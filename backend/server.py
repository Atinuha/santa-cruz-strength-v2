from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Query, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse, Response, JSONResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pymongo.errors import DuplicateKeyError
import os
import logging
import csv
import io
import re
import asyncio
import resend
import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from twilio.request_validator import RequestValidator
from pathlib import Path
from pydantic import BaseModel, Field
from typing import Any, Dict, List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

try:
    from runtime_safety import (
        ALLOW_DATABASE_WRITES,
        ALLOW_EMAIL_SENDS,
        ALLOW_SCHEDULERS,
        ALLOW_SEEDING,
        ALLOW_SMS_SENDS,
        ALLOW_RESEND_WEBHOOKS,
        ALLOW_THIRD_PARTY_RESEARCH,
        ALLOW_TWILIO_WEBHOOKS,
        APP_ENV,
        outbound_recipient_allowed,
        require_frontend_origin,
        runtime_summary,
        validate_runtime_safety,
    )
except ImportError:
    from .runtime_safety import (
        ALLOW_DATABASE_WRITES,
        ALLOW_EMAIL_SENDS,
        ALLOW_SCHEDULERS,
        ALLOW_SEEDING,
        ALLOW_SMS_SENDS,
        ALLOW_RESEND_WEBHOOKS,
        ALLOW_THIRD_PARTY_RESEARCH,
        ALLOW_TWILIO_WEBHOOKS,
        APP_ENV,
        outbound_recipient_allowed,
        require_frontend_origin,
        runtime_summary,
        validate_runtime_safety,
    )

try:
    from security_controls import (
        SlidingWindowLimiter,
        escape_html,
        make_signed_token,
        parse_cors_origins,
        safe_sms_text,
        verify_signed_token,
    )
except ImportError:
    from .security_controls import (
        SlidingWindowLimiter,
        escape_html,
        make_signed_token,
        parse_cors_origins,
        safe_sms_text,
        verify_signed_token,
    )

try:
    from lead_lifecycle import (
        InvalidLifecycleTransition,
        human_contact_event,
        lifecycle_event,
        new_lead_lifecycle_fields,
    )
except ImportError:
    from .lead_lifecycle import (
        InvalidLifecycleTransition,
        human_contact_event,
        lifecycle_event,
        new_lead_lifecycle_fields,
    )

try:
    from lead_outbox import (
        QuarantinedReplayRefused,
        enqueue_lead_received_jobs,
        replay_terminal_failure,
    )
except ImportError:
    from .lead_outbox import (
        QuarantinedReplayRefused,
        enqueue_lead_received_jobs,
        replay_terminal_failure,
    )
try:
    from blog_articles import PUBLISHED_ARTICLES as LONGFORM_ARTICLES
except ImportError:
    from .blog_articles import PUBLISHED_ARTICLES as LONGFORM_ARTICLES
try:
    from lead_consent import reinquiry_sms_updates
except ImportError:
    from .lead_consent import reinquiry_sms_updates

try:
    from provider_dispatch import DispatchConfig, build_adapters, dispatch_batch
except ImportError:
    from .provider_dispatch import DispatchConfig, build_adapters, dispatch_batch

mongo_url = os.environ['MONGO_URL']

# Refuse an unacknowledged connection rather than inherit one.
#
# w=0 is a legal thing to put in a connection string and it means the driver
# returns as soon as the write is handed to the socket, without waiting to hear
# that the server accepted it. Every insert then reports success whether or not
# the data landed, and this application answers a visitor with "accepted" on the
# strength of exactly that. A lead can be lost with nothing anywhere recording
# that it existed, which is the one failure this site cannot tolerate.
#
# Nothing in the code chose w=0; the risk is that a deployment configuration
# supplies it and nothing here objects. So: reject it loudly at import, in
# keeping with how this service treats every other unsafe configuration, and
# otherwise require acknowledgement explicitly rather than relying on a default
# that a future URL could override.
if re.search(r'[?&]w=0(?:&|$)', mongo_url):
    raise RuntimeError(
        'MONGO_URL specifies w=0, which acknowledges writes before the server '
        'has accepted them. Lead capture reports success on the basis of that '
        'acknowledgement, so an unacknowledged write means silently losing '
        'leads. Remove w=0 or set w=majority.'
    )

client = AsyncIOMotorClient(mongo_url, w=os.environ.get('MONGO_WRITE_CONCERN', 'majority'))
database_name = os.environ.get('DB_NAME', 'test_database')
db = client[database_name]

app = FastAPI(title='Santa Cruz Strength API')
api_router = APIRouter(prefix='/api')

JWT_SECRET = os.environ.get('JWT_SECRET', '').strip()
if not JWT_SECRET:
    raise RuntimeError('JWT_SECRET must be configured; no insecure fallback is permitted')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_MINUTES = int(os.environ.get('JWT_EXPIRE_MINUTES', 10080))
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

PUBLIC_LEAD_LIMITER = SlidingWindowLimiter(
    max_attempts=max(1, min(int(os.environ.get('PUBLIC_LEAD_RATE_LIMIT', '10')), 60)),
    window_seconds=max(60, min(int(os.environ.get('PUBLIC_LEAD_RATE_WINDOW_SECONDS', '600')), 3600)),
)
PUBLIC_LEAD_MAX_BYTES = max(1024, min(int(os.environ.get('PUBLIC_LEAD_MAX_BYTES', '32768')), 131072))


def _enforce_public_lead_request(request: Request, namespace: str = 'lead') -> None:
    content_length = request.headers.get('content-length')
    if content_length:
        try:
            if int(content_length) > PUBLIC_LEAD_MAX_BYTES:
                raise HTTPException(status_code=413, detail='Lead form payload is too large')
        except ValueError:
            raise HTTPException(status_code=400, detail='Invalid Content-Length header')
    client_ip = request.client.host if request.client else 'unknown'
    allowed, retry_after = PUBLIC_LEAD_LIMITER.check(f'{namespace}:{client_ip}')
    if not allowed:
        raise HTTPException(
            status_code=429,
            detail='Too many lead form submissions. Please try again later.',
            headers={'Retry-After': str(retry_after)},
        )


@app.middleware('http')
async def enforce_database_write_gate(request: Request, call_next):
    if request.method not in {'GET', 'HEAD', 'OPTIONS'} and not ALLOW_DATABASE_WRITES:
        return JSONResponse(
            status_code=503,
            content={
                'detail': 'Database writes are disabled for this protected environment.',
                'code': 'database_writes_disabled',
            },
        )
    return await call_next(request)

# --------------- Helpers ---------------

def serialize_doc(doc):
    if doc is None:
        return None
    result = {}
    for k, v in doc.items():
        if k == '_id':
            result['_id'] = str(v)
        elif isinstance(v, datetime):
            result[k] = v.isoformat()
        elif isinstance(v, list):
            result[k] = [serialize_doc(i) if isinstance(i, dict) else (i.isoformat() if isinstance(i, datetime) else i) for i in v]
        elif isinstance(v, dict):
            result[k] = serialize_doc(v)
        else:
            result[k] = v
    return result

def now_utc():
    return datetime.now(timezone.utc)

# --------------- Auth ---------------

def verify_password(plain, hashed):
    return pwd_context.verify(plain, hashed)

def hash_password(plain):
    return pwd_context.hash(plain)

def create_token(data, expires_delta=None):
    to_encode = data.copy()
    expire = now_utc() + (expires_delta or timedelta(minutes=JWT_EXPIRE_MINUTES))
    to_encode.update({'exp': expire})
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    token = credentials.credentials
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('sub')
        if not user_id:
            raise HTTPException(status_code=401, detail='Invalid token')
    except JWTError:
        raise HTTPException(status_code=401, detail='Invalid or expired token')
    user = await db.users.find_one({'id': user_id})
    if not user:
        raise HTTPException(status_code=401, detail='User not found')
    if not user.get('is_active', True):
        raise HTTPException(status_code=403, detail='Account disabled')
    return user

# Roles: owner > admin > staff
ROLE_RANK = {'owner': 3, 'admin': 2, 'staff': 1}

def has_role(user, min_role):
    return ROLE_RANK.get(user.get('role', 'staff'), 0) >= ROLE_RANK.get(min_role, 1)

async def require_staff(user=Depends(get_current_user)):
    """Any authenticated user"""
    return user

async def require_admin(user=Depends(get_current_user)):
    """Admin or owner only"""
    if not has_role(user, 'admin'):
        raise HTTPException(status_code=403, detail='Admin access required')
    return user

async def require_owner(user=Depends(get_current_user)):
    """Owner only"""
    if user.get('role') != 'owner':
        raise HTTPException(status_code=403, detail='Owner access required')
    return user

# --------------- Email (Resend) ---------------

resend.api_key = os.environ.get('RESEND_API_KEY', '')
STAFF_EMAIL       = os.environ.get('NOTIFICATION_EMAIL', 'management@santacruzstrength.com')
FROM_EMAIL        = os.environ.get('FROM_EMAIL', 'hello@santacruzstrength.com')
SECURITY_FROM     = os.environ.get('SECURITY_FROM_EMAIL', 'security@santacruzstrength.com')
CC_EMAIL          = os.environ.get('CC_EMAIL', '')
DAILY_EMAIL_LIMIT = int(os.environ.get('DAILY_EMAIL_LIMIT', 50000))  # Resend plan limit
STAFF_EMAIL_RESERVE = 10  # always keep 10 sends free for 2FA / resets / invites
EMAIL_MARKETING_FILTER = {
    'blacklisted': {'$ne': True},
    'email_opted_out': {'$ne': True},
    'email_opt_out': {'$ne': True},
    'email_marketing_opt_in': True,
    'email_bounced': {'$ne': True},
    'email_complained': {'$ne': True},
}


async def _email_delivery_allowed(to: str, message_kind: str) -> tuple[bool, Optional[dict]]:
    if message_kind in {'internal', 'corporate_marketing'}:
        return True, None
    lead = await db.leads.find_one(
        {'email': to.lower().strip()},
        {'_id': 0, 'id': 1, 'email': 1, 'blacklisted': 1, 'email_opted_out': 1,
         'email_opt_out': 1, 'email_marketing_opt_in': 1,
         'email_bounced': 1, 'email_complained': 1},
    )
    if not lead:
        return True, None
    if lead.get('email_bounced') or lead.get('email_complained'):
        return False, lead
    if message_kind == 'marketing' and (
        lead.get('blacklisted') or lead.get('email_opted_out') or lead.get('email_opt_out')
    ):
        return False, lead
    if message_kind == 'marketing' and lead.get('email_marketing_opt_in') is not True:
        return False, lead
    return True, lead


def _append_consumer_unsubscribe(html_body: str, lead: dict) -> str:
    secret = os.environ.get('UNSUBSCRIBE_SECRET', '')
    if len(secret) < 32:
        raise RuntimeError('UNSUBSCRIBE_SECRET must contain at least 32 characters for marketing email')
    token = make_signed_token({'lead_id': lead['id'], 'email': lead['email']}, secret)
    site_url = require_frontend_origin()
    unsubscribe_url = f'{site_url}/api/unsubscribe?token={token}'
    if '{{unsubscribe_url}}' in html_body:
        return html_body.replace('{{unsubscribe_url}}', escape_html(unsubscribe_url))
    footer = (
        '<p style="margin:16px 0;font-size:11px;color:#888;text-align:center;">'
        f'<a href="{escape_html(unsubscribe_url)}" style="color:#666;">Unsubscribe from marketing email</a>'
        '</p>'
    )
    return html_body.replace('</body>', footer + '</body>', 1) if '</body>' in html_body else html_body + footer

async def _check_campaign_quota() -> bool:
    """Returns True if there is quota available for campaign sends (respects staff reserve)."""
    today = now_utc().date().isoformat()
    stats = await db.email_stats.find_one({'date': today})
    campaign_sent = (stats or {}).get('campaign_sends', 0)
    transact_sent = (stats or {}).get('transact_sends', 0)
    total_sent = campaign_sent + transact_sent
    available = DAILY_EMAIL_LIMIT - total_sent
    return available > STAFF_EMAIL_RESERVE

async def _track_email_send(is_campaign: bool = False):
    """Increment daily email counter."""
    today = now_utc().date().isoformat()
    field = 'campaign_sends' if is_campaign else 'transact_sends'
    await db.email_stats.update_one({'date': today}, {'$inc': {field: 1}}, upsert=True)   # e.g. teresa@santacruzstrength.com

async def send_resend_email(to: str, subject: str, html: str, reply_to: str = None,
                            from_override: str = None, cc: list = None,
                            message_kind: str = 'transactional'):
    """Non-blocking Resend send - falls back gracefully if key not set."""
    if not ALLOW_EMAIL_SENDS:
        logger.info('[EMAIL] Outbound email disabled by runtime safety controls')
        return False
    if not outbound_recipient_allowed('email', to):
        logger.warning('[EMAIL] Recipient blocked by non-production allowlist')
        return False
    if not resend.api_key:
        logger.info(f'[EMAIL] RESEND_API_KEY not set - skipping to {to}')
        return False
    allowed, lead = await _email_delivery_allowed(to, message_kind)
    if not allowed:
        logger.info(f'[EMAIL] Suppressed {message_kind} email to {to}')
        return False
    try:
        if message_kind == 'marketing':
            if not lead:
                logger.warning(f'[EMAIL] Marketing send blocked because no lead record was found for {to}')
                return False
            html = _append_consumer_unsubscribe(html, lead)
        sender = from_override or FROM_EMAIL
        params = {'from': sender, 'to': [to], 'subject': subject, 'html': html}
        if reply_to:
            params['reply_to'] = [reply_to]
        if cc:
            params['cc'] = [c for c in cc if c and c != to]
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f'[EMAIL] Sent via Resend to {to} - id={result.get("id","?")}')
        return True
    except Exception as e:
        logger.warning(f'[EMAIL] Resend failed to {to}: {e}')
        return False


def _verified_consumer_unsubscribe(token: str) -> dict:
    secret = os.environ.get('UNSUBSCRIBE_SECRET', '')
    if len(secret) < 32:
        raise HTTPException(status_code=503, detail='Unsubscribe service is not configured')
    payload = verify_signed_token(token, secret)
    if not payload or not payload.get('lead_id') or not payload.get('email'):
        raise HTTPException(status_code=400, detail='Invalid unsubscribe token')
    return payload


@api_router.get('/unsubscribe')
async def consumer_unsubscribe_confirmation(token: str = Query(..., min_length=20, max_length=2000)):
    _verified_consumer_unsubscribe(token)
    safe_token = escape_html(token)
    return Response(
        content=(
            '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">'
            '<title>Email preferences | Santa Cruz Strength</title></head><body>'
            '<main><h1>Email preferences</h1><p>Confirm that you want to stop marketing email from Santa Cruz Strength.</p>'
            f'<form method="post" action="/api/unsubscribe?token={safe_token}"><button type="submit">Unsubscribe</button></form>'
            '</main></body></html>'
        ),
        media_type='text/html',
    )


@api_router.post('/unsubscribe')
async def consumer_unsubscribe(token: str = Query(..., min_length=20, max_length=2000)):
    payload = _verified_consumer_unsubscribe(token)
    result = await db.leads.update_one(
        {'id': payload['lead_id'], 'email': payload['email']},
        {'$set': {
            'email_opted_out': True,
            'email_opt_out': True,
            'email_opted_out_at': now_utc().isoformat(),
            'updated_at': now_utc().isoformat(),
        }},
    )
    if not result.matched_count:
        raise HTTPException(status_code=404, detail='Subscription not found')
    return Response(
        content='<!doctype html><html><body><main><h1>You are unsubscribed.</h1><p>You will no longer receive marketing email from Santa Cruz Strength.</p></main></body></html>',
        media_type='text/html',
    )

# ── Twilio Config ──────────────────────────────────────────────────────────────
TWILIO_ACCOUNT_SID  = os.environ.get('TWILIO_ACCOUNT_SID', '')
TWILIO_AUTH_TOKEN   = os.environ.get('TWILIO_AUTH_TOKEN', '')
TWILIO_PHONE_NUMBER = os.environ.get('TWILIO_PHONE_NUMBER', '')
_twilio_client = None

def _get_twilio_client():
    global _twilio_client
    if _twilio_client is None and TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN:
        from twilio.rest import Client
        _twilio_client = Client(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN)
    return _twilio_client

# ── Core send (Twilio, the only SMS provider) ──────────────────────────────────
async def send_sms(
    to_numbers: list,
    text: str,
    lead_info: dict = None,
) -> bool:
    """Send SMS via Twilio. Twilio is the only authoritative SMS provider.

    A MailerSend fallback used to sit behind this and was removed. It resent to
    the whole recipient list after a mid batch Twilio failure, so anyone already
    delivered to got the message twice from a second number. Worse, inbound
    MailerSend webhooks fail closed, so a STOP reply to that number was never
    recorded: we would have been sending from a number whose opt outs we could
    not process.

    lead_info: optional dict with {name, email, phone, lead_id} for failure logging.
    """
    valid = [n.strip().replace(' ', '') for n in to_numbers if n and n.strip().startswith('+')]
    if not valid:
        return False

    if not ALLOW_SMS_SENDS:
        logger.info('[SMS] Outbound SMS disabled by runtime safety controls')
        return False
    if any(not outbound_recipient_allowed('sms', number) for number in valid):
        logger.warning('[SMS] One or more recipients blocked by non-production allowlist')
        return False

    # Try Twilio first (primary - A2P 10DLC registered)
    twilio = _get_twilio_client()
    if twilio and TWILIO_PHONE_NUMBER:
        try:
            for number in valid:
                msg = twilio.messages.create(
                    body=text,
                    from_=TWILIO_PHONE_NUMBER,
                    to=number,
                    status_callback=require_frontend_origin() + '/api/webhooks/twilio-status',
                )
                logger.info(f'[SMS-TWILIO] Sent to {number} (SID: {msg.sid})')
            return True
        except Exception as e:
            logger.warning(f'[SMS-TWILIO] Failed: {e}')

    logger.info(f'[SMS] Twilio unavailable or failed - skipping to {valid}')
    if lead_info:
        await _log_sms_failure(valid, 'all_providers_failed', lead_info)
    return False

async def _log_sms_failure(numbers: list, error, lead_info: dict):
    """Log an SMS failure to the daily bounce/failure digest."""
    try:
        await db.daily_bounce_log.insert_one({
            'type': 'sms_failure',
            'event': f'sms_send_failed ({error})',
            'phone': numbers[0] if numbers else '',
            'name': lead_info.get('name', 'Unknown'),
            'email': lead_info.get('email', ''),
            'source': lead_info.get('source', ''),
            'timestamp': now_utc().isoformat(),
            'date': now_utc().date().isoformat(),
        })
    except Exception:
        pass

# ── Get staff SMS numbers (DB-managed so staff can update via CRM UI) ─────────
async def get_sms_staff_numbers() -> list:
    doc = await db.sms_settings.find_one({'_id': 'staff_numbers'})
    if doc:
        return doc.get('numbers', [])
    # Seed from env on first call.
    #
    # This persists, and it is reached from a GET. The write gate only inspects
    # the HTTP method, so protected read-only mode could not see it and a read
    # endpoint could write to the database while the service believed it could
    # not. Gate it on the same flag the middleware enforces, so read-only means
    # read-only however the write is reached. The value is still returned, so
    # the endpoint keeps working; it simply does not persist a cache it was
    # never asked to persist.
    seed = [n.strip() for n in os.environ.get('SMS_STAFF_NUMBERS', '').split(',') if n.strip()]
    if seed and ALLOW_DATABASE_WRITES:
        await db.sms_settings.replace_one(
            {'_id': 'staff_numbers'},
            {'_id': 'staff_numbers', 'numbers': seed},
            upsert=True,
        )
    return seed

# ── Immediate flows ───────────────────────────────────────────────────────────
# ── Status-change triggered SMS ────────────────────────────────────────────────
async def send_status_change_sms(lead: dict, new_status: str):
    """Fire a branded SMS when staff moves a lead to a milestone status."""
    name      = lead.get('first_name', 'there')
    lead_phone = lead.get('phone', '').strip()
    if (
        not lead_phone
        or not lead_phone.startswith('+')
        or not (
            lead.get('sms_operational_opt_in') is True
            or lead.get('sms_consent') is True
        )
        or lead.get('sms_opted_out')
    ):
        return

    msg = None

    if new_status == 'Booked Visit':
        msg = (
            f"Hey {name}! Your tour at Santa Cruz Strength is confirmed. "
            f"We are at 151 Harvey West Blvd, Suite D, Santa Cruz. "
            f"Any questions? Call (408) 337-6709. See you soon! - SCS"
        )
    elif new_status == 'Trial Scheduled':
        msg = (
            f"Hey {name}, your trial session at Santa Cruz Strength is locked in! "
            f"151 Harvey West Blvd, Suite D. Questions? (408) 337-6709. - SCS"
        )
    elif new_status == 'Joined':
        msg = (
            f"Welcome to Santa Cruz Strength, {name}! "
            f"You are officially part of the crew. "
            f"Download the app for 24/7 access and we will see you in the gym. - SCS"
        )

    if msg:
        await send_sms([lead_phone], msg)
        # Track it
        await db.leads.update_one(
            {'id': lead.get('id', '')},
            {'$push': {'sms_log': {'type': f'status_{new_status.lower().replace(" ","_")}',
                                    'sent_at': now_utc().isoformat()}}}
        )

# ── Follow-up scheduler (runs every 30 min) ───────────────────────────────────
STOP_STATUSES = {'Booked Visit', 'Trial Scheduled', 'Joined', 'Lost', 'No Response'}

SMS_SEQUENCE = [
    {
        'key':   'day1',
        'hours': 24,
        'target_statuses': {'New'},
        'text': (
            "Hey {{name}}, following up from Santa Cruz Strength! "
            "Still thinking about checking out the gym? "
            "We would love to show you around - zero pressure, totally free. "
            "Reply back or call (408) 337-6709. - SCS"
        ),
    },
    {
        'key':   'day3',
        'hours': 72,
        'target_statuses': {'New', 'Contacted', 'Attempted Call', 'Texted'},
        'text': (
            "Hey {{name}}, the SCS team here again. "
            "We have open spots for tours this week - takes 20 min, free, no commitment. "
            "Want to grab one? Reply or call (408) 337-6709. - SCS"
        ),
    },
    {
        'key':   'day7',
        'hours': 168,
        'target_statuses': {'New', 'Contacted', 'Attempted Call', 'Texted'},
        'text': (
            "Last one from us, {{name}} - if strength training ever moves up the priority list, "
            "Santa Cruz Strength will be here. "
            "Come by anytime: 151 Harvey West Blvd, Santa Cruz. (408) 337-6709. - SCS"
        ),
    },
]

async def run_sms_followup_job():
    """Scheduled every 30 min: send follow-up SMS based on lead age + status."""
    if not TWILIO_PHONE_NUMBER:
        return
    now = now_utc()
    for seq in SMS_SEQUENCE:
        cutoff_start = (now - timedelta(hours=seq['hours'] + 1)).isoformat()
        cutoff_end   = (now - timedelta(hours=seq['hours'] - 1)).isoformat()
        leads = await db.leads.find({
            'created_at': {'$gte': cutoff_start, '$lte': cutoff_end},
            'status':     {'$in': list(seq['target_statuses'])},
            'sms_marketing_opt_in': True,
            'sms_opted_out': {'$ne': True},
            f'sms_log.type': {'$ne': seq['key']},   # hasn't already received this step
        }, {'_id': 0, 'id': 1, 'phone': 1, 'first_name': 1, 'status': 1, 'sms_log': 1}).to_list(500)

        for lead in leads:
            # Was: skip anything not starting with '+'. Every stored number is
            # in display form, so that skipped all of them and no lead could
            # ever receive a message. Convert instead, and skip only what
            # genuinely cannot be dialled.
            phone = to_e164(lead.get('phone', ''))
            if not phone:
                logger.warning(f"[SMS] Lead {lead.get('id')} has an undiallable phone, skipping")
                continue
            # Skip if already in stop status
            if lead.get('status') in STOP_STATUSES:
                continue
            # Build personalised text
            text = seq['text'].replace('{{name}}', lead.get('first_name', 'there'))
            ok = await send_sms([phone], text)
            if ok:
                await db.leads.update_one(
                    {'id': lead['id']},
                    {'$push': {'sms_log': {'type': seq['key'], 'sent_at': now.isoformat()}}}
                )
                logger.info(f"[SMS FOLLOWUP] {seq['key']} sent to {phone}")

async def run_review_request_job():
    """Scheduled every 30 min: send review request 3 days after member joined (up to 7 days)."""
    now = now_utc()
    now_iso     = now.isoformat()
    cutoff_iso  = (now - timedelta(days=4)).isoformat()   # window: 3-7 days after joining

    # Find leads where review is due (review_send_at <= now) and within 7-day window
    leads = await db.leads.find({
        'review_send_at':  {'$lte': now_iso, '$gte': cutoff_iso},
        'review_sent':     False,
        'status':          'Joined',
    }, {'_id': 0}).to_list(100)

    for lead in leads:
        try:
            await _send_review_request(lead)
            await db.leads.update_one({'id': lead['id']}, {'$set': {'review_sent': True}})
            logger.info(f"[REVIEW] Sent to {lead.get('first_name', '')} {lead.get('last_name', '')}")
        except Exception as e:
            logger.warning(f"[REVIEW] Failed for lead {lead.get('id')}: {e}")


# --------------- Pydantic Models ---------------

class AttributionTouch(BaseModel):
    landing_page: Optional[str] = Field(default='', max_length=500)
    referrer: Optional[str] = Field(default='', max_length=500)
    captured_at: Optional[str] = Field(default='', max_length=64)
    utm_source: Optional[str] = Field(default='', max_length=250)
    utm_medium: Optional[str] = Field(default='', max_length=250)
    utm_campaign: Optional[str] = Field(default='', max_length=250)
    utm_content: Optional[str] = Field(default='', max_length=250)
    utm_term: Optional[str] = Field(default='', max_length=250)
    gclid: Optional[str] = Field(default='', max_length=250)
    fbclid: Optional[str] = Field(default='', max_length=250)

class LeadAttribution(BaseModel):
    first_touch: Optional[AttributionTouch] = None
    last_touch: Optional[AttributionTouch] = None

class LeadCreate(BaseModel):
    first_name: str = Field(min_length=1, max_length=100)
    last_name: str = Field(default='', max_length=100)
    email: str = Field(min_length=3, max_length=254)
    phone: str = Field(default='', max_length=40)
    location: str = Field(default='santa_cruz', max_length=100)
    interest_type: str = Field(default='General Membership', max_length=150)
    training_goals: Optional[str] = Field(default='', max_length=500)
    start_timeline: Optional[str] = Field(default='Just exploring', max_length=100)
    preferred_contact: Optional[str] = Field(default='call', max_length=30)
    lead_source: Optional[str] = Field(default='website_form', max_length=150)
    notes: Optional[str] = Field(default='', max_length=1000)
    tags: Optional[List[str]] = []
    sms_consent: Optional[bool] = False
    attribution: Optional[LeadAttribution] = None
    schema_version: Optional[str] = None
    request_id: Optional[str] = None
    brand_id: Optional[str] = None
    location_id: Optional[str] = None
    form_id: Optional[str] = None
    offer_id: Optional[str] = None
    consent: Optional[Dict[str, Any]] = None

class LeadUpdate(BaseModel):
    status: Optional[str] = None
    notes: Optional[str] = None
    next_follow_up_date: Optional[str] = None
    next_follow_up_time: Optional[str] = None
    last_contact_date: Optional[str] = None
    tags: Optional[List[str]] = None
    interest_type: Optional[str] = None
    training_goals: Optional[str] = None
    preferred_contact: Optional[str] = None

class LeadLifecycleTransitionCreate(BaseModel):
    event_id: str = Field(min_length=36, max_length=36)
    state: str = Field(min_length=2, max_length=40)
    reason: Optional[str] = Field(default='', max_length=500)

class HumanContactEventCreate(BaseModel):
    event_id: str = Field(min_length=36, max_length=36)
    channel: str = Field(min_length=2, max_length=40)
    outcome: str = Field(min_length=2, max_length=40)
    note: Optional[str] = Field(default='', max_length=500)

class OutboxReplayCreate(BaseModel):
    reason: str = Field(min_length=3, max_length=500)
    # Set only after checking the provider log for a quarantined job, where the
    # original delivery outcome is unknown and Twilio offers no idempotency key.
    confirmed_not_sent: bool = False

class NoteCreate(BaseModel):
    note: str

class UserCreate(BaseModel):
    email: str
    password: str
    name: str
    role: str = 'staff'
    location: str = 'santa_cruz'

class UserUpdate(BaseModel):
    name: Optional[str] = None
    email: Optional[str] = None
    password: Optional[str] = None
    role: Optional[str] = None
    is_active: Optional[bool] = None

class LoginRequest(BaseModel):
    email: str
    password: str
    device_token: Optional[str] = None

class InviteCreate(BaseModel):
    email: str
    name: str
    role: str = 'staff'

class AcceptInvite(BaseModel):
    token: str
    password: str
    name: Optional[str] = None

# --------------- Auth Routes ---------------

