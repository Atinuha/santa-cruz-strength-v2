from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Query, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.responses import StreamingResponse
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import csv
import io
import asyncio
import resend
import httpx
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'test_database')]

app = FastAPI(title='Santa Cruz Strength API')
api_router = APIRouter(prefix='/api')

JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret-change-me')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_MINUTES = int(os.environ.get('JWT_EXPIRE_MINUTES', 10080))
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

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
CC_EMAIL          = os.environ.get('CC_EMAIL', '')   # e.g. teresa@santacruzstrength.com

async def send_resend_email(to: str, subject: str, html: str, reply_to: str = None,
                            from_override: str = None, cc: list = None):
    """Non-blocking Resend send — falls back gracefully if key not set."""
    if not resend.api_key:
        logger.info(f'[EMAIL] RESEND_API_KEY not set — skipping to {to}')
        return False
    try:
        sender = from_override or FROM_EMAIL
        params = {'from': sender, 'to': [to], 'subject': subject, 'html': html}
        if reply_to:
            params['reply_to'] = [reply_to]
        if cc:
            params['cc'] = [c for c in cc if c and c != to]
        result = await asyncio.to_thread(resend.Emails.send, params)
        logger.info(f'[EMAIL] Sent via Resend to {to} — id={result.get("id","?")}')
        return True
    except Exception as e:
        logger.warning(f'[EMAIL] Resend failed to {to}: {e}')
        return False

def _lead_confirmation_html(lead: dict) -> str:
    name = lead.get('first_name', 'there')
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#F7F5F0;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F0;padding:40px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr>
          <td style="background:#0D5D3E;padding:28px 36px;">
            <p style="margin:0;color:#CDE4DF;font-size:11px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Santa Cruz Strength</p>
            <p style="margin:6px 0 0;color:#ffffff;font-size:22px;font-weight:800;letter-spacing:1px;">151 Harvey West Blvd · Santa Cruz, CA</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 36px 28px;">
            <p style="margin:0 0 16px;font-size:17px;font-weight:700;color:#1a1a1a;">Hey {name},</p>
            <p style="margin:0 0 14px;font-size:15px;color:#444;line-height:1.65;">
              Thanks for reaching out to Santa Cruz Strength. We're stoked you're interested in checking out the space.
            </p>
            <p style="margin:0 0 24px;font-size:15px;color:#444;line-height:1.65;">
              Someone from the team will reach out shortly to set up a quick tour and answer any questions.
            </p>
            <!-- CTA -->
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#FA5A5C;border-radius:8px;">
                  <a href="https://santacruzstrength.com" style="display:inline-block;padding:13px 28px;color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;letter-spacing:0.3px;">
                    Visit Our Website →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Details recap -->
        <tr>
          <td style="padding:0 36px 28px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F5F0;border-radius:8px;padding:16px 20px;">
              <tr><td style="padding:4px 0;font-size:12px;color:#666;"><strong style="color:#1a1a1a;">Interest:</strong> {lead.get('interest_type','General Membership')}</td></tr>
              <tr><td style="padding:4px 0;font-size:12px;color:#666;"><strong style="color:#1a1a1a;">Timeline:</strong> {lead.get('start_timeline','Just exploring')}</td></tr>
            </table>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="border-top:1px solid #eee;padding:20px 36px;background:#fafaf9;">
            <p style="margin:0;font-size:12px;color:#999;line-height:1.6;">
              Santa Cruz Strength · 151 Harvey West Blvd Ste D, Santa Cruz CA 95060<br>
              <a href="tel:+14083376709" style="color:#0D5D3E;text-decoration:none;">(408) 337-6709</a> ·
              <a href="https://www.instagram.com/santacruzstrength/" style="color:#0D5D3E;text-decoration:none;">@santacruzstrength</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

