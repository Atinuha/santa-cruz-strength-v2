from fastapi import FastAPI, APIRouter, Depends, HTTPException, status, Query
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
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any, Dict
import uuid
from datetime import datetime, timezone, timedelta
from jose import JWTError, jwt
from passlib.context import CryptContext
from bson import ObjectId
import re

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'scs_gym')]

app = FastAPI(title='Santa Cruz Strength API')
api_router = APIRouter(prefix='/api')

# Auth config
JWT_SECRET = os.environ.get('JWT_SECRET', 'fallback-secret-change-me')
JWT_ALGORITHM = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRE_MINUTES = int(os.environ.get('JWT_EXPIRE_MINUTES', 10080))
pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')
security = HTTPBearer()

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ──────────────────────── Helpers ────────────────────────

def serialize_doc(doc: dict) -> dict:
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

# ──────────────────────── Auth helpers ────────────────────────

def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)

def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)

def create_token(data: dict, expires_delta: timedelta = None) -> str:
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

async def require_admin(user=Depends(get_current_user)):
    if user.get('role') != 'admin':
        raise HTTPException(status_code=403, detail='Admin access required')
    return user

# ──────────────────────── Email helper ────────────────────────

def send_lead_notification(lead: dict):
    smtp_user = os.environ.get('SMTP_USER', '')
    smtp_pass = os.environ.get('SMTP_PASSWORD', '')
    notify_email = os.environ.get('NOTIFICATION_EMAIL', '')
    smtp_host = os.environ.get('SMTP_HOST', 'smtp.gmail.com')
    smtp_port = int(os.environ.get('SMTP_PORT', 587))
    from_email = os.environ.get('FROM_EMAIL', 'noreply@santacruzstrength.com')

    if not smtp_user or not notify_email:
        logger.info(f'[EMAIL] SMTP not configured — skipping notification for lead {lead.get("id")}')
        return

    try:
        msg = MIMEMultipart('alternative')
        msg['Subject'] = f"New Lead: {lead.get('first_name', '')} {lead.get('last_name', '')}"
        msg['From'] = from_email
        msg['To'] = notify_email

        html = f"""
        <html><body style='font-family:sans-serif;background:#111;color:#fff;padding:24px;'>
        <h2 style='color:#D32F2F;'>New Lead — Santa Cruz Strength</h2>
        <table style='border-collapse:collapse;width:100%;'>
          <tr><td style='padding:8px;color:#aaa;'>Name</td><td style='padding:8px;'>{lead.get('first_name','')} {lead.get('last_name','')}</td></tr>
          <tr><td style='padding:8px;color:#aaa;'>Phone</td><td style='padding:8px;'>{lead.get('phone','')}</td></tr>
          <tr><td style='padding:8px;color:#aaa;'>Email</td><td style='padding:8px;'>{lead.get('email','')}</td></tr>
          <tr><td style='padding:8px;color:#aaa;'>Interest</td><td style='padding:8px;'>{lead.get('interest_type','')}</td></tr>
          <tr><td style='padding:8px;color:#aaa;'>Source</td><td style='padding:8px;'>{lead.get('lead_source','')}</td></tr>
          <tr><td style='padding:8px;color:#aaa;'>Timeline</td><td style='padding:8px;'>{lead.get('start_timeline','')}</td></tr>
          <tr><td style='padding:8px;color:#aaa;'>Goals</td><td style='padding:8px;'>{lead.get('training_goals','')}</td></tr>
        </table>
        <br/><a href='#' style='color:#D32F2F;'>Open in CRM Dashboard</a>
        </body></html>
        """
        msg.attach(MIMEText(html, 'html'))
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.sendmail(from_email, notify_email, msg.as_string())
        logger.info(f'[EMAIL] Notification sent for lead {lead.get("id")}')
    except Exception as e:
        logger.warning(f'[EMAIL] Failed to send notification: {e}')

# ──────────────────────── Pydantic Models ────────────────────────

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

# ──────────────────────── Auth Routes ────────────────────────

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

@api_router.get('/staff/me')
async def get_me(user=Depends(get_current_user)):
    return {
        'id': user['id'],
        'name': user['name'],
        'email': user['email'],
        'role': user['role'],
        'location': user.get('location', 'santa_cruz')
    }