def _otp_email_html(name: str, otp: str) -> str:
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F7F5F0;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#111f16;border-radius:12px;overflow:hidden;border:1px solid #1e3327;">
      <tr><td style="background:#0D5D3E;padding:22px 32px;">
        <p style="margin:0;color:#CDE4DF;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Santa Cruz Strength - Staff Portal</p>
        <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:800;">Your login code</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px;color:#e8f5ee;font-size:14px;">Hey {name}, here's your one-time login code:</p>
        <div style="background:#0D5D3E;border-radius:10px;padding:20px 32px;text-align:center;margin:0 0 20px;">
          <span style="font-family:monospace;font-size:38px;font-weight:900;color:#ffffff;letter-spacing:10px;">{otp}</span>
        </div>
        <p style="margin:0;color:#8FBF9F;font-size:12px;line-height:1.6;">
          This code expires in <strong style="color:#CDE4DF;">10 minutes</strong>.<br>
          If you didn't request this, someone may be attempting to access your account - contact your admin.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""

def _reset_email_html(name: str, reset_url: str) -> str:
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F7F5F0;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
  <tr><td align="center">
    <table width="480" cellpadding="0" cellspacing="0" style="background:#111f16;border-radius:12px;overflow:hidden;border:1px solid #1e3327;">
      <tr><td style="background:#0D5D3E;padding:22px 32px;">
        <p style="margin:0;color:#CDE4DF;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Santa Cruz Strength - Staff Portal</p>
        <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:800;">Reset your password</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 20px;color:#e8f5ee;font-size:14px;">Hey {name}, click the button below to set a new password. This link expires in <strong style="color:#CDE4DF;">1 hour</strong>.</p>
        <table cellpadding="0" cellspacing="0"><tr>
          <td style="background:#0D5D3E;border-radius:8px;">
            <a href="{reset_url}" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;">
              Reset Password →
            </a>
          </td>
        </tr></table>
        <p style="margin:20px 0 0;color:#8FBF9F;font-size:11px;">
          Or copy this link: <span style="color:#CDE4DF;">{reset_url}</span><br><br>
          If you didn't request a password reset, ignore this email - your password will not change.
        </p>
      </td></tr>
    </table>
  </td></tr>
</table>
</body></html>"""

import random, string

def normalize_phone(phone: str) -> str:
    """Format any phone number to (XXX) XXX-XXXX for consistent storage."""
    if not phone:
        return phone
    digits = re.sub(r'\D', '', phone)
    if len(digits) == 11 and digits[0] == '1':
        digits = digits[1:]
    if len(digits) == 10:
        return f"({digits[:3]}) {digits[3:6]}-{digits[6:]}"
    return phone  # return as-is if unrecognised


def to_e164(phone: str) -> Optional[str]:
    """The same number in the only form a carrier accepts.

    Leads are stored in the display form above, (831) 555-1212, because that is
    what staff read. Twilio speaks E.164, +18315551212, in both directions. The
    two were never reconciled, and it broke the SMS path at both ends:

      Sending: the dispatcher skipped any number not starting with '+', which
      is every number this application has ever stored, so no lead could ever
      receive a message.

      STOP: an inbound keyword arrives with the sender in E.164 and was matched
      against the stored display string, so it matched nothing. A customer
      texting STOP got an acknowledgement and stayed subscribed. That is the
      half that carries legal exposure rather than merely losing a message.

    Both were latent only because SMS is flag disabled. They fire the moment
    Twilio is enabled, which the deployment sequence does at step 5.

    Returns None when the input is not a number that can be dialled, so callers
    must decide what to do rather than send to a malformed destination.
    """
    if not phone:
        return None
    digits = re.sub(r'\D', '', phone)
    if len(digits) == 11 and digits[0] == '1':
        return f'+{digits}'
    if len(digits) == 10:
        return f'+1{digits}'
    if phone.strip().startswith('+') and 8 <= len(digits) <= 15:
        return f'+{digits}'
    return None


def phone_match_query(phone: str) -> dict:
    """Match a stored lead by phone in whatever form the caller has.

    Used for inbound Twilio webhooks, where the sender is E.164 and the stored
    value is the display form. Matching on either representation means a STOP
    lands whichever way the record was written, including records created
    before to_e164 existed.
    """
    candidates = {phone, phone.strip()}
    display = normalize_phone(phone)
    if display:
        candidates.add(display)
    e164 = to_e164(phone)
    if e164:
        candidates.add(e164)
        digits = e164[1:]
        if len(digits) == 11 and digits[0] == '1':
            candidates.add(normalize_phone(digits[1:]))
    return {'phone': {'$in': [c for c in candidates if c]}}

@api_router.post('/auth/login')
async def login(req: LoginRequest):
    user = await db.users.find_one({'email': req.email.lower().strip()})
    if not user or not verify_password(req.password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    if not user.get('is_active', True):
        raise HTTPException(status_code=403, detail='Account disabled')

    # 2FA is disabled - issue JWT directly on valid credentials
    token = create_token({'sub': user['id']})
    logger.info(f'[AUTH] Direct login for {user["email"]} - 2FA disabled')

    # Always issue a long-lived device token (90 days)
    device_token = str(uuid.uuid4())
    device_expires = now_utc() + timedelta(days=90)
    await db.device_tokens.delete_many({'email': user['email']})
    await db.device_tokens.insert_one({
        'email': user['email'],
        'token': device_token,
        'expires_at': device_expires.isoformat(),
        'used': False,
        'created_at': now_utc().isoformat(),
        'user_agent': getattr(req, 'user_agent', ''),
    })

    return {
        'access_token': token,
        'token_type': 'bearer',
        'step': 'authenticated',
        'device_token': device_token,
        'device_token_expires': device_expires.isoformat(),
        'user': {'id': user['id'], 'name': user['name'], 'email': user['email'],
                 'role': user['role'], 'location': user.get('location', 'santa_cruz')}
    }

@api_router.post('/auth/verify-otp')
async def verify_otp(req: dict):
    email         = (req.get('email') or '').lower().strip()
    otp           = (req.get('otp') or '').strip()
    remember      = bool(req.get('remember_device', False))

    record = await db.auth_otps.find_one({'email': email, 'used': False})
    if not record:
        raise HTTPException(status_code=401, detail='Invalid or expired code')
    expires = datetime.fromisoformat(record['expires_at'].replace('Z', '+00:00'))
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now_utc() > expires:
        await db.auth_otps.delete_one({'_id': record['_id']})
        raise HTTPException(status_code=401, detail='Code has expired - please log in again')
    if record['otp'] != otp:
        raise HTTPException(status_code=401, detail='Incorrect code')
    await db.auth_otps.update_one({'_id': record['_id']}, {'$set': {'used': True}})

    user = await db.users.find_one({'email': email})
    if not user or not user.get('is_active', True):
        raise HTTPException(status_code=401, detail='Account not found')

    jwt_token = create_token({'sub': user['id']})
    response = {
        'access_token': jwt_token,
        'token_type': 'bearer',
        'user': {'id': user['id'], 'name': user['name'], 'email': user['email'],
                 'role': user['role'], 'location': user.get('location', 'santa_cruz')}
    }

    # Issue a 7-day device token if user chose "remember this device"
    if remember:
        device_token = str(uuid.uuid4())
        device_expires = now_utc() + timedelta(days=7)
        await db.device_tokens.delete_many({'email': email})   # one remembered device at a time
        await db.device_tokens.insert_one({
            'email': email,
            'token': device_token,
            'expires_at': device_expires.isoformat(),
            'used': False,
            'created_at': now_utc().isoformat(),
        })
        response['device_token'] = device_token
        response['device_token_expires'] = device_expires.isoformat()
        logger.info(f'[AUTH] Device token issued for {email} - expires {device_expires.date()}')

    return response

@api_router.post('/auth/forgot-password')
async def forgot_password(req: dict):
    email = (req.get('email') or '').lower().strip()
    user = await db.users.find_one({'email': email})
    # Always return success to prevent email enumeration
    if not user or not user.get('is_active', True):
        return {'message': 'If that email exists, a reset link has been sent'}
    reset_token = str(uuid.uuid4())
    expires = now_utc() + timedelta(hours=1)
    await db.password_resets.delete_many({'email': email})
    await db.password_resets.insert_one({
        'email': email,
        'token': reset_token,
        'expires_at': expires.isoformat(),
        'used': False,
    })
    frontend_url = require_frontend_origin()
    reset_url = f"{frontend_url}/staff/reset-password?token={reset_token}"
    await send_resend_email(
        to=email,
        subject='Reset your Santa Cruz Strength staff password',
        html=_reset_email_html(user.get('name', 'there'), reset_url),
        from_override=SECURITY_FROM,
    )
    return {'message': 'If that email exists, a reset link has been sent'}

@api_router.post('/auth/reset-password')
async def reset_password(req: dict):
    token    = (req.get('token') or '').strip()
    password = (req.get('password') or '').strip()
    if len(password) < 8:
        raise HTTPException(status_code=400, detail='Password must be at least 8 characters')
    record = await db.password_resets.find_one({'token': token, 'used': False})
    if not record:
        raise HTTPException(status_code=400, detail='Invalid or expired reset link')
    expires = datetime.fromisoformat(record['expires_at'].replace('Z', '+00:00'))
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now_utc() > expires:
        await db.password_resets.delete_one({'_id': record['_id']})
        raise HTTPException(status_code=400, detail='Reset link has expired - please request a new one')
    await db.users.update_one({'email': record['email']}, {'$set': {'password_hash': hash_password(password)}})
    await db.password_resets.update_one({'_id': record['_id']}, {'$set': {'used': True}})
    return {'message': 'Password updated - you can now log in'}

@api_router.post('/staff/users/{user_id}/send-reset')
async def owner_send_reset(user_id: str, caller=Depends(require_owner)):
    target = await db.users.find_one({'id': user_id})
    if not target:
        raise HTTPException(status_code=404, detail='User not found')
    reset_token = str(uuid.uuid4())
    expires = now_utc() + timedelta(hours=24)
    await db.password_resets.delete_many({'email': target['email']})
    await db.password_resets.insert_one({
        'email': target['email'],
        'token': reset_token,
        'expires_at': expires.isoformat(),
        'used': False,
    })
    frontend_url = require_frontend_origin()
    reset_url = f"{frontend_url}/staff/reset-password?token={reset_token}"
    await send_resend_email(
        to=target['email'],
        subject=f'Password reset sent by {caller["name"]} - Santa Cruz Strength',
        html=_reset_email_html(target.get('name', 'there'), reset_url),
        from_override=SECURITY_FROM,
    )
    return {'message': f'Password reset email sent to {target["email"]}'}

@api_router.post('/auth/accept-invite')
async def accept_invite(req: AcceptInvite):
    invite = await db.invites.find_one({'token': req.token, 'used': False})
    if not invite:
        raise HTTPException(status_code=400, detail='Invalid or expired invite link')
    expires = invite.get('expires_at')
    if isinstance(expires, str):
        expires = datetime.fromisoformat(expires.replace('Z', '+00:00'))
    if expires:
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if now_utc() > expires:
            raise HTTPException(status_code=400, detail='Invite link has expired')
    existing = await db.users.find_one({'email': invite['email']})
    if existing:
        raise HTTPException(status_code=400, detail='An account with this email already exists')
    user_id = str(uuid.uuid4())
    await db.users.insert_one({
        'id': user_id,
        'email': invite['email'],
        'password_hash': hash_password(req.password),
        'name': req.name or invite.get('name', invite['email'].split('@')[0]),
        'role': invite.get('role', 'staff'),
        'location': invite.get('location', 'santa_cruz'),
        'is_active': True,
        'created_at': now_utc().isoformat()
    })
    await db.invites.update_one({'token': req.token}, {'$set': {'used': True, 'used_at': now_utc().isoformat()}})
    return {'message': 'Account created. You can now log in.', 'email': invite['email']}

@api_router.get('/staff/me')
async def get_me(user=Depends(get_current_user)):
    return {'id': user['id'], 'name': user['name'], 'email': user['email'], 'role': user['role'], 'location': user.get('location', 'santa_cruz')}

@api_router.put('/staff/me')
async def update_me(data: UserUpdate, user=Depends(get_current_user)):
    update = {}
    if data.name: update['name'] = data.name
    if data.email: update['email'] = data.email.lower().strip()
    if data.password: update['password_hash'] = hash_password(data.password)
    update['updated_at'] = now_utc().isoformat()
    await db.users.update_one({'id': user['id']}, {'$set': update})
    updated = await db.users.find_one({'id': user['id']})
    return {'id': updated['id'], 'name': updated['name'], 'email': updated['email'], 'role': updated['role']}

# --------------- Invite Routes ---------------

@api_router.post('/staff/invites')
async def create_invite(data: InviteCreate, user=Depends(require_admin)):
    # Only owner can create admin invites
    if data.role in ('admin', 'owner') and user.get('role') != 'owner':
        raise HTTPException(status_code=403, detail='Only the owner can invite admins')
    existing_user = await db.users.find_one({'email': data.email.lower().strip()})
    if existing_user:
        raise HTTPException(status_code=400, detail='A user with this email already exists')
    # Revoke any existing unused invite for this email
    await db.invites.delete_many({'email': data.email.lower().strip(), 'used': False})
    token = str(uuid.uuid4())
    invite_doc = {
        'id': str(uuid.uuid4()),
        'token': token,
        'email': data.email.lower().strip(),
        'name': data.name,
        'role': data.role,
        'location': 'santa_cruz',
        'created_by': user['id'],
        'created_by_name': user['name'],
        'used': False,
        'expires_at': (now_utc() + timedelta(days=7)).isoformat(),
        'created_at': now_utc().isoformat()
    }
    await db.invites.insert_one(invite_doc)
    # Build invite URL
    frontend_url = require_frontend_origin()
    invite_url = f"{frontend_url}/staff/accept-invite?token={token}"
    # Try to send email
    html = f"""
    <html><body style='font-family:sans-serif;background:#111;color:#fff;padding:24px;'>
    <h2 style='color:#1B7A4A;'>You've been invited to Santa Cruz Strength</h2>
    <p>Hi {data.name},</p>
    <p>{user['name']} has invited you to join the Santa Cruz Strength staff portal as <strong>{data.role}</strong>.</p>
    <p style='margin:24px 0;'>
      <a href='{invite_url}' style='background:#1B7A4A;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;'>Accept Invitation</a>
    </p>
    <p style='color:#aaa;font-size:12px;'>This link expires in 7 days. If you did not expect this invitation, ignore this email.</p>
    <p style='color:#555;font-size:11px;'>Direct link: {invite_url}</p>
    </body></html>
    """
    email_sent = await send_resend_email(data.email, 'Invitation to Santa Cruz Strength Staff Portal', html,
                                         from_override=SECURITY_FROM)
    return {
        'id': invite_doc['id'],
        'token': token,
        'invite_url': invite_url,
        'email_sent': email_sent,
        'expires_at': invite_doc['expires_at']
    }

@api_router.get('/staff/invites')
async def list_invites(user=Depends(require_admin)):
    invites = await db.invites.find({'used': False}, {'_id': 0}).sort('created_at', -1).to_list(100)
    return invites

@api_router.delete('/staff/invites/{invite_id}')
async def revoke_invite(invite_id: str, user=Depends(require_admin)):
    result = await db.invites.delete_one({'id': invite_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Invite not found')
    return {'message': 'Invite revoked'}

# --------------- Public Lead Route ---------------

def _public_lead_response(request: Request, lead_id: str, request_id: Optional[str], duplicate: bool):
    if request.url.path.endswith('/v1/leads'):
        return {
            'status': 'accepted',
            'lead_id': lead_id,
            'id': lead_id,
            'request_id': request_id,
            'duplicate': duplicate,
            'next_step': 'team_follow_up',
        }
    return {'id': lead_id, 'status': 'updated' if duplicate else 'created'}


@api_router.post('/v1/leads')
@api_router.post('/leads')
async def create_lead_public(lead: LeadCreate, request: Request):
    _enforce_public_lead_request(request)
    if not lead.first_name.strip():
        raise HTTPException(status_code=422, detail='first_name cannot be blank')
    if not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', lead.email.strip()):
        raise HTTPException(status_code=422, detail='email must be valid')
    idempotency_key = request.headers.get('Idempotency-Key')
    if idempotency_key and lead.request_id and idempotency_key != lead.request_id:
        raise HTTPException(status_code=400, detail='Idempotency-Key must match request_id')
    request_id = lead.request_id or idempotency_key
    if not request_id:
        raise HTTPException(status_code=422, detail='request_id or Idempotency-Key is required')
    if request_id:
        try:
            uuid.UUID(request_id)
        except ValueError:
            raise HTTPException(status_code=422, detail='request_id must be a valid UUID')
        existing_request = await db.leads.find_one(
            {'$or': [{'request_id': request_id}, {'request_ids': request_id}]},
            {
                'id': 1,
                'brand_id': 1,
                'location_id': 1,
                'sms_operational_opt_in': 1,
                'sms_opted_out': 1,
                '_id': 0,
            },
        )
        if existing_request:
            await enqueue_lead_received_jobs(
                db.lead_outbox, existing_request, request_id, now_utc()
            )
            return _public_lead_response(request, existing_request['id'], request_id, True)

    if request.url.path.endswith('/v1/leads'):
        if lead.schema_version != '1.0.0':
            raise HTTPException(status_code=422, detail='Unsupported form schema version')
        if lead.brand_id != 'santa_cruz_strength' or lead.location_id != 'santa_cruz_ca':
            raise HTTPException(status_code=422, detail='Brand or location does not match this lead endpoint')

    existing = await db.leads.find_one({'email': lead.email.lower().strip(), 'location': lead.location})
    lead_id = str(uuid.uuid4())
    now = now_utc()
    attribution = lead.attribution.model_dump(exclude_none=True) if lead.attribution else {}
    consent = lead.consent if isinstance(lead.consent, dict) else {}
    sms_consent = bool(consent.get('sms_operational_opt_in') or lead.sms_consent)
    doc = {
        'id': lead_id,
        'first_name': lead.first_name.strip(),
        'last_name': lead.last_name.strip(),
        'email': lead.email.lower().strip(),
        'phone': normalize_phone(lead.phone.strip()),
        'location': lead.location,
        'interest_type': lead.interest_type,
        'training_goals': lead.training_goals or '',
        'start_timeline': lead.start_timeline or 'Just exploring',
        'preferred_contact': lead.preferred_contact or 'call',
        'lead_source': lead.lead_source or 'website_form',
        'notes': lead.notes or '',
        'tags': lead.tags or [],
        'schema_version': lead.schema_version or 'legacy',
        'request_id': request_id,
        'request_ids': [request_id],
        # Recorded, not rejected. The legacy route accepts a lead with no
        # schema, brand, location, form, offer or consent, and defaults them
        # silently, so an incomplete lead is indistinguishable from a complete
        # one once stored. Nothing in this application posts here any more, both
        # public forms use /v1/leads, but an unknown external caller might, and
        # answering it with 422 would lose a real lead to enforce a contract it
        # never agreed to. Losing a lead is the one failure this site cannot
        # take.
        #
        # So the gap is made visible instead: the lead is stored, and staff and
        # any future CRM sync can see it arrived without a contract rather than
        # discovering it at the point of a terminal provider failure. GymMaster
        # hard requires a surname, so this is the field that turns an accepted
        # lead into an undeliverable one later.
        'contract_complete': bool(
            lead.schema_version and lead.brand_id and lead.location_id
            and lead.form_id and lead.offer_id and lead.consent
        ),
        'contract_missing_fields': [
            name for name, value in (
                ('schema_version', lead.schema_version), ('brand_id', lead.brand_id),
                ('location_id', lead.location_id), ('form_id', lead.form_id),
                ('offer_id', lead.offer_id), ('consent', lead.consent),
                ('last_name', lead.last_name.strip() if lead.last_name else ''),
            ) if not value
        ],
        'brand_id': lead.brand_id or 'santa_cruz_strength',
        'location_id': lead.location_id or 'santa_cruz_ca',
        'form_id': lead.form_id or 'legacy_website_form',
        'offer_id': lead.offer_id or 'membership_inquiry',
        'privacy_notice_version': consent.get('privacy_notice_version'),
        'privacy_notice_accepted_at': now.isoformat() if consent.get('privacy_notice_version') else None,
        'email_operational_opt_in': bool(consent.get('email_operational_opt_in', False)),
        'email_marketing_opt_in': bool(consent.get('email_marketing_opt_in', False)),
        'sms_consent': sms_consent,
        'sms_operational_opt_in': sms_consent,
        'sms_marketing_opt_in': bool(consent.get('sms_marketing_opt_in', False)),
        'sms_consent_text_version': consent.get('sms_consent_text_version') if sms_consent else None,
        'sms_consent_date': now.isoformat() if sms_consent else None,
        'sms_consent_source_url': (attribution.get('last_touch') or {}).get('landing_page') if sms_consent else None,
        'sms_opted_out': False if sms_consent else None,
        'attribution': attribution,
        'status': 'New',
        'primary_lead_owner': 'Teresa',
        'lead_routing_brand': 'santa_cruz_strength',
        'next_follow_up_date': None,
        'next_follow_up_time': None,
        'last_contact_date': None,
        **new_lead_lifecycle_fields(now),
        'activity_log': [{'action': 'Lead Created', 'note': f'Submitted via {lead.lead_source or "website_form"}', 'staff_id': None, 'staff_name': 'System', 'timestamp': now.isoformat()}],
        'created_at': now.isoformat(),
        'updated_at': now.isoformat()
    }
    if existing:
        update_fields = {
            'phone': doc['phone'],
            'interest_type': doc['interest_type'],
            'training_goals': doc['training_goals'],
            'preferred_contact': doc['preferred_contact'],
            'request_id': request_id,
            'form_id': doc['form_id'],
            'offer_id': doc['offer_id'],
            'updated_at': now.isoformat(),
        }
        if attribution:
            existing_attribution = existing.get('attribution') or {}
            update_fields['attribution'] = {
                'first_touch': existing_attribution.get('first_touch') or attribution.get('first_touch'),
                'last_touch': attribution.get('last_touch') or existing_attribution.get('last_touch'),
            }
        update_fields.update(reinquiry_sms_updates(
            existing,
            requested_sms_consent=sms_consent,
            marketing_opt_in=doc['sms_marketing_opt_in'],
            consent_text_version=doc['sms_consent_text_version'],
            consent_date=now.isoformat(),
            consent_source_url=doc['sms_consent_source_url'],
        ))
        if consent:
            update_fields['privacy_notice_version'] = doc['privacy_notice_version']
            update_fields['privacy_notice_accepted_at'] = doc['privacy_notice_accepted_at']
            update_fields['email_operational_opt_in'] = doc['email_operational_opt_in']
            update_fields['email_marketing_opt_in'] = doc['email_marketing_opt_in']
        try:
            await db.leads.update_one(
                {'email': lead.email.lower().strip(), 'location': lead.location},
                {'$set': update_fields,
                 '$addToSet': {'request_ids': request_id},
                 '$push': {'activity_log': {'action': 'Re-inquiry', 'note': f'Re-submitted via {lead.lead_source}', 'staff_id': None, 'staff_name': 'System', 'timestamp': now.isoformat()}}}
            )
        except DuplicateKeyError:
            prior = await db.leads.find_one(
                {'$or': [{'request_id': request_id}, {'request_ids': request_id}]},
                {
                    'id': 1,
                    'brand_id': 1,
                    'location_id': 1,
                    'sms_operational_opt_in': 1,
                    'sms_opted_out': 1,
                    '_id': 0,
                },
            )
            if prior:
                await enqueue_lead_received_jobs(db.lead_outbox, prior, request_id, now_utc())
                return _public_lead_response(request, prior['id'], request_id, True)
            raise
        outbox_lead = await db.leads.find_one(
            {'id': existing['id']},
            {
                'id': 1,
                'brand_id': 1,
                'location_id': 1,
                'sms_operational_opt_in': 1,
                'sms_opted_out': 1,
                '_id': 0,
            },
        )
        if not outbox_lead:
            raise HTTPException(status_code=500, detail='Lead persistence could not be confirmed')
        await enqueue_lead_received_jobs(db.lead_outbox, outbox_lead, request_id, now)
        return _public_lead_response(request, existing['id'], request_id, True)
    try:
        await db.leads.insert_one(doc)
    except DuplicateKeyError:
        existing_request = await db.leads.find_one(
            {'$or': [{'request_id': request_id}, {'request_ids': request_id}]},
            {
                'id': 1,
                'brand_id': 1,
                'location_id': 1,
                'sms_operational_opt_in': 1,
                'sms_opted_out': 1,
                '_id': 0,
            },
        )
        if not existing_request:
            # The collision was on the identity index, not the request id: the
            # same person enquired twice with different request ids and the
            # other request won the insert. Adopt the winner and record this
            # request id against it, so a retry of THIS request is recognised
            # too. Without this branch the new unique index would turn a
            # duplicate enquiry into a 500 and lose the lead outright, which is
            # worse than the duplicate it exists to prevent.
            await db.leads.update_one(
                {'email': doc['email'], 'location': doc['location']},
                {'$addToSet': {'request_ids': request_id}},
            )
            existing_request = await db.leads.find_one(
                {'email': doc['email'], 'location': doc['location']},
                {
                    'id': 1,
                    'brand_id': 1,
                    'location_id': 1,
                    'sms_operational_opt_in': 1,
                    'sms_opted_out': 1,
                    '_id': 0,
                },
            )
        if existing_request:
            await enqueue_lead_received_jobs(
                db.lead_outbox, existing_request, request_id, now_utc()
            )
            return _public_lead_response(request, existing_request['id'], request_id, True)
        raise
    await enqueue_lead_received_jobs(db.lead_outbox, doc, request_id, now)
    return _public_lead_response(request, lead_id, request_id, False)

# --------------- Staff Lead Routes ---------------

import re

@api_router.get('/staff/leads')
async def list_leads(
    search: Optional[str] = None,
    status: Optional[str] = None,
    lead_source: Optional[str] = None,
    location: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    priority_first: bool = False,   # sort website/walk-in leads before csv
    limit: int = Query(200, le=500),
    skip: int = 0,
    user=Depends(require_staff)
):
    query = {}
    if search:
        pattern = re.compile(search, re.IGNORECASE)
        query['$or'] = [{'first_name': pattern}, {'last_name': pattern}, {'email': pattern}, {'phone': pattern}]
    if status: query['status'] = status
    if lead_source: query['lead_source'] = lead_source
    if location: query['location'] = location
    if date_from or date_to:
        query['created_at'] = {}
        if date_from: query['created_at']['$gte'] = date_from
        if date_to: query['created_at']['$lte'] = date_to + 'T23:59:59Z'
    total = await db.leads.count_documents(query)

    # Priority sort: website/walk-in leads first, then by date descending
    PRIORITY_SOURCES = ['website_form', 'book_a_tour', 'contact_page', 'personal_training_inquiry', 'walk_in']
    if priority_first:
        # Add a priority field dynamically via aggregation
        pipeline = [
            {'$match': query},
            {'$addFields': {
                '_priority': {'$cond': [{'$in': ['$lead_source', PRIORITY_SOURCES]}, 0, 1]}
            }},
            {'$sort': {'_priority': 1, 'created_at': -1}},
            {'$skip': skip},
            {'$limit': limit},
            {'$project': {'_id': 0, '_priority': 0}},
        ]
        leads = await db.leads.aggregate(pipeline).to_list(limit)
    else:
        leads = await db.leads.find(query, {'_id': 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)

    return {'leads': leads, 'total': total, 'skip': skip, 'limit': limit}

@api_router.post('/staff/leads')
async def create_lead_manual(lead: LeadCreate, user=Depends(require_staff)):
    lead_id = str(uuid.uuid4())
    now = now_utc()
    doc = {
        'id': lead_id,
        'first_name': lead.first_name.strip(),
        'last_name': lead.last_name.strip(),
        'email': lead.email.lower().strip(),
        'phone': normalize_phone(lead.phone.strip()),
        'location': lead.location,
        'interest_type': lead.interest_type,
        'training_goals': lead.training_goals or '',
        'start_timeline': lead.start_timeline or 'Just exploring',
        'preferred_contact': lead.preferred_contact or 'call',
        'lead_source': 'manual_entry',
        'notes': lead.notes or '',
        'tags': lead.tags or [],
        'status': 'New',
        'next_follow_up_date': None,
        'next_follow_up_time': None,
        'last_contact_date': None,
        'activity_log': [{'action': 'Lead Created', 'note': f'Manually added by {user["name"]}', 'staff_id': user['id'], 'staff_name': user['name'], 'timestamp': now.isoformat()}],
        'created_at': now.isoformat(),
        'updated_at': now.isoformat()
    }
    await db.leads.insert_one(doc)
    return {'id': lead_id, 'status': 'created'}

# CSV Template - includes member fields
@api_router.get('/staff/leads/template/csv')
async def download_csv_template(user=Depends(require_staff)):
    fieldnames = [
        'first_name', 'last_name', 'date_of_birth', 'email', 'phone',
        'address', 'city', 'state', 'zip_code',
        'interest_type', 'training_goals', 'start_timeline',
        'preferred_contact', 'notes', 'lead_source', 'how_did_you_hear_about_us'
    ]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    writer.writerow({
        'first_name': 'Alex', 'last_name': 'Smith',
        'date_of_birth': '1990-04-15',
        'email': 'alex@example.com', 'phone': '(831) 555-0100',
        'address': '123 Pacific Ave', 'city': 'Santa Cruz',
        'state': 'CA', 'zip_code': '95060',
        'interest_type': 'General Membership',
        'training_goals': 'Build strength',
        'start_timeline': 'ASAP',
        'preferred_contact': 'call',
        'notes': 'Previous member',
        'lead_source': 'csv_import',
        'how_did_you_hear_about_us': 'Friend'
    })
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename=scs-leads-template.csv'}
    )

# CSV Export - includes member fields
@api_router.get('/staff/leads/export/csv')
async def export_leads_csv(status: Optional[str] = None, location: Optional[str] = None, user=Depends(require_staff)):
    query = {}
    if status: query['status'] = status
    if location: query['location'] = location
    # No cap. This used to stop at 5000 with no total and no paging, so the
    # owner would have received a file that looked complete and silently ended.
    # The existing export already runs to 2469 rows, so half the old ceiling was
    # spent before anyone would have noticed. An export that drops records is
    # worse than an export that is slow.
    leads = await db.leads.find(query, {'_id': 0}).sort('created_at', -1).to_list(None)
    fieldnames = [
        'first_name', 'last_name', 'date_of_birth', 'email', 'phone',
        'address', 'city', 'state', 'zip_code',
        'status', 'interest_type', 'lead_source', 'how_did_you_hear_about_us',
        'training_goals', 'start_timeline', 'preferred_contact', 'location',
        'notes', 'created_at', 'last_contact_date', 'next_follow_up_date', 'next_follow_up_time',
        'first_utm_source', 'first_utm_medium', 'first_utm_campaign', 'first_landing_page',
        'last_utm_source', 'last_utm_medium', 'last_utm_campaign', 'last_landing_page'
    ]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for lead in leads:
        row = {f: lead.get(f, '') or '' for f in fieldnames}
        attribution = lead.get('attribution') or {}
        first_touch = attribution.get('first_touch') or {}
        last_touch = attribution.get('last_touch') or {}
        row.update({
            'first_utm_source': first_touch.get('utm_source', ''),
            'first_utm_medium': first_touch.get('utm_medium', ''),
            'first_utm_campaign': first_touch.get('utm_campaign', ''),
            'first_landing_page': first_touch.get('landing_page', ''),
            'last_utm_source': last_touch.get('utm_source', ''),
            'last_utm_medium': last_touch.get('utm_medium', ''),
            'last_utm_campaign': last_touch.get('utm_campaign', ''),
            'last_landing_page': last_touch.get('landing_page', ''),
        })
        writer.writerow(row)
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type='text/csv', headers={'Content-Disposition': 'attachment; filename=scs-leads.csv'})

# CSV Import - handles both member format and lead format
@api_router.post('/staff/leads/import/csv')
async def import_leads_csv(file: UploadFile = File(...), user=Depends(require_staff)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail='File must be a CSV')
    content = await file.read()
    try:
        text = content.decode('utf-8-sig')
    except UnicodeDecodeError:
        text = content.decode('latin-1')
    reader = csv.DictReader(io.StringIO(text))
    rows = list(reader)
    if not rows:
        raise HTTPException(status_code=400, detail='CSV is empty')
    headers = set(reader.fieldnames or [])
    # Must have at least phone/email to be useful
    if not (('email' in headers) or ('phone' in headers) or ('phone_number' in headers)):
        raise HTTPException(status_code=400, detail='CSV must have at minimum an email or phone column')
    now = now_utc()
    imported = 0
    skipped = 0
    errors = []
    docs_to_insert = []

    # Pre-fetch existing emails in bulk (much faster than per-row DB lookup)
    all_emails = [
        (row.get('email') or '').strip().lower()
        for row in rows if (row.get('email') or '').strip()
    ]
    existing_emails = set()
    if all_emails:
        cursor = db.leads.find({'email': {'$in': all_emails}, 'location': 'santa_cruz'}, {'email': 1, '_id': 0})
        existing_emails = {d['email'] async for d in cursor}

    for i, row in enumerate(rows, 1):
        full_name = (row.get('name') or '').strip()
        if full_name and not row.get('first_name'):
            parts = full_name.split(' ', 1)
            fn = parts[0]
            ln = parts[1] if len(parts) > 1 else ''
        else:
            fn = (row.get('first_name') or '').strip()
            ln = (row.get('last_name') or '').strip()
        phone = normalize_phone((row.get('phone') or row.get('phone_number') or '').strip())
        email = (row.get('email') or '').strip().lower()
        if not fn or (not email and not phone):
            errors.append(f'Row {i}: missing name and contact info (need at least email or phone) - skipped')
            skipped += 1
            continue
        if email and email in existing_emails:
            skipped += 1
            continue
        address_parts = [row.get('address', ''), row.get('city', ''), row.get('state', ''), row.get('zip_code', '')]
        address_str = ', '.join(p.strip() for p in address_parts if p and p.strip())
        base_notes = (row.get('notes') or '').strip()
        combined_notes = f'{base_notes}\nAddress: {address_str}'.strip() if address_str else base_notes
        how_heard = (row.get('how_did_you_hear_about_us') or '').strip()
        lead_source = (row.get('lead_source') or 'csv_import').strip()
        if how_heard and how_heard.lower() not in ('', 'n/a', 'unknown'):
            combined_notes = f'{combined_notes}\nHow heard: {how_heard}'.strip()
        doc = {
            'id': str(uuid.uuid4()),
            'first_name': fn, 'last_name': ln, 'email': email, 'phone': phone,
            'location': 'santa_cruz',
            'date_of_birth': (row.get('date_of_birth') or row.get('date_of_birht') or '').strip(),
            'address': (row.get('address') or '').strip(),
            'city': (row.get('city') or '').strip(),
            'state': (row.get('state') or '').strip(),
            'zip_code': (row.get('zip_code') or '').strip(),
            'how_did_you_hear_about_us': how_heard,
            'interest_type': (row.get('interest_type') or 'General Membership').strip(),
            'training_goals': (row.get('training_goals') or '').strip(),
            'start_timeline': (row.get('start_timeline') or 'Just exploring').strip(),
            'preferred_contact': (row.get('preferred_contact') or 'call').strip(),
            'lead_source': lead_source,
            'notes': combined_notes,
            'tags': ['imported'],
            'status': 'New',
            'blacklisted': False,
            'next_follow_up_date': None, 'next_follow_up_time': None, 'last_contact_date': None,
            'activity_log': [{'action': 'Lead Imported', 'note': f'Imported via CSV by {user["name"]}',
                              'staff_id': user['id'], 'staff_name': user['name'], 'timestamp': now.isoformat()}],
            'created_at': now.isoformat(), 'updated_at': now.isoformat(),
        }
        docs_to_insert.append(doc)
        if email:
            existing_emails.add(email)  # prevent dupes within the same CSV

    # Bulk insert - handles 2000+ rows efficiently
    if docs_to_insert:
        try:
            result = await db.leads.insert_many(docs_to_insert, ordered=False)
            imported = len(result.inserted_ids)
        except Exception as bulk_err:
            imported = getattr(getattr(bulk_err, 'details', {}), 'get', lambda *a: len(docs_to_insert))('nInserted', len(docs_to_insert))

    return {'imported': imported, 'skipped': skipped, 'errors': errors[:20], 'total_rows': len(rows)}

@api_router.get('/staff/leads/{lead_id}')
async def get_lead(lead_id: str, user=Depends(require_staff)):
    lead = await db.leads.find_one({'id': lead_id}, {'_id': 0})
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    return lead

@api_router.post('/staff/leads/{lead_id}/lifecycle')
async def transition_lead_lifecycle(
    lead_id: str,
    data: LeadLifecycleTransitionCreate,
    user=Depends(require_staff),
):
    try:
        uuid.UUID(data.event_id)
    except ValueError:
        raise HTTPException(status_code=422, detail='event_id must be a valid UUID')

    lead = await db.leads.find_one({'id': lead_id}, {'_id': 0})
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')

    stored_event = await db.lead_lifecycle_events.find_one(
        {'event_id': data.event_id}, {'_id': 0}
    )
    if stored_event:
        if stored_event.get('lead_id') != lead_id or stored_event.get('to_state') != data.state:
            raise HTTPException(status_code=409, detail='event_id is already used for another transition')
        event = stored_event
        duplicate = True
    else:
        try:
            event = lifecycle_event(
                event_id=data.event_id,
                lead_id=lead_id,
                current_state=lead.get('lifecycle_state') or 'new',
                target_state=data.state,
                actor_id=user['id'],
                actor_name=user['name'],
                reason=data.reason or '',
            )
        except (ValueError, InvalidLifecycleTransition) as error:
            raise HTTPException(status_code=409, detail=str(error))
        try:
            await db.lead_lifecycle_events.insert_one(event)
            duplicate = False
        except DuplicateKeyError:
            stored_event = await db.lead_lifecycle_events.find_one(
                {'event_id': data.event_id}, {'_id': 0}
            )
            if not stored_event or stored_event.get('lead_id') != lead_id or stored_event.get('to_state') != data.state:
                raise HTTPException(status_code=409, detail='event_id is already used for another transition')
            event = stored_event
            duplicate = True

    if event.get('changed'):
        result = await db.leads.update_one(
            {'id': lead_id, 'lifecycle_event_ids': {'$ne': data.event_id}},
            {
                '$set': {
                    'lifecycle_state': event['to_state'],
                    'lifecycle_state_changed_at': event['occurred_at'],
                    'updated_at': event['occurred_at'],
                },
                '$addToSet': {'lifecycle_event_ids': data.event_id},
                '$push': {'activity_log': {
                    'action': 'Lifecycle Transition',
                    'note': f"{event['from_state']} to {event['to_state']}",
                    'staff_id': user['id'],
                    'staff_name': user['name'],
                    'timestamp': event['occurred_at'],
                }},
            },
        )
        duplicate = duplicate or result.modified_count == 0

    updated = await db.leads.find_one({'id': lead_id}, {'_id': 0})
    return {
        'lead_id': lead_id,
        'lifecycle_state': updated.get('lifecycle_state') or 'new',
        'event_id': data.event_id,
        'duplicate': duplicate,
    }

@api_router.post('/staff/leads/{lead_id}/contact-events')
async def record_human_contact(
    lead_id: str,
    data: HumanContactEventCreate,
    user=Depends(require_staff),
):
    try:
        uuid.UUID(data.event_id)
    except ValueError:
        raise HTTPException(status_code=422, detail='event_id must be a valid UUID')

    lead = await db.leads.find_one({'id': lead_id}, {'_id': 0})
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')

    stored_event = await db.lead_contact_events.find_one(
        {'event_id': data.event_id}, {'_id': 0}
    )
    if stored_event:
        if stored_event.get('lead_id') != lead_id:
            raise HTTPException(status_code=409, detail='event_id is already used for another lead')
        event = stored_event
        duplicate = True
    else:
        try:
            event = human_contact_event(
                event_id=data.event_id,
                lead_id=lead_id,
                current_state=lead.get('human_contact_state') or 'not_attempted',
                channel=data.channel,
                outcome=data.outcome,
                actor_id=user['id'],
                actor_name=user['name'],
                note=data.note or '',
            )
        except ValueError as error:
            raise HTTPException(status_code=422, detail=str(error))
        try:
            await db.lead_contact_events.insert_one(event)
            duplicate = False
        except DuplicateKeyError:
            stored_event = await db.lead_contact_events.find_one(
                {'event_id': data.event_id}, {'_id': 0}
            )
            if not stored_event or stored_event.get('lead_id') != lead_id:
                raise HTTPException(status_code=409, detail='event_id is already used for another lead')
            event = stored_event
            duplicate = True

    contact_fields = {
        'human_contact_state': event['to_state'],
        'last_contact_attempt_at': event['occurred_at'],
        'updated_at': event['occurred_at'],
    }
    if event.get('reached'):
        contact_fields['last_human_contact_at'] = event['occurred_at']
        contact_fields['last_contact_date'] = event['occurred_at']
    result = await db.leads.update_one(
        {'id': lead_id, 'human_contact_event_ids': {'$ne': data.event_id}},
        {
            '$set': contact_fields,
            '$addToSet': {'human_contact_event_ids': data.event_id},
            '$inc': {'human_contact_event_count': 1},
            '$push': {'activity_log': {
                'action': 'Human Contact Recorded',
                'note': f"{event['channel']} contact: {event['outcome']}",
                'staff_id': user['id'],
                'staff_name': user['name'],
                'timestamp': event['occurred_at'],
            }},
        },
    )
    duplicate = duplicate or result.modified_count == 0
    updated = await db.leads.find_one({'id': lead_id}, {'_id': 0})
    return {
        'lead_id': lead_id,
        'human_contact_state': updated.get('human_contact_state') or 'not_attempted',
        'event_id': data.event_id,
        'duplicate': duplicate,
    }

@api_router.put('/staff/leads/{lead_id}')
async def update_lead(lead_id: str, data: LeadUpdate, user=Depends(require_staff)):
    lead = await db.leads.find_one({'id': lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    now = now_utc()
    update = {'updated_at': now.isoformat()}
    log_entries = []
    if data.status and data.status != lead.get('status'):
        old_status = lead.get('status', 'Unknown')
        update['status'] = data.status
        log_entries.append({'action': 'Status Changed', 'note': f'{old_status} → {data.status}', 'staff_id': user['id'], 'staff_name': user['name'], 'timestamp': now.isoformat()})
    if data.notes is not None: update['notes'] = data.notes
    if data.next_follow_up_date is not None:
        update['next_follow_up_date'] = data.next_follow_up_date
        time_str = data.next_follow_up_time or ''
        update['next_follow_up_time'] = time_str
        display = f"{data.next_follow_up_date}{' at ' + time_str if time_str else ''}"
        log_entries.append({'action': 'Follow-up Scheduled', 'note': f'Set for {display}', 'staff_id': user['id'], 'staff_name': user['name'], 'timestamp': now.isoformat()})
    elif data.next_follow_up_time is not None:
        update['next_follow_up_time'] = data.next_follow_up_time
    if data.last_contact_date is not None: update['last_contact_date'] = data.last_contact_date
    if data.tags is not None: update['tags'] = data.tags
    if data.interest_type is not None: update['interest_type'] = data.interest_type
    if data.training_goals is not None: update['training_goals'] = data.training_goals
    if data.preferred_contact is not None: update['preferred_contact'] = data.preferred_contact
    set_op = {'$set': update}
    if log_entries: set_op['$push'] = {'activity_log': {'$each': log_entries}}
    await db.leads.update_one({'id': lead_id}, set_op)
    updated = await db.leads.find_one({'id': lead_id}, {'_id': 0})
    # Fire status-change SMS + schedule review request for milestone statuses
    if data.status and data.status != lead.get('status'):
        asyncio.ensure_future(send_status_change_sms(updated, data.status))
        if data.status == 'Joined':
            # Schedule review request for 3 days from now
            review_send_at = (now_utc() + timedelta(days=3)).isoformat()
            await db.leads.update_one(
                {'id': lead_id},
                {'$set': {'review_send_at': review_send_at, 'review_sent': False}}
            )
            logger.info(f'[REVIEW] Scheduled for {updated.get("first_name","")} at {review_send_at}')
    return updated

@api_router.post('/staff/leads/{lead_id}/notes')
async def add_note(lead_id: str, data: NoteCreate, user=Depends(require_staff)):
    lead = await db.leads.find_one({'id': lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    now = now_utc()
    entry = {'action': 'Note Added', 'note': data.note, 'staff_id': user['id'], 'staff_name': user['name'], 'timestamp': now.isoformat()}
    await db.leads.update_one({'id': lead_id}, {'$push': {'activity_log': entry}, '$set': {'updated_at': now.isoformat()}})
    return {'message': 'Note added', 'entry': entry}

@api_router.delete('/staff/leads/{lead_id}')
async def delete_lead(lead_id: str, user=Depends(require_admin)):
    """Admin/owner only - staff cannot delete"""
    result = await db.leads.delete_one({'id': lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Lead not found')
    return {'message': 'Lead deleted'}

@api_router.get('/staff/outbox/failures')
async def list_outbox_terminal_failures(
    limit: int = Query(default=100, ge=1, le=500),
    user=Depends(require_staff),
):
    failures = await db.lead_outbox.find(
        {'status': 'terminal_failed'},
        {
            '_id': 0,
            'id': 1,
            'lead_id': 1,
            'event_type': 1,
            'channel': 1,
            'attempt_count': 1,
            'total_attempt_count': 1,
            'max_attempts': 1,
            'last_error_code': 1,
            'last_error_message': 1,
            'last_failed_at': 1,
            'terminal_failure_at': 1,
            'delivery_state': 1,
            'delivery_begun_at': 1,
            'replay_count': 1,
            'created_at': 1,
            'updated_at': 1,
        },
    ).sort('terminal_failure_at', -1).to_list(limit)
    return {'count': len(failures), 'failures': failures}

@api_router.post('/staff/outbox/{job_id}/replay')
async def replay_outbox_terminal_failure(
    job_id: str,
    data: OutboxReplayCreate,
    user=Depends(require_admin),
):
    try:
        job = await replay_terminal_failure(
            db.lead_outbox,
            job_id=job_id,
            actor_id=user['id'],
            reason=data.reason,
            confirmed_not_sent=data.confirmed_not_sent,
            now=now_utc(),
        )
    except QuarantinedReplayRefused as exc:
        raise HTTPException(status_code=409, detail=str(exc))
    if not job:
        raise HTTPException(status_code=404, detail='Terminal outbox failure not found')
    return {
        'id': job['id'],
        'status': job['status'],
        'replay_count': job.get('replay_count', 0),
        'available_at': job.get('available_at'),
    }

# --------------- Stats ---------------

@api_router.get('/staff/stats')
async def get_stats(user=Depends(require_staff)):
    pipeline = [{'$group': {'_id': '$status', 'count': {'$sum': 1}}}]
    status_counts = {item['_id']: item['count'] for item in await db.leads.aggregate(pipeline).to_list(100)}
    total = await db.leads.count_documents({})
    seven_days_ago = (now_utc() - timedelta(days=7)).isoformat()
    new_7d = await db.leads.count_documents({'created_at': {'$gte': seven_days_ago}})
    today_start = now_utc().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today = await db.leads.count_documents({'created_at': {'$gte': today_start}})
    source_pipeline = [{'$group': {'_id': '$lead_source', 'count': {'$sum': 1}}}]
    sources = {item['_id']: item['count'] for item in await db.leads.aggregate(source_pipeline).to_list(100)}
    return {'total': total, 'new_7d': new_7d, 'today': today, 'by_status': status_counts, 'by_source': sources}

@api_router.get('/staff/mobile/dashboard')
async def mobile_dashboard(user=Depends(require_staff)):
    """Single endpoint for the mobile portal - stats + today's follow-ups + recent new leads."""
    import re as _re
    today = now_utc().date().isoformat()          # e.g. "2026-03-14"
    today_start = now_utc().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()

    # Stats
    total = await db.leads.count_documents({})
    new_today = await db.leads.count_documents({'created_at': {'$gte': today_start}})
    follow_up_today = await db.leads.count_documents({
        'next_follow_up_date': today,
        'status': {'$nin': ['Joined', 'Lost', 'No Response']},
    })
    joined_month_start = now_utc().replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    joined_month = await db.leads.count_documents({'status': 'Joined', 'updated_at': {'$gte': joined_month_start}})

    # Today's follow-ups (full lead data)
    follow_ups = await db.leads.find(
        {'next_follow_up_date': today, 'status': {'$nin': ['Joined', 'Lost', 'No Response']}},
        {'_id': 0, 'id': 1, 'first_name': 1, 'last_name': 1, 'phone': 1, 'email': 1,
         'status': 1, 'interest_type': 1, 'next_follow_up_date': 1, 'next_follow_up_time': 1,
         'notes': 1, 'created_at': 1}
    ).sort('next_follow_up_time', 1).to_list(100)

    # Overdue follow-ups (past dates, not completed)
    overdue = await db.leads.find(
        {'next_follow_up_date': {'$lt': today, '$exists': True, '$ne': None, '$ne': ''},
         'status': {'$nin': ['Joined', 'Lost', 'No Response']}},
        {'_id': 0, 'id': 1, 'first_name': 1, 'last_name': 1, 'phone': 1, 'email': 1,
         'status': 1, 'interest_type': 1, 'next_follow_up_date': 1, 'notes': 1}
    ).sort('next_follow_up_date', -1).limit(20).to_list(20)

    # Recent new leads (last 48h)
    two_days_ago = (now_utc() - timedelta(hours=48)).isoformat()
    recent = await db.leads.find(
        {'created_at': {'$gte': two_days_ago}},
        {'_id': 0, 'id': 1, 'first_name': 1, 'last_name': 1, 'phone': 1, 'email': 1,
         'status': 1, 'interest_type': 1, 'created_at': 1, 'lead_source': 1}
    ).sort('created_at', -1).limit(20).to_list(20)

    return {
        'stats': {
            'new_today': new_today,
            'follow_up_today': follow_up_today,
            'joined_month': joined_month,
            'total': total,
        },
        'follow_ups': follow_ups,
        'overdue': overdue,
        'recent_leads': recent,
        'staff_name': user.get('name', ''),
    }