def _staff_notification_html(lead: dict) -> str:
    created = lead.get('created_at', '')[:16].replace('T', ' at ') if lead.get('created_at') else 'just now'
    rows = [
        ('Name', f"{lead.get('first_name','')} {lead.get('last_name','')}"),
        ('Phone', lead.get('phone', '—')),
        ('Email', lead.get('email', '—')),
        ('Interest', lead.get('interest_type', '—')),
        ('Timeline', lead.get('start_timeline', '—')),
        ('Goals', lead.get('training_goals', '—') or '—'),
        ('Source', lead.get('lead_source', '—')),
        ('Preferred Contact', lead.get('preferred_contact', '—')),
        ('Submitted', created),
    ]
    rows_html = ''.join(
        f"<tr style='background:{'#1a2a1f' if i%2==0 else '#141e19'};'>"
        f"<td style='padding:10px 16px;color:#8FBF9F;font-size:12px;font-weight:600;width:140px;'>{k}</td>"
        f"<td style='padding:10px 16px;color:#e8f5ee;font-size:13px;font-weight:500;'>{v}</td>"
        f"</tr>"
        for i, (k, v) in enumerate(rows)
    )
    name = f"{lead.get('first_name','')} {lead.get('last_name','')}".strip()
    crm_url = 'https://santacruzstrength.com/staff/leads'
    return f"""
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;background:#0f1a14;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0f1a14;padding:32px 20px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#111f16;border-radius:12px;overflow:hidden;border:1px solid #1e3327;">
        <!-- Header -->
        <tr>
          <td style="background:#0D5D3E;padding:22px 28px;">
            <p style="margin:0;color:#CDE4DF;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Santa Cruz Strength CRM</p>
            <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:800;">🔔 New Lead: {name}</p>
          </td>
        </tr>
        <!-- Table -->
        <tr>
          <td style="padding:0;">
            <table width="100%" cellpadding="0" cellspacing="0">
              {rows_html}
            </table>
          </td>
        </tr>
        <!-- CTA -->
        <tr>
          <td style="padding:24px 28px;border-top:1px solid #1e3327;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#0D5D3E;border-radius:8px;">
                  <a href="{crm_url}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-size:13px;font-weight:700;text-decoration:none;">
                    Open in CRM →
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""

async def send_lead_emails(lead: dict):
    """Fire both emails — skips blacklisted leads."""
    if lead.get('blacklisted'):
        return
    name = f"{lead.get('first_name','there')}".strip()
    lead_email = lead.get('email', '')
    tasks = []
    if lead_email:
        tasks.append(send_resend_email(
            to=lead_email,
            subject=f"Hey {name} — you're on our radar at Santa Cruz Strength",
            html=_lead_confirmation_html(lead),
            reply_to='management@santacruzstrength.com'
        ))
    tasks.append(send_resend_email(
        to=STAFF_EMAIL,
        subject=f"New Lead: {lead.get('first_name','')} {lead.get('last_name','')} — {lead.get('interest_type','General Membership')}",
        html=_staff_notification_html(lead),
        cc=[c for c in [CC_EMAIL] if c and c != STAFF_EMAIL],
    ))
    await asyncio.gather(*tasks, return_exceptions=True)

# --------------- SMS (MailerSend) ---------------

MAILERSEND_API_KEY = os.environ.get('MAILERSEND_API_KEY', '')
MAILERSEND_FROM   = os.environ.get('MAILERSEND_FROM_NUMBER', '')

# ── Core send ─────────────────────────────────────────────────────────────────
async def send_sms(to_numbers: list, text: str) -> bool:
    """Send SMS via MailerSend REST API. Safe-guards when not configured."""
    if not MAILERSEND_API_KEY or not MAILERSEND_FROM:
        logger.info(f'[SMS] Not configured — skipping to {to_numbers}')
        return False
    # Clean numbers — keep only valid E.164
    valid = [n.strip() for n in to_numbers if n and n.strip().startswith('+')]
    if not valid:
        return False
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                'https://api.mailersend.com/v1/sms',
                headers={
                    'Authorization': f'Bearer {MAILERSEND_API_KEY}',
                    'Content-Type': 'application/json',
                },
                json={'from': MAILERSEND_FROM, 'to': valid, 'text': text},
            )
        if resp.status_code == 202:
            logger.info(f'[SMS] Sent to {valid}')
            return True
        else:
            logger.warning(f'[SMS] Failed {resp.status_code}: {resp.text[:200]}')
            return False
    except Exception as e:
        logger.warning(f'[SMS] Error: {e}')
        return False

# ── Get staff SMS numbers (DB-managed so staff can update via CRM UI) ─────────
async def get_sms_staff_numbers() -> list:
    doc = await db.sms_settings.find_one({'_id': 'staff_numbers'})
    if doc:
        return doc.get('numbers', [])
    # Seed from env on first call
    seed = [n.strip() for n in os.environ.get('SMS_STAFF_NUMBERS', '').split(',') if n.strip()]
    if seed:
        await db.sms_settings.replace_one(
            {'_id': 'staff_numbers'},
            {'_id': 'staff_numbers', 'numbers': seed},
            upsert=True,
        )
    return seed

# ── Immediate flows ───────────────────────────────────────────────────────────
async def send_lead_sms(lead: dict):
    """Two immediate texts: confirmation to lead + alert to staff."""
    name      = lead.get('first_name', 'there')
    interest  = lead.get('interest_type', 'General Membership')
    timeline  = lead.get('start_timeline', '')
    lead_phone = lead.get('phone', '').strip()
    staff_nums = await get_sms_staff_numbers()

    tasks = []

    # A) Confirmation to lead
    if lead_phone and lead_phone.startswith('+'):
        msg = (
            f"Hey {name}, Santa Cruz Strength here! "
            f"Stoked you reached out. Someone from our team will hit you up shortly "
            f"to set up a quick tour. Questions? Call (408) 337-6709. - SCS"
        )
        tasks.append(send_sms([lead_phone], msg))

    # B) Alert to staff
    if staff_nums:
        full_name = f"{lead.get('first_name','')} {lead.get('last_name','')}".strip()
        staff_msg = (
            f"New SCS Lead: {full_name} | "
            f"{lead_phone} | {interest}"
            f"{' | ' + timeline if timeline else ''} | "
            f"CRM: https://santacruzstrength.com/staff/dashboard"
        )
        tasks.append(send_sms(staff_nums, staff_msg))

    await asyncio.gather(*tasks, return_exceptions=True)

# ── Status-change triggered SMS ────────────────────────────────────────────────
async def send_status_change_sms(lead: dict, new_status: str):
    """Fire a branded SMS when staff moves a lead to a milestone status."""
    name      = lead.get('first_name', 'there')
    lead_phone = lead.get('phone', '').strip()
    if not lead_phone or not lead_phone.startswith('+'):
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
    if not MAILERSEND_API_KEY or not MAILERSEND_FROM:
        return
    now = now_utc()
    for seq in SMS_SEQUENCE:
        cutoff_start = (now - timedelta(hours=seq['hours'] + 1)).isoformat()
        cutoff_end   = (now - timedelta(hours=seq['hours'] - 1)).isoformat()
        leads = await db.leads.find({
            'created_at': {'$gte': cutoff_start, '$lte': cutoff_end},
            'status':     {'$in': list(seq['target_statuses'])},
            f'sms_log.type': {'$ne': seq['key']},   # hasn't already received this step
        }, {'_id': 0, 'id': 1, 'phone': 1, 'first_name': 1, 'status': 1, 'sms_log': 1}).to_list(500)

        for lead in leads:
            phone = lead.get('phone', '').strip()
            if not phone or not phone.startswith('+'):
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
    cutoff_iso  = (now - timedelta(days=4)).isoformat()   # window: 3–7 days after joining

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

class LeadCreate(BaseModel):
    first_name: str
    last_name: str
    email: str
    phone: str
    location: str = 'santa_cruz'
    interest_type: str = 'General Membership'
    training_goals: Optional[str] = ''
    start_timeline: Optional[str] = 'Just exploring'
    preferred_contact: Optional[str] = 'call'
    lead_source: Optional[str] = 'website_form'
    notes: Optional[str] = ''
    tags: Optional[List[str]] = []

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
        <p style="margin:0;color:#CDE4DF;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Santa Cruz Strength — Staff Portal</p>
        <p style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:800;">Your login code</p>
      </td></tr>
      <tr><td style="padding:32px;">
        <p style="margin:0 0 16px;color:#e8f5ee;font-size:14px;">Hey {name}, here's your one-time login code:</p>
        <div style="background:#0D5D3E;border-radius:10px;padding:20px 32px;text-align:center;margin:0 0 20px;">
          <span style="font-family:monospace;font-size:38px;font-weight:900;color:#ffffff;letter-spacing:10px;">{otp}</span>
        </div>
        <p style="margin:0;color:#8FBF9F;font-size:12px;line-height:1.6;">
          This code expires in <strong style="color:#CDE4DF;">10 minutes</strong>.<br>
          If you didn't request this, someone may be attempting to access your account — contact your admin.
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
        <p style="margin:0;color:#CDE4DF;font-size:10px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Santa Cruz Strength — Staff Portal</p>
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
          If you didn't request a password reset, ignore this email — your password will not change.
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

@api_router.post('/auth/login')
async def login(req: LoginRequest):
    user = await db.users.find_one({'email': req.email.lower().strip()})
    if not user or not verify_password(req.password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    if not user.get('is_active', True):
        raise HTTPException(status_code=403, detail='Account disabled')

    # Check if a valid remembered device token was supplied
    device_token = (getattr(req, 'device_token', None) or '').strip()
    if device_token:
        device_record = await db.device_tokens.find_one({
            'email': user['email'],
            'token': device_token,
            'used': False,
        })
        if device_record:
            exp = datetime.fromisoformat(device_record['expires_at'].replace('Z', '+00:00'))
            if exp.tzinfo is None:
                exp = exp.replace(tzinfo=timezone.utc)
            if now_utc() < exp:
                # Valid remembered device — skip OTP, issue JWT directly
                token = create_token({'sub': user['id']})
                logger.info(f'[AUTH] Device token valid for {user["email"]} — OTP skipped')
                return {
                    'access_token': token,
                    'token_type': 'bearer',
                    'step': 'authenticated',
                    'user': {'id': user['id'], 'name': user['name'], 'email': user['email'],
                             'role': user['role'], 'location': user.get('location', 'santa_cruz')}
                }
            else:
                # Expired — clean it up
                await db.device_tokens.delete_one({'_id': device_record['_id']})

    # No valid device token — require OTP
    otp = ''.join(random.choices(string.digits, k=6))
    expires = now_utc() + timedelta(minutes=10)
    await db.auth_otps.delete_many({'email': user['email']})
    await db.auth_otps.insert_one({
        'email': user['email'],
        'otp': otp,
        'expires_at': expires.isoformat(),
        'used': False,
    })
    await send_resend_email(
        to=user['email'],
        subject='Your Santa Cruz Strength login code',
        html=_otp_email_html(user.get('name', 'there'), otp),
        from_override=SECURITY_FROM,
    )
    return {'step': 'otp_required', 'message': f'Code sent to {user["email"]}'}

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
        raise HTTPException(status_code=401, detail='Code has expired — please log in again')
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
        logger.info(f'[AUTH] Device token issued for {email} — expires {device_expires.date()}')

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
    frontend_url = os.environ.get('FRONTEND_URL', 'https://santacruzstrength.com')
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
        raise HTTPException(status_code=400, detail='Reset link has expired — please request a new one')
    await db.users.update_one({'email': record['email']}, {'$set': {'password_hash': hash_password(password)}})
    await db.password_resets.update_one({'_id': record['_id']}, {'$set': {'used': True}})
    return {'message': 'Password updated — you can now log in'}

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
    frontend_url = os.environ.get('FRONTEND_URL', 'https://santacruzstrength.com')
    reset_url = f"{frontend_url}/staff/reset-password?token={reset_token}"
    await send_resend_email(
        to=target['email'],
        subject=f'Password reset sent by {caller["name"]} — Santa Cruz Strength',
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
    frontend_url = os.environ.get('FRONTEND_URL', 'https://santacruzstrength.com')
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

@api_router.post('/leads')
async def create_lead_public(lead: LeadCreate):
    existing = await db.leads.find_one({'email': lead.email.lower().strip(), 'location': lead.location})
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
        'lead_source': lead.lead_source or 'website_form',
        'notes': lead.notes or '',
        'tags': lead.tags or [],
        'status': 'New',
        'next_follow_up_date': None,
        'next_follow_up_time': None,
        'last_contact_date': None,
        'activity_log': [{'action': 'Lead Created', 'note': f'Submitted via {lead.lead_source or "website_form"}', 'staff_id': None, 'staff_name': 'System', 'timestamp': now.isoformat()}],
        'created_at': now.isoformat(),
        'updated_at': now.isoformat()
    }
    if existing:
        await db.leads.update_one(
            {'email': lead.email.lower().strip(), 'location': lead.location},
            {'$set': {'phone': doc['phone'], 'interest_type': doc['interest_type'], 'training_goals': doc['training_goals'], 'updated_at': now.isoformat()},
             '$push': {'activity_log': {'action': 'Re-inquiry', 'note': f'Re-submitted via {lead.lead_source}', 'staff_id': None, 'staff_name': 'System', 'timestamp': now.isoformat()}}}
        )
        await asyncio.gather(send_lead_emails(doc), send_lead_sms(doc), return_exceptions=True)
        return {'id': existing['id'], 'status': 'updated'}
    await db.leads.insert_one(doc)
    await asyncio.gather(send_lead_emails(doc), send_lead_sms(doc), return_exceptions=True)
    return {'id': lead_id, 'status': 'created'}

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

# CSV Template — includes member fields
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

# CSV Export — includes member fields
@api_router.get('/staff/leads/export/csv')
async def export_leads_csv(status: Optional[str] = None, location: Optional[str] = None, user=Depends(require_staff)):
    query = {}
    if status: query['status'] = status
    if location: query['location'] = location
    leads = await db.leads.find(query, {'_id': 0}).sort('created_at', -1).to_list(5000)
    fieldnames = [
        'first_name', 'last_name', 'date_of_birth', 'email', 'phone',
        'address', 'city', 'state', 'zip_code',
        'status', 'interest_type', 'lead_source', 'how_did_you_hear_about_us',
        'training_goals', 'start_timeline', 'preferred_contact', 'location',
        'notes', 'created_at', 'last_contact_date', 'next_follow_up_date', 'next_follow_up_time'
    ]
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for lead in leads:
        writer.writerow({f: lead.get(f, '') or '' for f in fieldnames})
    output.seek(0)
    return StreamingResponse(iter([output.getvalue()]), media_type='text/csv', headers={'Content-Disposition': 'attachment; filename=scs-leads.csv'})

# CSV Import — handles both member format and lead format
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
        if not fn or not phone:
            errors.append(f'Row {i}: missing name or phone — skipped')
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

    # Bulk insert — handles 2000+ rows efficiently
    if docs_to_insert:
        try:
            result = await db.leads.insert_many(docs_to_insert, ordered=False)
            imported = len(result.inserted_ids)
        except Exception as bulk_err:
            imported = getattr(getattr(bulk_err, 'details', {}), 'get', lambda *a: len(docs_to_insert))('nInserted', len(docs_to_insert))

    return {'imported': imported, 'skipped': skipped, 'errors': errors[:20], 'total_rows': len(rows)}
    lead = await db.leads.find_one({'id': lead_id}, {'_id': 0})
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    return lead

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
        update['last_contact_date'] = now.isoformat()
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
    await db.leads.update_one({'id': lead_id}, {'$push': {'activity_log': entry}, '$set': {'updated_at': now.isoformat(), 'last_contact_date': now.isoformat()}})
    return {'message': 'Note added', 'entry': entry}

@api_router.delete('/staff/leads/{lead_id}')
async def delete_lead(lead_id: str, user=Depends(require_admin)):
    """Admin/owner only — staff cannot delete"""
    result = await db.leads.delete_one({'id': lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Lead not found')
    return {'message': 'Lead deleted'}

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
    """Single endpoint for the mobile portal — stats + today's follow-ups + recent new leads."""
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
    return {'message': 'User deleted'}

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