@api_router.put('/staff/me')
async def update_me(data: UserUpdate, user=Depends(get_current_user)):
    update = {}
    if data.name:
        update['name'] = data.name
    if data.email:
        update['email'] = data.email.lower().strip()
    if data.password:
        update['password_hash'] = hash_password(data.password)
    update['updated_at'] = now_utc().isoformat()
    await db.users.update_one({'id': user['id']}, {'$set': update})
    updated = await db.users.find_one({'id': user['id']})
    return {'id': updated['id'], 'name': updated['name'], 'email': updated['email'], 'role': updated['role']}

# ──────────────────────── Public Lead Route ────────────────────────

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
        'last_contact_date': None,
        'activity_log': [
            {
                'action': 'Lead Created',
                'note': f'Lead submitted via {lead.lead_source or "website_form"}',
                'staff_id': None,
                'staff_name': 'System',
                'timestamp': now.isoformat()
            }
        ],
        'created_at': now.isoformat(),
        'updated_at': now.isoformat()
    }
    
    if existing:
        # Update existing lead instead of creating duplicate
        await db.leads.update_one(
            {'email': lead.email.lower().strip(), 'location': lead.location},
            {'$set': {
                'phone': doc['phone'],
                'interest_type': doc['interest_type'],
                'training_goals': doc['training_goals'],
                'start_timeline': doc['start_timeline'],
                'preferred_contact': doc['preferred_contact'],
                'lead_source': doc['lead_source'],
                'notes': doc['notes'],
                'updated_at': now.isoformat()
            },
            '$push': {'activity_log': {
                'action': 'Re-inquiry',
                'note': f'Lead re-submitted via {lead.lead_source or "website_form"}',
                'staff_id': None,
                'staff_name': 'System',
                'timestamp': now.isoformat()
            }}}
        )
        logger.info(f'[LEAD] Updated existing lead: {existing["id"]}')
        try:
            import threading
            threading.Thread(target=send_lead_notification, args=(doc,), daemon=True).start()
        except Exception as e:
            logger.warning(f'[EMAIL] Thread error: {e}')
        return {'id': existing['id'], 'status': 'updated', 'message': 'Lead updated successfully'}
    
    await db.leads.insert_one(doc)
    logger.info(f'[LEAD] Created new lead: {lead_id}')
    try:
        import threading
        threading.Thread(target=send_lead_notification, args=(doc,), daemon=True).start()
    except Exception as e:
        logger.warning(f'[EMAIL] Thread error: {e}')
    return {'id': lead_id, 'status': 'created', 'message': 'Lead created successfully'}

# ──────────────────────── Staff Lead Routes ────────────────────────

@api_router.get('/staff/leads')
async def list_leads(
    search: Optional[str] = None,
    status: Optional[str] = None,
    lead_source: Optional[str] = None,
    location: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    limit: int = Query(50, le=200),
    skip: int = 0,
    user=Depends(get_current_user)
):
    query = {}
    if search:
        pattern = re.compile(search, re.IGNORECASE)
        query['$or'] = [
            {'first_name': pattern},
            {'last_name': pattern},
            {'email': pattern},
            {'phone': pattern}
        ]
    if status:
        query['status'] = status
    if lead_source:
        query['lead_source'] = lead_source
    if location:
        query['location'] = location
    if date_from or date_to:
        query['created_at'] = {}
        if date_from:
            query['created_at']['$gte'] = date_from
        if date_to:
            query['created_at']['$lte'] = date_to + 'T23:59:59Z'
    
    total = await db.leads.count_documents(query)
    leads = await db.leads.find(query, {'_id': 0}).sort('created_at', -1).skip(skip).limit(limit).to_list(limit)
    return {'leads': leads, 'total': total, 'skip': skip, 'limit': limit}

@api_router.post('/staff/leads')
async def create_lead_manual(lead: LeadCreate, user=Depends(get_current_user)):
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
        'last_contact_date': None,
        'activity_log': [
            {
                'action': 'Lead Created',
                'note': f'Manually entered by {user["name"]}',
                'staff_id': user['id'],
                'staff_name': user['name'],
                'timestamp': now.isoformat()
            }
        ],
        'created_at': now.isoformat(),
        'updated_at': now.isoformat()
    }
    await db.leads.insert_one(doc)
    return {'id': lead_id, 'status': 'created', 'message': 'Lead created successfully'}