# --------------- Staff User Management ---------------

@api_router.get('/staff/users')
async def list_users(user=Depends(require_admin)):
    users = await db.users.find({}, {'_id': 0, 'password_hash': 0}).to_list(100)
    return users

@api_router.post('/staff/users')
async def create_user(data: UserCreate, user=Depends(require_admin)):
    if data.role in ('admin', 'owner') and user.get('role') != 'owner':
        raise HTTPException(status_code=403, detail='Only the owner can create admin accounts')
    existing = await db.users.find_one({'email': data.email.lower().strip()})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    user_id = str(uuid.uuid4())
    doc = {'id': user_id, 'email': data.email.lower().strip(), 'password_hash': hash_password(data.password), 'name': data.name, 'role': data.role, 'location': data.location, 'is_active': True, 'created_at': now_utc().isoformat()}
    await db.users.insert_one(doc)
    return {'id': user_id, 'email': doc['email'], 'name': doc['name'], 'role': doc['role']}

@api_router.put('/staff/users/{user_id}')
async def update_user(user_id: str, data: UserUpdate, user=Depends(require_admin)):
    target = await db.users.find_one({'id': user_id})
    if not target:
        raise HTTPException(status_code=404, detail='User not found')
    # Can't change owner role unless you are owner
    if data.role and target.get('role') == 'owner' and user.get('role') != 'owner':
        raise HTTPException(status_code=403, detail='Cannot modify the owner account')
    update = {'updated_at': now_utc().isoformat()}
    if data.name is not None: update['name'] = data.name
    if data.email is not None: update['email'] = data.email.lower().strip()
    if data.password is not None: update['password_hash'] = hash_password(data.password)
    if data.role is not None: update['role'] = data.role
    if data.is_active is not None: update['is_active'] = data.is_active
    await db.users.update_one({'id': user_id}, {'$set': update})
    # Auto-revoke all device tokens when deactivating a user
    if data.is_active is False:
        await db.device_tokens.delete_many({'email': target['email']})
        logger.info(f'[AUTH] Device tokens revoked for deactivated user {target["email"]}')
    updated = await db.users.find_one({'id': user_id}, {'_id': 0, 'password_hash': 0})
    return updated

@api_router.delete('/staff/users/{user_id}')
async def delete_user(user_id: str, user=Depends(require_admin)):
    if user_id == user['id']:
        raise HTTPException(status_code=400, detail='Cannot delete your own account')
    target = await db.users.find_one({'id': user_id})
    if not target:
        raise HTTPException(status_code=404, detail='User not found')
    if target.get('role') == 'owner':
        raise HTTPException(status_code=403, detail='Cannot delete the owner account')
    result = await db.users.delete_one({'id': user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='User not found')
    # Revoke all device tokens when deleting a user
    await db.device_tokens.delete_many({'email': target['email']})
    return {'message': 'User deleted'}

@api_router.post('/staff/users/{user_id}/revoke-devices')
async def revoke_user_devices(user_id: str, user=Depends(require_admin)):
    """Admin: revoke all remembered device tokens for a user (stolen device, security concern)."""
    target = await db.users.find_one({'id': user_id})
    if not target:
        raise HTTPException(status_code=404, detail='User not found')
    result = await db.device_tokens.delete_many({'email': target['email']})
    logger.info(f'[AUTH] Admin {user["email"]} revoked {result.deleted_count} device(s) for {target["email"]}')
    return {'message': f'Revoked {result.deleted_count} device token(s) for {target["email"]}', 'revoked': result.deleted_count}

# --------------- Staffed Hours Settings ---------------

DEFAULT_STAFFED_HOURS = {
    'monday':    {'enabled': True,  'open': '08:00', 'close': '19:00'},
    'tuesday':   {'enabled': True,  'open': '08:00', 'close': '19:00'},
    'wednesday': {'enabled': True,  'open': '08:00', 'close': '19:00'},
    'thursday':  {'enabled': True,  'open': '08:00', 'close': '19:00'},
    'friday':    {'enabled': True,  'open': '08:00', 'close': '19:00'},
    'saturday':  {'enabled': True,  'open': '09:00', 'close': '14:00'},
    'sunday':    {'enabled': False, 'open': '09:00', 'close': '14:00'},
}

@api_router.get('/staff/settings/staffed-hours')
async def get_staffed_hours(user=Depends(require_staff)):
    doc = await db.settings.find_one({'key': 'staffed_hours', 'location': 'santa_cruz'})
    if doc:
        return doc.get('value', DEFAULT_STAFFED_HOURS)
    return DEFAULT_STAFFED_HOURS

@api_router.put('/staff/settings/staffed-hours')
async def update_staffed_hours(hours: dict, user=Depends(require_owner)):
    await db.settings.update_one(
        {'key': 'staffed_hours', 'location': 'santa_cruz'},
        {'$set': {'key': 'staffed_hours', 'location': 'santa_cruz', 'value': hours, 'updated_at': now_utc().isoformat(), 'updated_by': user['name']}},
        upsert=True
    )
    return {'message': 'Staffed hours updated', 'hours': hours}

# --------------- SMS Settings Routes ---------------

@api_router.get('/staff/settings/sms-numbers')
async def get_sms_numbers(user=Depends(require_staff)):
    numbers = await get_sms_staff_numbers()
    return {'numbers': numbers}

@api_router.put('/staff/settings/sms-numbers')
async def update_sms_numbers(data: dict, user=Depends(require_owner)):
    numbers = data.get('numbers', [])
    # Validate E.164 format
    clean = [n.strip() for n in numbers if n and n.strip().startswith('+')]
    await db.sms_settings.replace_one(
        {'_id': 'staff_numbers'},
        {'_id': 'staff_numbers', 'numbers': clean},
        upsert=True,
    )
    return {'numbers': clean, 'message': 'SMS notification numbers updated'}

# --------------- Blog Models ---------------

class BlogPostCreate(BaseModel):
    title: str
    slug: Optional[str] = None
    excerpt: str
    content: str
    category: str = 'Training Tips'
    tags: Optional[List[str]] = []
    cover_image: Optional[str] = ''
    published: bool = False
    seo_title: Optional[str] = ''
    seo_description: Optional[str] = ''
    author: Optional[str] = ''

class BlogPostUpdate(BaseModel):
    title: Optional[str] = None
    slug: Optional[str] = None
    excerpt: Optional[str] = None
    content: Optional[str] = None
    category: Optional[str] = None
    tags: Optional[List[str]] = None
    cover_image: Optional[str] = None
    published: Optional[bool] = None
    seo_title: Optional[str] = None
    seo_description: Optional[str] = None
    author: Optional[str] = None

def slugify(text: str) -> str:
    import re
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_-]+', '-', text)
    text = re.sub(r'^-+|-+$', '', text)
    return text

# --------------- Blog Routes (Public) ---------------