@api_router.get('/blog/:slug')
async def get_blog_post_by_slug_param(slug: str):
    post = await db.blog.find_one({'slug': slug, 'published': True}, {'_id': 0})
    if not post:
        raise HTTPException(status_code=404, detail='Post not found')
    return post

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
    Returns cached blog ideas (instant) or generates fresh ones.
    Cache lives for 6 hours. Pass ?force=true to force regeneration.
    """
    import json as _json
    from emergentintegrations.llm.chat import LlmChat, UserMessage

    # ── Check cache first (skip if force=true) ────────────────────────────────
    if not force:
        cached = await db.blog_ideas_cache.find_one({'_id': 'latest'})
        if cached:
            age_hours = (now_utc() - datetime.fromisoformat(
                cached['generated_at'].replace('Z', '+00:00')
            ).replace(tzinfo=timezone.utc)).total_seconds() / 3600
            if age_hours < 6:
                logger.info(f'[BLOG IDEAS] Serving cache ({age_hours:.1f}h old)')
                return {
                    'ideas': cached['ideas'],
                    'trends_used': cached.get('trends_used', []),
                    'cached': True,
                    'generated_at': cached['generated_at'],
                }

    # ── Fetch Google Trends (with tight 8-second timeout) ─────────────────────
    trend_topics = []
    try:
        from pytrends.request import TrendReq
        pytrends = TrendReq(hl='en-US', tz=360, timeout=(4, 8))
        kw_list = ['strength training', 'powerlifting', 'gym workout']
        pytrends.build_payload(kw_list, cat=44, timeframe='now 7-d', geo='US-CA')
        related = pytrends.related_queries()
        for kw in kw_list:
            for bucket in ('rising', 'top'):
                df = related.get(kw, {}).get(bucket)
                if df is not None and not df.empty:
                    trend_topics += df['query'].head(4).tolist()
        trend_topics = list(dict.fromkeys(trend_topics))[:15]
        logger.info(f'[BLOG IDEAS] Trends: {trend_topics}')
    except Exception as e:
        logger.warning(f'[BLOG IDEAS] pytrends failed: {e} — using fallback')
        trend_topics = ['strength training beginners', 'powerlifting program',
                        'gym for surfers', 'how to deadlift', 'strength training over 40']

    trends_str = ', '.join(trend_topics) if trend_topics else 'strength training, powerlifting, fitness'

    # ── LLM — shorter prompt, 6 ideas, gpt-4o-mini ───────────────────────────
    llm_key = os.environ.get('EMERGENT_LLM_KEY', '')
    if not llm_key:
        raise HTTPException(status_code=500, detail='LLM key not configured')

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

        # ── Save to cache ──────────────────────────────────────────────────────
        generated_at = now_utc().isoformat()
        await db.blog_ideas_cache.replace_one(
            {'_id': 'latest'},
            {'_id': 'latest', 'ideas': ideas, 'trends_used': trend_topics, 'generated_at': generated_at},
            upsert=True,
        )
        return {'ideas': ideas, 'trends_used': trend_topics, 'cached': False, 'generated_at': generated_at}
    except Exception as e:
        logger.error(f'[BLOG IDEAS] LLM error: {e}')
        raise HTTPException(status_code=500, detail=f'Failed to generate ideas: {str(e)}')

        logger.error(f'[BLOG IDEAS] LLM error: {e}')
        raise HTTPException(status_code=500, detail=f'Failed to generate ideas: {str(e)}')

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
    max_capacity: Optional[int] = None
    published: bool = True
    recurring: str = 'none'          # 'none' | 'daily' | 'weekly' | 'biweekly' | 'monthly'
    recurring_until: Optional[str] = ''  # ISO date string

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
    max_capacity: Optional[int] = None
    published: Optional[bool] = None
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
        query['date'] = {'$gte': today.isoformat()}
    events = await db.events.find(query, {'_id': 0}).sort('date', 1).to_list(200)

    # Expand recurring events into instances up to 6 months ahead
    expanded = []
    cutoff = today + timedelta(days=183)

    for e in events:
        # Attach RSVP count
        if e.get('ticket_type') == 'rsvp':
            e['rsvp_count'] = await db.event_rsvps.count_documents({'event_id': e['id']})

        recurring = e.get('recurring', 'none') or 'none'
        if recurring == 'none' or not upcoming:
            expanded.append(e)
            continue

        # Generate recurring instances
        try:
            base_date = date_type.fromisoformat(e['date'])
            until_str = e.get('recurring_until', '')
            until = date_type.fromisoformat(until_str) if until_str else cutoff
            until = min(until, cutoff)

            DELTAS = {
                'daily':    timedelta(days=1),
                'weekly':   timedelta(weeks=1),
                'biweekly': timedelta(weeks=2),
            }

            current = base_date
            instance_count = 0
            while current <= until and instance_count < 52:
                if current >= today:
                    instance = dict(e)
                    instance['date'] = current.isoformat()
                    instance['id'] = f"{e['id']}_{current.isoformat()}"
                    instance['is_recurring_instance'] = current != base_date
                    expanded.append(instance)
                    instance_count += 1

                if recurring in DELTAS:
                    current += DELTAS[recurring]
                elif recurring == 'monthly':
                    # Advance one month, same day-of-month
                    month = current.month + 1 if current.month < 12 else 1
                    year  = current.year + 1 if current.month == 12 else current.year
                    day   = min(current.day, cal_module.monthrange(year, month)[1])
                    current = date_type(year, month, day)
                else:
                    break
        except Exception:
            expanded.append(e)

    # Sort all expanded events by date
    expanded.sort(key=lambda x: x.get('date', ''))
    return expanded

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
    events = await db.events.find({}, {'_id': 0}).sort('date', -1).to_list(200)
    for e in events:
        if e.get('ticket_type') == 'rsvp':
            e['rsvp_count'] = await db.event_rsvps.count_documents({'event_id': e['id']})
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
JOIN_URL = 'https://onlinejoin.abcfitness.com/signup/plan?club=31691'

CAMPAIGN_SUBJECTS = [
    "We've been thinking about you.",
    "Your spot's still here.",
    "Come back and train with us.",
]

def _campaign_email_html(first_name: str, join_url: str, wave: int = 1) -> str:
    if wave == 1:
        subject_line = f"Hey {first_name},"
        body = f"""
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">We've been thinking about you.</p>
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">We just wrapped our 11th annual <strong>Iron Roses</strong>, and moments like that remind us what this place really is.</p>
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">It's not just a gym.<br>It's the people. The energy. The ones who show up and put in real work.</p>
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;"><strong>You were part of that.</strong> And it's not the same without you here.</p>
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">Life gets busy, things shift — we understand that. But if there's even a part of you that's been missing training&hellip; missing that feeling of getting stronger&hellip; missing being around people who actually push you&hellip;</p>
        <p style="margin:0 0 24px;font-size:16px;font-weight:700;color:#1a1a1a;">We want you back in the room.</p>
        <div style="background:#f7f5f0;border-left:4px solid #0D5D3E;padding:16px 20px;margin:0 0 24px;border-radius:0 8px 8px 0;">
          <p style="margin:0 0 6px;font-size:15px;font-weight:800;color:#0D5D3E;">🔥 Come Back Stronger</p>
          <p style="margin:0;font-size:14px;color:#444;line-height:1.6;">Sign up for any committed membership and we'll give you <strong>2 months free</strong>.<br>No codes. No extra steps. Just sign up, show up, and train — we'll take care of the rest.</p>
        </div>"""
        cta = "Claim Your 2 Months Free →"
        footer = "You don't need to be \"ready.\" You just need to walk back through the door."
    elif wave == 2:
        subject_line = f"Hey {first_name} — last chance."
        body = f"""
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">We sent you a note a week ago about coming back to Santa Cruz Strength.</p>
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">We're following up because the offer — <strong>2 months free on any committed membership</strong> — doesn't last forever.</p>
        <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.7;">If you've been on the fence, this is your moment. We'd love to have you back.</p>"""
        cta = "Get 2 Months Free — Last Chance →"
        footer = "No pressure. But the door is open."
    else:
        subject_line = f"Hey {first_name} — we saved your spot."
        body = f"""
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">We've reached out a couple of times because we genuinely want you back.</p>
        <p style="margin:0 0 14px;font-size:15px;color:#333;line-height:1.7;">This is our final note. Your spot at Santa Cruz Strength — and the <strong>2 months free offer</strong> — is still here. But we won't keep asking.</p>
        <p style="margin:0 0 24px;font-size:15px;color:#333;line-height:1.7;">When you're ready, we'll be here. That's a promise.</p>"""
        cta = "Come Back — Offer Ends Soon →"
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
        <p style="margin:0;font-size:14px;color:#555;font-weight:600;">— Santa Cruz Strength</p>
      </td></tr>
      <tr><td style="border-top:1px solid #eee;padding:16px 36px;background:#fafaf9;">
        <p style="margin:0;font-size:11px;color:#aaa;line-height:1.6;">
          Santa Cruz Strength · 151 Harvey West Blvd Ste D, Santa Cruz CA 95060<br>
          <a href="tel:+14083376709" style="color:#0D5D3E;text-decoration:none;">(408) 337-6709</a> ·
          <a href="https://www.instagram.com/santacruzstrength/" style="color:#0D5D3E;text-decoration:none;">@santacruzstrength</a><br>
          <span style="color:#ccc;">To unsubscribe, reply with STOP.</span>
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
@api_router.get('/staff/campaigns')
async def list_campaigns(user=Depends(require_admin)):
    campaigns = await db.campaigns.find({}, {'_id': 0}).sort('created_at', -1).to_list(50)
    for c in campaigns:
        c['sent_count'] = await db.campaign_sends.count_documents({'campaign_id': c['id'], 'wave': 1})
        c['total_leads'] = await db.leads.count_documents({
            'blacklisted': {'$ne': True},
            'email': {'$ne': ''},
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
        'blacklisted': {'$ne': True}, 'email': {'$nin': ['', None]},
        'tags': c.get('tag_filter', 'imported'),
    })
    return c