@api_router.get('/staff/leads/export/csv')
async def export_leads_csv(
    status: Optional[str] = None,
    location: Optional[str] = None,
    user=Depends(get_current_user)
):
    query = {}
    if status:
        query['status'] = status
    if location:
        query['location'] = location
    
    leads = await db.leads.find(query, {'_id': 0}).sort('created_at', -1).to_list(10000)
    
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        'first_name', 'last_name', 'email', 'phone', 'status', 'interest_type',
        'lead_source', 'training_goals', 'start_timeline', 'preferred_contact',
        'location', 'notes', 'created_at', 'last_contact_date', 'next_follow_up_date'
    ])
    writer.writeheader()
    for lead in leads:
        writer.writerow({
            'first_name': lead.get('first_name', ''),
            'last_name': lead.get('last_name', ''),
            'email': lead.get('email', ''),
            'phone': lead.get('phone', ''),
            'status': lead.get('status', ''),
            'interest_type': lead.get('interest_type', ''),
            'lead_source': lead.get('lead_source', ''),
            'training_goals': lead.get('training_goals', ''),
            'start_timeline': lead.get('start_timeline', ''),
            'preferred_contact': lead.get('preferred_contact', ''),
            'location': lead.get('location', ''),
            'notes': lead.get('notes', ''),
            'created_at': lead.get('created_at', ''),
            'last_contact_date': lead.get('last_contact_date', '') or '',
            'next_follow_up_date': lead.get('next_follow_up_date', '') or ''
        })
    
    output.seek(0)
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type='text/csv',
        headers={'Content-Disposition': 'attachment; filename=leads.csv'}
    )

@api_router.get('/staff/leads/{lead_id}')
async def get_lead(lead_id: str, user=Depends(get_current_user)):
    lead = await db.leads.find_one({'id': lead_id}, {'_id': 0})
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    return lead