@api_router.get('/blog')
async def list_blog_posts(
    category: Optional[str] = None,
    limit: int = Query(20, le=50),
    skip: int = 0
):
    query = {'published': True}
    if category: query['category'] = category
    total = await db.blog.count_documents(query)
    posts = await db.blog.find(query, {'_id': 0, 'content': 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    return {'posts': posts, 'total': total}

@api_router.get('/blog/post/{slug}')
async def get_blog_post(slug: str):
    post = await db.blog.find_one({'slug': slug, 'published': True}, {'_id': 0})
    if not post:
        raise HTTPException(status_code=404, detail='Post not found')
    return post

# --------------- Blog Routes (Staff) ---------------

@api_router.get('/staff/blog')
async def list_all_blog_posts(user=Depends(require_admin)):
    posts = await db.blog.find({}, {'_id': 0, 'content': 0}).sort('created_at', -1).to_list(200)
    return posts

@api_router.get('/staff/blog/{post_id}')
async def get_blog_post_staff(post_id: str, user=Depends(require_admin)):
    post = await db.blog.find_one({'id': post_id}, {'_id': 0})
    if not post:
        raise HTTPException(status_code=404, detail='Post not found')
    return post

@api_router.post('/staff/blog')
async def create_blog_post(data: BlogPostCreate, user=Depends(require_admin)):
    post_id = str(uuid.uuid4())
    now = now_utc()
    slug = data.slug or slugify(data.title)
    # Ensure unique slug
    existing = await db.blog.find_one({'slug': slug})
    if existing:
        slug = f'{slug}-{post_id[:6]}'
    doc = {
        'id': post_id,
        'title': data.title,
        'slug': slug,
        'excerpt': data.excerpt,
        'content': data.content,
        'category': data.category,
        'tags': data.tags or [],
        'cover_image': data.cover_image or '',
        'published': data.published,
        'seo_title': data.seo_title or data.title,
        'seo_description': data.seo_description or data.excerpt,
        'author': data.author or user['name'],
        'created_at': now.isoformat(),
        'updated_at': now.isoformat(),
    }
    await db.blog.insert_one(doc)
    return {k: v for k, v in doc.items() if k != 'content'}

@api_router.put('/staff/blog/{post_id}')
async def update_blog_post(post_id: str, data: BlogPostUpdate, user=Depends(require_admin)):
    post = await db.blog.find_one({'id': post_id})
    if not post:
        raise HTTPException(status_code=404, detail='Post not found')
    update = {'updated_at': now_utc().isoformat()}
    for field in ['title', 'slug', 'excerpt', 'content', 'category', 'tags', 'cover_image', 'published', 'seo_title', 'seo_description', 'author']:
        val = getattr(data, field)
        if val is not None:
            update[field] = val
    if 'title' in update and not data.slug:
        update['slug'] = slugify(update['title'])
    await db.blog.update_one({'id': post_id}, {'$set': update})
    updated = await db.blog.find_one({'id': post_id}, {'_id': 0})
    return updated

@api_router.delete('/staff/blog/{post_id}')
async def delete_blog_post(post_id: str, user=Depends(require_admin)):
    result = await db.blog.delete_one({'id': post_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Post not found')
    return {'message': 'Post deleted'}

# --------------- Blog Ideas (Google Trends + AI) ---------------

@api_router.post('/staff/blog/ideas')
async def generate_blog_ideas(user=Depends(require_admin), force: bool = False):
    """
    Returns cached blog ideas (instant). Background job keeps cache warm every 6 hours.
    Pass ?force=true to force an immediate background refresh (still returns current cache instantly).
    """
    # ── Always try to serve from cache first (instant response) ────────────────
    cached = await db.blog_ideas_cache.find_one({'_id': 'latest'})

    if force and cached:
        # Kick off background refresh, but return current cache immediately
        asyncio.create_task(_refresh_blog_ideas_background())
        return {
            'ideas': cached['ideas'],
            'trends_used': cached.get('trends_used', []),
            'cached': True,
            'refreshing': True,
            'generated_at': cached['generated_at'],
        }

    if cached:
        age_hours = (now_utc() - datetime.fromisoformat(
            cached['generated_at'].replace('Z', '+00:00')
        ).replace(tzinfo=timezone.utc)).total_seconds() / 3600
        logger.info(f'[BLOG IDEAS] Serving cache ({age_hours:.1f}h old)')
        # If stale (>6h), trigger background refresh but still return instantly
        if age_hours >= 6:
            asyncio.create_task(_refresh_blog_ideas_background())
        return {
            'ideas': cached['ideas'],
            'trends_used': cached.get('trends_used', []),
            'cached': True,
            'refreshing': age_hours >= 6,
            'generated_at': cached['generated_at'],
        }

    # ── No cache at all - must generate synchronously (first-ever call) ────────
    result = await _generate_blog_ideas_core()
    if result:
        return {**result, 'cached': False, 'refreshing': False}
    raise HTTPException(status_code=500, detail='Failed to generate ideas')


async def _refresh_blog_ideas_background():
    """Background task to refresh blog ideas without blocking the response."""
    try:
        await _generate_blog_ideas_core()
        logger.info('[BLOG IDEAS] Background refresh completed')
    except Exception as e:
        logger.warning(f'[BLOG IDEAS] Background refresh failed: {e}')


async def _generate_blog_ideas_core():
    """Core generation logic - fetches trends + calls LLM, saves to cache."""
    import json as _json

    # This function reaches two third parties: Google Trends, then an LLM. Both
    # happen before any flag was consulted, so possessing EMERGENT_LLM_KEY was
    # itself sufficient to send, which is the exact thing the flags exist to
    # prevent. Google Trends went out even with no key at all, because the
    # trend fetch preceded the key check.
    if not ALLOW_THIRD_PARTY_RESEARCH:
        logger.info(
            '[BLOG IDEAS] Skipped. Third party research is disabled, so no '
            'request was made to Google Trends or the model provider.'
        )
        return None

    # emergentintegrations is not on PyPI, so it is not a hard requirement and
    # any host outside Emergent's private index will not have it. Only this one
    # staff convenience feature needs it, so the absence degrades to a disabled
    # feature rather than an unbootable backend. Import failure used to raise
    # before the key check below, turning a missing optional package into a 500.
    try:
        from emergentintegrations.llm.chat import LlmChat, UserMessage
    except ImportError:
        logger.warning(
            '[BLOG IDEAS] emergentintegrations is not installed, so AI idea '
            'generation is unavailable. Everything else is unaffected.'
        )
        return None

    # ── Fetch Google Trends in a thread (non-blocking) ─────────────────────────
    trend_topics = await asyncio.to_thread(_fetch_google_trends)

    trends_str = ', '.join(trend_topics) if trend_topics else 'strength training, powerlifting, fitness'

    # ── LLM call ───────────────────────────────────────────────────────────────
    llm_key = os.environ.get('EMERGENT_LLM_KEY', '')
    if not llm_key:
        logger.error('[BLOG IDEAS] LLM key not configured')
        return None

    prompt = f"""Content strategist for Santa Cruz Strength gym (Santa Cruz, CA). Serves surfers, climbers, powerlifters, trail runners. Gritty, authentic, no fluff.

Trending searches right now: {trends_str}

Generate 6 blog ideas. Return ONLY a JSON array, no other text:
[{{"title":"...","keyword":"...","volume":"High|Medium|Low","category":"Local SEO|Outdoor Athletes|How-To|FAQ Content|Gym Culture|Trending","outline":["point1","point2","point3"],"trend_hook":"..."}}]"""

    try:
        chat = LlmChat(
            api_key=llm_key,
            session_id=f'blog-ideas-{uuid.uuid4()}',
            system_message='Return only valid JSON arrays, no markdown, no explanation.'
        ).with_model('openai', 'gpt-4o-mini')
        response = await asyncio.wait_for(chat.send_message(UserMessage(text=prompt)), timeout=30.0)
        raw = response.strip()
        if raw.startswith('```'):
            raw = raw.split('```')[1]
            if raw.startswith('json'):
                raw = raw[4:]
        ideas = _json.loads(raw)

        generated_at = now_utc().isoformat()
        await db.blog_ideas_cache.replace_one(
            {'_id': 'latest'},
            {'_id': 'latest', 'ideas': ideas, 'trends_used': trend_topics, 'generated_at': generated_at},
            upsert=True,
        )
        return {'ideas': ideas, 'trends_used': trend_topics, 'generated_at': generated_at}
    except Exception as e:
        logger.error(f'[BLOG IDEAS] LLM error: {e}')
        return None


def _fetch_google_trends():
    """Synchronous Google Trends fetch - runs in thread pool."""
    try:
        from pytrends.request import TrendReq
        pytrends = TrendReq(hl='en-US', tz=360, timeout=(3, 6))
        kw_list = ['strength training', 'powerlifting', 'gym workout']
        pytrends.build_payload(kw_list, cat=44, timeframe='now 7-d', geo='US-CA')
        related = pytrends.related_queries()
        topics = []
        for kw in kw_list:
            for bucket in ('rising', 'top'):
                df = related.get(kw, {}).get(bucket)
                if df is not None and not df.empty:
                    topics += df['query'].head(4).tolist()
        topics = list(dict.fromkeys(topics))[:15]
        logger.info(f'[BLOG IDEAS] Trends: {topics}')
        return topics
    except Exception as e:
        logger.warning(f'[BLOG IDEAS] pytrends failed: {e} - using fallback')
        return ['strength training beginners', 'powerlifting program',
                'gym for surfers', 'how to deadlift', 'strength training over 40']


async def run_blog_ideas_refresh():
    """Scheduled job - keeps blog ideas cache warm every 6 hours."""
    cached = await db.blog_ideas_cache.find_one({'_id': 'latest'})
    if cached:
        age_hours = (now_utc() - datetime.fromisoformat(
            cached['generated_at'].replace('Z', '+00:00')
        ).replace(tzinfo=timezone.utc)).total_seconds() / 3600
        if age_hours < 5.5:
            return  # Still fresh, skip
    logger.info('[BLOG IDEAS] Scheduled refresh starting...')
    await _generate_blog_ideas_core()

# --------------- Site Content (Editable Copy) ---------------

@api_router.get('/content')
async def get_public_content():
    """Public: get all site content as key-value map."""
    docs = await db.site_content.find({}, {'_id': 0}).to_list(200)
    return {d['key']: d['value'] for d in docs}


@api_router.get('/staff/content')
async def get_all_content(user=Depends(require_admin)):
    """Staff: get all content entries."""
    docs = await db.site_content.find({}, {'_id': 0}).to_list(200)
    return docs


@api_router.put('/staff/content/{key}')
async def update_content(key: str, request: Request, user=Depends(require_admin)):
    body = await request.json()
    value = body.get('value', '')
    result = await db.site_content.update_one(
        {'key': key},
        {'$set': {'value': value, 'updated_at': now_utc().isoformat()}},
        upsert=True,
    )
    return {'key': key, 'value': value}


# --------------- Corporate / Local Wellness Leads ---------------

# Santa Cruz Strength coordinates
SCS_LAT = 36.9741
SCS_LNG = -122.0308

CORPORATE_STAGES = [
    'Discovered', 'Queued', 'Email 1 Sent', 'Email 2 Sent', 'Email 3 Sent',
    'Replied', 'Discovery Scheduled', 'Proposal Sent', 'Verbal Yes',
    'Active Corporate Account', 'Lost / Not Now'
]

COLD_EMAIL_TEMPLATES = [
    {
        'wave': 1,
        'subject': 'Corporate gym memberships for your team',
        'body': """Hey {{contact_name}},

I'm reaching out from Santa Cruz Strength here in Santa Cruz.

We're opening up corporate membership options for local businesses that want to offer their employees a real wellness perk - access to a strength gym, supportive community, and a place to train without the big-box gym feel.

You can cover all of the membership, part of it, or simply give your team access to a preferred employee rate.

Would it be worth sending over the quick breakdown?

 - Santa Cruz Strength
151 Harvey West Blvd Ste D, Santa Cruz CA 95060
If this is not a fit, reply 'no thanks' and we won't follow up."""
    },
    {
        'wave': 2,
        'subject': 'Quick idea for your employees',
        'body': """Hey {{contact_name}},

Quick follow-up.

A lot of businesses want to offer better employee perks, but most wellness programs are either too expensive, too complicated, or barely used.

Our corporate membership setup is simple:
- Your team gets discounted gym access
- You choose whether the company pays all, part, or none
- We handle the membership setup
- Your employees get a real local gym community

Want me to send the options?

 - Santa Cruz Strength
151 Harvey West Blvd Ste D, Santa Cruz CA 95060
If this is not a fit, reply 'no thanks' and we won't follow up."""
    },
    {
        'wave': 3,
        'subject': 'Should I close the loop?',
        'body': """Hey {{contact_name}},

Last note from me.

If employee wellness, team perks, or discounted gym access is something you want to explore, I'd be happy to send over the corporate membership options.

If not, no worries at all - just reply 'no thanks' and I won't follow up.

Appreciate you,
Santa Cruz Strength
151 Harvey West Blvd Ste D, Santa Cruz CA 95060"""
    },
]

OVERPASS_CATEGORIES = {
    'cafe': 'Coffee Shop',
    'restaurant': 'Restaurant',
    'bar': 'Bar / Brewery',
    'pub': 'Bar / Brewery',
    'shop': 'Retail',
    'clinic': 'Healthcare',
    'doctors': 'Healthcare',
    'dentist': 'Healthcare',
    'pharmacy': 'Healthcare',
    'fitness_centre': 'Fitness',
    'school': 'School',
    'office': 'Office',
    'coworking_space': 'Office',
    'surf_school': 'Surf / Outdoor',
    'outdoor': 'Surf / Outdoor',
}

def _score_lead(lead: dict) -> int:
    """Score a corporate lead 0-100 based on engagement & fit."""
    score = 20  # base
    if lead.get('email'): score += 10
    if lead.get('phone'): score += 5
    if lead.get('website_or_instagram'): score += 5
    enrolled = lead.get('estimated_enrolled', 0)
    if enrolled >= 21: score += 25
    elif enrolled >= 11: score += 20
    elif enrolled >= 6: score += 15
    elif enrolled >= 3: score += 10
    if lead.get('contribution_model') == 'employer_pays_all': score += 10
    elif lead.get('contribution_model') == 'employer_pays_part': score += 5
    status = lead.get('status', '')
    if status in ('Replied', 'Discovery Scheduled'): score += 15
    elif status == 'Proposal Sent': score += 20
    elif status == 'Verbal Yes': score += 25
    return min(score, 100)


DISCOUNT_TIERS = {
    '3-5': '10%', '6-10': '15%', '11-20': '20%', '21+': 'Custom'
}

def _calc_discount_tier(enrolled: int) -> str:
    if enrolled >= 21: return '21+'
    if enrolled >= 11: return '11-20'
    if enrolled >= 6: return '6-10'
    if enrolled >= 3: return '3-5'
    return 'Under 3'


class CorporateLeadCreate(BaseModel):
    business_name: str = Field(min_length=1, max_length=200)
    contact_name: str = Field(min_length=1, max_length=200)
    contact_title: str = Field(default='', max_length=150)
    email: str = Field(default='', max_length=254)
    phone: str = Field(default='', max_length=40)
    business_address: str = Field(default='', max_length=500)
    website_or_instagram: str = Field(default='', max_length=500)
    employee_count: int = Field(default=0, ge=0, le=100000)
    estimated_enrolled: int = Field(default=0, ge=0, le=100000)
    contribution_model: str = Field(default='not_sure', max_length=100)
    desired_start_date: str = Field(default='', max_length=64)
    notes: str = Field(default='', max_length=2000)
    email_consent: bool = False
    sms_consent: bool = False
    request_id: Optional[str] = Field(default=None, max_length=64)
    attribution: Optional[LeadAttribution] = None
    schema_version: Optional[str] = None
    brand_id: Optional[str] = None
    location_id: Optional[str] = None
    form_id: Optional[str] = None
    offer_id: Optional[str] = None
    lead_source: Optional[str] = Field(default='corporate_landing_page', max_length=150)
    consent: Optional[Dict[str, Any]] = None


async def _send_corporate_lead_emails(lead: dict):
    """Send confirmation to business contact + internal staff notification.

    The contact confirmation is gated on the consent the submitter actually
    gave. The endpoint validates that email_consent and the consent object agree
    before storing them, which shows the gate was always intended, but the send
    never consulted it: any corporate submission with an email address produced
    a confirmation regardless of consent.

    The downstream guard could not catch it either. _email_delivery_allowed
    looks the recipient up in db.leads, and corporate leads are written to
    db.corporate_leads, so it returned "allowed" on a record it never found.

    The staff notification below is internal and is not gated. Nobody consents
    on the gym's behalf to being told it has a lead.
    """
    contact_parts = safe_sms_text(lead.get('contact_name', 'there'), 200).split()
    name = escape_html(contact_parts[0] if contact_parts else 'there')
    tasks = []
    contact_email_permitted = (
        lead.get('email_operational_opt_in') is True
        and not lead.get('email_opted_out')
        and not lead.get('blacklisted')
    )
    if lead.get('email') and contact_email_permitted:
        html = f"""<div style="font-family:sans-serif;background:#111;color:#fff;padding:32px;border-radius:12px;max-width:600px;">
<h2 style="color:#7FCCA6;margin-bottom:16px;">We got your corporate membership request</h2>
<p style="color:#ccc;font-size:15px;line-height:1.6;">Hey {name},</p>
<p style="color:#ccc;font-size:15px;line-height:1.6;">Thanks for reaching out about corporate memberships at Santa Cruz Strength.</p>
<p style="color:#ccc;font-size:15px;line-height:1.6;">We'll review your team size, contribution preference, and goals, then follow up with the best option for your business.</p>
<p style="color:#ccc;font-size:15px;line-height:1.6;">Whether you want to cover the full membership, split the cost with employees, or just give your team a preferred local rate, we can make it simple.</p>
<p style="color:#ccc;font-size:15px;line-height:1.6;margin-top:24px;">Talk soon,<br/><strong style="color:#fff;">Santa Cruz Strength</strong></p>
<p style="color:#555;font-size:11px;margin-top:24px;">151 Harvey West Blvd Ste D, Santa Cruz CA 95060</p>
</div>"""
        tasks.append(send_resend_email(
            to=lead['email'],
            subject='We got your corporate membership request',
            html=html,
            reply_to='management@santacruzstrength.com'
        ))

    contrib_labels = {'employer_pays_all': 'Employer Pays All', 'employer_pays_part': 'Employer Pays Part', 'employee_discount': 'Employee Discount Only', 'not_sure': 'Not Sure Yet'}
    safe_business = escape_html(lead.get('business_name', ''))
    safe_contact = escape_html(lead.get('contact_name', ''))
    safe_title = escape_html(lead.get('contact_title', ''))
    safe_email = escape_html(lead.get('email', ''))
    safe_phone = escape_html(lead.get('phone', ''))
    safe_model = escape_html(contrib_labels.get(lead.get('contribution_model', ''), lead.get('contribution_model', '')))
    safe_tier = escape_html(lead.get('discount_tier', ''))
    safe_start = escape_html(lead.get('desired_start_date', 'Not specified'))
    safe_notes = escape_html(lead.get('notes', ' - '))
    staff_html = f"""<div style="font-family:sans-serif;background:#111;color:#fff;padding:24px;border-radius:8px;">
<h3 style="color:#7FCCA6;">New Corporate Lead</h3>
<table style="color:#ccc;font-size:14px;line-height:1.8;">
<tr><td style="color:#888;padding-right:16px;">Company</td><td><strong style="color:#fff;">{safe_business}</strong></td></tr>
<tr><td style="color:#888;">Contact</td><td>{safe_contact} - {safe_title}</td></tr>
<tr><td style="color:#888;">Email</td><td>{safe_email}</td></tr>
<tr><td style="color:#888;">Phone</td><td>{safe_phone}</td></tr>
<tr><td style="color:#888;">Employees</td><td>{lead.get('employee_count',0)} total, ~{lead.get('estimated_enrolled',0)} interested</td></tr>
<tr><td style="color:#888;">Model</td><td>{safe_model}</td></tr>
<tr><td style="color:#888;">Discount Tier</td><td>{safe_tier}</td></tr>
<tr><td style="color:#888;">Start Date</td><td>{safe_start}</td></tr>
<tr><td style="color:#888;">Notes</td><td>{safe_notes}</td></tr>
<tr><td style="color:#888;">SMS Consent</td><td>{'Yes' if lead.get('sms_consent') else 'No'}</td></tr>
</table>
<p style="color:#666;font-size:12px;margin-top:16px;">Follow up within 1 business day.</p>
</div>"""
    tasks.append(send_resend_email(
        to=STAFF_EMAIL,
        subject=safe_sms_text(f"New Corporate Lead: {lead.get('business_name','')} ({lead.get('estimated_enrolled',0)} employees)", 220),
        html=staff_html,
        message_kind='internal',
    ))
    await asyncio.gather(*tasks, return_exceptions=True)


@api_router.get('/corporate-unsubscribe/{lead_id}')
async def corporate_unsubscribe(lead_id: str):
    """Public confirmation page. GET does not mutate subscription state."""
    lead = await db.corporate_leads.find_one({'id': lead_id}, {'_id': 0, 'business_name': 1, 'email': 1})
    if not lead:
        return Response(content=_unsub_page('Unknown', False), media_type='text/html')

    safe_name = re.sub(r'[^a-zA-Z0-9 .,&-]', '', lead.get('business_name', ''))[:120]
    html = f"""<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Email preferences</title></head>
<body><main><h1>Email preferences</h1><p>Confirm that you want to stop corporate outreach emails for {safe_name or 'this contact'}.</p><form method="post" action="/api/corporate-unsubscribe/{lead_id}"><button type="submit">Unsubscribe</button></form></main></body></html>"""
    return Response(content=html, media_type='text/html')


@api_router.post('/corporate-unsubscribe/{lead_id}')
async def confirm_corporate_unsubscribe(lead_id: str):
    """Public unsubscribe action after explicit confirmation."""
    lead = await db.corporate_leads.find_one({'id': lead_id}, {'_id': 0, 'business_name': 1, 'email': 1})
    if not lead:
        return Response(content=_unsub_page('Unknown', False), media_type='text/html')

    await db.corporate_leads.update_one(
        {'id': lead_id},
        {
            '$set': {'email_opted_out': True, 'updated_at': now_utc().isoformat()},
            '$push': {'activity_log': {
                'action': 'Email Unsubscribed',
                'note': f'{lead.get("email", "")} clicked unsubscribe link',
                'staff_name': 'System',
                'timestamp': now_utc().isoformat(),
            }}
        }
    )
    logger.info(f'[CORPORATE] Unsubscribe: {lead.get("email", "")} ({lead.get("business_name", "")})')
    return Response(content=_unsub_page(lead.get('business_name', ''), True), media_type='text/html')


def _unsub_page(name: str, success: bool) -> str:
    msg = "You've been unsubscribed from Santa Cruz Strength corporate outreach emails. We won't email you again." if success else "We couldn't find that subscription, but you won't receive further emails."
    site_url = escape_html(require_frontend_origin())
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribed - Santa Cruz Strength</title>
<style>body{{font-family:-apple-system,sans-serif;background:#F7F5F0;color:#222;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;padding:20px;}}
.card{{background:#fff;border-radius:16px;padding:40px;max-width:420px;text-align:center;box-shadow:0 2px 12px rgba(0,0,0,0.06);}}
h1{{font-size:20px;margin:0 0 12px;}}p{{font-size:14px;color:#666;line-height:1.6;margin:0 0 20px;}}
a{{color:#3A7D5C;text-decoration:none;font-weight:600;}}</style></head>
<body><div class="card"><h1>You're unsubscribed.</h1><p>{msg}</p><a href="{site_url}">Back to Santa Cruz Strength</a></div></body></html>"""


@api_router.post('/corporate-leads')
async def create_corporate_lead(data: CorporateLeadCreate, request: Request):
    """Public endpoint: corporate membership inquiry form submission."""
    _enforce_public_lead_request(request, 'corporate')
    if not data.business_name.strip() or not data.contact_name.strip():
        raise HTTPException(status_code=422, detail='Business and contact names cannot be blank')
    if data.email and not re.fullmatch(r'[^\s@]+@[^\s@]+\.[^\s@]+', data.email.strip()):
        raise HTTPException(status_code=422, detail='email must be valid')
    if not data.email.strip() and not data.phone.strip():
        raise HTTPException(status_code=422, detail='Email or phone is required')
    if data.schema_version != '1.0.0':
        raise HTTPException(status_code=422, detail='Unsupported form schema version')
    if data.brand_id != 'santa_cruz_strength' or data.location_id != 'santa_cruz_ca':
        raise HTTPException(status_code=422, detail='Brand or location does not match this lead endpoint')
    if data.form_id != 'local_wellness_corporate_inquiry' or data.offer_id != 'corporate_membership_pricing':
        raise HTTPException(status_code=422, detail='Form or offer does not match this lead endpoint')
    consent = data.consent if isinstance(data.consent, dict) else {}
    if data.email_consent != (consent.get('email_operational_opt_in') is True):
        raise HTTPException(status_code=422, detail='Email consent fields do not match')
    if data.sms_consent != (consent.get('sms_operational_opt_in') is True):
        raise HTTPException(status_code=422, detail='SMS consent fields do not match')
    idempotency_key = request.headers.get('Idempotency-Key')
    if idempotency_key and data.request_id and idempotency_key != data.request_id:
        raise HTTPException(status_code=400, detail='Idempotency-Key must match request_id')
    request_id = data.request_id or idempotency_key
    if not request_id:
        raise HTTPException(status_code=422, detail='request_id or Idempotency-Key is required')
    try:
        uuid.UUID(request_id)
    except ValueError:
        raise HTTPException(status_code=422, detail='request_id must be a valid UUID')
    existing_request = await db.corporate_leads.find_one(
        {'$or': [{'request_id': request_id}, {'request_ids': request_id}]},
        {'id': 1, 'discount_tier': 1, '_id': 0},
    )
    if existing_request:
        return {
            'id': existing_request['id'],
            'status': 'accepted',
            'duplicate': True,
            'request_id': request_id,
            'discount_tier': existing_request.get('discount_tier'),
        }
    now = now_utc()
    lead_id = str(uuid.uuid4())
    tier = _calc_discount_tier(data.estimated_enrolled)
    attribution = data.attribution.model_dump(exclude_none=True) if data.attribution else {}
    doc = {
        'id': lead_id,
        'request_id': request_id,
        'request_ids': [request_id],
        'schema_version': data.schema_version,
        'brand_id': data.brand_id,
        'location_id': data.location_id,
        'form_id': data.form_id,
        'offer_id': data.offer_id,
        'business_name': data.business_name.strip(),
        'contact_name': data.contact_name.strip(),
        'contact_title': data.contact_title.strip(),
        'email': data.email.lower().strip(),
        'phone': normalize_phone(data.phone.strip()) if data.phone else '',
        'business_address': data.business_address.strip(),
        'website_or_instagram': data.website_or_instagram.strip(),
        'employee_count': data.employee_count,
        'estimated_enrolled': data.estimated_enrolled,
        'contribution_model': data.contribution_model.strip(),
        'discount_tier': tier,
        'desired_start_date': data.desired_start_date.strip(),
        'notes': data.notes.strip(),
        'email_consent': data.email_consent,
        'sms_consent': data.sms_consent,
        'email_operational_opt_in': consent.get('email_operational_opt_in') is True,
        'email_marketing_opt_in': consent.get('email_marketing_opt_in') is True,
        'sms_operational_opt_in': consent.get('sms_operational_opt_in') is True,
        'sms_marketing_opt_in': consent.get('sms_marketing_opt_in') is True,
        'consent': consent,
        'sms_consent_date': now.isoformat() if data.sms_consent else None,
        'attribution': attribution,
        'status': 'New Corporate Lead',
        'lead_source': data.lead_source or 'corporate_landing_page',
        'assigned_to': None,
        'next_follow_up_date': (now + timedelta(days=1)).date().isoformat(),
        'last_contact_date': None,
        'proposal': None,
        'activity_log': [{'action': 'Corporate Lead Created', 'note': f'Submitted via corporate landing page', 'staff_name': 'System', 'timestamp': now.isoformat()}],
        'created_at': now.isoformat(),
        'updated_at': now.isoformat(),
    }
    try:
        await db.corporate_leads.insert_one(doc)
    except DuplicateKeyError:
        prior = await db.corporate_leads.find_one(
            {'$or': [{'request_id': request_id}, {'request_ids': request_id}]},
            {'id': 1, 'discount_tier': 1, '_id': 0},
        )
        if prior:
            return {
                'id': prior['id'],
                'status': 'accepted',
                'duplicate': True,
                'request_id': request_id,
                'discount_tier': prior.get('discount_tier'),
            }
        raise

    # Send emails + optional SMS in background
    async def _bg():
        await _send_corporate_lead_emails(doc)
        if data.sms_consent and doc.get('phone'):
            contact_parts = safe_sms_text(doc['contact_name'], 200).split()
            name = contact_parts[0] if contact_parts else 'there'
            await send_sms(
                [doc['phone']],
                safe_sms_text(
                    f"Hey {name}, this is Santa Cruz Strength. We got your corporate membership request and will follow up soon. Reply STOP to opt out.",
                    500,
                ),
            )
    asyncio.create_task(_bg())

    return {
        'id': lead_id,
        'status': 'accepted',
        'duplicate': False,
        'request_id': request_id,
        'discount_tier': tier,
    }


@api_router.get('/staff/corporate-leads')
async def list_corporate_leads(user=Depends(require_staff)):
    leads = await db.corporate_leads.find({}, {'_id': 0}).sort('created_at', -1).to_list(500)
    return leads


@api_router.get('/staff/corporate-leads/stats')
async def corporate_lead_stats(user=Depends(require_staff)):
    now = now_utc()
    week_ago = (now - timedelta(days=7)).isoformat()
    total = await db.corporate_leads.count_documents({})
    new_this_week = await db.corporate_leads.count_documents({'created_at': {'$gte': week_ago}})
    followups_due = await db.corporate_leads.count_documents({
        'next_follow_up_date': {'$lte': now.date().isoformat()},
        'status': {'$nin': ['Active Corporate Account', 'Lost / Not Now']}
    })
    proposals = await db.corporate_leads.count_documents({'status': 'Proposal Sent'})
    active = await db.corporate_leads.count_documents({'status': 'Active Corporate Account'})
    pipeline = [
        {'$match': {'status': 'Active Corporate Account'}},
        {'$group': {'_id': None, 'total_enrolled': {'$sum': '$estimated_enrolled'}}}
    ]
    agg = await db.corporate_leads.aggregate(pipeline).to_list(1)
    enrolled = agg[0]['total_enrolled'] if agg else 0
    return {
        'total': total, 'new_this_week': new_this_week, 'followups_due': followups_due,
        'proposals_sent': proposals, 'active_accounts': active, 'enrolled_employees': enrolled,
    }


@api_router.put('/staff/corporate-leads/{lead_id}')
async def update_corporate_lead(lead_id: str, request: Request, user=Depends(require_staff)):
    body = await request.json()
    body['updated_at'] = now_utc().isoformat()
    if 'estimated_enrolled' in body:
        body['discount_tier'] = _calc_discount_tier(body['estimated_enrolled'])
    result = await db.corporate_leads.update_one({'id': lead_id}, {'$set': body})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Not found')
    updated = await db.corporate_leads.find_one({'id': lead_id}, {'_id': 0})
    return updated


@api_router.post('/staff/corporate-leads/{lead_id}/note')
async def add_corporate_note(lead_id: str, request: Request, user=Depends(require_staff)):
    body = await request.json()
    note_text = body.get('note', '')
    if not note_text:
        raise HTTPException(status_code=400, detail='Note is required')
    entry = {
        'action': 'Note Added',
        'note': note_text,
        'staff_name': user.get('name', 'Staff'),
        'timestamp': now_utc().isoformat(),
    }
    await db.corporate_leads.update_one(
        {'id': lead_id},
        {'$push': {'activity_log': entry}, '$set': {'updated_at': now_utc().isoformat()}}
    )
    return {'ok': True}


@api_router.delete('/staff/corporate-leads/{lead_id}')
async def delete_corporate_lead(lead_id: str, user=Depends(require_admin)):
    result = await db.corporate_leads.delete_one({'id': lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Not found')
    return {'ok': True}


@api_router.post('/staff/corporate-leads/{lead_id}/proposal')
async def generate_proposal(lead_id: str, request: Request, user=Depends(require_staff)):
    body = await request.json()
    proposal = {
        'company_name': body.get('company_name', ''),
        'employee_count': body.get('employee_count', 0),
        'estimated_participants': body.get('estimated_participants', 0),
        'contribution_model': body.get('contribution_model', ''),
        'discount_tier': body.get('discount_tier', ''),
        'proposed_monthly_price': body.get('proposed_monthly_price', ''),
        'notes': body.get('notes', ''),
        'generated_at': now_utc().isoformat(),
        'generated_by': user.get('name', 'Staff'),
    }
    await db.corporate_leads.update_one(
        {'id': lead_id},
        {
            '$set': {'proposal': proposal, 'status': 'Proposal Sent', 'updated_at': now_utc().isoformat()},
            '$push': {'activity_log': {'action': 'Proposal Generated', 'note': f'Proposal for {proposal["estimated_participants"]} employees at {proposal["proposed_monthly_price"]}', 'staff_name': user.get('name', 'Staff'), 'timestamp': now_utc().isoformat()}}
        }
    )
    return proposal


@api_router.get('/staff/corporate-leads/discover')
async def discover_businesses(user=Depends(require_staff), category: str = 'cafe', radius: int = 3000):
    """Use Overpass API to find local businesses near Santa Cruz Strength."""
    # Egress on a GET. The write gate only inspects the HTTP method, so a GET
    # that performs an outbound POST passes straight through it and protected
    # read-only mode does not actually hold. A flag is the only thing that can
    # stop this one.
    if not ALLOW_THIRD_PARTY_RESEARCH:
        raise HTTPException(
            status_code=503,
            detail='Business discovery is disabled. It calls a third party service.',
        )
    cat_map = {
        'cafe': '["amenity"="cafe"]',
        'restaurant': '["amenity"="restaurant"]',
        'bar': '["amenity"="bar"]',
        'brewery': '["craft"="brewery"]',
        'retail': '["shop"]',
        'healthcare': '["amenity"~"clinic|doctors|dentist|pharmacy"]',
        'fitness': '["leisure"="fitness_centre"]',
        'office': '["office"]',
        'school': '["amenity"="school"]',
    }
    osm_filter = cat_map.get(category, '["amenity"="cafe"]')
    query = f'[out:json][timeout:15];(node{osm_filter}(around:{radius},{SCS_LAT},{SCS_LNG});way{osm_filter}(around:{radius},{SCS_LAT},{SCS_LNG}););out center 50;'
    try:
        async with httpx.AsyncClient(timeout=20) as client:
            resp = await client.post('https://overpass.kumi.systems/api/interpreter', data={'data': query})
        logger.info(f'[CORPORATE-DISCOVER] Overpass status={resp.status_code} len={len(resp.text)}')
        if resp.status_code != 200:
            logger.warning(f'[CORPORATE-DISCOVER] Overpass returned {resp.status_code}: {resp.text[:300]}')
            raise HTTPException(
                status_code=502,
                detail=f'Business discovery upstream returned {resp.status_code}.',
            )
        data = resp.json()
        logger.info(f'[CORPORATE-DISCOVER] Overpass returned {len(data.get("elements",[]))} elements for {category} r={radius}')
        existing_names = set()
        existing_leads = await db.corporate_leads.find({}, {'_id': 0, 'business_name': 1}).to_list(1000)
        for l in existing_leads:
            existing_names.add(l.get('business_name', '').lower().strip())

        businesses = []
        skipped_no_name = 0
        skipped_existing = 0
        for el in data.get('elements', []):
            tags = el.get('tags', {})
            name = tags.get('name', '')
            if not name:
                skipped_no_name += 1
                continue
            if name.lower().strip() in existing_names:
                skipped_existing += 1
                continue
            lat = el.get('lat') or (el.get('center', {}).get('lat'))
            lon = el.get('lon') or (el.get('center', {}).get('lon'))
            businesses.append({
                'name': name,
                'category': OVERPASS_CATEGORIES.get(tags.get('amenity', tags.get('shop', tags.get('leisure', ''))), category.title()),
                'address': f"{tags.get('addr:street', '')} {tags.get('addr:housenumber', '')}".strip() or tags.get('addr:full', ''),
                'city': tags.get('addr:city', 'Santa Cruz'),
                'phone': tags.get('phone', tags.get('contact:phone', '')),
                'website': tags.get('website', tags.get('contact:website', '')),
                'email': tags.get('email', tags.get('contact:email', '')),
                'lat': lat, 'lon': lon,
                'osm_id': el.get('id'),
                'already_in_crm': False,
            })
        logger.info(f'[CORPORATE-DISCOVER] Results: {len(businesses)} businesses, skipped_no_name={skipped_no_name}, skipped_existing={skipped_existing}')
        return {'businesses': businesses[:50], 'total_found': len(businesses)}
    except HTTPException:
        # The upstream-status branch above raises deliberately. Without this it
        # would be caught below and flattened into the generic message.
        raise
    except Exception as e:
        # The exception text used to be returned to the client, which leaked
        # internal detail including full outbound URLs. It belongs in the log,
        # where staff can find it, and not in the response.
        logger.error(f'[CORPORATE-DISCOVER] Overpass error: {e}')
        raise HTTPException(
            status_code=502,
            detail='Business discovery upstream is unavailable. See server logs.',
        )


@api_router.post('/staff/corporate-leads/import-discovered')
async def import_discovered_business(request: Request, user=Depends(require_staff)):
    """Import a business from discovery into the corporate leads pipeline."""
    body = await request.json()
    now = now_utc()
    lead_id = str(uuid.uuid4())
    doc = {
        'id': lead_id,
        'business_name': body.get('name', '').strip(),
        'contact_name': body.get('contact_name', '').strip(),
        'contact_title': body.get('contact_title', '').strip(),
        'email': body.get('email', '').lower().strip(),
        'phone': normalize_phone(body.get('phone', '').strip()) if body.get('phone') else '',
        'business_address': body.get('address', '').strip(),
        'website_or_instagram': body.get('website', '').strip(),
        'employee_count': body.get('employee_count', 0),
        'estimated_enrolled': body.get('estimated_enrolled', 0),
        'contribution_model': 'not_sure',
        'discount_tier': _calc_discount_tier(body.get('estimated_enrolled', 0)),
        'desired_start_date': '',
        'notes': body.get('notes', ''),
        'email_consent': False,
        'sms_consent': False,
        'sms_consent_date': None,
        'status': 'Discovered',
        'lead_source': body.get('lead_source', 'overpass_discovery'),
        'category': body.get('category', ''),
        'assigned_to': user.get('name', None),
        'next_follow_up_date': now.date().isoformat(),
        'last_contact_date': None,
        'cold_email_wave': 0,
        'last_email_sent_at': None,
        'proposal': None,
        'score': 20,
        'activity_log': [{'action': 'Discovered', 'note': f"Added from {body.get('lead_source', 'local discovery')} by {user.get('name', 'Staff')}", 'staff_name': user.get('name', 'Staff'), 'timestamp': now.isoformat()}],
        'created_at': now.isoformat(),
        'updated_at': now.isoformat(),
    }
    await db.corporate_leads.insert_one(doc)
    return {'id': lead_id, 'status': 'imported'}


@api_router.post('/staff/corporate-leads/{lead_id}/send-cold-email')
async def send_cold_email(lead_id: str, request: Request, user=Depends(require_staff)):
    """Send the next cold email wave to a corporate lead."""
    lead = await db.corporate_leads.find_one({'id': lead_id}, {'_id': 0})
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    if not lead.get('email'):
        raise HTTPException(status_code=400, detail='Lead has no email address')
    if lead.get('email_opted_out'):
        raise HTTPException(status_code=400, detail='This contact has opted out of emails')

    current_wave = lead.get('cold_email_wave', 0)
    next_wave = current_wave + 1
    if next_wave > 3:
        raise HTTPException(status_code=400, detail='All 3 email waves already sent')

    template = COLD_EMAIL_TEMPLATES[next_wave - 1]
    contact_name = lead.get('contact_name', 'there').split()[0]
    body_text = template['body'].replace('{{contact_name}}', escape_html(contact_name))
    subject = template['subject']

    site_url = require_frontend_origin()
    unsub_url = f'{site_url}/api/corporate-unsubscribe/{lead_id}'

    html_body = f"""<div style="font-family:sans-serif;color:#222;font-size:15px;line-height:1.7;max-width:600px;">
{''.join(f'<p>{line}</p>' if line.strip() else '<br/>' for line in body_text.split(chr(10)))}
<hr style="border:none;border-top:1px solid #ddd;margin:24px 0 12px;" />
<p style="font-size:11px;color:#999;line-height:1.5;">
Santa Cruz Strength &middot; 151 Harvey West Blvd Ste D, Santa Cruz CA 95060<br/>
<a href="{unsub_url}" style="color:#999;">Unsubscribe</a> from future emails.
</p>
</div>"""

    ok = await send_resend_email(
        to=lead['email'],
        subject=subject,
        html=html_body,
        reply_to='management@santacruzstrength.com',
        message_kind='corporate_marketing',
    )
    if not ok:
        raise HTTPException(status_code=500, detail='Email send failed - check daily quota')

    new_status = f'Email {next_wave} Sent'
    await db.corporate_leads.update_one(
        {'id': lead_id},
        {
            '$set': {
                'cold_email_wave': next_wave,
                'last_email_sent_at': now_utc().isoformat(),
                'status': new_status,
                'updated_at': now_utc().isoformat(),
                'score': _score_lead({**lead, 'status': new_status}),
            },
            '$push': {'activity_log': {
                'action': f'Cold Email {next_wave} Sent',
                'note': f'Subject: "{subject}" sent to {lead["email"]}',
                'staff_name': user.get('name', 'Staff'),
                'timestamp': now_utc().isoformat(),
            }}
        }
    )
    return {'ok': True, 'wave': next_wave, 'subject': subject, 'sent_to': lead['email']}


@api_router.post('/staff/corporate-leads/bulk-action')
async def bulk_corporate_action(request: Request, user=Depends(require_staff)):
    """Bulk actions: send emails, change status, delete."""
    body = await request.json()
    lead_ids = body.get('lead_ids', [])
    action = body.get('action', '')
    if not lead_ids:
        raise HTTPException(status_code=400, detail='No leads selected')

    results = {'success': 0, 'failed': 0, 'errors': []}

    if action == 'send_next_email':
        for lid in lead_ids:
            try:
                lead = await db.corporate_leads.find_one({'id': lid}, {'_id': 0})
                if not lead or not lead.get('email') or lead.get('email_opted_out'):
                    results['failed'] += 1; continue
                wave = lead.get('cold_email_wave', 0)
                if wave >= 3:
                    results['failed'] += 1; continue
                template = COLD_EMAIL_TEMPLATES[wave]
                contact_name = lead.get('contact_name', 'there').split()[0]
                body_text = template['body'].replace('{{contact_name}}', escape_html(contact_name))
                site_url = require_frontend_origin()
                unsub_url = f'{site_url}/api/corporate-unsubscribe/{lid}'
                html_body = f"<div style='font-family:sans-serif;color:#222;font-size:15px;line-height:1.7;max-width:600px;'>{''.join(f'<p>{l}</p>' if l.strip() else '<br/>' for l in body_text.split(chr(10)))}<hr style='border:none;border-top:1px solid #ddd;margin:24px 0 12px;'/><p style='font-size:11px;color:#999;line-height:1.5;'>Santa Cruz Strength &middot; 151 Harvey West Blvd Ste D, Santa Cruz CA 95060<br/><a href='{unsub_url}' style='color:#999;'>Unsubscribe</a> from future emails.</p></div>"
                ok = await send_resend_email(
                    to=lead['email'], subject=template['subject'], html=html_body,
                    reply_to='management@santacruzstrength.com', message_kind='corporate_marketing',
                )
                if ok:
                    new_wave = wave + 1
                    await db.corporate_leads.update_one({'id': lid}, {'$set': {'cold_email_wave': new_wave, 'status': f'Email {new_wave} Sent', 'last_email_sent_at': now_utc().isoformat(), 'updated_at': now_utc().isoformat()}, '$push': {'activity_log': {'action': f'Cold Email {new_wave} Sent', 'note': f'Bulk send by {user.get("name", "Staff")}', 'staff_name': user.get('name', 'Staff'), 'timestamp': now_utc().isoformat()}}})
                    results['success'] += 1
                else:
                    results['failed'] += 1
                await asyncio.sleep(0.5)  # rate limit
            except Exception as e:
                results['failed'] += 1; results['errors'].append(str(e))

    elif action == 'change_status':
        new_status = body.get('new_status', '')
        if new_status not in CORPORATE_STAGES:
            raise HTTPException(status_code=400, detail='Invalid status')
        result = await db.corporate_leads.update_many(
            {'id': {'$in': lead_ids}},
            {'$set': {'status': new_status, 'updated_at': now_utc().isoformat()}}
        )
        results['success'] = result.modified_count

    elif action == 'delete':
        result = await db.corporate_leads.delete_many({'id': {'$in': lead_ids}})
        results['success'] = result.deleted_count

    return results


@api_router.get('/staff/corporate-leads/email-templates')
async def get_email_templates(user=Depends(require_staff)):
    """Return the cold email templates for preview."""
    return COLD_EMAIL_TEMPLATES


@api_router.get('/staff/corporate-leads/{lead_id}')
async def get_corporate_lead(lead_id: str, user=Depends(require_staff)):
    lead = await db.corporate_leads.find_one({'id': lead_id}, {'_id': 0})
    if not lead:
        raise HTTPException(status_code=404, detail='Corporate lead not found')
    return lead


# --------------- Team Members ---------------

class TeamMemberCreate(BaseModel):
    name: str
    role: str
    bio: str = ''
    photo_url: str = ''
    category: str = 'team'  # 'team' or 'trainer'
    sort_order: int = 0
    is_visible: bool = True

class TeamMemberUpdate(BaseModel):
    name: str = None
    role: str = None
    bio: str = None
    photo_url: str = None
    category: str = None
    sort_order: int = None
    is_visible: bool = None


@api_router.get('/team')
async def get_team_members():
    """Public: get all visible team members."""
    members = await db.team_members.find({'is_visible': True}, {'_id': 0}).sort('sort_order', 1).to_list(100)
    return members


@api_router.get('/staff/team')
async def get_all_team_members(user=Depends(require_admin)):
    """Staff: get all team members including hidden."""
    members = await db.team_members.find({}, {'_id': 0}).sort('sort_order', 1).to_list(100)
    return members


@api_router.post('/staff/team')
async def create_team_member(data: TeamMemberCreate, user=Depends(require_admin)):
    member = {
        'id': str(uuid.uuid4()),
        **data.dict(),
        'created_at': now_utc().isoformat(),
        'updated_at': now_utc().isoformat(),
    }
    await db.team_members.insert_one(member)
    created = await db.team_members.find_one({'id': member['id']}, {'_id': 0})
    return created


@api_router.put('/staff/team/{member_id}')
async def update_team_member(member_id: str, data: TeamMemberUpdate, user=Depends(require_admin)):
    updates = {k: v for k, v in data.dict().items() if v is not None}
    if not updates:
        raise HTTPException(status_code=400, detail='No fields to update')
    updates['updated_at'] = now_utc().isoformat()
    result = await db.team_members.update_one({'id': member_id}, {'$set': updates})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail='Member not found')
    updated = await db.team_members.find_one({'id': member_id}, {'_id': 0})
    return updated


@api_router.delete('/staff/team/{member_id}')
async def delete_team_member(member_id: str, user=Depends(require_admin)):
    result = await db.team_members.delete_one({'id': member_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Member not found')
    return {'ok': True}


# --------------- Events Models ---------------

class EventCreate(BaseModel):
    title: str
    description: str
    date: str
    time: Optional[str] = ''
    end_time: Optional[str] = ''
    image_url: Optional[str] = ''
    category: str = 'General'
    location: Optional[str] = ''
    ticket_type: str = 'free'
    ticket_url: Optional[str] = ''
    ticket_price: Optional[str] = ''
    registration_url: Optional[str] = ''
    max_capacity: Optional[int] = None
    published: bool = True
    sold_out: bool = False
    recurring: str = 'none'
    recurring_until: Optional[str] = ''

class EventUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    date: Optional[str] = None
    time: Optional[str] = None
    end_time: Optional[str] = None
    image_url: Optional[str] = None
    category: Optional[str] = None
    location: Optional[str] = None
    ticket_type: Optional[str] = None
    ticket_url: Optional[str] = None
    ticket_price: Optional[str] = None
    registration_url: Optional[str] = None
    max_capacity: Optional[int] = None
    published: Optional[bool] = None
    sold_out: Optional[bool] = None
    recurring: Optional[str] = None
    recurring_until: Optional[str] = None

class RSVPCreate(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ''

# --------------- Events Routes (Public) ---------------

@api_router.get('/events')
async def list_events(upcoming: bool = True):
    from datetime import date as date_type
    import calendar as cal_module

    today = now_utc().date()
    query = {'published': True}
    if upcoming:
        # Fetch events with future dates OR recurring events (whose base date may be past)
        query['$or'] = [
            {'date': {'$gte': today.isoformat()}},
            {'recurring': {'$nin': ['none', '', None]}},
        ]
    events = await db.events.find(query, {'_id': 0}).sort('date', 1).to_list(200)

    result = []
    # For past events, also pull recurring ones whose base date is in the past
    if not upcoming:
        all_events = await db.events.find({'published': True}, {'_id': 0}).sort('date', -1).to_list(200)
    else:
        all_events = events

    for e in all_events:
        if e.get('ticket_type') == 'rsvp':
            e['rsvp_count'] = await db.event_rsvps.count_documents({'event_id': e['id']})

        recurring = e.get('recurring', 'none') or 'none'
        if recurring == 'none' or not upcoming:
            result.append(e)
            continue

        # For recurring events - find ONLY the next upcoming occurrence (one card per event)
        DELTAS = {'daily': timedelta(days=1), 'weekly': timedelta(weeks=1), 'biweekly': timedelta(weeks=2)}
        RECURRING_LABELS = {
            'daily': 'Every day', 'weekly': 'Every week',
            'biweekly': 'Every 2 weeks', 'monthly': 'Every month',
            'quarterly': 'Every 3 months', 'annually': 'Every year',
        }
        try:
            base_date = date_type.fromisoformat(e['date'])
            until_str = e.get('recurring_until', '')
            until = date_type.fromisoformat(until_str) if until_str else today + timedelta(days=365)

            current = base_date
            next_date = None
            for _ in range(730):
                if current >= today:
                    next_date = current
                    break
                if recurring in DELTAS:
                    current += DELTAS[recurring]
                elif recurring == 'monthly':
                    month = current.month + 1 if current.month < 12 else 1
                    year  = current.year + 1 if current.month == 12 else current.year
                    day   = min(current.day, cal_module.monthrange(year, month)[1])
                    current = date_type(year, month, day)
                elif recurring == 'quarterly':
                    month = current.month + 3
                    year  = current.year
                    while month > 12:
                        month -= 12
                        year += 1
                    day = min(current.day, cal_module.monthrange(year, month)[1])
                    current = date_type(year, month, day)
                elif recurring == 'annually':
                    year = current.year + 1
                    day = min(current.day, cal_module.monthrange(year, current.month)[1])
                    current = date_type(year, current.month, day)
                else:
                    break

            if next_date and next_date <= until:
                instance = dict(e)
                instance['date']              = next_date.isoformat()
                instance['recurring_label']   = RECURRING_LABELS.get(recurring, recurring)
                instance['recurring_until']   = e.get('recurring_until', '')
                result.append(instance)
        except Exception:
            result.append(e)

    result.sort(key=lambda x: x.get('date', ''))
    return result

@api_router.get('/events/{event_id}')
async def get_event(event_id: str):
    event = await db.events.find_one({'id': event_id, 'published': True}, {'_id': 0})
    if not event:
        raise HTTPException(status_code=404, detail='Event not found')
    if event.get('ticket_type') == 'rsvp':
        event['rsvp_count'] = await db.event_rsvps.count_documents({'event_id': event_id})
        event['rsvps'] = []  # don't expose attendee list publicly
    return event

@api_router.post('/events/{event_id}/rsvp')
async def rsvp_event(event_id: str, data: RSVPCreate):
    event = await db.events.find_one({'id': event_id, 'published': True})
    if not event:
        raise HTTPException(status_code=404, detail='Event not found')
    if event.get('ticket_type') != 'rsvp':
        raise HTTPException(status_code=400, detail='This event does not use RSVP')
    max_cap = event.get('max_capacity')
    if max_cap:
        current = await db.event_rsvps.count_documents({'event_id': event_id})
        if current >= max_cap:
            raise HTTPException(status_code=400, detail='Event is at capacity')
    # Check duplicate
    existing = await db.event_rsvps.find_one({'event_id': event_id, 'email': data.email.lower().strip()})
    if existing:
        return {'message': 'Already registered', 'id': existing['id']}
    rsvp_id = str(uuid.uuid4())
    await db.event_rsvps.insert_one({
        'id': rsvp_id, 'event_id': event_id, 'event_title': event.get('title', ''),
        'name': data.name.strip(), 'email': data.email.lower().strip(),
        'phone': data.phone.strip(), 'created_at': now_utc().isoformat(),
    })
    return {'message': 'RSVP confirmed', 'id': rsvp_id}

# --------------- Events Routes (Staff) ---------------

@api_router.get('/staff/events')
async def list_all_events(user=Depends(require_admin)):
    from datetime import date as date_type
    import calendar as cal_module
    events = await db.events.find({}, {'_id': 0}).sort('date', -1).to_list(200)
    today = date_type.today()
    DELTAS = {'daily': timedelta(days=1), 'weekly': timedelta(weeks=1), 'biweekly': timedelta(weeks=2)}
    for e in events:
        if e.get('ticket_type') == 'rsvp':
            e['rsvp_count'] = await db.event_rsvps.count_documents({'event_id': e['id']})
        # Compute next occurrence for recurring events
        recurring = e.get('recurring', 'none') or 'none'
        if recurring != 'none':
            try:
                base_date = date_type.fromisoformat(e['date'])
                until_str = e.get('recurring_until', '')
                until = date_type.fromisoformat(until_str) if until_str else today + timedelta(days=365)
                current = base_date
                for _ in range(730):
                    if current >= today:
                        break
                    if recurring in DELTAS:
                        current += DELTAS[recurring]
                    elif recurring == 'monthly':
                        month = current.month + 1 if current.month < 12 else 1
                        year  = current.year + 1 if current.month == 12 else current.year
                        day   = min(current.day, cal_module.monthrange(year, month)[1])
                        current = date_type(year, month, day)
                    elif recurring == 'quarterly':
                        month = current.month + 3
                        year  = current.year
                        while month > 12:
                            month -= 12
                            year += 1
                        day = min(current.day, cal_module.monthrange(year, month)[1])
                        current = date_type(year, month, day)
                    elif recurring == 'annually':
                        year = current.year + 1
                        day = min(current.day, cal_module.monthrange(year, current.month)[1])
                        current = date_type(year, current.month, day)
                    else:
                        break
                if current <= until:
                    e['next_occurrence'] = current.isoformat()
            except Exception:
                pass
    return events

@api_router.post('/staff/events')
async def create_event(data: EventCreate, user=Depends(require_admin)):
    event_id = str(uuid.uuid4())
    doc = {'id': event_id, **data.dict(), 'created_by': user['id'], 'created_at': now_utc().isoformat(), 'updated_at': now_utc().isoformat()}
    await db.events.insert_one(doc)
    doc.pop('_id', None)
    return doc

@api_router.put('/staff/events/{event_id}')
async def update_event(event_id: str, data: EventUpdate, user=Depends(require_admin)):
    event = await db.events.find_one({'id': event_id})
    if not event:
        raise HTTPException(status_code=404, detail='Event not found')
    update = {k: v for k, v in data.dict().items() if v is not None}
    update['updated_at'] = now_utc().isoformat()
    await db.events.update_one({'id': event_id}, {'$set': update})
    return await db.events.find_one({'id': event_id}, {'_id': 0})

@api_router.delete('/staff/events/{event_id}')
async def delete_event(event_id: str, user=Depends(require_admin)):
    result = await db.events.delete_one({'id': event_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Event not found')
    await db.event_rsvps.delete_many({'event_id': event_id})
    return {'message': 'Event deleted'}

@api_router.get('/staff/events/{event_id}/rsvps')
async def get_event_rsvps(event_id: str, user=Depends(require_admin)):
    rsvps = await db.event_rsvps.find({'event_id': event_id}, {'_id': 0}).sort('created_at', 1).to_list(500)
    return rsvps

# --------------- Blacklist + Campaign System ---------------

@api_router.post('/staff/leads/{lead_id}/blacklist')
async def toggle_blacklist(lead_id: str, user=Depends(require_admin)):
    lead = await db.leads.find_one({'id': lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    new_val = not lead.get('blacklisted', False)
    action = 'Blacklisted' if new_val else 'Removed from blacklist'
    await db.leads.update_one({'id': lead_id}, {
        '$set': {'blacklisted': new_val, 'updated_at': now_utc().isoformat()},
        '$push': {'activity_log': {'action': action, 'note': f'{action} by {user["name"]}',
                                    'staff_id': user['id'], 'staff_name': user['name'],
                                    'timestamp': now_utc().isoformat()}}
    })
    return {'blacklisted': new_val, 'message': action}

# Campaign email templates
# Memberships are sold in person, so every {{join_url}} in campaign email and
# SMS points at the website's tour section rather than an external checkout.
# Mirrors MEMBERSHIP in frontend/src/config/index.js. ABC Fitness is retired and
# GymMaster has no membership products configured, so neither can receive
# buyers. Restoring an online purchase path means setting MEMBERSHIP_JOIN_URL
# here and sellsOnline in the frontend config together.
JOIN_URL = os.environ.get(
    'MEMBERSHIP_JOIN_URL',
    'https://santacruzstrength.com/join#book-a-tour',
)

CAMPAIGN_SUBJECTS = [
    "We've been thinking about you.",
    "Your spot's still here.",
    "Come back and train with us.",
]

def _campaign_email_html(first_name: str, join_url: str, wave: int = 1) -> str:
    first_name = escape_html(first_name)
    join_url = escape_html(join_url)
    subject_line = f"Hey {first_name},"
    body = ""
    cta = "Get Started →"
    footer = "151 Harvey West Blvd, Santa Cruz CA."

    if wave == 1:
        subject_line = f"Hey {first_name},"
        body = f"""
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">We've been thinking about you.</p>
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">We just wrapped our 11th annual <strong>Iron Roses</strong>, and moments like that remind us what this place really is.</p>
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">It's not just a gym.<br>It's the people. The energy. The ones who show up and put in real work.</p>
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;"><strong>You were part of that.</strong> And it's not the same without you here.</p>
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">Life gets busy, things shift - we understand that. But if there's even a part of you that's been missing training&hellip; missing that feeling of getting stronger&hellip; missing being around people who actually push you&hellip;</p>
        <p style="margin:0 0 24px;font-size:16px;font-weight:700;color:#1a1a1a;">We want you back in the space.</p>
        <div style="background:#f7f5f0;border-left:4px solid #0D5D3E;padding:16px 20px;margin:0 0 24px;border-radius:0 8px 8px 0;">
          <p style="margin:0 0 6px;font-size:15px;font-weight:800;color:#0D5D3E;">🔥 Come Back Stronger</p>
          <p style="margin:0;font-size:14px;color:#444;line-height:1.6;">Sign up for any committed membership and we'll give you <strong>2 months free</strong>.<br>No codes. No extra steps. Just sign up, show up, and train - we'll take care of the rest.</p>
        </div>"""
        cta = "Claim Your 2 Months Free →"
        footer = "You don't need to be \"ready.\" You just need to walk back through the door."
    elif wave == 2:
        subject_line = f"Hey {first_name} - last chance."
        body = f"""
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">We sent you a note a week ago about coming back to Santa Cruz Strength.</p>
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">We're following up because the offer - <strong>2 months free on any committed membership</strong> - doesn't last forever.</p>
        <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.7;">If you've been on the fence, this is your moment. We'd love to have you back.</p>"""
        cta = "Get 2 Months Free - Last Chance →"
        footer = "No pressure. But the door is open."
    else:
        subject_line = f"Hey {first_name} - we saved your spot."
        body = f"""
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">We've reached out a couple of times because we genuinely want you back.</p>
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">This is our final note. Your spot at Santa Cruz Strength - and the <strong>2 months free offer</strong> - is still here. But we won't keep asking.</p>
        <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.7;">When you're ready, we'll be here. That's a promise.</p>"""
        cta = "Come Back - Offer Ends Soon →"
        footer = "151 Harvey West Blvd, Santa Cruz CA. The best place to get stronger in and around Santa Cruz."

    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F7F5F0;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F0;padding:36px 16px;">
  <tr><td align="center">
    <table width="580" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:14px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <tr><td style="background:#0D5D3E;padding:24px 36px;">
        <p style="margin:0;color:#CDE4DF;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Santa Cruz Strength</p>
        <p style="margin:6px 0 0;color:#ffffff;font-size:18px;font-weight:800;letter-spacing:0.5px;">151 Harvey West Blvd · Santa Cruz, CA</p>
      </td></tr>
      <tr><td style="padding:32px 36px 8px;">
        <p style="margin:0 0 20px;font-size:17px;font-weight:700;color:#1a1a1a;">{subject_line}</p>
        {body}
        <table cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
          <tr><td style="background:#FA5A5C;border-radius:9px;">
            <a href="{join_url}" style="display:inline-block;padding:14px 30px;color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;letter-spacing:0.3px;">{cta}</a>
          </td></tr>
        </table>
        <p style="margin:0 0 28px;font-size:13px;color:#888;line-height:1.6;font-style:italic;">{footer}</p>
        <p style="margin:0;font-size:14px;color:#555;font-weight:600;"> - Santa Cruz Strength</p>
      </td></tr>
      <tr><td style="border-top:1px solid #eee;padding:16px 36px;background:#fafaf9;">
        <p style="margin:0;font-size:11px;color:#aaa;line-height:1.6;">
          Santa Cruz Strength · 151 Harvey West Blvd Ste D, Santa Cruz CA 95060<br>
          <a href="tel:+14083376709" style="color:#0D5D3E;text-decoration:none;">(408) 337-6709</a> ·
          <a href="https://www.instagram.com/santacruzstrength/" style="color:#0D5D3E;text-decoration:none;">@santacruzstrength</a><br>
          <a href="{{unsubscribe_url}}" style="color:#999;text-decoration:underline;">Unsubscribe from marketing email</a>
        </p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>"""

def _campaign_sms(first_name: str, join_url: str, wave: int = 1) -> str:
    name = first_name or 'there'
    if wave == 1:
        return (f"Hey {name}, Santa Cruz Strength here. We've been thinking about you - especially after Iron Roses this year. "
                f"If you've been missing training, your spot's still here. Sign up for any committed membership and we'll give you 2 months free. No catch. {join_url} - SCS")
    elif wave == 2:
        return (f"Hey {name}, last reminder from SCS - 2 months free on any committed membership if you come back. "
                f"Offer won't last. {join_url} Reply STOP to opt out.")
    else:
        return (f"Hey {name}, final note from Santa Cruz Strength. Your spot and the 2-month free offer are still here. "
                f"When you're ready: {join_url} - SCS")

# Campaign CRUD
@api_router.get('/staff/campaigns/preview-count')
async def campaign_preview_count(
    tag: str = '', source: str = '', interest: str = '', statuses: str = '',
    user=Depends(require_admin)
):
    """Returns how many leads match the given campaign filter."""
    query = {'email': {'$nin': ['', None]}, **EMAIL_MARKETING_FILTER}
    if tag:
        query['tags'] = tag
    if source:
        query['lead_source'] = source
    if interest:
        query['interest_type'] = interest
    if statuses:
        query['status'] = {'$in': [s.strip() for s in statuses.split(',') if s.strip()]}
    count = await db.leads.count_documents(query)
    return {'count': count}

@api_router.get('/staff/campaigns')
async def list_campaigns(user=Depends(require_admin)):
    campaigns = await db.campaigns.find({}, {'_id': 0}).sort('created_at', -1).to_list(50)
    for c in campaigns:
        c['sent_count'] = await db.campaign_sends.count_documents({'campaign_id': c['id'], 'wave': 1})
        c['total_leads'] = await db.leads.count_documents({
            'email': {'$ne': ''},
            **EMAIL_MARKETING_FILTER,
            'tags': c.get('tag_filter', 'imported'),
            **(({'lead_source': c['source_filter']} if c.get('source_filter') else {}))
        })
    return campaigns

@api_router.post('/staff/campaigns')
async def create_campaign(data: dict, user=Depends(require_admin)):
    campaign_id = str(uuid.uuid4())
    doc = {
        'id': campaign_id,
        'name': data.get('name', 'Re-engagement Campaign'),
        'status': 'draft',
        'subject_options': data.get('subject_options', CAMPAIGN_SUBJECTS),
        'join_url': data.get('join_url', JOIN_URL),
        'tag_filter': data.get('tag_filter', 'imported'),
        'source_filter': data.get('source_filter', 'csv_import'),
        'status_filter': data.get('status_filter', []),
        'interest_filter': data.get('interest_filter', ''),
        'batch_size_per_day': int(data.get('batch_size_per_day', 70)),
        'send_email': data.get('send_email', True),
        'send_sms': data.get('send_sms', True),
        'wave2_delay_days': int(data.get('wave2_delay_days', 7)),
        'wave3_delay_days': int(data.get('wave3_delay_days', 14)),
        'last_sent_date': None,
        'created_by': user['id'],
        'created_by_name': user['name'],
        'created_at': now_utc().isoformat(),
        'updated_at': now_utc().isoformat(),
    }
    await db.campaigns.insert_one(doc)
    doc.pop('_id', None)
    return doc

@api_router.get('/staff/campaigns/{campaign_id}')
async def get_campaign(campaign_id: str, user=Depends(require_admin)):
    c = await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})
    if not c:
        raise HTTPException(status_code=404, detail='Campaign not found')
    c['wave1_sent'] = await db.campaign_sends.count_documents({'campaign_id': campaign_id, 'wave': 1})
    c['wave2_sent'] = await db.campaign_sends.count_documents({'campaign_id': campaign_id, 'wave': 2})
    c['wave3_sent'] = await db.campaign_sends.count_documents({'campaign_id': campaign_id, 'wave': 3})
    c['total_leads'] = await db.leads.count_documents({
        'email': {'$nin': ['', None]}, **EMAIL_MARKETING_FILTER,
        'tags': c.get('tag_filter', 'imported'),
    })
    return c

@api_router.post('/staff/campaigns/{campaign_id}/start')
async def start_campaign(campaign_id: str, user=Depends(require_admin)):
    c = await db.campaigns.find_one({'id': campaign_id})
    if not c:
        raise HTTPException(status_code=404, detail='Campaign not found')
    await db.campaigns.update_one({'id': campaign_id}, {
        '$set': {'status': 'active', 'last_sent_date': None, 'updated_at': now_utc().isoformat()}
    })
    # Trigger first batch immediately (don't wait for scheduled 10 AM run)
    asyncio.ensure_future(_run_single_campaign(campaign_id))
    return {'message': 'Campaign started - first batch sending now', 'status': 'active'}

@api_router.post('/staff/campaigns/{campaign_id}/pause')
async def pause_campaign(campaign_id: str, user=Depends(require_admin)):
    await db.campaigns.update_one({'id': campaign_id}, {'$set': {'status': 'paused', 'updated_at': now_utc().isoformat()}})
    return {'message': 'Campaign paused', 'status': 'paused'}

@api_router.put('/staff/campaigns/{campaign_id}')
async def update_campaign(campaign_id: str, data: dict, user=Depends(require_admin)):
    """Update campaign - used by the email builder to save blocks + generated HTML."""
    c = await db.campaigns.find_one({'id': campaign_id})
    if not c:
        raise HTTPException(status_code=404, detail='Campaign not found')
    allowed = ['name','blocks','email_html_template','subject_options','batch_size_per_day',
               'send_email','send_sms','tag_filter','source_filter','status_filter',
               'interest_filter','wave2_delay_days','wave3_delay_days','join_url']
    update = {k: v for k, v in data.items() if k in allowed}
    update['updated_at'] = now_utc().isoformat()
    await db.campaigns.update_one({'id': campaign_id}, {'$set': update})
    return await db.campaigns.find_one({'id': campaign_id}, {'_id': 0})

@api_router.post('/staff/campaigns/{campaign_id}/test-send')
async def test_send_campaign(campaign_id: str, user=Depends(require_admin)):
    """Send a test email to the logged-in staff user."""
    c = await db.campaigns.find_one({'id': campaign_id})
    if not c:
        raise HTTPException(status_code=404, detail='Campaign not found')
    html_template = c.get('email_html_template', '')
    test_html = (html_template or '<p>No email content yet. Build your email in the Email Builder first.</p>') \
        .replace('{{first_name}}', user.get('name', 'Test').split()[0]) \
        .replace('{{last_name}}', '') \
        .replace('{{gym_name}}', 'Santa Cruz Strength') \
        .replace('{{join_url}}', c.get('join_url', JOIN_URL)) \
        .replace('{{gym_phone}}', '(408) 337-6709')
    subjects = c.get('subject_options', ['Test Email'])
    subject = f"[TEST] {subjects[0] if subjects else 'Campaign Preview'}"
    ok = await send_resend_email(to=user['email'], subject=subject, html=test_html)
    if ok:
        return {'message': 'Test email sent', 'sent_to': user['email']}
    raise HTTPException(status_code=500, detail='Failed to send test email')

@api_router.post('/staff/campaigns/{campaign_id}/test-sms')
async def test_sms_campaign(campaign_id: str, user=Depends(require_admin)):
    """Send a test SMS to the staff member's phone on record (if any)."""
    c = await db.campaigns.find_one({'id': campaign_id})
    if not c:
        raise HTTPException(status_code=404, detail='Campaign not found')
    if not TWILIO_PHONE_NUMBER:
        raise HTTPException(status_code=400, detail='Twilio phone number is not configured')
    staff_numbers = await get_sms_staff_numbers()
    if not staff_numbers:
        raise HTTPException(status_code=400, detail='No staff SMS numbers configured in Settings')
    sms_tpl = c.get('sms_template', '')
    if not sms_tpl:
        raise HTTPException(status_code=400, detail='No SMS template saved yet - build it in the SMS Builder first')
    test_text = sms_tpl \
        .replace('{{first_name}}', user.get('name', 'Test').split()[0]) \
        .replace('{{last_name}}', '').replace('{{gym_name}}', 'Santa Cruz Strength') \
        .replace('{{join_url}}', c.get('join_url', JOIN_URL)).replace('{{gym_phone}}', '(408) 337-6709')
    ok = await send_sms(staff_numbers[:1], f'[TEST] {test_text}')
    if ok:
        return {'message': 'Test SMS sent', 'sent_to': staff_numbers[0]}
    raise HTTPException(status_code=500, detail='Failed to send test SMS')

# Campaign scheduler - runs every hour, sends daily batch
async def _run_single_campaign(campaign_id: str):
    """Send the next batch for one campaign. Called on start AND by scheduler."""
    campaign = await db.campaigns.find_one({'id': campaign_id, 'status': 'active'})
    if not campaign:
        return

    cid          = campaign['id']
    today        = now_utc().date().isoformat()
    tag_filter   = campaign.get('tag_filter', 'imported')
    batch_size   = campaign.get('batch_size_per_day', 70)
    join_url     = campaign.get('join_url', JOIN_URL)
    subjects     = campaign.get('subject_options', CAMPAIGN_SUBJECTS)
    status_filter = campaign.get('status_filter') or []
    source_filter = campaign.get('source_filter') or ''
    interest_filter = campaign.get('interest_filter') or ''

    # Skip if already sent today (prevent double-sends)
    if campaign.get('last_sent_date') == today:
        return

    # Build lead query from campaign filters
    lead_query = {'email': {'$nin': ['', None]}, **EMAIL_MARKETING_FILTER}
    if tag_filter:
        lead_query['tags'] = tag_filter
    if status_filter:
        lead_query['status'] = {'$in': status_filter}
    if source_filter:
        lead_query['lead_source'] = source_filter
    if interest_filter:
        lead_query['interest_type'] = interest_filter

    # ── Wave 1 ────────────────────────────────────────────────────────────────
    already_sent_ids = [
        s['lead_id'] async for s in db.campaign_sends.find({'campaign_id': cid, 'wave': 1}, {'lead_id': 1, '_id': 0})
    ]
    lead_query['id'] = {'$nin': already_sent_ids}
    leads = await db.leads.find(lead_query, {'_id': 0, 'id': 1, 'first_name': 1, 'email': 1, 'phone': 1, 'sms_marketing_opt_in': 1, 'sms_opted_out': 1}).limit(batch_size).to_list(batch_size)

    sent_wave1 = 0
    for idx, lead in enumerate(leads):
        # Check quota before each send - always keep 10 slots for staff emails
        if not await _check_campaign_quota():
            logger.warning(f'[CAMPAIGN] Daily quota nearly full - pausing to protect staff email reserve')
            break
        subject = subjects[idx % len(subjects)]
        # Use blocks-generated HTML if available, else fallback to Iron Roses template
        custom_html = campaign.get('email_html_template', '')
        if custom_html:
            html = custom_html \
                .replace('{{first_name}}', escape_html(lead.get('first_name', 'Friend'))) \
                .replace('{{last_name}}',  escape_html(lead.get('last_name', ''))) \
                .replace('{{gym_name}}',   'Santa Cruz Strength') \
                .replace('{{join_url}}',   join_url) \
                .replace('{{gym_phone}}',  '(408) 337-6709')
        else:
            html = _campaign_email_html(lead.get('first_name', 'there'), join_url, wave=1)
        email_ok = await send_resend_email(to=lead['email'], subject=subject, html=html, message_kind='marketing')
        if email_ok:
            await _track_email_send(is_campaign=True)
        sms_ok = False
        if campaign.get('send_sms') and lead.get('phone') and lead.get('sms_marketing_opt_in') is True and not lead.get('sms_opted_out') and TWILIO_PHONE_NUMBER:
            sms_text = _campaign_sms(lead.get('first_name', 'there'), join_url, wave=1)
            sms_ok   = await send_sms([lead['phone']], sms_text)
        if email_ok:
            try:
                await db.campaign_sends.insert_one({
                    'id': str(uuid.uuid4()), 'campaign_id': cid, 'lead_id': lead['id'],
                    'wave': 1, 'email_sent': email_ok, 'sms_sent': sms_ok,
                    'subject': subject, 'sent_at': now_utc().isoformat(),
                })
                sent_wave1 += 1
            except Exception:
                pass  # duplicate key - already sent
        await asyncio.sleep(0.25)  # stay under Resend 5/sec rate limit

    # ── Wave 2 ────────────────────────────────────────────────────────────────
    wave2_cutoff = (now_utc() - timedelta(days=campaign.get('wave2_delay_days', 7))).isoformat()
    wave1_for_w2 = await db.campaign_sends.find(
        {'campaign_id': cid, 'wave': 1, 'sent_at': {'$lte': wave2_cutoff}},
        {'lead_id': 1, '_id': 0}
    ).to_list(1000)
    wave2_done = {s['lead_id'] async for s in db.campaign_sends.find({'campaign_id': cid, 'wave': 2}, {'lead_id': 1, '_id': 0})}
    sent_wave2 = 0
    for send in wave1_for_w2:
        if send['lead_id'] in wave2_done:
            continue
        if not await _check_campaign_quota():
            logger.warning(f'[CAMPAIGN] Daily quota nearly full - pausing wave 2')
            break
        lead = await db.leads.find_one({'id': send['lead_id'], **EMAIL_MARKETING_FILTER}, {'_id': 0, 'id': 1, 'first_name': 1, 'last_name': 1, 'email': 1, 'phone': 1, 'sms_marketing_opt_in': 1, 'sms_opted_out': 1})
        if not lead or not lead.get('email'):
            continue
        custom_html = campaign.get('email_html_template', '')
        if custom_html:
            html = custom_html \
                .replace('{{first_name}}', escape_html(lead.get('first_name', 'Friend'))) \
                .replace('{{last_name}}',  escape_html(lead.get('last_name', ''))) \
                .replace('{{gym_name}}',   'Santa Cruz Strength') \
                .replace('{{join_url}}',   join_url) \
                .replace('{{gym_phone}}',  '(408) 337-6709')
        else:
            html = _campaign_email_html(lead.get('first_name', 'there'), join_url, wave=2)
        w2_subject = subjects[1] if len(subjects) > 1 else "Your spot's still open - 2 months free"
        ok = await send_resend_email(to=lead['email'], subject=w2_subject, html=html, message_kind='marketing')
        if ok:
            await _track_email_send(is_campaign=True)
        sms_ok = False
        if campaign.get('send_sms') and lead.get('phone') and lead.get('sms_marketing_opt_in') is True and not lead.get('sms_opted_out'):
            sms_tpl = campaign.get('sms_template', '')
            if sms_tpl:
                sms_text = sms_tpl \
                    .replace('{{first_name}}', safe_sms_text(lead.get('first_name', 'there'), 100)) \
                    .replace('{{last_name}}', safe_sms_text(lead.get('last_name', ''), 100)) \
                    .replace('{{gym_name}}', 'Santa Cruz Strength') \
                    .replace('{{join_url}}', join_url) \
                    .replace('{{gym_phone}}', '(408) 337-6709')
            else:
                sms_text = _campaign_sms(lead.get('first_name', 'there'), join_url, wave=2)
            sms_ok = await send_sms([lead['phone']], sms_text)
        if ok:
            try:
                await db.campaign_sends.insert_one({
                    'id': str(uuid.uuid4()), 'campaign_id': cid, 'lead_id': lead['id'],
                    'wave': 2, 'email_sent': True, 'sms_sent': sms_ok,
                    'subject': w2_subject, 'sent_at': now_utc().isoformat(),
                })
                sent_wave2 += 1
            except Exception:
                pass
        await asyncio.sleep(0.25)

    # ── Wave 3 ────────────────────────────────────────────────────────────────
    wave3_cutoff = (now_utc() - timedelta(days=campaign.get('wave3_delay_days', 14))).isoformat()
    wave2_for_w3 = await db.campaign_sends.find(
        {'campaign_id': cid, 'wave': 2, 'sent_at': {'$lte': wave3_cutoff}},
        {'lead_id': 1, '_id': 0}
    ).to_list(1000)
    wave3_done = {s['lead_id'] async for s in db.campaign_sends.find({'campaign_id': cid, 'wave': 3}, {'lead_id': 1, '_id': 0})}
    sent_wave3 = 0
    for send in wave2_for_w3:
        if send['lead_id'] in wave3_done:
            continue
        if not await _check_campaign_quota():
            logger.warning(f'[CAMPAIGN] Daily quota nearly full - pausing wave 3')
            break
        lead = await db.leads.find_one({'id': send['lead_id'], **EMAIL_MARKETING_FILTER}, {'_id': 0, 'id': 1, 'first_name': 1, 'last_name': 1, 'email': 1, 'phone': 1, 'sms_marketing_opt_in': 1, 'sms_opted_out': 1})
        if not lead or not lead.get('email'):
            continue
        custom_html = campaign.get('email_html_template', '')
        if custom_html:
            html = custom_html \
                .replace('{{first_name}}', escape_html(lead.get('first_name', 'Friend'))) \
                .replace('{{last_name}}',  escape_html(lead.get('last_name', ''))) \
                .replace('{{gym_name}}',   'Santa Cruz Strength') \
                .replace('{{join_url}}',   join_url) \
                .replace('{{gym_phone}}',  '(408) 337-6709')
        else:
            html = _campaign_email_html(lead.get('first_name', 'there'), join_url, wave=3)
        w3_subject = subjects[2] if len(subjects) > 2 else "We saved your spot."
        ok = await send_resend_email(to=lead['email'], subject=w3_subject, html=html, message_kind='marketing')
        if ok:
            await _track_email_send(is_campaign=True)
        sms_ok = False
        if campaign.get('send_sms') and lead.get('phone') and lead.get('sms_marketing_opt_in') is True and not lead.get('sms_opted_out'):
            sms_tpl = campaign.get('sms_template', '')
            if sms_tpl:
                sms_text = sms_tpl \
                    .replace('{{first_name}}', safe_sms_text(lead.get('first_name', 'there'), 100)) \
                    .replace('{{last_name}}', safe_sms_text(lead.get('last_name', ''), 100)) \
                    .replace('{{gym_name}}', 'Santa Cruz Strength') \
                    .replace('{{join_url}}', join_url) \
                    .replace('{{gym_phone}}', '(408) 337-6709')
            else:
                sms_text = _campaign_sms(lead.get('first_name', 'there'), join_url, wave=3)
            sms_ok = await send_sms([lead['phone']], sms_text)
        if ok:
            try:
                await db.campaign_sends.insert_one({
                    'id': str(uuid.uuid4()), 'campaign_id': cid, 'lead_id': lead['id'],
                    'wave': 3, 'email_sent': True, 'sms_sent': sms_ok,
                    'subject': w3_subject, 'sent_at': now_utc().isoformat(),
                })
                sent_wave3 += 1
            except Exception:
                pass
        await asyncio.sleep(0.25)

    # Update campaign progress - only "completed" when ALL waves are done for ALL leads
    total_eligible = await db.leads.count_documents({k: v for k, v in lead_query.items() if k != 'id'})
    total_w1       = await db.campaign_sends.count_documents({'campaign_id': cid, 'wave': 1})
    total_w3       = await db.campaign_sends.count_documents({'campaign_id': cid, 'wave': 3})
    # Campaign is complete only when wave 3 has been sent to all wave 1 recipients
    all_waves_done = total_w1 >= total_eligible and total_w3 >= total_w1
    new_status     = 'completed' if all_waves_done else 'active'
    await db.campaigns.update_one({'id': cid}, {'$set': {
        'last_sent_date': today, 'status': new_status, 'updated_at': now_utc().isoformat()
    }})
    total_actions = sent_wave1 + sent_wave2 + sent_wave3
    if total_actions:
        logger.info(f'[CAMPAIGN] {campaign["name"]}: w1={sent_wave1} w2={sent_wave2} w3={sent_wave3} ({total_w1}/{total_eligible} through pipeline)')

async def run_campaign_scheduler():
    """Runs every hour - sends daily campaign batches (waves 2+3 also checked here)."""
    today    = now_utc().date().isoformat()
    campaigns = await db.campaigns.find({'status': 'active'}, {'_id': 0, 'id': 1, 'last_sent_date': 1}).to_list(20)
    for c in campaigns:
        if c.get('last_sent_date') != today:
            await _run_single_campaign(c['id'])
GOOGLE_REVIEW_URL = 'https://g.page/r/CUj8NPJ7NHNOEAE/review'
async def _send_review_request(lead: dict):
    """Create review token + send branded email + SMS to new member."""
    name  = f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip() or 'there'
    email = lead.get('email', '')
    phone = lead.get('phone', '')
    lead_id = lead.get('id', '')
    if not email and not phone:
        return
    token = str(uuid.uuid4())
    expires = now_utc() + timedelta(days=30)
    await db.review_requests.insert_one({
        'id': str(uuid.uuid4()), 'token': token, 'lead_id': lead_id,
        'name': name, 'email': email, 'phone': phone,
        'expires_at': expires.isoformat(), 'submitted': False, 'created_at': now_utc().isoformat(),
    })
    frontend_url = require_frontend_origin()
    review_page_url = f"{frontend_url}/review/{token}"
    if email:
        await send_resend_email(
            to=email,
            subject=f"Welcome to Santa Cruz Strength, {name}! Share your experience",
            html=_review_email_html(name, review_page_url),
        )
    if phone and phone.startswith('+') and lead.get('sms_marketing_opt_in') is True and not lead.get('sms_opted_out') and TWILIO_PHONE_NUMBER:
        sms = (f"Hey {name.split()[0]}, welcome to Santa Cruz Strength! "
               f"We'd love to hear about your experience - takes 10 seconds: {review_page_url} - SCS")
        await send_sms([phone], sms)
    logger.info(f'[REVIEW] Request sent to {name} - token {token}')
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F7F5F0;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
      <tr><td style="background:#0D5D3E;padding:28px 36px;text-align:center;">
        <p style="margin:0;color:#CDE4DF;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Santa Cruz Strength</p>
        <p style="margin:8px 0 0;color:#ffffff;font-size:24px;font-weight:800;">Welcome to the family, {name}!</p>
      </td></tr>
      <tr><td style="padding:36px;text-align:center;">
        <p style="margin:0 0 8px;font-size:32px;">🏋️</p>
        <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#1a1a1a;">You're officially part of the crew.</p>
        <p style="margin:0 0 28px;font-size:14px;color:#555;line-height:1.65;">
          Stoked to have you at Santa Cruz Strength. We'd love to hear how your first experience has been - it only takes 10 seconds.
        </p>
        <table cellpadding="0" cellspacing="0" style="margin:0 auto 24px;">
          <tr><td style="background:#0D5D3E;border-radius:10px;">
            <a href="{review_url}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
              Share Your Experience ★
            </a>
          </td></tr>
        </table>
        <p style="margin:0;font-size:12px;color:#999;">Takes less than 10 seconds. Your feedback helps us get better.</p>
      </td></tr>
      <tr><td style="border-top:1px solid #eee;padding:16px 36px;background:#fafaf9;text-align:center;">
        <p style="margin:0;font-size:11px;color:#aaa;">Santa Cruz Strength · 151 Harvey West Blvd Ste D, Santa Cruz CA</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>"""

def _feedback_email_html(name: str, rating: int, category: str, follow_up: str, extra: str) -> str:
    name = escape_html(name)
    category = escape_html(category)
    follow_up = escape_html(follow_up)
    extra = escape_html(extra)
    stars = '★' * rating + '☆' * (5 - rating)
    return f"""<!DOCTYPE html><html><head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f1a14;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 20px;">
  <tr><td align="center">
    <table width="520" cellpadding="0" cellspacing="0" style="background:#111f16;border-radius:12px;overflow:hidden;border:1px solid #1e3327;">
      <tr><td style="background:#8B1A1A;padding:20px 28px;">
        <p style="margin:0;color:#ffcccc;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Member Feedback Alert</p>
        <p style="margin:6px 0 0;color:#ffffff;font-size:18px;font-weight:800;">{name} left a {rating}-star review</p>
      </td></tr>
      <tr><td style="padding:28px;">
        <p style="margin:0 0 6px;color:#8FBF9F;font-size:13px;font-weight:600;">Rating</p>
        <p style="margin:0 0 20px;font-size:28px;color:#FA5A5C;letter-spacing:4px;">{stars}</p>
        <p style="margin:0 0 6px;color:#8FBF9F;font-size:13px;font-weight:600;">Area needing improvement</p>
        <p style="margin:0 0 20px;color:#e8f5ee;font-size:14px;">{category or 'Not specified'}</p>
        <p style="margin:0 0 6px;color:#8FBF9F;font-size:13px;font-weight:600;">Specific feedback</p>
        <p style="margin:0 0 20px;color:#e8f5ee;font-size:14px;line-height:1.6;">{follow_up or 'Not provided'}</p>
        <p style="margin:0 0 6px;color:#8FBF9F;font-size:13px;font-weight:600;">Additional comments</p>
        <p style="margin:0;color:#e8f5ee;font-size:14px;line-height:1.6;">{extra or 'None'}</p>
      </td></tr>
    </table>
  </td></tr>
</table></body></html>"""

@api_router.post('/review/request/{lead_id}')
async def create_review_request(lead_id: str, user=Depends(require_staff)):
    """Internal - called when lead status changes to Joined."""
    # The docstring said internal and the endpoint was not. Anyone who could
    # reach the API could mint a review token for any lead id and then read the
    # member's name back through GET /review/{token}. Lead ids are UUID4 so it
    # was not practically enumerable, which is the only reason this was not
    # worse.
    lead = await db.leads.find_one({'id': lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    token = str(uuid.uuid4())
    expires = now_utc() + timedelta(days=30)
    await db.review_requests.insert_one({
        'id': str(uuid.uuid4()), 'token': token, 'lead_id': lead_id,
        'name': f"{lead.get('first_name','')} {lead.get('last_name','')}".strip(),
        'email': lead.get('email', ''), 'phone': lead.get('phone', ''),
        'expires_at': expires.isoformat(), 'submitted': False, 'created_at': now_utc().isoformat(),
    })
    return {'token': token}

@api_router.get('/review/{token}')
async def get_review_request(token: str):
    req = await db.review_requests.find_one({'token': token}, {'_id': 0})
    if not req:
        raise HTTPException(status_code=404, detail='Review link not found')
    if req.get('submitted'):
        raise HTTPException(status_code=400, detail='Already submitted')
    expires = datetime.fromisoformat(req['expires_at'].replace('Z', '+00:00'))
    if expires.tzinfo is None:
        expires = expires.replace(tzinfo=timezone.utc)
    if now_utc() > expires:
        raise HTTPException(status_code=400, detail='This link has expired')
    return {'name': req['name'], 'token': token}

@api_router.post('/review/{token}/submit')
async def submit_review(token: str, data: dict):
    req = await db.review_requests.find_one({'token': token})
    if not req or req.get('submitted'):
        raise HTTPException(status_code=400, detail='Invalid or already submitted')
    rating   = int(data.get('rating', 0))
    category = data.get('category', '')
    follow_up = data.get('follow_up', '')
    extra    = data.get('extra', '')
    await db.review_requests.update_one({'token': token}, {'$set': {
        'submitted': True, 'submitted_at': now_utc().isoformat(),
        'rating': rating, 'category': category, 'follow_up': follow_up, 'extra': extra,
    }})
    # If negative, email management
    if rating <= 3:
        await send_resend_email(
            to='management@santacruzstrength.com',
            subject=f'⚠️ {rating}-Star Member Feedback - {req["name"]}',
            html=_feedback_email_html(req['name'], rating, category, follow_up, extra),
        )
    return {'message': 'Thank you for your feedback!', 'rating': rating}

# --------------- Resend Webhook (bounces + complaints) ---------------

async def _apply_verified_resend_suppression(event_type: str, to_addr: str) -> None:
    """Apply only a signature-verified Resend suppression event."""
    if event_type not in {'email.bounced', 'email.complained'}:
        return
    email_lower = to_addr.lower().strip()
    if not email_lower:
        return
    suppression_field = 'email_complained' if event_type == 'email.complained' else 'email_bounced'
    await db.leads.update_many(
        {'email': email_lower},
        {'$set': {
            suppression_field: True,
            'bounce_type': event_type,
            'bounce_at': now_utc().isoformat(),
            'updated_at': now_utc().isoformat(),
        }},
    )

@api_router.post('/webhooks/resend')
async def resend_webhook():
    """Fail closed until the installed Resend SDK verifier is validated."""
    raise HTTPException(status_code=503, detail='Resend webhooks are disabled pending verified signature support')


@api_router.get('/staff/bounce-log')
async def get_bounce_log(user=Depends(require_admin)):
    """View today's pending bounce/failure entries before the daily digest sends."""
    today = now_utc().date().isoformat()
    entries = await db.daily_bounce_log.find({'date': today}, {'_id': 0}).to_list(500)
    return {'date': today, 'entries': entries, 'total': len(entries)}

@api_router.post('/staff/bounce-log/send-now')
async def send_bounce_digest_now(user=Depends(require_admin)):
    """Manually trigger the daily bounce digest email right now."""
    await run_daily_bounce_digest()
    return {'ok': True, 'message': 'Digest sent (if entries existed)'}

# --------------- Twilio Webhooks ---------------

async def _validated_twilio_form(request: Request, event_kind: str):
    if not ALLOW_TWILIO_WEBHOOKS:
        raise HTTPException(status_code=503, detail='Twilio webhooks are disabled')
    signature = request.headers.get('X-Twilio-Signature', '')
    if not signature:
        raise HTTPException(status_code=403, detail='Missing Twilio signature')
    form = await request.form()
    params = dict(form)
    base_url = os.environ.get('TWILIO_WEBHOOK_BASE_URL', '').rstrip('/')
    validation_url = f'{base_url}{request.url.path}'
    if request.url.query:
        validation_url = f'{validation_url}?{request.url.query}'
    validator = RequestValidator(os.environ.get('TWILIO_AUTH_TOKEN', ''))
    if not validator.validate(validation_url, params, signature):
        raise HTTPException(status_code=403, detail='Invalid Twilio signature')
    sender = str(form.get('To') if event_kind == 'status' else form.get('From') or '').strip()
    if APP_ENV != 'production' and sender and not outbound_recipient_allowed('sms', sender):
        raise HTTPException(status_code=403, detail='Twilio number is not in the non-production allowlist')
    message_sid = str(form.get('MessageSid') or form.get('SmsSid') or '').strip()
    if not message_sid:
        raise HTTPException(status_code=400, detail='Missing Twilio MessageSid')
    status_value = str(form.get('MessageStatus') or '').strip()
    event_key = f'twilio:{event_kind}:{message_sid}:{status_value}'
    # The unique MongoDB index makes replay rejection shared across API workers
    # that use the same database. Deployments with separate databases need an
    # edge-level or shared-store replay ledger as well.
    try:
        await db.webhook_receipts.insert_one({
            'event_key': event_key,
            'provider': 'twilio',
            'event_kind': event_kind,
            'received_at': now_utc().isoformat(),
        })
    except DuplicateKeyError:
        return form, True
    return form, False

async def _apply_sms_keyword_state(from_number: str, msg_upper: str) -> bool:
    """Apply a verified STOP or START keyword before acknowledging the change."""
    timestamp = now_utc().isoformat()
    if msg_upper in ('STOP', 'UNSUBSCRIBE', 'CANCEL', 'QUIT'):
        result = await db.leads.update_many(
            phone_match_query(from_number),
            {'$set': {
                'sms_opted_out': True,
                'sms_consent': False,
                'sms_operational_opt_in': False,
                'sms_marketing_opt_in': False,
                'sms_opted_out_at': timestamp,
                'sms_consent_source': 'keyword_stop',
                'updated_at': timestamp,
            }},
        )
        return result.matched_count > 0
    if msg_upper == 'START':
        result = await db.leads.update_many(
            phone_match_query(from_number),
            {'$set': {
                'sms_opted_out': False,
                'sms_consent': True,
                'sms_operational_opt_in': True,
                'sms_marketing_opt_in': False,
                'sms_started_at': timestamp,
                'sms_consent_source': 'keyword_start',
                'updated_at': timestamp,
            }},
        )
        return result.matched_count > 0
    return False

async def _twilio_inbound_background(from_number: str, message: str, msg_upper: str):
    """Background task for all DB/email work after TwiML is already returned to Twilio."""
    try:
        if msg_upper in ('STOP', 'UNSUBSCRIBE', 'CANCEL', 'QUIT'):
            lead = await db.leads.find_one(phone_match_query(from_number), {'_id': 0, 'first_name': 1, 'last_name': 1, 'email': 1, 'lead_source': 1})
            logger.info(f'[TWILIO-BG] STOP processed for {from_number}')
            await db.daily_bounce_log.insert_one({
                'type': 'sms_optout',
                'event': 'SMS STOP received (Twilio)',
                'phone': from_number,
                'name': f"{(lead or {}).get('first_name', '')} {(lead or {}).get('last_name', '')}".strip() or 'Unknown',
                'email': (lead or {}).get('email', ''),
                'source': (lead or {}).get('lead_source', ''),
                'timestamp': now_utc().isoformat(),
                'date': now_utc().date().isoformat(),
            })
        elif msg_upper == 'START':
            logger.info(f'[TWILIO-BG] START/resubscribe processed for {from_number}')
        else:
            lead = await db.leads.find_one(phone_match_query(from_number), {'_id': 0, 'first_name': 1, 'last_name': 1, 'email': 1})
            lead_name = f"{(lead or {}).get('first_name', '')} {(lead or {}).get('last_name', '')}".strip() or 'Unknown'
            safe_from = escape_html(from_number)
            safe_name = escape_html(lead_name)
            safe_message = escape_html(message)
            html = f"""<div style="font-family:sans-serif;background:#111;color:#fff;padding:24px;border-radius:8px;">
<h3 style="color:#7FCCA6;">SMS Reply Received</h3>
<p style="color:#aaa;">From: <strong style="color:#fff;">{safe_from}</strong> ({safe_name})</p>
<p style="color:#aaa;">Message:</p>
<p style="background:#1B1B1B;padding:12px;border-radius:6px;color:#fff;font-size:15px;">"{safe_message}"</p>
<p style="color:#666;font-size:12px;margin-top:12px;">Auto-reply was sent. Follow up via Google Voice: voice.google.com</p>
</div>"""
            await send_resend_email(to=STAFF_EMAIL, subject=safe_sms_text(f'SMS Reply from {from_number} ({lead_name})', 220), html=html, message_kind='internal')
            if lead:
                await db.leads.update_one(
                    phone_match_query(from_number),
                    {'$push': {'activity_log': {
                        'action': 'sms_reply',
                        'note': f'Replied via SMS: "{message[:100]}"',
                        'timestamp': now_utc().isoformat(),
                    }}}
                )
            logger.info(f'[TWILIO-BG] Reply from {from_number} ({lead_name}): {message[:80]} - forwarded')
    except Exception as e:
        logger.error(f'[TWILIO-BG] Background processing failed for {from_number}: {e}')


@api_router.get('/webhooks/twilio-sms')
async def twilio_sms_health():
    """Health check - lets you verify the webhook URL is reachable from a browser.

    Returns an EMPTY TwiML document. A <Message> element is an instruction to
    the carrier to send an SMS, so the old body made an unauthenticated GET with
    no flag on it capable of causing an outbound message. An empty <Response> is
    still valid TwiML and still proves the URL is reachable and parsing, which
    is all a health check needs to do.
    """
    return Response(
        content='<Response></Response>',
        media_type='application/xml',
    )


@api_router.post('/webhooks/twilio-sms')
async def twilio_sms_webhook(request: Request):
    """
    Twilio inbound SMS webhook. Returns TwiML IMMEDIATELY, then processes
    DB updates and email forwarding in a background task to avoid timeouts.
    URL: https://santacruzstrength.com/api/webhooks/twilio-sms
    """
    form, duplicate = await _validated_twilio_form(request, 'inbound')
    if duplicate:
        return Response(content='<Response></Response>', media_type='application/xml')
    try:
        from_number = form.get('From', '')
        message     = form.get('Body', '')

        if not from_number or not message:
            return Response(content='<Response></Response>', media_type='application/xml')

        msg_upper = message.strip().upper()
        logger.info(f'[TWILIO-INBOUND] From {from_number}: {message[:80]}')

        # Apply consent state before sending a response that describes that state.
        state_applied = False
        if msg_upper in ('STOP', 'UNSUBSCRIBE', 'CANCEL', 'QUIT', 'START'):
            state_applied = await _apply_sms_keyword_state(from_number, msg_upper)

        # Determine the TwiML reply
        if msg_upper in ('STOP', 'UNSUBSCRIBE', 'CANCEL', 'QUIT'):
            twiml = '<Response><Message>SMS messages are off. Reply START to restore requested tour and membership messages. Marketing consent will remain off.</Message></Response>'
        elif msg_upper == 'START':
            if state_applied:
                twiml = '<Response><Message>Requested tour and membership messages are back on. Marketing messages remain off unless you give separate consent.</Message></Response>'
            else:
                twiml = '<Response><Message>We could not restore messaging for this number. Please contact Santa Cruz Strength at (408) 337-6709.</Message></Response>'
        else:
            auto_reply = (
                "Hey thanks for reaching out! This number is not monitored for replies. "
                "Our team will follow up with you shortly.\n\n"
                "Need to reach us sooner?\n"
                "Call/Text: (408) 337-6709\n"
                "Email: management@santacruzstrength.com\n"
                "Visit: santacruzstrength.com\n\n"
                "Contact us for current staffed hours. Members have 24/7 app access."
            )
            twiml = f'<Response><Message>{auto_reply}</Message></Response>'

        # Fire-and-forget: all DB/email work happens AFTER the response is sent
        asyncio.create_task(_twilio_inbound_background(from_number, message, msg_upper))

        # A TwiML <Message> is an outbound SMS, billed and delivered like any
        # other, so it belongs behind the flag that governs sending. It was
        # behind ALLOW_TWILIO_WEBHOOKS only, which governs whether we ACCEPT
        # inbound, a different question.
        #
        # The consent state above is applied either way and deliberately so.
        # Honouring STOP is not an outbound capability to be switched off; a
        # customer who opts out must be opted out whether or not this service is
        # currently allowed to reply. Only the reply is suppressed.
        if not ALLOW_SMS_SENDS:
            logger.info(
                '[TWILIO-INBOUND] Reply suppressed, ALLOW_SMS_SENDS is off. '
                'Keyword state was still applied.'
            )
            return Response(content='<Response></Response>', media_type='application/xml')

        return Response(content=twiml, media_type='application/xml')
    except Exception as e:
        logger.error(f'[TWILIO-INBOUND] Webhook handler error: {e}')
        return Response(content='<Response></Response>', media_type='application/xml')


@api_router.post('/webhooks/twilio-status')
async def twilio_status_webhook(request: Request):
    """
    Twilio delivery status callback.
    URL: https://santacruzstrength.com/api/webhooks/twilio-status
    """
    form, duplicate = await _validated_twilio_form(request, 'status')
    if duplicate:
        return {'ok': True, 'duplicate': True}
    msg_sid    = form.get('MessageSid', '')
    msg_status = form.get('MessageStatus', '')
    to_number  = form.get('To', '')
    error_code = form.get('ErrorCode', '')

    if msg_status in ('failed', 'undelivered'):
        logger.warning(f'[TWILIO-STATUS] {msg_status} to {to_number} (SID: {msg_sid}, Error: {error_code})')
        lead = await db.leads.find_one({'phone': to_number}, {'_id': 0, 'first_name': 1, 'last_name': 1, 'email': 1, 'lead_source': 1})
        if lead:
            await db.daily_bounce_log.insert_one({
                'type': 'sms_failure',
                'event': f'Twilio {msg_status} (Error: {error_code})',
                'phone': to_number,
                'name': f"{lead.get('first_name', '')} {lead.get('last_name', '')}".strip() or 'Unknown',
                'email': lead.get('email', ''),
                'source': lead.get('lead_source', ''),
                'timestamp': now_utc().isoformat(),
                'date': now_utc().date().isoformat(),
            })
    else:
        logger.info(f'[TWILIO-STATUS] {msg_status} to {to_number} (SID: {msg_sid})')

    return {'ok': True}


# --------------- Media Upload ---------------

import base64 as _base64

@api_router.post('/upload')
async def upload_image(file: UploadFile = File(...), user=Depends(require_admin)):
    """Upload an image file - stores in MongoDB, returns a public URL."""
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail='Only image files are allowed (JPEG, PNG, WebP, GIF)')
    content = await file.read()
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail='File too large - max 8MB')
    media_id = str(uuid.uuid4())
    await db.media.insert_one({
        'id': media_id,
        'filename': file.filename or 'image',
        'content_type': file.content_type,
        'data': _base64.b64encode(content).decode(),
        'size': len(content),
        'created_by': user['id'],
        'created_at': now_utc().isoformat(),
    })
    logger.info(f'[UPLOAD] {file.filename} ({len(content)//1024}KB) by {user["email"]}')
    return {'url': f'/api/media/{media_id}', 'id': media_id, 'filename': file.filename}

@api_router.get('/media/{media_id}')
async def serve_media(media_id: str):
    """Serve an uploaded image publicly - no auth required."""
    media = await db.media.find_one({'id': media_id})
    if not media:
        raise HTTPException(status_code=404, detail='Image not found')
    content = _base64.b64decode(media['data'])
    return Response(
        content=content,
        media_type=media['content_type'],
        headers={'Cache-Control': 'public, max-age=31536000'},
    )


async def seed_blog_posts():
    now = now_utc()
    posts = [
        {
            'id': str(uuid.uuid4()),
            'title': 'Why Surfers in Santa Cruz Should Lift Weights',
            'slug': 'why-surfers-in-santa-cruz-should-lift-weights',
            'excerpt': 'Surfing demands explosive power, rotational strength, and injury resilience. Here\'s why every Santa Cruz surfer should be spending time in the weight room.',
            'content': '''<p>If you surf in Santa Cruz, you already understand athletic effort. Early mornings, cold water, and a lineup that demands respect. What you might not realize is that your time in the gym - specifically lifting weights - could be the biggest performance leap available to you right now.</p>

<h2>Strength Training and Surfing: The Connection</h2>

<p>Surfing is not a low-impact sport. It demands explosive hip extension for pop-ups, rotational power for turns, shoulder stability for paddle-outs, and the core strength to hold position on unpredictable wave faces.</p>

<p>Most surf-specific injuries - rotator cuff issues, lower back pain, knee problems - are rooted in muscular imbalances that strength training directly addresses. When you train compound movements like squats, deadlifts, rows, and overhead pressing, you build the structural resilience that keeps you surfing longer into life.</p>

<h2>The Specific Lifts That Carry Over to Surfing</h2>

<ul>
<li><strong>Deadlifts</strong> - Build posterior chain strength (hamstrings, glutes, lower back) that powers your pop-up and keeps your spine stable in the barrel.</li>
<li><strong>Romanian Deadlifts</strong> - Train the hip hinge pattern under load, improving your ability to generate force from the hips on critical turns.</li>
<li><strong>Barbell Rows</strong> - Strengthen the back muscles that do most of the work during paddle sessions. Better paddling equals more waves.</li>
<li><strong>Front Squats</strong> - Develop quad strength and thoracic mobility - both essential for low, powerful stance positions.</li>
<li><strong>Turkish Get-Ups</strong> - One of the best exercises for the total-body stability and shoulder integrity surfers need.</li>
</ul>

<h2>How Often Should Surfers Lift?</h2>

<p>Two to three sessions per week is enough to see meaningful results without interfering with your time in the water. The key is consistency and progressive overload - adding small amounts of weight over time as your strength develops.</p>

<p>At Santa Cruz Strength, we work with surfers, climbers, trail runners, and other outdoor athletes who want their gym time to directly support their performance. If you\'re curious how to structure a program around your surf schedule, come in and talk to a coach.</p>

<h2>You Don\'t Have to Choose Between the Gym and the Water</h2>

<p>Strength training isn\'t a replacement for surfing. It\'s the foundation that makes everything else better. Local athletes who commit to a year of consistent lifting tell us the same thing: their surfing improved, their injuries decreased, and they feel more capable in every area of life.</p>

<p>That\'s what strength is for.</p>''',
            'category': 'Outdoor Athletes',
            'tags': ['surfing', 'strength training', 'Santa Cruz', 'performance'],
            'cover_image': None,  # see BLOG_COVERS_AWAITING_PERMISSION in blog_articles,
            'published': True,
            'seo_title': 'Why Surfers in Santa Cruz Should Lift Weights | Santa Cruz Strength',
            'seo_description': 'Surfing demands explosive power, rotational strength, and injury resilience. Learn why every Santa Cruz surfer benefits from strength training.',
            'author': 'Santa Cruz Strength',
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'How Many Days a Week Should You Lift? (The Real Answer)',
            'slug': 'how-many-days-a-week-should-you-lift',
            'excerpt': 'It\'s one of the most common questions we get. The answer depends on your goals, recovery capacity, and schedule - but there\'s a clear range that works for most people.',
            'content': '''<p>This is one of the questions we hear most often from new members and people considering joining. The internet gives wildly different answers - some say 6 days a week, others say 2 is enough. The truth is somewhere in the middle, and it depends on you.</p>

<h2>The Short Answer</h2>

<p><strong>For most people: 3 days per week.</strong></p>

<p>Three well-programmed sessions per week is enough to build real strength, add muscle, improve body composition, and maintain your results long-term. This holds true for beginners, intermediate lifters, and even many advanced athletes.</p>

<h2>Why 3 Days Works</h2>

<p>Muscle tissue repairs and grows during rest - not during the training session itself. Three sessions spaced throughout the week gives you enough stimulus to drive adaptation while allowing adequate recovery between sessions.</p>

<p>A typical 3-day program at Santa Cruz Strength might look like:</p>
<ul>
<li><strong>Monday</strong> - Lower body focus (squat pattern + deadlift variation)</li>
<li><strong>Wednesday</strong> - Upper body focus (push + pull)</li>
<li><strong>Friday</strong> - Full body or sport-specific work</li>
</ul>

<h2>When to Train 4-5 Days</h2>

<p>More advanced lifters with specific goals - powerlifting competition prep, building a particular muscle group, sport performance peaking - can benefit from 4 to 5 sessions per week. At this level, programming becomes more specialized and recovery management matters significantly more.</p>

<h2>When 2 Days Is Enough</h2>

<p>Two days of focused, heavy lifting is enough to maintain strength and provide measurable health benefits. If you\'re a busy professional, parent, or athlete whose primary sport is outside the gym, two sessions can absolutely move the needle.</p>

<p>Something is always better than nothing. We would rather have you lift twice a week for five years than attempt six days a week for three weeks before burning out.</p>

<h2>The Most Important Variable</h2>

<p>Consistency over time beats frequency in the short term. The best program is the one you can actually do week after week, month after month. Start with three days. Get consistent. Build from there.</p>

<p>If you\'re not sure where to start, our coaches at Santa Cruz Strength are happy to help you build a realistic schedule that works with your life.</p>''',
            'category': 'Strength Science',
            'tags': ['training frequency', 'beginners', 'programming', 'FAQ'],
            'cover_image': None,  # see BLOG_COVERS_AWAITING_PERMISSION in blog_articles,
            'published': True,
            'seo_title': 'How Many Days a Week Should You Lift? | Santa Cruz Strength',
            'seo_description': 'The honest answer on training frequency: how many days per week you should lift based on your goals, schedule, and recovery capacity.',
            'author': 'Santa Cruz Strength',
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'Is Strength Training Good for Beginners? (Yes - Here\'s Why)',
            'slug': 'is-strength-training-good-for-beginners',
            'excerpt': 'You don\'t need to be in shape to start lifting. You start lifting to get in shape. Here\'s what beginners actually experience in their first months of strength training.',
            'content': '''<p>One of the most common concerns we hear from people who walk into Santa Cruz Strength for the first time: "I\'m not fit enough to be here yet."</p>

<p>That\'s exactly backwards. You\'re not supposed to come in already fit. You come in to get fit. That\'s what the gym is for.</p>

<h2>What Actually Happens When Beginners Lift</h2>

<p>Beginners respond to strength training faster than almost anyone else. This isn\'t motivation - it\'s physiology. When your body encounters a new stimulus (lifting weights), it adapts aggressively. In the first 3 to 6 months of consistent training, beginners often:</p>

<ul>
<li>Increase strength by 20-40% on major lifts</li>
<li>Improve body composition even without dietary changes</li>
<li>Build bone density that protects against injury</li>
<li>Improve insulin sensitivity and metabolic health</li>
<li>Sleep better and report improved mental clarity</li>
</ul>

<h2>You Don\'t Need Special Fitness First</h2>

<p>You don\'t need to be able to run a mile. You don\'t need to lose weight before you come in. You don\'t need to have lifted before. Every coach at Santa Cruz Strength has worked with people at every starting point - from never having touched a barbell to returning after years away from training.</p>

<p>Good coaching means meeting you exactly where you are.</p>

<h2>What Beginners Should Focus On</h2>

<p>In the first 3 months, the priority is short, and <a href="/blog/beginner-strength-training-santa-cruz">the full beginner strength training guide</a> expands each item into what it looks like week to week:</p>

<ol>
<li><strong>Learning movement patterns</strong> - squat, hinge, push, pull, carry</li>
<li><strong>Building the habit</strong> - consistent attendance matters more than perfect programming</li>
<li><strong>Staying patient</strong> - the results are real but they compound over months, not weeks</li>
</ol>

<h2>The Santa Cruz Strength Environment</h2>

<p>We built this gym for serious training - but serious doesn\'t mean exclusive. It means focused, respectful, and honest. Beginners are welcome here because everyone who trains seriously was once a beginner.</p>

<p>If you\'re curious about starting, come in and talk to us. No pressure, no sales tactics. Just a conversation about where you are and where you want to go.</p>''',
            'category': 'Getting Started',
            'tags': ['beginners', 'strength training', 'getting started', 'FAQ'],
            'cover_image': None,  # see BLOG_COVERS_AWAITING_PERMISSION in blog_articles,
            'published': True,
            'seo_title': 'Is Strength Training Good for Beginners? | Santa Cruz Strength',
            'seo_description': 'You don\'t need to be in shape to start lifting. Learn what beginners actually experience in their first months of strength training at Santa Cruz Strength.',
            'author': 'Santa Cruz Strength',
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'Why Climbers, Trail Runners, and Cyclists Should Lift Heavy',
            'slug': 'strength-training-for-outdoor-athletes-santa-cruz',
            'excerpt': 'Santa Cruz is full of world-class outdoor athletes who train hard in their sport - and often neglect the weight room. Here\'s why that\'s a missed opportunity.',
            'content': '''<p>Santa Cruz has one of the most diverse outdoor athletic communities in California. On any given day, you\'ll find people climbing at Castle Rock, running the fire roads above Wilder Ranch, or grinding up Empire Grade on a road bike. What these athletes often have in common: they\'re incredibly fit in their sport and significantly undertrained everywhere else.</p>

<h2>Why Sport-Specific Fitness Isn\'t Enough</h2>

<p>Running makes you a better runner - but only to a point. Past a certain threshold, additional running volume produces diminishing returns and increasing injury risk. The athletes who break through plateaus and stay healthy long-term are the ones who address their structural weaknesses in the weight room. The same reasoning applies to <a href="/blog/strength-training-for-surfers-santa-cruz">surfers specifically</a>, and that article covers the lifts that carry over to the water.</p>

<h2>For Climbers</h2>

<p>Climbing develops pulling strength impressively but creates significant imbalances - overdeveloped pulling muscles, underdeveloped pushing muscles, and often tight hip flexors. Dedicated pressing work, hip mobility training, and posterior chain strengthening directly address the injury patterns that take climbers out of commission. Finger injuries, shoulder impingements, and elbow tendinitis are frequently rooted in these imbalances.</p>

<h2>For Trail Runners</h2>

<p>Running doesn\'t build the single-leg strength needed to run efficiently. Unilateral exercises - Bulgarian split squats, single-leg Romanian deadlifts, step-ups - build the specific strength that improves running economy and protects knees and hips on technical descents. Two sessions per week of strength work has been shown repeatedly to improve running performance without adding significant training load.</p>

<h2>For Road Cyclists</h2>

<p>Road cycling is almost entirely quad-dominant. Road cyclists who lift discover two things quickly: their glutes were significantly underdeveloped, and their power on climbs improves when they address it. Heavy deadlifts and hip thrusts build the posterior chain that makes the difference in the final kilometers of a hard effort.</p>

<p>Mountain biking asks for something different. Braking and bar control load the upper body, technical descents demand rotational stability and grip endurance, and crashes are part of the sport. If you ride trails rather than roads, see <a href="/blog/strength-training-for-mountain-bikers-santa-cruz">strength training for Santa Cruz mountain bikers</a>.</p>

<h2>How We Train Outdoor Athletes at Santa Cruz Strength</h2>

<p>Our approach for athletes is simple: build strength that carries over to your sport without compromising your sport-specific training. We program around your schedule, respect your primary training volume, and focus on the movements that give you the most return. Those are <a href="/blog/beginner-strength-training-santa-cruz">the compound lifts that carry over</a>, and the beginner guide covers how to learn them.</p>

<p>If you\'re a climber, runner, or cyclist curious about how strength training would fit into your life, come in for a free tour and conversation. We train athletes from across the Santa Cruz community.</p>''',
            'category': 'Outdoor Athletes',
            'tags': ['climbing', 'trail running', 'cycling', 'outdoor athletes', 'Santa Cruz'],
            'cover_image': None,  # see BLOG_COVERS_AWAITING_PERMISSION in blog_articles,
            'published': True,
            'seo_title': 'Strength Training for Santa Cruz Outdoor Athletes | Santa Cruz Strength',
            'seo_description': 'Why climbers, trail runners, and cyclists in Santa Cruz should add strength training to their routine - and how to do it without sacrificing sport performance.',
            'author': 'Santa Cruz Strength',
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'Can You Lose Weight by Lifting Weights?',
            'slug': 'can-you-lose-weight-by-lifting-weights',
            'excerpt': 'The short answer is yes - but the mechanism is different from what most people expect. Here\'s what actually happens to your body when you start a consistent strength training program.',
            'content': '''<p>This question comes up constantly, and the honest answer surprises a lot of people: yes, lifting weights is one of the most effective things you can do for long-term body composition - but not necessarily for the reasons you think.</p>

<h2>Why Cardio Alone Often Disappoints</h2>

<p>Many people approach fat loss by adding cardio: longer runs, more classes, more time on the bike. This works to a degree, but it has a ceiling. The body adapts to cardio volume efficiently, caloric burn per session decreases over time, and muscle mass - which drives metabolic rate - is often lost in the process.</p>

<h2>How Lifting Changes the Equation</h2>

<p>Muscle tissue is metabolically expensive. The more of it you have, the more calories your body burns at rest. When you add muscle through consistent strength training, you raise your resting metabolic rate - meaning you burn more calories even when you\'re not exercising.</p>

<p>This is why many people who start lifting report that their body composition changes noticeably even without changing what they eat. They gain muscle, lose fat, and their clothes fit differently - even if the number on the scale doesn\'t move dramatically. None of that happens in a single session, which is why <a href="/blog/how-many-days-a-week-should-a-beginner-lift">a sustainable weekly frequency</a> matters more than any individual workout.</p>

<h2>Strength Training + Diet: The Real Formula</h2>

<p>If weight loss is a goal, the most effective approach combines:</p>
<ol>
<li>Consistent strength training (2-4 sessions per week)</li>
<li>Adequate protein intake (enough to support muscle retention and growth)</li>
<li>A modest caloric deficit (not aggressive restriction)</li>
</ol>

<p>This combination preserves muscle while losing fat - which produces dramatically better long-term results than calorie restriction alone. If the training half of that is the unfamiliar part, <a href="/blog/beginner-strength-training-santa-cruz">how to start lifting</a> covers the first six months.</p>

<h2>What Santa Cruz Strength Members Experience</h2>

<p>We have members who came in specifically for weight loss and discovered that the scale became far less important once they started getting stronger. Performance goals - lifting more, moving better, having more energy - replaced the single focus on body weight. And ironically, their bodies changed more significantly than they expected.</p>

<p>Strength training doesn\'t just change how you look. It changes how you live.</p>''',
            'category': 'Strength Science',
            'tags': ['weight loss', 'body composition', 'strength training', 'FAQ'],
            'cover_image': None,  # see BLOG_COVERS_AWAITING_PERMISSION in blog_articles,
            'published': True,
            'seo_title': 'Can You Lose Weight by Lifting Weights? | Santa Cruz Strength',
            'seo_description': 'Yes - and here\'s why strength training is one of the most effective tools for long-term body composition change.',
            'author': 'Santa Cruz Strength',
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'The Best Gym in Santa Cruz for Serious Athletes',
            'slug': 'best-gym-santa-cruz-serious-athletes',
            'excerpt': 'What makes a gym right for athletes who train with intention? After years of building Santa Cruz Strength, here\'s what we believe separates a serious training environment from everything else.',
            'content': '''<p>Santa Cruz has no shortage of fitness options. Big-box gyms, boutique studios, CrossFit affiliates, yoga centers, and everything in between. We built Santa Cruz Strength because we believed something was missing - a dedicated strength training environment for people who take their training seriously without taking themselves too seriously.</p>

<h2>What "Serious" Actually Means</h2>

<p>Serious doesn\'t mean competitive. It doesn\'t mean you have to be a powerlifter or an athlete chasing a PR. Serious means you show up consistently, you put in the work, and you\'re there to improve - not to be seen, not to socialize, not to go through the motions. That is one criterion among several in <a href="/blog/how-to-choose-a-strength-gym-santa-cruz">how to evaluate a strength gym in Santa Cruz</a>.</p>

<p>Our members include competitive powerlifters, professional surfers, UCSC researchers who train before work, parents who get their session in during school hours, and people in their 60s who came to us wanting to build strength for the next chapter of their lives. What they have in common is intentionality.</p>

<h2>The Equipment</h2>

<p>At 151 Harvey West Blvd, we have what serious training requires:</p>
<ul>
<li>Power racks and squat stands for heavy barbell work</li>
<li>Bumper and iron plates across every rack</li>
<li>Specialty bars including safety squat bar, hex bar, and cambered bar</li>
<li>Dumbbells scaled for heavy work</li>
<li>Dedicated lifting platforms</li>
<li>Conditioning equipment that doesn\'t crowd the strength floor</li>
</ul>

<p>We invest in equipment that athletes actually need, not in amenities designed to impress during a tour, and <a href="/blog/gym-with-lifting-platforms-santa-cruz">the platforms and racks</a> are broken down lift by lift on their own page.</p>

<h2>The Culture</h2>

<p>The culture at Santa Cruz Strength is what differentiates us most. Members re-rack their weights. People nod at each other, spot when asked, and offer advice when it\'s welcome and stay quiet when it\'s not. There\'s no judgment about what you\'re lifting, where you started, or what your goals are. If those goals point toward competition, <a href="/blog/powerlifting-vs-olympic-weightlifting-vs-strongman">the three strength sports compared</a> covers what each one demands.</p>

<h2>Location</h2>

<p>We\'re in Harvey West Business Park - a working part of Santa Cruz that feels right for a gym like this. Not downtown, not a strip mall. A real space in a real neighborhood, easy to get to, with parking.</p>

<p>If this sounds like what you\'ve been looking for, come in and see it. We offer free tours for anyone considering membership. No pressure, just an honest look at the space and a conversation about whether it\'s the right fit.</p>''',
            'category': 'Gym Culture',
            'tags': ['best gym Santa Cruz', 'strength gym', 'Santa Cruz', 'local'],
            'cover_image': None,  # see BLOG_COVERS_AWAITING_PERMISSION in blog_articles,
            'published': True,
            'seo_title': 'Best Gym in Santa Cruz for Serious Athletes | Santa Cruz Strength',
            'seo_description': 'What makes Santa Cruz Strength different from every other gym in Santa Cruz. Real equipment, real culture, and a community built around intentional training.',
            'author': 'Santa Cruz Strength',
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'How Long Should a Workout Be? What Actually Matters',
            'slug': 'how-long-should-a-workout-be',
            'excerpt': 'More time in the gym doesn\'t automatically mean more progress. Here\'s what the research says - and what we see with members at Santa Cruz Strength.',
            'content': '''<p>There\'s a persistent belief that longer workouts produce better results. People who spend 90 minutes in the gym feel they worked harder than people who were in and out in 45. This isn\'t necessarily true - and in many cases it\'s backwards.</p>

<h2>The Research on Workout Duration</h2>

<p>Studies on strength training consistently show that the quality and intensity of training matters far more than duration. A focused 45-minute session with appropriate load, rest periods, and exercise selection produces equivalent or superior results to a 90-minute session filled with extra volume, long conversations between sets, and unfocused effort.</p>

<h2>What a Well-Structured Session Looks Like</h2>

<p>For most strength training goals, a well-designed session fits in 45 to 75 minutes:</p>
<ul>
<li><strong>5-10 minutes:</strong> Warm-up and movement prep</li>
<li><strong>25-40 minutes:</strong> Primary strength work (2-4 main lifts)</li>
<li><strong>10-20 minutes:</strong> Accessory work or conditioning</li>
<li><strong>5 minutes:</strong> Cool-down</li>
</ul>

<h2>When Sessions Creep Too Long</h2>

<p>Sessions that stretch past 75-90 minutes often indicate one of several things: too much volume (more sets and exercises than necessary), insufficient rest management, or time being lost to non-training activities. None of these improve outcomes.</p>

<p>Cortisol - the stress hormone - rises meaningfully after about 60 minutes of intense training. Extended sessions can actually compromise the hormonal environment for recovery and muscle growth.</p>

<h2>The Practical Reality</h2>

<p>For most people - especially those with jobs, families, and other commitments - the ideal workout is the one that gets done consistently. A 45-minute session three times per week that you actually complete will produce far better results over a year than an aspirational 2-hour program that you abandon after three weeks. How many of those sessions belong in a week is a separate question, answered in <a href="/blog/how-many-days-a-week-should-a-beginner-lift">training frequency for beginners</a>.</p>

<p>Build the habit. Keep sessions focused. Progress will follow.</p>

<p>At Santa Cruz Strength, our coaches help members design programs that fit their real schedules. If you\'re wondering how to train effectively without spending your entire day in the gym, come in and talk to us.</p>''',
            'category': 'Strength Science',
            'tags': ['workout length', 'training tips', 'programming', 'FAQ'],
            'cover_image': None,  # see BLOG_COVERS_AWAITING_PERMISSION in blog_articles,
            'published': True,
            'seo_title': 'How Long Should a Workout Be? | Santa Cruz Strength',
            'seo_description': 'More time in the gym doesn\'t mean more progress. Here\'s what actually matters when it comes to workout duration for strength training.',
            'author': 'Santa Cruz Strength',
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
        },
    ]
    # Long form articles, authored separately and imported wholesale. They carry
    # no cover_image on purpose: no real photograph has been chosen for them yet,
    # and inventing one would break the media policy. The blog renders without.
    for article in LONGFORM_ARTICLES:
        body = article['content']
        posts.append({
            'id': str(uuid.uuid4()),
            'title': article['title'],
            'slug': article['slug'],
            'excerpt': article['excerpt'],
            'content': body(article['slug']) if callable(body) else body,
            'category': article.get('category', 'Training'),
            'tags': article.get('tags', []),
            'cover_image': None,
            'published': True,
            'seo_title': article.get('seo_title'),
            'seo_description': article.get('seo_description'),
            'author': 'Santa Cruz Strength',
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
        })

    for post in posts:
        await db.blog.insert_one(post)
    logger.info(f'[SEED] Seeded {len(posts)} blog posts')


# --------------- Daily Bounce / SMS Failure Digest ---------------

async def run_daily_bounce_digest():
    """Runs daily at 6 PM PT. Sends one summary email with all email bounces,
    SMS failures, and SMS opt-outs from today, then clears the log."""
    today = now_utc().date().isoformat()
    entries = await db.daily_bounce_log.find({'date': today}).to_list(500)
    if not entries:
        logger.info('[DIGEST] No bounces/failures today - skipping digest')
        return

    email_bounces = [e for e in entries if e.get('type') == 'email_bounce']
    sms_failures  = [e for e in entries if e.get('type') == 'sms_failure']
    sms_optouts   = [e for e in entries if e.get('type') == 'sms_optout']

    total = len(entries)

    # Build HTML digest
    rows_html = ''
    if email_bounces:
        rows_html += '<tr><td colspan="5" style="padding:16px 0 8px;color:#FA5A5C;font-weight:700;font-size:15px;border-bottom:1px solid #333;">Email Bounces / Complaints</td></tr>'
        for e in email_bounces:
            rows_html += f'''<tr style="border-bottom:1px solid #222;">
<td style="padding:8px 12px;color:#fff;">{e.get('name',' - ')}</td>
<td style="padding:8px 12px;color:#aaa;">{e.get('email',' - ')}</td>
<td style="padding:8px 12px;color:#aaa;">{e.get('phone',' - ')}</td>
<td style="padding:8px 12px;color:#aaa;">{e.get('source',' - ')}</td>
<td style="padding:8px 12px;color:#FA5A5C;">{e.get('event','').replace('email.','')}</td>
</tr>'''

    if sms_failures:
        rows_html += '<tr><td colspan="5" style="padding:16px 0 8px;color:#F59E0B;font-weight:700;font-size:15px;border-bottom:1px solid #333;">SMS Send Failures</td></tr>'
        for e in sms_failures:
            rows_html += f'''<tr style="border-bottom:1px solid #222;">
<td style="padding:8px 12px;color:#fff;">{e.get('name',' - ')}</td>
<td style="padding:8px 12px;color:#aaa;">{e.get('email',' - ')}</td>
<td style="padding:8px 12px;color:#aaa;">{e.get('phone',' - ')}</td>
<td style="padding:8px 12px;color:#aaa;">{e.get('source',' - ')}</td>
<td style="padding:8px 12px;color:#F59E0B;">{e.get('event','')}</td>
</tr>'''

    if sms_optouts:
        rows_html += '<tr><td colspan="5" style="padding:16px 0 8px;color:#8B5CF6;font-weight:700;font-size:15px;border-bottom:1px solid #333;">SMS Opt-Outs (STOP)</td></tr>'
        for e in sms_optouts:
            rows_html += f'''<tr style="border-bottom:1px solid #222;">
<td style="padding:8px 12px;color:#fff;">{e.get('name',' - ')}</td>
<td style="padding:8px 12px;color:#aaa;">{e.get('email',' - ')}</td>
<td style="padding:8px 12px;color:#aaa;">{e.get('phone',' - ')}</td>
<td style="padding:8px 12px;color:#aaa;">{e.get('source',' - ')}</td>
<td style="padding:8px 12px;color:#8B5CF6;">STOP received</td>
</tr>'''

    summary_parts = []
    if email_bounces:
        summary_parts.append(f'{len(email_bounces)} email bounce{"s" if len(email_bounces) != 1 else ""}')
    if sms_failures:
        summary_parts.append(f'{len(sms_failures)} SMS failure{"s" if len(sms_failures) != 1 else ""}')
    if sms_optouts:
        summary_parts.append(f'{len(sms_optouts)} SMS opt-out{"s" if len(sms_optouts) != 1 else ""}')
    summary_text = ', '.join(summary_parts)

    html = f"""<div style="font-family:sans-serif;padding:28px;background:#0D0D0D;color:#fff;border-radius:12px;">
<h2 style="color:#fff;margin:0 0 4px;">Daily Delivery Report</h2>
<p style="color:#666;margin:0 0 20px;font-size:14px;">Santa Cruz Strength CRM - {today}</p>
<div style="background:#1A1A1A;border-radius:8px;padding:16px 20px;margin-bottom:20px;">
<p style="color:#aaa;margin:0;font-size:14px;">Today's removals: <strong style="color:#fff;">{total} contacts</strong> - {summary_text}</p>
<p style="color:#666;margin:4px 0 0;font-size:12px;">All contacts below have been automatically blacklisted and removed from future sends.</p>
</div>
<table style="width:100%;border-collapse:collapse;font-size:13px;">
<thead><tr style="border-bottom:2px solid #333;">
<th style="padding:8px 12px;text-align:left;color:#888;">Name</th>
<th style="padding:8px 12px;text-align:left;color:#888;">Email</th>
<th style="padding:8px 12px;text-align:left;color:#888;">Phone</th>
<th style="padding:8px 12px;text-align:left;color:#888;">Source</th>
<th style="padding:8px 12px;text-align:left;color:#888;">Reason</th>
</tr></thead>
<tbody>{rows_html}</tbody>
</table>
</div>"""

    subject = f'Daily Report: {total} contact{"s" if total != 1 else ""} removed - {today}'
    ok = await send_resend_email(to=STAFF_EMAIL, subject=subject, html=html)
    if ok:
        logger.info(f'[DIGEST] Sent daily bounce digest: {total} entries')
        # Clear today's log after successful send
        await db.daily_bounce_log.delete_many({'date': today})
    else:
        logger.warning('[DIGEST] Failed to send daily bounce digest - will retry next run')

async def run_lead_outbox_dispatcher():
    """Dispatch a bounded batch outside the public request path."""
    runtime = getattr(app.state, 'lead_dispatch_runtime', None)
    if not runtime:
        return
    await dispatch_batch(
        db.lead_outbox,
        db.leads,
        config=runtime['config'],
        adapters=runtime['adapters'],
        worker_id=runtime['worker_id'],
    )


@app.on_event('startup')
async def startup():
    validate_runtime_safety(database_name, mongo_url)
    require_frontend_origin()
    lead_dispatch_config = DispatchConfig.from_env()
    logger.info('[SAFETY] Runtime controls: %s', runtime_summary())
    if not ALLOW_DATABASE_WRITES:
        logger.warning('[SAFETY] Protected read-only mode active; startup writes and schedulers skipped')
        return
    await db.leads.create_index('id', unique=True)
    await db.leads.create_index('email')
    # A person is one lead per location. The intake handler already treats
    # email plus location as identity, updating in place on a re-inquiry, but
    # it established that by reading first and then writing, with nothing
    # enforcing it in between.
    #
    # Two enquiries from the same person carrying DIFFERENT request ids, which
    # is what happens when somebody submits, waits, and submits again from
    # another tab, could both find no existing document and both insert. The
    # same-request-id race was already closed by the unique indexes below plus
    # DuplicateKeyError recovery; this is the other axis, and it was open.
    #
    # Created in the background and tolerantly: an existing collection may
    # already hold duplicates from before this index existed, and refusing to
    # start is the wrong response to historical data. A failure here is logged
    # loudly and leaves the read-before-write behaviour exactly as it was.
    try:
        await db.leads.create_index(
            [('email', 1), ('location', 1)],
            unique=True,
            name='unique_lead_identity',
            partialFilterExpression={'email': {'$type': 'string'}},
        )
    except Exception as exc:
        logger.error(
            '[INDEX] Could not enforce one lead per email and location: %s. '
            'Existing duplicates must be merged before this can be applied, '
            'and until it is, simultaneous enquiries from one person can '
            'create two records.', exc,
        )
    await db.leads.create_index('status')
    await db.leads.create_index('lead_source')
    await db.leads.create_index('created_at')
    await db.leads.create_index('location')
    await db.leads.create_index(
        'request_id', unique=True,
        partialFilterExpression={'request_id': {'$type': 'string'}},
        name='unique_lead_request_id',
    )
    await db.leads.create_index(
        'request_ids', unique=True,
        partialFilterExpression={'request_ids': {'$type': 'array'}},
        name='unique_lead_request_id_history',
    )
    await db.users.create_index('id', unique=True)
    await db.users.create_index('email', unique=True)
    await db.invites.create_index('token', unique=True)
    await db.invites.create_index('email')
    await db.blog.create_index('id', unique=True)
    await db.blog.create_index('slug', unique=True)
    await db.blog.create_index([('published', 1), ('created_at', -1)])
    await db.blog.create_index('category')
    await db.auth_otps.create_index('email')
    await db.auth_otps.create_index('expires_at', expireAfterSeconds=0)
    await db.password_resets.create_index('token', unique=True)
    await db.password_resets.create_index('email')
    await db.device_tokens.create_index('token')
    await db.device_tokens.create_index('email')
    await db.device_tokens.create_index('expires_at', expireAfterSeconds=0)
    await db.events.create_index('id', unique=True)
    await db.events.create_index([('published', 1), ('date', 1)])
    await db.event_rsvps.create_index('event_id')
    await db.event_rsvps.create_index([('event_id', 1), ('email', 1)], unique=True)
    await db.review_requests.create_index('token', unique=True)
    await db.review_requests.create_index('lead_id')
    await db.media.create_index('id', unique=True)
    await db.media.create_index('created_at')
    await db.campaigns.create_index('id', unique=True)
    await db.campaigns.create_index('status')
    await db.campaign_sends.create_index([('campaign_id', 1), ('lead_id', 1), ('wave', 1)], unique=True)
    await db.campaign_sends.create_index('lead_id')
    await db.campaign_sends.create_index('sent_at')
    await db.email_stats.create_index('date', unique=True)
    await db.daily_bounce_log.create_index('date')
    await db.daily_bounce_log.create_index('type')
    await db.team_members.create_index('id', unique=True)
    await db.team_members.create_index('category')
    await db.site_content.create_index('key', unique=True)
    await db.corporate_leads.create_index('id', unique=True)
    await db.corporate_leads.create_index('request_id', unique=True, sparse=True)
    await db.corporate_leads.create_index('request_ids', unique=True, sparse=True)
    await db.corporate_leads.create_index('status')
    await db.corporate_leads.create_index('created_at')
    await db.webhook_receipts.create_index('event_key', unique=True)
    await db.webhook_receipts.create_index('received_at')
    await db.lead_lifecycle_events.create_index('event_id', unique=True)
    await db.lead_lifecycle_events.create_index([('lead_id', 1), ('occurred_at', 1)])
    await db.lead_contact_events.create_index('event_id', unique=True)
    await db.lead_contact_events.create_index([('lead_id', 1), ('occurred_at', 1)])
    await db.lead_outbox.create_index('id', unique=True)
    await db.lead_outbox.create_index('idempotency_key', unique=True)
    await db.lead_outbox.create_index([('status', 1), ('available_at', 1), ('created_at', 1)])
    await db.lead_outbox.create_index('terminal_failure_at')
    # Seed site content - upsert missing keys (preserves existing edits)
    seed_content = [
        # About Page
        {'key': 'about_mission', 'value': 'Rooted in strength. Built with heart.'},
        {'key': 'about_headline', 'value': 'THIS IS SANTA CRUZ STRENGTH'},
        {'key': 'about_story', 'value': "Santa Cruz Strength has been part of this community for over 13 years.\n\nWe were originally built as a space for powerlifting, strongman, and Olympic weightlifting. It was a place for strength athletes deeply committed to their training who wanted to take it seriously.\n\nThat foundation still matters. It shaped how we train, the equipment we use, and the respect we have for strength as a practice.\n\nOver time, the gym became more than a place to train. People stayed, built relationships, and supported each other. For many, it became a space where they found a sense of belonging they hadn't experienced in other gyms.\n\nAs the community evolved, so did the space.\n\nToday, Santa Cruz Strength is a place where you can train hard and get stronger, whether you're experienced or just getting started.\n\nWe welcome people across all levels of experience, and we're proud that our community includes a strong base of women and queer members.\n\nYou'll find people here lifting heavy and training consistently, as well as people learning, returning, or building a new relationship with movement. All belong here.\n\nThis gym has always been about strength. Now, it's also about making that strength more accessible."},
        {'key': 'about_team_headline', 'value': 'MEET THE TEAM'},
        {'key': 'about_team_subtitle', 'value': 'The people behind the iron'},
        {'key': 'about_trainers_headline', 'value': 'MEET OUR TRAINERS'},
        {'key': 'about_trainers_subtitle', 'value': 'Expert coaching for every level'},
        {'key': 'about_cta_headline', 'value': 'COME SEE FOR YOURSELF'},
        {'key': 'about_cta_text', 'value': "Come by, take a look around, and meet the crew. Good people, a supportive space, and a chance to get a feel for it."},
        # Home Page
        {'key': 'home_hero_headline', 'value': 'SERIOUS\nSTRENGTH\nTRAINING.'},
        {'key': 'home_hero_subtitle', 'value': 'A focused gym for athletes, lifters, and people who believe strength matters.'},
        # Home.js reads the _v2 keys. The unsuffixed pair above is still seeded
        # because other pages read it, so editing one never changes the other.
        # Values match the fallbacks in Home.js so the editor opens populated
        # with the copy that is actually on screen rather than blank.
        {'key': 'home_hero_headline_v2', 'value': 'A Santa Cruz strength gym you can see before you join.'},
        {'key': 'home_hero_subtitle_v2', 'value': 'See the racks, platforms, training floor, and access setup before you choose a membership.'},
        {'key': 'home_hero_subtext', 'value': 'Real training environment. Real community. Santa Cruz.'},
        {'key': 'home_benefits_headline', 'value': 'STRENGTH WITHOUT THE NOISE.'},
        {'key': 'home_benefits_subtitle', 'value': 'No cardio theater. No supplement counters. A focused space for people who show up, lift, and improve.'},
        {'key': 'home_environment_headline', 'value': 'WHAT TRAINING\nHERE FEELS LIKE'},
        {'key': 'home_environment_text', 'value': "Walk in and you'll notice it immediately. The space is clean. The equipment is serious. People are focused, not performing."},
        {'key': 'home_environment_subtext', 'value': 'No music drowning out your thoughts. No influencer corner. Just chalk, iron, and people who came to work.'},
        {'key': 'home_who_headline', 'value': 'IF YOU TRAIN,\nYOU BELONG HERE.'},
        {'key': 'home_who_text', 'value': "Santa Cruz Strength serves the full athletic community of this city. The common thread isn't your sport or your level."},
        {'key': 'home_who_subtext', 'value': "It's the belief that being strong makes everything else better - your surfing, your climbing, your work, your decades ahead."},
        # Training Page
        {'key': 'training_headline', 'value': 'PERSONAL TRAINING\nTHAT RESPECTS YOUR TIME.'},
        {'key': 'training_subtitle', 'value': 'Work directly with a Santa Cruz Strength coach to build real strength, master technique, and train with purpose.'},
        {'key': 'training_cta_headline', 'value': 'READY TO TRAIN WITH PURPOSE?'},
        # Contact Page
        {'key': 'contact_headline', 'value': 'CONTACT US'},
        {'key': 'contact_subtitle', 'value': 'Questions, tour requests, or just want to know more.'},
        {'key': 'contact_form_headline', 'value': 'REACH OUT'},
        {'key': 'contact_form_subtitle', 'value': 'Fill out the form and we will get back to you within 24 hours.'},
    ]
    seeded = 0
    for item in seed_content if ALLOW_SEEDING else []:
        result = await db.site_content.update_one(
            {'key': item['key']},
            {'$setOnInsert': {'value': item['value'], 'updated_at': now_utc().isoformat()}},
            upsert=True,
        )
        if result.upserted_id:
            seeded += 1
    if seeded:
        logger.info(f'[SEED] Seeded {seeded} new site content keys')
    # Seed team members if none exist
    team_count = await db.team_members.count_documents({})
    if ALLOW_SEEDING and team_count == 0:
        seed_team = [
            {'id': str(uuid.uuid4()), 'name': 'Mike', 'role': 'Owner', 'bio': '', 'photo_url': '/assets/scs/real/portrait-mike.jpg', 'category': 'team', 'sort_order': 0, 'is_visible': True, 'created_at': now_utc().isoformat(), 'updated_at': now_utc().isoformat()},
            {'id': str(uuid.uuid4()), 'name': 'Teresa', 'role': 'Community Manager', 'bio': '', 'photo_url': '/assets/scs/real/portrait-teresa.jpg', 'category': 'team', 'sort_order': 1, 'is_visible': True, 'created_at': now_utc().isoformat(), 'updated_at': now_utc().isoformat()},
            {'id': str(uuid.uuid4()), 'name': 'Brit', 'role': 'Resident Badass', 'bio': '', 'photo_url': '/assets/scs/real/portrait-brit.jpg', 'category': 'team', 'sort_order': 2, 'is_visible': True, 'created_at': now_utc().isoformat(), 'updated_at': now_utc().isoformat()},
            {'id': str(uuid.uuid4()), 'name': 'Morghan King', 'role': 'Resident Olympian', 'bio': '', 'photo_url': '', 'category': 'trainer', 'sort_order': 0, 'is_visible': True, 'created_at': now_utc().isoformat(), 'updated_at': now_utc().isoformat()},
            {'id': str(uuid.uuid4()), 'name': 'Lexi', 'role': 'Strength Coach & Acrobatic Enthusiast', 'bio': '', 'photo_url': '/assets/scs/real/portrait-lexi.jpg', 'category': 'trainer', 'sort_order': 1, 'is_visible': True, 'created_at': now_utc().isoformat(), 'updated_at': now_utc().isoformat()},
            {'id': str(uuid.uuid4()), 'name': 'Chris', 'role': 'Powerlifting Powerhouse', 'bio': '', 'photo_url': '/assets/scs/real/portrait-chris.jpg', 'category': 'trainer', 'sort_order': 2, 'is_visible': True, 'created_at': now_utc().isoformat(), 'updated_at': now_utc().isoformat()},
            {'id': str(uuid.uuid4()), 'name': 'Syon', 'role': 'Strength & Conditioning Coach Extraordinaire', 'bio': '', 'photo_url': '', 'category': 'trainer', 'sort_order': 3, 'is_visible': True, 'created_at': now_utc().isoformat(), 'updated_at': now_utc().isoformat()},
        ]
        await db.team_members.insert_many(seed_team)
        logger.info(f'[SEED] Created {len(seed_team)} team members')
    # Seed blog posts if none exist
    blog_count = await db.blog.count_documents({})
    if ALLOW_SEEDING and blog_count == 0:
        await seed_blog_posts()
    # Bootstrap the first owner only when explicit, one-time environment values are supplied.
    # Existing owner credentials are never reset during application startup.
    owner_exists = await db.users.find_one({'role': 'owner'})
    if ALLOW_SEEDING and not owner_exists:
        bootstrap_email = os.environ.get('BOOTSTRAP_OWNER_EMAIL', '').strip().lower()
        bootstrap_password = os.environ.get('BOOTSTRAP_OWNER_PASSWORD', '')
        bootstrap_name = os.environ.get('BOOTSTRAP_OWNER_NAME', 'Management').strip() or 'Management'

        if bootstrap_email and len(bootstrap_password) >= 12:
            existing_user = await db.users.find_one({'email': bootstrap_email})
            if existing_user:
                await db.users.update_one(
                    {'email': bootstrap_email},
                    {'$set': {'role': 'owner', 'is_active': True}},
                )
                logger.info('[BOOTSTRAP] Promoted configured account to owner role')
            else:
                owner_id = str(uuid.uuid4())
                await db.users.insert_one({
                    'id': owner_id,
                    'email': bootstrap_email,
                    'password_hash': hash_password(bootstrap_password),
                    'name': bootstrap_name,
                    'role': 'owner',
                    'location': 'santa_cruz',
                    'is_active': True,
                    'created_at': now_utc().isoformat(),
                })
                logger.info('[BOOTSTRAP] Created configured owner account')
        else:
            logger.warning(
                '[BOOTSTRAP] No owner exists. Set BOOTSTRAP_OWNER_EMAIL and a '
                'BOOTSTRAP_OWNER_PASSWORD of at least 12 characters for one-time setup.'
            )
    logger.info('[STARTUP] Santa Cruz Strength API ready')
    if lead_dispatch_config.enabled:
        app.state.lead_dispatch_runtime = {
            'config': lead_dispatch_config,
            'adapters': build_adapters(lead_dispatch_config),
            'worker_id': f'scs-lead-dispatch-{uuid.uuid4()}',
        }
        logger.info(
            '[LEAD DISPATCH] Enabled for owner=%s test_recipient_mode=%s',
            lead_dispatch_config.primary_owner,
            lead_dispatch_config.test_recipient_mode,
        )
    # Start SMS follow-up scheduler
    if ALLOW_SCHEDULERS:
        scheduler = AsyncIOScheduler(timezone='America/Los_Angeles')
        scheduler.add_job(run_sms_followup_job,    'interval', minutes=30,  id='sms_followup',    replace_existing=True)
        scheduler.add_job(run_review_request_job,  'interval', minutes=30,  id='review_requests', replace_existing=True)
        scheduler.add_job(run_campaign_scheduler,  'interval', minutes=60,  id='campaigns',       replace_existing=True)
        scheduler.add_job(run_daily_bounce_digest, 'cron',     hour=18, minute=0, id='bounce_digest', replace_existing=True)
        scheduler.add_job(run_blog_ideas_refresh,  'interval', hours=6,   id='blog_ideas',      replace_existing=True)
        if lead_dispatch_config.enabled:
            scheduler.add_job(
                run_lead_outbox_dispatcher,
                'interval',
                seconds=15,
                id='lead_outbox_dispatch',
                max_instances=1,
                coalesce=True,
                replace_existing=True,
            )
        scheduler.start()
        app.state.scheduler = scheduler
        logger.info('[STARTUP] Approved schedulers started')
    else:
        logger.info('[SCHEDULER] Disabled by runtime safety controls')

@app.on_event('shutdown')
async def shutdown_db_client():
    if hasattr(app.state, 'scheduler'):
        app.state.scheduler.shutdown(wait=False)
    client.close()

app.include_router(api_router)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=parse_cors_origins(os.environ.get('CORS_ORIGINS'), APP_ENV),
    allow_methods=['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allow_headers=[
        'Authorization', 'Content-Type', 'Idempotency-Key', 'X-Form-Schema-Version',
        'X-Twilio-Signature', 'svix-id', 'svix-signature', 'svix-timestamp',
    ],
)