@api_router.post('/staff/campaigns/{campaign_id}/start')
async def start_campaign(campaign_id: str, user=Depends(require_admin)):
    c = await db.campaigns.find_one({'id': campaign_id})
    if not c:
        raise HTTPException(status_code=404, detail='Campaign not found')
    await db.campaigns.update_one({'id': campaign_id}, {'$set': {'status': 'active', 'updated_at': now_utc().isoformat()}})
    return {'message': 'Campaign started', 'status': 'active'}

@api_router.post('/staff/campaigns/{campaign_id}/pause')
async def pause_campaign(campaign_id: str, user=Depends(require_admin)):
    await db.campaigns.update_one({'id': campaign_id}, {'$set': {'status': 'paused', 'updated_at': now_utc().isoformat()}})
    return {'message': 'Campaign paused', 'status': 'paused'}

# Campaign scheduler — runs every hour, sends at 10 AM PT
async def run_campaign_scheduler():
    """Staggered campaign sends — fires daily batch at ~10 AM."""
    from datetime import date as date_type
    la_hour = (now_utc() - timedelta(hours=7)).hour   # approx Pacific time offset
    if la_hour != 10:
        return   # only fire at 10 AM PT

    today = now_utc().date().isoformat()
    active_campaigns = await db.campaigns.find({'status': 'active'}, {'_id': 0}).to_list(20)

    for campaign in active_campaigns:
        cid = campaign['id']
        if campaign.get('last_sent_date') == today:
            continue   # already sent today's batch

        tag_filter   = campaign.get('tag_filter', 'imported')
        batch_size   = campaign.get('batch_size_per_day', 70)
        join_url     = campaign.get('join_url', JOIN_URL)
        subjects     = campaign.get('subject_options', CAMPAIGN_SUBJECTS)

        # ── Wave 1: initial send ──────────────────────────────────────────────
        already_sent_ids = {
            s['lead_id'] async for s in db.campaign_sends.find({'campaign_id': cid, 'wave': 1}, {'lead_id': 1, '_id': 0})
        }
        leads = await db.leads.find({
            'blacklisted': {'$ne': True},
            'email': {'$nin': ['', None]},
            'tags': tag_filter,
            'id': {'$nin': list(already_sent_ids)},
        }, {'_id': 0, 'id': 1, 'first_name': 1, 'email': 1, 'phone': 1}).limit(batch_size).to_list(batch_size)

        sent_wave1 = 0
        for idx, lead in enumerate(leads):
            subject = subjects[idx % len(subjects)]
            html = _campaign_email_html(lead.get('first_name', 'there'), join_url, wave=1)
            email_ok = await send_resend_email(to=lead['email'], subject=subject, html=html)
            sms_ok = False
            if campaign.get('send_sms') and lead.get('phone') and MAILERSEND_FROM:
                sms_text = _campaign_sms(lead.get('first_name', 'there'), join_url, wave=1)
                sms_ok = await send_sms([lead['phone']], sms_text)
            if email_ok:
                await db.campaign_sends.insert_one({
                    'id': str(uuid.uuid4()), 'campaign_id': cid, 'lead_id': lead['id'],
                    'wave': 1, 'email_sent': email_ok, 'sms_sent': sms_ok,
                    'subject': subject, 'sent_at': now_utc().isoformat(),
                })
                sent_wave1 += 1
            await asyncio.sleep(0.25)  # 4/second max — stay under Resend 5/sec limit

        # ── Wave 2: 7-day follow-up ───────────────────────────────────────────
        wave2_cutoff = (now_utc() - timedelta(days=campaign.get('wave2_delay_days', 7))).isoformat()
        wave1_sent = await db.campaign_sends.find(
            {'campaign_id': cid, 'wave': 1, 'sent_at': {'$lte': wave2_cutoff}},
            {'lead_id': 1, '_id': 0}
        ).to_list(500)
        wave2_already = {s['lead_id'] async for s in db.campaign_sends.find({'campaign_id': cid, 'wave': 2}, {'lead_id': 1, '_id': 0})}
        for send in wave1_sent:
            if send['lead_id'] in wave2_already:
                continue
            lead = await db.leads.find_one({'id': send['lead_id'], 'blacklisted': {'$ne': True}}, {'_id': 0, 'first_name': 1, 'email': 1, 'phone': 1})
            if not lead or not lead.get('email'):
                continue
            html = _campaign_email_html(lead.get('first_name', 'there'), join_url, wave=2)
            email_ok = await send_resend_email(to=lead['email'], subject="Your spot's still open — 2 months free", html=html)
            if email_ok:
                await db.campaign_sends.insert_one({
                    'id': str(uuid.uuid4()), 'campaign_id': cid, 'lead_id': lead['id'] if 'id' in lead else send['lead_id'],
                    'wave': 2, 'email_sent': True, 'sms_sent': False,
                    'subject': "Your spot's still open", 'sent_at': now_utc().isoformat(),
                })

        # ── Wave 3: final ─────────────────────────────────────────────────────
        wave3_cutoff = (now_utc() - timedelta(days=campaign.get('wave3_delay_days', 14))).isoformat()
        wave2_sent_old = await db.campaign_sends.find(
            {'campaign_id': cid, 'wave': 2, 'sent_at': {'$lte': wave3_cutoff}},
            {'lead_id': 1, '_id': 0}
        ).to_list(500)
        wave3_already = {s['lead_id'] async for s in db.campaign_sends.find({'campaign_id': cid, 'wave': 3}, {'lead_id': 1, '_id': 0})}
        for send in wave2_sent_old:
            if send['lead_id'] in wave3_already:
                continue
            lead = await db.leads.find_one({'id': send['lead_id'], 'blacklisted': {'$ne': True}}, {'_id': 0, 'first_name': 1, 'email': 1})
            if not lead or not lead.get('email'):
                continue
            html = _campaign_email_html(lead.get('first_name', 'there'), join_url, wave=3)
            email_ok = await send_resend_email(to=lead['email'], subject="We saved your spot.", html=html)
            if email_ok:
                await db.campaign_sends.insert_one({
                    'id': str(uuid.uuid4()), 'campaign_id': cid, 'lead_id': send['lead_id'],
                    'wave': 3, 'email_sent': True, 'sms_sent': False,
                    'subject': "We saved your spot.", 'sent_at': now_utc().isoformat(),
                })

        # Update campaign stats
        total_leads = await db.leads.count_documents({'tags': tag_filter, 'blacklisted': {'$ne': True}, 'email': {'$nin': ['', None]}})
        total_sent  = await db.campaign_sends.count_documents({'campaign_id': cid, 'wave': 1})
        new_status  = 'completed' if total_sent >= total_leads else 'active'
        await db.campaigns.update_one({'id': cid}, {'$set': {
            'last_sent_date': today, 'status': new_status, 'updated_at': now_utc().isoformat()
        }})
        if sent_wave1:
            logger.info(f'[CAMPAIGN] {campaign["name"]}: sent wave1={sent_wave1} today, total={total_sent}/{total_leads}')