@api_router.put('/staff/leads/{lead_id}')
async def update_lead(lead_id: str, data: LeadUpdate, user=Depends(get_current_user)):
    lead = await db.leads.find_one({'id': lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    
    now = now_utc()
    update = {'updated_at': now.isoformat()}
    log_entries = []
    
    if data.status and data.status != lead.get('status'):
        old_status = lead.get('status', 'Unknown')
        update['status'] = data.status
        log_entries.append({
            'action': 'Status Changed',
            'note': f'Status changed from {old_status} to {data.status}',
            'staff_id': user['id'],
            'staff_name': user['name'],
            'timestamp': now.isoformat()
        })
        update['last_contact_date'] = now.isoformat()
    
    if data.notes is not None:
        update['notes'] = data.notes
    if data.next_follow_up_date is not None:
        update['next_follow_up_date'] = data.next_follow_up_date
        log_entries.append({
            'action': 'Follow-up Scheduled',
            'note': f'Next follow-up set for {data.next_follow_up_date}',
            'staff_id': user['id'],
            'staff_name': user['name'],
            'timestamp': now.isoformat()
        })
    if data.last_contact_date is not None:
        update['last_contact_date'] = data.last_contact_date
    if data.tags is not None:
        update['tags'] = data.tags
    if data.interest_type is not None:
        update['interest_type'] = data.interest_type
    if data.training_goals is not None:
        update['training_goals'] = data.training_goals
    if data.preferred_contact is not None:
        update['preferred_contact'] = data.preferred_contact
    
    set_op = {'$set': update}
    if log_entries:
        set_op['$push'] = {'activity_log': {'$each': log_entries}}
    
    await db.leads.update_one({'id': lead_id}, set_op)
    updated = await db.leads.find_one({'id': lead_id}, {'_id': 0})
    return updated

@api_router.post('/staff/leads/{lead_id}/notes')
async def add_note(lead_id: str, data: NoteCreate, user=Depends(get_current_user)):
    lead = await db.leads.find_one({'id': lead_id})
    if not lead:
        raise HTTPException(status_code=404, detail='Lead not found')
    
    now = now_utc()
    note_entry = {
        'action': 'Note Added',
        'note': data.note,
        'staff_id': user['id'],
        'staff_name': user['name'],
        'timestamp': now.isoformat()
    }
    await db.leads.update_one(
        {'id': lead_id},
        {
            '$push': {'activity_log': note_entry},
            '$set': {'updated_at': now.isoformat(), 'last_contact_date': now.isoformat()}
        }
    )
    return {'message': 'Note added', 'entry': note_entry}

@api_router.delete('/staff/leads/{lead_id}')
async def delete_lead(lead_id: str, user=Depends(require_admin)):
    result = await db.leads.delete_one({'id': lead_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='Lead not found')
    return {'message': 'Lead deleted'}

# ──────────────────────── Stats Route ────────────────────────

@api_router.get('/staff/stats')
async def get_stats(user=Depends(get_current_user)):
    pipeline = [
        {'$group': {'_id': '$status', 'count': {'$sum': 1}}}
    ]
    status_counts_raw = await db.leads.aggregate(pipeline).to_list(100)
    status_counts = {item['_id']: item['count'] for item in status_counts_raw}
    
    total = await db.leads.count_documents({})
    
    # New leads in last 7 days
    seven_days_ago = (now_utc() - timedelta(days=7)).isoformat()
    new_7d = await db.leads.count_documents({'created_at': {'$gte': seven_days_ago}})
    
    # Today's leads
    today_start = now_utc().replace(hour=0, minute=0, second=0, microsecond=0).isoformat()
    today_count = await db.leads.count_documents({'created_at': {'$gte': today_start}})
    
    # Source breakdown
    source_pipeline = [{'$group': {'_id': '$lead_source', 'count': {'$sum': 1}}}]
    sources_raw = await db.leads.aggregate(source_pipeline).to_list(100)
    sources = {item['_id']: item['count'] for item in sources_raw}
    
    return {
        'total': total,
        'new_7d': new_7d,
        'today': today_count,
        'by_status': status_counts,
        'by_source': sources
    }

# ──────────────────────── Staff User Management ────────────────────────

@api_router.get('/staff/users')
async def list_users(user=Depends(require_admin)):
    users = await db.users.find({}, {'_id': 0, 'password_hash': 0}).to_list(100)
    return users

@api_router.post('/staff/users')
async def create_user(data: UserCreate, user=Depends(require_admin)):
    existing = await db.users.find_one({'email': data.email.lower().strip()})
    if existing:
        raise HTTPException(status_code=400, detail='Email already registered')
    
    user_id = str(uuid.uuid4())
    now = now_utc()
    doc = {
        'id': user_id,
        'email': data.email.lower().strip(),
        'password_hash': hash_password(data.password),
        'name': data.name,
        'role': data.role,
        'location': data.location,
        'is_active': True,
        'created_at': now.isoformat()
    }
    await db.users.insert_one(doc)
    return {'id': user_id, 'email': doc['email'], 'name': doc['name'], 'role': doc['role']}

@api_router.put('/staff/users/{user_id}')
async def update_user(user_id: str, data: UserUpdate, user=Depends(require_admin)):
    target = await db.users.find_one({'id': user_id})
    if not target:
        raise HTTPException(status_code=404, detail='User not found')
    
    update = {'updated_at': now_utc().isoformat()}
    if data.name is not None:
        update['name'] = data.name
    if data.email is not None:
        update['email'] = data.email.lower().strip()
    if data.password is not None:
        update['password_hash'] = hash_password(data.password)
    if data.role is not None:
        update['role'] = data.role
    if data.is_active is not None:
        update['is_active'] = data.is_active
    
    await db.users.update_one({'id': user_id}, {'$set': update})
    updated = await db.users.find_one({'id': user_id}, {'_id': 0, 'password_hash': 0})
    return updated

@api_router.delete('/staff/users/{user_id}')
async def delete_user(user_id: str, user=Depends(require_admin)):
    if user_id == user['id']:
        raise HTTPException(status_code=400, detail='Cannot delete your own account')
    result = await db.users.delete_one({'id': user_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail='User not found')
    return {'message': 'User deleted'}

# ──────────────────────── Seed admin on startup ────────────────────────

@app.on_event('startup')
async def startup():
    # Create indexes
    await db.leads.create_index('id', unique=True)
    await db.leads.create_index('email')
    await db.leads.create_index('status')
    await db.leads.create_index('lead_source')
    await db.leads.create_index('created_at')
    await db.leads.create_index('location')
    await db.users.create_index('id', unique=True)
    await db.users.create_index('email', unique=True)
    
    # Seed default admin if none exists
    admin_exists = await db.users.find_one({'role': 'admin'})
    if not admin_exists:
        admin_id = str(uuid.uuid4())
        await db.users.insert_one({
            'id': admin_id,
            'email': 'management@santacruzstrength.com',
            'password_hash': hash_password('SCS@admin2024!'),
            'name': 'Management',
            'role': 'admin',
            'location': 'santa_cruz',
            'is_active': True,
            'created_at': now_utc().isoformat()
        })
        logger.info('[SEED] Created default admin: admin@santacruzstrength.com / SCS@admin2024!')
    
    logger.info('[STARTUP] Santa Cruz Strength API ready')

@app.on_event('shutdown')
async def shutdown_db_client():
    client.close()

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=['*'],
    allow_headers=['*'],
)
