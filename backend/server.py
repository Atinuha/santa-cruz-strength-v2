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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
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
db = client[os.environ.get('DB_NAME', 'scs_gym')]

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

# --------------- Email ---------------

def send_email(to_email, subject, html_body):
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASSWORD', '')
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    from_email = os.environ.get('FROM_EMAIL', 'noreply@santacruzstrength.com')
    if not smtp_user:
        logger.info(f'[EMAIL] SMTP not configured — skipping email to {to_email}')
        return False
    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = from_email
        msg['To'] = to_email
        msg.attach(MIMEText(html_body, 'html'))
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, to_email, msg.as_string())
        logger.info(f'[EMAIL] Sent to {to_email}: {subject}')
        return True
    except Exception as e:
        logger.warning(f'[EMAIL] Failed: {e}')
        return False

def send_lead_notification(lead):
    notify = os.environ.get('NOTIFICATION_EMAIL', '')
    if not notify:
        return
    html = f"""
    <html><body style='font-family:sans-serif;background:#111;color:#fff;padding:24px;'>
    <h2 style='color:#1B7A4A;'>New Lead — Santa Cruz Strength</h2>
    <table style='border-collapse:collapse;width:100%;'>
      <tr><td style='padding:8px;color:#aaa;'>Name</td><td style='padding:8px;'>{lead.get('first_name','')} {lead.get('last_name','')}</td></tr>
      <tr><td style='padding:8px;color:#aaa;'>Phone</td><td style='padding:8px;'>{lead.get('phone','')}</td></tr>
      <tr><td style='padding:8px;color:#aaa;'>Email</td><td style='padding:8px;'>{lead.get('email','')}</td></tr>
      <tr><td style='padding:8px;color:#aaa;'>Interest</td><td style='padding:8px;'>{lead.get('interest_type','')}</td></tr>
      <tr><td style='padding:8px;color:#aaa;'>Source</td><td style='padding:8px;'>{lead.get('lead_source','')}</td></tr>
      <tr><td style='padding:8px;color:#aaa;'>Timeline</td><td style='padding:8px;'>{lead.get('start_timeline','')}</td></tr>
    </table>
    </body></html>
    """
    import threading
    threading.Thread(target=send_email, args=(notify, f"New Lead: {lead.get('first_name','')} {lead.get('last_name','')}", html), daemon=True).start()

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

class InviteCreate(BaseModel):
    email: str
    name: str
    role: str = 'staff'

class AcceptInvite(BaseModel):
    token: str
    password: str
    name: Optional[str] = None

# --------------- Auth Routes ---------------

@api_router.post('/auth/login')
async def login(req: LoginRequest):
    user = await db.users.find_one({'email': req.email.lower().strip()})
    if not user or not verify_password(req.password, user.get('password_hash', '')):
        raise HTTPException(status_code=401, detail='Invalid email or password')
    if not user.get('is_active', True):
        raise HTTPException(status_code=403, detail='Account disabled')
    token = create_token({'sub': user['id']})
    return {
        'access_token': token,
        'token_type': 'bearer',
        'user': {
            'id': user['id'],
            'name': user['name'],
            'email': user['email'],
            'role': user['role'],
            'location': user.get('location', 'santa_cruz')
        }
    }

@api_router.post('/auth/accept-invite')
async def accept_invite(req: AcceptInvite):
    invite = await db.invites.find_one({'token': req.token, 'used': False})
    if not invite:
        raise HTTPException(status_code=400, detail='Invalid or expired invite link')
    expires = invite.get('expires_at')
    if isinstance(expires, str):
        expires = datetime.fromisoformat(expires.replace('Z', '+00:00'))
    if expires and now_utc() > expires.replace(tzinfo=timezone.utc) if expires.tzinfo is None else expires:
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
    frontend_url = os.environ.get('FRONTEND_URL', 'https://local-gym-hub.preview.emergentagent.com')
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
    email_sent = send_email(data.email, 'Invitation to Santa Cruz Strength Staff Portal', html)
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
        'phone': lead.phone.strip(),
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
        send_lead_notification(doc)
        return {'id': existing['id'], 'status': 'updated'}
    await db.leads.insert_one(doc)
    send_lead_notification(doc)
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
        'phone': lead.phone.strip(),
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
    leads = await db.leads.find(query, {'_id': 0}).sort('created_at', -1).to_list(10000)
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
    for i, row in enumerate(rows, 1):
        # Handle 'name' as full name (member export format)
        full_name = (row.get('name') or '').strip()
        if full_name and not row.get('first_name'):
            parts = full_name.split(' ', 1)
            fn = parts[0]
            ln = parts[1] if len(parts) > 1 else ''
        else:
            fn = (row.get('first_name') or '').strip()
            ln = (row.get('last_name') or '').strip()
        # Support both 'phone' and 'phone_number' columns
        phone = (row.get('phone') or row.get('phone_number') or '').strip()
        email = (row.get('email') or '').strip().lower()
        if not fn or not phone:
            errors.append(f'Row {i}: missing name or phone — skipped')
            skipped += 1
            continue
        if email:
            existing = await db.leads.find_one({'email': email, 'location': 'santa_cruz'})
            if existing:
                skipped += 1
                continue
        # Build notes combining address info if present
        address_parts = [
            row.get('address', ''), row.get('city', ''),
            row.get('state', ''), row.get('zip_code', '')
        ]
        address_str = ', '.join(p.strip() for p in address_parts if p and p.strip())
        base_notes = (row.get('notes') or '').strip()
        combined_notes = base_notes
        if address_str:
            combined_notes = f'{base_notes}\nAddress: {address_str}'.strip()
        # how_did_you_hear maps to lead_source or stored in notes
        how_heard = (row.get('how_did_you_hear_about_us') or '').strip()
        lead_source = (row.get('lead_source') or 'csv_import').strip()
        if how_heard and how_heard.lower() not in ('', 'n/a', 'unknown'):
            combined_notes = f'{combined_notes}\nHow heard: {how_heard}'.strip()
        lead_id = str(uuid.uuid4())
        doc = {
            'id': lead_id,
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
            'next_follow_up_date': None,
            'next_follow_up_time': None,
            'last_contact_date': None,
            'activity_log': [{'action': 'Lead Imported', 'note': f'Imported via CSV by {user["name"]}', 'staff_id': user['id'], 'staff_name': user['name'], 'timestamp': now.isoformat()}],
            'created_at': now.isoformat(),
            'updated_at': now.isoformat()
        }
        await db.leads.insert_one(doc)
        imported += 1
    return {'imported': imported, 'skipped': skipped, 'errors': errors[:10], 'total_rows': len(rows)}

@api_router.get('/staff/leads/{lead_id}')
async def get_lead(lead_id: str, user=Depends(require_staff)):
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

# --------------- Startup ---------------

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

@app.on_event('shutdown')
async def shutdown_db_client():
    client.close()

app.include_router(api_router)
app.add_middleware(CORSMiddleware, allow_credentials=True, allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','), allow_methods=['*'], allow_headers=['*'])