GOOGLE_REVIEW_URL = 'https://g.page/r/CUj8NPJ7NHNOEAE/review'
FRONTEND_URL_DEFAULT = 'https://santacruzstrength.com'

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
    frontend_url = os.environ.get('FRONTEND_URL', FRONTEND_URL_DEFAULT)
    review_page_url = f"{frontend_url}/review/{token}"
    if email:
        await send_resend_email(
            to=email,
            subject=f"Welcome to Santa Cruz Strength, {name}! Share your experience",
            html=_review_email_html(name, review_page_url),
        )
    if phone and phone.startswith('+') and MAILERSEND_FROM:
        sms = (f"Hey {name.split()[0]}, welcome to Santa Cruz Strength! "
               f"We'd love to hear about your experience — takes 10 seconds: {review_page_url} - SCS")
        await send_sms([phone], sms)
    logger.info(f'[REVIEW] Request sent to {name} — token {token}')
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
          Stoked to have you at Santa Cruz Strength. We'd love to hear how your first experience has been — it only takes 10 seconds.
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
async def create_review_request(lead_id: str):
    """Internal — called when lead status changes to Joined."""
    lead = await db.leads.find_one({'id': lead_id})
    if not lead:
        return {'message': 'Lead not found'}
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
            subject=f'⚠️ {rating}-Star Member Feedback — {req["name"]}',
            html=_feedback_email_html(req['name'], rating, category, follow_up, extra),
        )
    return {'message': 'Thank you for your feedback!', 'rating': rating}

# --------------- Media Upload ---------------

import base64 as _base64

@api_router.post('/upload')
async def upload_image(file: UploadFile = File(...), user=Depends(require_admin)):
    """Upload an image file — stores in MongoDB, returns a public URL."""
    if not file.content_type or not file.content_type.startswith('image/'):
        raise HTTPException(status_code=400, detail='Only image files are allowed (JPEG, PNG, WebP, GIF)')
    content = await file.read()
    if len(content) > 8 * 1024 * 1024:
        raise HTTPException(status_code=400, detail='File too large — max 8MB')
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
    """Serve an uploaded image publicly — no auth required."""
    from fastapi.responses import Response
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
            'content': '''<p>If you surf in Santa Cruz, you already understand athletic effort. Early mornings, cold water, and a lineup that demands respect. What you might not realize is that your time in the gym — specifically lifting weights — could be the biggest performance leap available to you right now.</p>

<h2>Strength Training and Surfing: The Connection</h2>

<p>Surfing is not a low-impact sport. It demands explosive hip extension for pop-ups, rotational power for turns, shoulder stability for paddle-outs, and the core strength to hold position on unpredictable wave faces.</p>

<p>Most surf-specific injuries — rotator cuff issues, lower back pain, knee problems — are rooted in muscular imbalances that strength training directly addresses. When you train compound movements like squats, deadlifts, rows, and overhead pressing, you build the structural resilience that keeps you surfing longer into life.</p>

<h2>The Specific Lifts That Carry Over to Surfing</h2>

<ul>
<li><strong>Deadlifts</strong> — Build posterior chain strength (hamstrings, glutes, lower back) that powers your pop-up and keeps your spine stable in the barrel.</li>
<li><strong>Romanian Deadlifts</strong> — Train the hip hinge pattern under load, improving your ability to generate force from the hips on critical turns.</li>
<li><strong>Barbell Rows</strong> — Strengthen the back muscles that do most of the work during paddle sessions. Better paddling equals more waves.</li>
<li><strong>Front Squats</strong> — Develop quad strength and thoracic mobility — both essential for low, powerful stance positions.</li>
<li><strong>Turkish Get-Ups</strong> — One of the best exercises for the total-body stability and shoulder integrity surfers need.</li>
</ul>

<h2>How Often Should Surfers Lift?</h2>

<p>Two to three sessions per week is enough to see meaningful results without interfering with your time in the water. The key is consistency and progressive overload — adding small amounts of weight over time as your strength develops.</p>

<p>At Santa Cruz Strength, we work with surfers, climbers, trail runners, and other outdoor athletes who want their gym time to directly support their performance. If you\'re curious how to structure a program around your surf schedule, come in and talk to a coach.</p>

<h2>You Don\'t Have to Choose Between the Gym and the Water</h2>

<p>Strength training isn\'t a replacement for surfing. It\'s the foundation that makes everything else better. Local athletes who commit to a year of consistent lifting tell us the same thing: their surfing improved, their injuries decreased, and they feel more capable in every area of life.</p>

<p>That\'s what strength is for.</p>''',
            'category': 'Outdoor Athletes',
            'tags': ['surfing', 'strength training', 'Santa Cruz', 'performance'],
            'cover_image': 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/jba9w56u_images.jpeg',
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
            'excerpt': 'It\'s one of the most common questions we get. The answer depends on your goals, recovery capacity, and schedule — but there\'s a clear range that works for most people.',
            'content': '''<p>This is one of the questions we hear most often from new members and people considering joining. The internet gives wildly different answers — some say 6 days a week, others say 2 is enough. The truth is somewhere in the middle, and it depends on you.</p>

<h2>The Short Answer</h2>

<p><strong>For most people: 3 days per week.</strong></p>

<p>Three well-programmed sessions per week is enough to build real strength, add muscle, improve body composition, and maintain your results long-term. This holds true for beginners, intermediate lifters, and even many advanced athletes.</p>

<h2>Why 3 Days Works</h2>

<p>Muscle tissue repairs and grows during rest — not during the training session itself. Three sessions spaced throughout the week gives you enough stimulus to drive adaptation while allowing adequate recovery between sessions.</p>

<p>A typical 3-day program at Santa Cruz Strength might look like:</p>
<ul>
<li><strong>Monday</strong> — Lower body focus (squat pattern + deadlift variation)</li>
<li><strong>Wednesday</strong> — Upper body focus (push + pull)</li>
<li><strong>Friday</strong> — Full body or sport-specific work</li>
</ul>

<h2>When to Train 4-5 Days</h2>

<p>More advanced lifters with specific goals — powerlifting competition prep, building a particular muscle group, sport performance peaking — can benefit from 4 to 5 sessions per week. At this level, programming becomes more specialized and recovery management matters significantly more.</p>

<h2>When 2 Days Is Enough</h2>

<p>Two days of focused, heavy lifting is enough to maintain strength and provide measurable health benefits. If you\'re a busy professional, parent, or athlete whose primary sport is outside the gym, two sessions can absolutely move the needle.</p>

<p>Something is always better than nothing. We would rather have you lift twice a week for five years than attempt six days a week for three weeks before burning out.</p>

<h2>The Most Important Variable</h2>

<p>Consistency over time beats frequency in the short term. The best program is the one you can actually do week after week, month after month. Start with three days. Get consistent. Build from there.</p>

<p>If you\'re not sure where to start, our coaches at Santa Cruz Strength are happy to help you build a realistic schedule that works with your life.</p>''',
            'category': 'Strength Science',
            'tags': ['training frequency', 'beginners', 'programming', 'FAQ'],
            'cover_image': 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/gum0tx3j_l.jpg',
            'published': True,
            'seo_title': 'How Many Days a Week Should You Lift? | Santa Cruz Strength',
            'seo_description': 'The honest answer on training frequency: how many days per week you should lift based on your goals, schedule, and recovery capacity.',
            'author': 'Santa Cruz Strength',
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'Is Strength Training Good for Beginners? (Yes — Here\'s Why)',
            'slug': 'is-strength-training-good-for-beginners',
            'excerpt': 'You don\'t need to be in shape to start lifting. You start lifting to get in shape. Here\'s what beginners actually experience in their first months of strength training.',
            'content': '''<p>One of the most common concerns we hear from people who walk into Santa Cruz Strength for the first time: "I\'m not fit enough to be here yet."</p>

<p>That\'s exactly backwards. You\'re not supposed to come in already fit. You come in to get fit. That\'s what the gym is for.</p>

<h2>What Actually Happens When Beginners Lift</h2>

<p>Beginners respond to strength training faster than almost anyone else. This isn\'t motivation — it\'s physiology. When your body encounters a new stimulus (lifting weights), it adapts aggressively. In the first 3 to 6 months of consistent training, beginners often:</p>

<ul>
<li>Increase strength by 20–40% on major lifts</li>
<li>Improve body composition even without dietary changes</li>
<li>Build bone density that protects against injury</li>
<li>Improve insulin sensitivity and metabolic health</li>
<li>Sleep better and report improved mental clarity</li>
</ul>

<h2>You Don\'t Need Special Fitness First</h2>

<p>You don\'t need to be able to run a mile. You don\'t need to lose weight before you come in. You don\'t need to have lifted before. Every coach at Santa Cruz Strength has worked with people at every starting point — from never having touched a barbell to returning after years away from training.</p>

<p>Good coaching means meeting you exactly where you are.</p>

<h2>What Beginners Should Focus On</h2>

<p>In the first 3 months, the priority is:</p>

<ol>
<li><strong>Learning movement patterns</strong> — squat, hinge, push, pull, carry</li>
<li><strong>Building the habit</strong> — consistent attendance matters more than perfect programming</li>
<li><strong>Staying patient</strong> — the results are real but they compound over months, not weeks</li>
</ol>

<h2>The Santa Cruz Strength Environment</h2>

<p>We built this gym for serious training — but serious doesn\'t mean exclusive. It means focused, respectful, and honest. Beginners are welcome here because everyone who trains seriously was once a beginner.</p>

<p>If you\'re curious about starting, come in and talk to us. No pressure, no sales tactics. Just a conversation about where you are and where you want to go.</p>''',
            'category': 'Getting Started',
            'tags': ['beginners', 'strength training', 'getting started', 'FAQ'],
            'cover_image': 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/aw0t70q8_348s.jpg',
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
            'excerpt': 'Santa Cruz is full of world-class outdoor athletes who train hard in their sport — and often neglect the weight room. Here\'s why that\'s a missed opportunity.',
            'content': '''<p>Santa Cruz has one of the most diverse outdoor athletic communities in California. On any given day, you\'ll find people climbing at Castle Rock, running the fire roads above Wilder Ranch, or grinding up Empire Grade on a road bike. What these athletes often have in common: they\'re incredibly fit in their sport and significantly undertrained everywhere else.</p>

<h2>Why Sport-Specific Fitness Isn\'t Enough</h2>

<p>Running makes you a better runner — but only to a point. Past a certain threshold, additional running volume produces diminishing returns and increasing injury risk. The athletes who break through plateaus and stay healthy long-term are the ones who address their structural weaknesses in the weight room.</p>

<h2>For Climbers</h2>

<p>Climbing develops pulling strength impressively but creates significant imbalances — overdeveloped pulling muscles, underdeveloped pushing muscles, and often tight hip flexors. Dedicated pressing work, hip mobility training, and posterior chain strengthening directly address the injury patterns that take climbers out of commission. Finger injuries, shoulder impingements, and elbow tendinitis are frequently rooted in these imbalances.</p>

<h2>For Trail Runners</h2>

<p>Running doesn\'t build the single-leg strength needed to run efficiently. Unilateral exercises — Bulgarian split squats, single-leg Romanian deadlifts, step-ups — build the specific strength that improves running economy and protects knees and hips on technical descents. Two sessions per week of strength work has been shown repeatedly to improve running performance without adding significant training load.</p>

<h2>For Cyclists</h2>

<p>Cycling is almost entirely quad-dominant. Cyclists who lift discover two things quickly: their glutes were significantly underdeveloped, and their power on climbs improves when they address it. Heavy deadlifts and hip thrusts build the posterior chain that makes the difference in the final kilometers of a hard effort.</p>

<h2>How We Train Outdoor Athletes at Santa Cruz Strength</h2>

<p>Our approach for athletes is simple: build strength that carries over to your sport without compromising your sport-specific training. We program around your schedule, respect your primary training volume, and focus on the movements that give you the most return.</p>

<p>If you\'re a climber, runner, or cyclist curious about how strength training would fit into your life, come in for a free tour and conversation. We train athletes from across the Santa Cruz community.</p>''',
            'category': 'Outdoor Athletes',
            'tags': ['climbing', 'trail running', 'cycling', 'outdoor athletes', 'Santa Cruz'],
            'cover_image': 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/jba9w56u_images.jpeg',
            'published': True,
            'seo_title': 'Strength Training for Santa Cruz Outdoor Athletes | Santa Cruz Strength',
            'seo_description': 'Why climbers, trail runners, and cyclists in Santa Cruz should add strength training to their routine — and how to do it without sacrificing sport performance.',
            'author': 'Santa Cruz Strength',
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'Can You Lose Weight by Lifting Weights?',
            'slug': 'can-you-lose-weight-by-lifting-weights',
            'excerpt': 'The short answer is yes — but the mechanism is different from what most people expect. Here\'s what actually happens to your body when you start a consistent strength training program.',
            'content': '''<p>This question comes up constantly, and the honest answer surprises a lot of people: yes, lifting weights is one of the most effective things you can do for long-term body composition — but not necessarily for the reasons you think.</p>

<h2>Why Cardio Alone Often Disappoints</h2>

<p>Many people approach fat loss by adding cardio: longer runs, more classes, more time on the bike. This works to a degree, but it has a ceiling. The body adapts to cardio volume efficiently, caloric burn per session decreases over time, and muscle mass — which drives metabolic rate — is often lost in the process.</p>

<h2>How Lifting Changes the Equation</h2>

<p>Muscle tissue is metabolically expensive. The more of it you have, the more calories your body burns at rest. When you add muscle through consistent strength training, you raise your resting metabolic rate — meaning you burn more calories even when you\'re not exercising.</p>

<p>This is why many people who start lifting report that their body composition changes noticeably even without changing what they eat. They gain muscle, lose fat, and their clothes fit differently — even if the number on the scale doesn\'t move dramatically.</p>

<h2>Strength Training + Diet: The Real Formula</h2>

<p>If weight loss is a goal, the most effective approach combines:</p>
<ol>
<li>Consistent strength training (2–4 sessions per week)</li>
<li>Adequate protein intake (enough to support muscle retention and growth)</li>
<li>A modest caloric deficit (not aggressive restriction)</li>
</ol>

<p>This combination preserves muscle while losing fat — which produces dramatically better long-term results than calorie restriction alone.</p>

<h2>What Santa Cruz Strength Members Experience</h2>

<p>We have members who came in specifically for weight loss and discovered that the scale became far less important once they started getting stronger. Performance goals — lifting more, moving better, having more energy — replaced the single focus on body weight. And ironically, their bodies changed more significantly than they expected.</p>

<p>Strength training doesn\'t just change how you look. It changes how you live.</p>''',
            'category': 'Strength Science',
            'tags': ['weight loss', 'body composition', 'strength training', 'FAQ'],
            'cover_image': 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/gum0tx3j_l.jpg',
            'published': True,
            'seo_title': 'Can You Lose Weight by Lifting Weights? | Santa Cruz Strength',
            'seo_description': 'Yes — and here\'s why strength training is one of the most effective tools for long-term body composition change.',
            'author': 'Santa Cruz Strength',
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
        },
        {
            'id': str(uuid.uuid4()),
            'title': 'The Best Gym in Santa Cruz for Serious Athletes',
            'slug': 'best-gym-santa-cruz-serious-athletes',
            'excerpt': 'What makes a gym right for athletes who train with intention? After years of building Santa Cruz Strength, here\'s what we believe separates a serious training environment from everything else.',
            'content': '''<p>Santa Cruz has no shortage of fitness options. Big-box gyms, boutique studios, CrossFit affiliates, yoga centers, and everything in between. We built Santa Cruz Strength because we believed something was missing — a dedicated strength training environment for people who take their training seriously without taking themselves too seriously.</p>

<h2>What "Serious" Actually Means</h2>

<p>Serious doesn\'t mean competitive. It doesn\'t mean you have to be a powerlifter or an athlete chasing a PR. Serious means you show up consistently, you put in the work, and you\'re there to improve — not to be seen, not to socialize, not to go through the motions.</p>

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

<p>We invest in equipment that athletes actually need, not in amenities designed to impress during a tour.</p>

<h2>The Culture</h2>

<p>The culture at Santa Cruz Strength is what differentiates us most. Members re-rack their weights. People nod at each other, spot when asked, and offer advice when it\'s welcome and stay quiet when it\'s not. There\'s no judgment about what you\'re lifting, where you started, or what your goals are.</p>

<h2>Location</h2>

<p>We\'re in Harvey West Business Park — a working part of Santa Cruz that feels right for a gym like this. Not downtown, not a strip mall. A real space in a real neighborhood, easy to get to, with parking.</p>

<p>If this sounds like what you\'ve been looking for, come in and see it. We offer free tours for anyone considering membership. No pressure, just an honest look at the space and a conversation about whether it\'s the right fit.</p>''',
            'category': 'Gym Culture',
            'tags': ['best gym Santa Cruz', 'strength gym', 'Santa Cruz', 'local'],
            'cover_image': 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/timf8d48_images12.jpeg',
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
            'excerpt': 'More time in the gym doesn\'t automatically mean more progress. Here\'s what the research says — and what we see with members at Santa Cruz Strength.',
            'content': '''<p>There\'s a persistent belief that longer workouts produce better results. People who spend 90 minutes in the gym feel they worked harder than people who were in and out in 45. This isn\'t necessarily true — and in many cases it\'s backwards.</p>

<h2>The Research on Workout Duration</h2>

<p>Studies on strength training consistently show that the quality and intensity of training matters far more than duration. A focused 45-minute session with appropriate load, rest periods, and exercise selection produces equivalent or superior results to a 90-minute session filled with extra volume, long conversations between sets, and unfocused effort.</p>

<h2>What a Well-Structured Session Looks Like</h2>

<p>For most strength training goals, a well-designed session fits in 45 to 75 minutes:</p>
<ul>
<li><strong>5–10 minutes:</strong> Warm-up and movement prep</li>
<li><strong>25–40 minutes:</strong> Primary strength work (2–4 main lifts)</li>
<li><strong>10–20 minutes:</strong> Accessory work or conditioning</li>
<li><strong>5 minutes:</strong> Cool-down</li>
</ul>

<h2>When Sessions Creep Too Long</h2>

<p>Sessions that stretch past 75–90 minutes often indicate one of several things: too much volume (more sets and exercises than necessary), insufficient rest management, or time being lost to non-training activities. None of these improve outcomes.</p>

<p>Cortisol — the stress hormone — rises meaningfully after about 60 minutes of intense training. Extended sessions can actually compromise the hormonal environment for recovery and muscle growth.</p>

<h2>The Practical Reality</h2>

<p>For most people — especially those with jobs, families, and other commitments — the ideal workout is the one that gets done consistently. A 45-minute session three times per week that you actually complete will produce far better results over a year than an aspirational 2-hour program that you abandon after three weeks.</p>

<p>Build the habit. Keep sessions focused. Progress will follow.</p>

<p>At Santa Cruz Strength, our coaches help members design programs that fit their real schedules. If you\'re wondering how to train effectively without spending your entire day in the gym, come in and talk to us.</p>''',
            'category': 'Strength Science',
            'tags': ['workout length', 'training tips', 'programming', 'FAQ'],
            'cover_image': 'https://customer-assets.emergentagent.com/job_local-gym-hub/artifacts/aw0t70q8_348s.jpg',
            'published': True,
            'seo_title': 'How Long Should a Workout Be? | Santa Cruz Strength',
            'seo_description': 'More time in the gym doesn\'t mean more progress. Here\'s what actually matters when it comes to workout duration for strength training.',
            'author': 'Santa Cruz Strength',
            'created_at': now.isoformat(),
            'updated_at': now.isoformat(),
        },
    ]
    for post in posts:
        await db.blog.insert_one(post)
    logger.info(f'[SEED] Seeded {len(posts)} blog posts')

@app.on_event('startup')
async def startup():
    await db.leads.create_index('id', unique=True)
    await db.leads.create_index('email')
    await db.leads.create_index('status')
    await db.leads.create_index('lead_source')
    await db.leads.create_index('created_at')
    await db.leads.create_index('location')
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
    # Seed blog posts if none exist
    blog_count = await db.blog.count_documents({})
    if blog_count == 0:
        await seed_blog_posts()
    # Seed default owner if none exists
    owner_exists = await db.users.find_one({'role': 'owner'})
    if not owner_exists:
        # Upgrade existing admin to owner if present
        existing_admin = await db.users.find_one({'email': 'management@santacruzstrength.com'})
        if existing_admin:
            await db.users.update_one({'email': 'management@santacruzstrength.com'}, {'$set': {'role': 'owner'}})
            logger.info('[SEED] Upgraded management@ to owner role')
        else:
            admin_id = str(uuid.uuid4())
            await db.users.insert_one({'id': admin_id, 'email': 'management@santacruzstrength.com', 'password_hash': hash_password('schuscle01'), 'name': 'Management', 'role': 'owner', 'location': 'santa_cruz', 'is_active': True, 'created_at': now_utc().isoformat()})
            logger.info('[SEED] Created owner: management@santacruzstrength.com')
    logger.info('[STARTUP] Santa Cruz Strength API ready')
    # Start SMS follow-up scheduler
    scheduler = AsyncIOScheduler(timezone='America/Los_Angeles')
    scheduler.add_job(run_sms_followup_job,    'interval', minutes=30,  id='sms_followup',    replace_existing=True)
    scheduler.add_job(run_review_request_job,  'interval', minutes=30,  id='review_requests', replace_existing=True)
    scheduler.add_job(run_campaign_scheduler,  'interval', minutes=60,  id='campaigns',       replace_existing=True)
    scheduler.start()
    app.state.scheduler = scheduler
    logger.info('[STARTUP] SMS follow-up + review + campaign schedulers started')

@app.on_event('shutdown')
async def shutdown_db_client():
    if hasattr(app.state, 'scheduler'):
        app.state.scheduler.shutdown(wait=False)
    client.close()

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','), allow_methods=['*'], allow_headers=['*'])
