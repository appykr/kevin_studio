# Kevin's Tattoo Studio — Full Backend Implementation Guide

> **Purpose:** This document contains every file, every line of code, every command, and every configuration needed to add a FastAPI backend to the existing static tattoo website. An agent or developer can pick up any phase and implement it independently.

---

## Table of Contents

1. [Current State of the Project](#1-current-state-of-the-project)
2. [Target Architecture](#2-target-architecture)
3. [Tech Stack & Services Setup](#3-tech-stack--services-setup)
4. [Phase 2A — Foundation](#4-phase-2a--foundation)
5. [Phase 2B — Booking System](#5-phase-2b--booking-system)
6. [Phase 2C — Stripe Payments](#6-phase-2c--stripe-payments)
7. [Phase 2D — Polish & Admin Dashboard](#7-phase-2d--polish--admin-dashboard)
8. [Frontend Integration Changes](#8-frontend-integration-changes)
9. [Deployment](#9-deployment)
10. [Verification Checklists](#10-verification-checklists)

---

## 1. Current State of the Project

### File Structure (as of now)
```
/root/kevin_tatto/
├── index.html              # Single-page scrolling site (656 lines)
├── css/
│   ├── style.css           # Main stylesheet with CSS custom properties (1432 lines)
│   ├── responsive.css      # Mobile breakpoints (403 lines)
│   └── animations.css      # Keyframes & transitions (195 lines)
├── js/
│   ├── main.js             # Nav, scroll, parallax, gallery filter, contact form validation (251 lines)
│   ├── lightbox.js         # Image lightbox modal (127 lines)
│   └── testimonials.js     # Carousel with auto-slide (143 lines)
├── images/                 # Empty — reserved for local assets
└── README.md
```

### Key Existing Frontend Details

**CSS Custom Properties** (defined in `css/style.css` lines 7-46 — reuse these in admin dashboard):
```css
:root {
    --bg-primary: #0a0a0a;
    --bg-secondary: #111111;
    --bg-tertiary: #1a1a1a;
    --bg-card: #141414;
    --bg-card-hover: #1c1c1c;
    --text-primary: #f5f5f5;
    --text-secondary: #a0a0a0;
    --text-muted: #666666;
    --accent: #c9a96e;
    --accent-hover: #d4b87a;
    --accent-dark: #a88b52;
    --border: #2a2a2a;
    --border-light: #333333;
    --font-display: 'Cinzel', serif;
    --font-body: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;
}
```

**Contact Form** (`index.html` lines 482-523): Currently has fields for `name`, `email`, `phone`, `style` (select), `message`. The form submit handler is in `js/main.js` lines 198-251 — it does client-side validation only and shows a fake success message. This must be replaced with an actual `fetch()` POST to the backend.

**Gallery** (`index.html` lines 104-225): 12 hardcoded `<div class="gallery-item">` elements with Unsplash `<img>` URLs. Each has `data-category` attribute. Filter buttons are at lines 94-101. The gallery rendering must be changed to dynamically fetch from the API.

**Lightbox** (`js/lightbox.js`): Queries `.gallery-item` elements on page load (line 18). After gallery becomes dynamic, this must be re-initialized after gallery images are rendered.

**CDN Libraries** already loaded in `index.html`:
- AOS (Animate on Scroll): `https://unpkg.com/aos@2.3.1/dist/aos.js` + CSS
- Font Awesome 6.5.1: `https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css`
- Google Fonts: Cinzel (display) + Inter (body)

---

## 2. Target Architecture

```
                   ┌─────────────────────────┐
                   │    CLOUDFLARE PAGES      │
                   │  Static HTML/CSS/JS      │
   User ──────────▶│  kevinstattoo.com        │
                   │  Cost: $0/month          │
                   └────────┬────────────────┘
                            │ fetch() calls to API
                            ▼
                   ┌─────────────────────────┐
                   │    RENDER ($7/mo)        │
                   │  FastAPI + Uvicorn       │
                   │  api.kevinstattoo.com    │
                   │                         │
                   │  ┌───────────────────┐  │
                   │  │ SQLite (file DB)  │  │
                   │  │ /data/studio.db   │  │
                   │  └───────────────────┘  │
                   │                         │
                   │  ┌───────────────────┐  │
                   │  │ /data/uploads/    │  │
                   │  │ Gallery images    │  │
                   │  └───────────────────┘  │
                   └────┬───────────┬────────┘
                        │           │
              ┌─────────▼──┐  ┌────▼─────────┐
              │   STRIPE    │  │   RESEND     │
              │  Payments   │  │  Emails      │
              │ 2.9%+$0.30  │  │ 3K/mo free   │
              └─────────────┘  └──────────────┘
```

**Total monthly cost: ~$8/month** ($7 Render + ~$1 amortized domain)

### API URL Convention
- During local development: `http://localhost:8000`
- In production: `https://api.kevinstattoo.com`
- The frontend uses a config variable `API_BASE` to switch between these.

---

## 3. Tech Stack & Services Setup

### 3.1 Accounts to Create (do this first)

| Service | URL | What to Do |
|---------|-----|------------|
| **GitHub** | https://github.com | Create repo `kevin-tattoo-studio`, push all code |
| **Cloudflare** | https://dash.cloudflare.com | Sign up free. Used for: Pages (frontend hosting), Registrar (domain purchase) |
| **Render** | https://render.com | Sign up free. Create Web Service for backend ($7/mo Starter plan) |
| **Stripe** | https://dashboard.stripe.com | Sign up. Get test API keys from Developers → API Keys. Do NOT use live keys until ready for real payments. |
| **Resend** | https://resend.com | Sign up free. Get API key. Add + verify your sending domain later. |

### 3.2 Environment Variables (all services combined)

Create file `backend/.env` locally (NEVER commit this file):
```bash
# App
SECRET_KEY=generate-a-64-char-random-string-here
ENVIRONMENT=development
FRONTEND_URL=http://localhost:8080
BACKEND_URL=http://localhost:8000

# Database
DATABASE_URL=sqlite:///./data/studio.db

# Admin (set your initial admin credentials)
ADMIN_USERNAME=kevin
ADMIN_PASSWORD=change-this-to-a-strong-password

# Stripe (use TEST keys during development)
STRIPE_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxxxxxx
STRIPE_PUBLISHABLE_KEY=pk_test_xxxxxxxxxxxxxxxxxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxxxxxxxxxxxxxxxxx

# Resend
RESEND_API_KEY=re_xxxxxxxxxxxxxxxxxxxx
ADMIN_EMAIL=kevin@kevinstattoo.com

# Deposit
DEPOSIT_PERCENTAGE=30
```

### 3.3 Python Version
Use Python 3.11 or 3.12. Verify with `python3 --version`.

---

## 4. Phase 2A — Foundation

**Goal:** FastAPI project scaffold, database models, admin auth, contact form endpoint, gallery API. At the end of this phase, the contact form sends real emails and the gallery loads from the database.

### 4.1 Create Directory Structure

Run from project root (`/root/kevin_tatto/`):
```bash
mkdir -p backend/models backend/routes backend/services backend/data
touch backend/__init__.py backend/models/__init__.py backend/routes/__init__.py backend/services/__init__.py
```

### 4.2 File: `backend/requirements.txt`

```txt
fastapi==0.115.6
uvicorn[standard]==0.34.0
sqlalchemy==2.0.36
pydantic==2.10.3
pydantic-settings==2.7.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.20
resend==2.5.0
stripe==11.4.1
python-dotenv==1.0.1
aiofiles==24.1.0
Pillow==11.1.0
```

Install with:
```bash
cd backend
pip install -r requirements.txt
```

### 4.3 File: `backend/config.py`

```python
"""Application configuration loaded from environment variables."""

from pydantic_settings import BaseSettings
from functools import lru_cache


class Settings(BaseSettings):
    # App
    secret_key: str = "CHANGE-ME-TO-A-RANDOM-64-CHAR-STRING"
    environment: str = "development"
    frontend_url: str = "http://localhost:8080"
    backend_url: str = "http://localhost:8000"

    # Database
    database_url: str = "sqlite:///./data/studio.db"

    # Admin
    admin_username: str = "kevin"
    admin_password: str = "changeme"

    # Stripe
    stripe_secret_key: str = ""
    stripe_publishable_key: str = ""
    stripe_webhook_secret: str = ""

    # Resend
    resend_api_key: str = ""
    admin_email: str = "kevin@kevinstattoo.com"

    # Deposit
    deposit_percentage: float = 30.0

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
```

### 4.4 File: `backend/database.py`

```python
"""SQLite database setup using SQLAlchemy."""

from sqlalchemy import create_engine, event
from sqlalchemy.orm import sessionmaker, declarative_base, Session
from config import get_settings

settings = get_settings()

# SQLite-specific: enable WAL mode for better concurrent read performance
engine = create_engine(
    settings.database_url,
    connect_args={"check_same_thread": False},
    echo=(settings.environment == "development"),
)


# Enable WAL mode and foreign keys for SQLite
@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_connection, connection_record):
    cursor = dbapi_connection.cursor()
    cursor.execute("PRAGMA journal_mode=WAL")
    cursor.execute("PRAGMA foreign_keys=ON")
    cursor.close()


SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db() -> Session:
    """FastAPI dependency that yields a database session and closes it after use."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def create_tables():
    """Create all tables. Called once at app startup."""
    Base.metadata.create_all(bind=engine)
```

### 4.5 File: `backend/models/__init__.py`

```python
"""Import all models so SQLAlchemy knows about them when creating tables."""

from models.admin import Admin
from models.contact import Contact
from models.gallery import GalleryImage
from models.timeslot import TimeSlot
from models.booking import Booking
```

### 4.6 File: `backend/models/admin.py`

```python
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base


class Admin(Column):
    pass


# Fix: proper model definition
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

**IMPORTANT: The above has a mistake — the duplicate class definition. The correct file content is:**

### 4.6 File: `backend/models/admin.py` (CORRECTED)

```python
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy.sql import func
from database import Base


class Admin(Base):
    __tablename__ = "admins"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 4.7 File: `backend/models/contact.py`

```python
from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base


class Contact(Base):
    __tablename__ = "contacts"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(255), nullable=False)
    phone = Column(String(20), nullable=True)
    style = Column(String(50), nullable=True)
    message = Column(Text, nullable=False)
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 4.8 File: `backend/models/gallery.py`

```python
from sqlalchemy import Column, Integer, String, Text, DateTime
from sqlalchemy.sql import func
from database import Base


class GalleryImage(Base):
    __tablename__ = "gallery_images"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(100), nullable=False)
    category = Column(String(50), nullable=False)  # traditional, realism, blackwork, japanese, geometric
    image_url = Column(String(500), nullable=False)
    description = Column(Text, nullable=True)
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 4.9 File: `backend/models/timeslot.py`

```python
from sqlalchemy import Column, Integer, String, Date, Time, Boolean, DateTime
from sqlalchemy.sql import func
from database import Base


class TimeSlot(Base):
    __tablename__ = "time_slots"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False, index=True)
    start_time = Column(Time, nullable=False)
    end_time = Column(Time, nullable=False)
    is_booked = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 4.10 File: `backend/models/booking.py`

```python
from sqlalchemy import Column, Integer, String, Text, Float, ForeignKey, DateTime
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from database import Base


class Booking(Base):
    __tablename__ = "bookings"

    id = Column(Integer, primary_key=True, index=True)
    client_name = Column(String(100), nullable=False)
    client_email = Column(String(255), nullable=False)
    client_phone = Column(String(20), nullable=True)
    slot_id = Column(Integer, ForeignKey("time_slots.id"), nullable=True)
    tattoo_style = Column(String(50), nullable=True)
    tattoo_description = Column(Text, nullable=True)
    placement = Column(String(100), nullable=True)
    reference_images = Column(Text, nullable=True)  # JSON array of URLs stored as text
    status = Column(String(20), default="pending")  # pending, confirmed, deposit_paid, completed, cancelled
    estimated_price = Column(Float, nullable=True)
    deposit_percentage = Column(Float, default=30.0)
    deposit_amount = Column(Float, nullable=True)
    stripe_payment_id = Column(String(255), nullable=True)
    admin_notes = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    slot = relationship("TimeSlot", backref="booking")
```

### 4.11 File: `backend/auth.py`

```python
"""Admin authentication: password hashing + JWT tokens."""

from datetime import datetime, timedelta, timezone
from jose import JWTError, jwt
from passlib.context import CryptContext
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from config import get_settings

settings = get_settings()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# JWT Config
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 480  # 8 hours


def hash_password(password: str) -> str:
    """Hash a plaintext password with bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against a bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict) -> str:
    """Create a JWT access token with expiration."""
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)) -> dict:
    """FastAPI dependency: extracts and validates JWT from Authorization header.
    
    Returns the token payload dict (contains 'sub' with admin username).
    Raises 401 if token is invalid or expired.
    """
    token = credentials.credentials
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid or expired token",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        return payload
    except JWTError:
        raise credentials_exception
```

### 4.12 File: `backend/services/email.py`

```python
"""Email service using Resend API."""

import resend
from config import get_settings

settings = get_settings()
resend.api_key = settings.resend_api_key


def send_contact_notification(name: str, email: str, phone: str, style: str, message: str):
    """Send email to admin when someone submits the contact form.
    
    Args:
        name: Client's full name
        email: Client's email address
        phone: Client's phone (may be empty string)
        style: Tattoo style selected (may be empty string)
        message: Client's message text
    """
    if not settings.resend_api_key:
        print(f"[EMAIL STUB] Contact from {name} ({email}): {message[:100]}")
        return

    resend.Emails.send({
        "from": f"Kevin's Tattoo Studio <noreply@{_get_sending_domain()}>",
        "to": [settings.admin_email],
        "subject": f"New Inquiry from {name}",
        "html": f"""
        <h2>New Contact Form Submission</h2>
        <p><strong>Name:</strong> {name}</p>
        <p><strong>Email:</strong> {email}</p>
        <p><strong>Phone:</strong> {phone or 'Not provided'}</p>
        <p><strong>Style:</strong> {style or 'Not specified'}</p>
        <p><strong>Message:</strong></p>
        <p>{message}</p>
        """,
    })


def send_contact_confirmation(client_email: str, client_name: str):
    """Send confirmation email to the client after form submission.
    
    Args:
        client_email: Where to send the confirmation
        client_name: Client's name for personalization
    """
    if not settings.resend_api_key:
        print(f"[EMAIL STUB] Confirmation to {client_name} ({client_email})")
        return

    resend.Emails.send({
        "from": f"Kevin's Tattoo Studio <noreply@{_get_sending_domain()}>",
        "to": [client_email],
        "subject": "We Received Your Inquiry — Kevin's Tattoo Studio",
        "html": f"""
        <h2>Thanks for reaching out, {client_name}!</h2>
        <p>We've received your message and will get back to you within 24 hours.</p>
        <p>In the meantime, feel free to check out more of our work on 
        <a href="https://instagram.com/kevins.tattoo">Instagram</a>.</p>
        <br>
        <p>— Kevin's Tattoo Studio</p>
        """,
    })


def send_booking_confirmation(client_email: str, client_name: str, date: str, time: str):
    """Send email to client when their booking is confirmed by admin.
    
    Args:
        client_email: Client's email
        client_name: Client's name
        date: Booking date string (e.g., "March 15, 2025")
        time: Booking time string (e.g., "2:00 PM - 3:00 PM")
    """
    if not settings.resend_api_key:
        print(f"[EMAIL STUB] Booking confirmed for {client_name} on {date} at {time}")
        return

    resend.Emails.send({
        "from": f"Kevin's Tattoo Studio <noreply@{_get_sending_domain()}>",
        "to": [client_email],
        "subject": "Booking Confirmed — Kevin's Tattoo Studio",
        "html": f"""
        <h2>Your Booking is Confirmed!</h2>
        <p>Hi {client_name},</p>
        <p>Your tattoo session has been confirmed:</p>
        <p><strong>Date:</strong> {date}</p>
        <p><strong>Time:</strong> {time}</p>
        <p>You will receive a separate email with deposit payment details shortly.</p>
        <br>
        <p>— Kevin's Tattoo Studio</p>
        """,
    })


def send_deposit_request(client_email: str, client_name: str, amount: float, payment_url: str):
    """Send deposit payment link to client.
    
    Args:
        client_email: Client's email
        client_name: Client's name
        amount: Deposit amount in dollars (e.g., 150.00)
        payment_url: Stripe Checkout URL the client clicks to pay
    """
    if not settings.resend_api_key:
        print(f"[EMAIL STUB] Deposit ${amount} link for {client_name}: {payment_url}")
        return

    resend.Emails.send({
        "from": f"Kevin's Tattoo Studio <noreply@{_get_sending_domain()}>",
        "to": [client_email],
        "subject": f"Deposit Required (${amount:.2f}) — Kevin's Tattoo Studio",
        "html": f"""
        <h2>Deposit Payment Required</h2>
        <p>Hi {client_name},</p>
        <p>To secure your booking, a deposit of <strong>${amount:.2f}</strong> is required.</p>
        <p>
            <a href="{payment_url}" 
               style="display:inline-block;padding:14px 36px;background:#c9a96e;color:#0a0a0a;
                      text-decoration:none;font-weight:bold;border-radius:4px;">
                Pay Deposit
            </a>
        </p>
        <p>This deposit is non-refundable and will be deducted from your total session cost.</p>
        <br>
        <p>— Kevin's Tattoo Studio</p>
        """,
    })


def _get_sending_domain() -> str:
    """Extract domain from admin email or fall back to resend.dev for testing."""
    if settings.admin_email and "@" in settings.admin_email:
        domain = settings.admin_email.split("@")[1]
        # Only use custom domain if it's not a common email provider
        if domain not in ("gmail.com", "yahoo.com", "hotmail.com", "outlook.com"):
            return domain
    return "resend.dev"  # Resend's default testing domain
```

### 4.13 File: `backend/routes/contact.py`

```python
"""Contact form API endpoint."""

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from database import get_db
from models.contact import Contact
from services.email import send_contact_notification, send_contact_confirmation

router = APIRouter(prefix="/api", tags=["contact"])


class ContactRequest(BaseModel):
    name: str
    email: EmailStr
    phone: str = ""
    style: str = ""
    message: str


class ContactResponse(BaseModel):
    success: bool
    message: str


@router.post("/contact", response_model=ContactResponse)
def submit_contact(data: ContactRequest, db: Session = Depends(get_db)):
    """Handle contact form submission.
    
    1. Validates input via Pydantic model
    2. Saves to contacts table
    3. Sends notification email to admin
    4. Sends confirmation email to client
    5. Returns success response
    """
    # Save to database
    contact = Contact(
        name=data.name,
        email=data.email,
        phone=data.phone,
        style=data.style,
        message=data.message,
    )
    db.add(contact)
    db.commit()

    # Send emails (non-blocking would be better but fine for low traffic)
    try:
        send_contact_notification(data.name, data.email, data.phone, data.style, data.message)
        send_contact_confirmation(data.email, data.name)
    except Exception as e:
        # Log error but don't fail the request — the form data is already saved
        print(f"Email send error: {e}")

    return ContactResponse(success=True, message="Your message has been sent! We'll get back to you within 24 hours.")
```

### 4.14 File: `backend/routes/gallery.py`

```python
"""Gallery API: public listing + admin upload/delete."""

import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models.gallery import GalleryImage
from auth import get_current_admin

router = APIRouter(prefix="/api", tags=["gallery"])

# Directory where uploaded images are stored
UPLOAD_DIR = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "uploads")
os.makedirs(UPLOAD_DIR, exist_ok=True)


class GalleryItemResponse(BaseModel):
    id: int
    title: str
    category: str
    image_url: str
    description: Optional[str] = None
    sort_order: int

    class Config:
        from_attributes = True


@router.get("/gallery", response_model=list[GalleryItemResponse])
def list_gallery(category: Optional[str] = None, db: Session = Depends(get_db)):
    """Public endpoint: list all gallery images.
    
    Query params:
        category (optional): filter by category (e.g., "blackwork", "realism")
    
    Returns list of gallery images ordered by sort_order descending (newest first).
    """
    query = db.query(GalleryImage)
    if category:
        query = query.filter(GalleryImage.category == category)
    return query.order_by(GalleryImage.sort_order.desc(), GalleryImage.id.desc()).all()


@router.post("/admin/gallery", response_model=GalleryItemResponse)
def upload_gallery_image(
    title: str = Form(...),
    category: str = Form(...),
    description: str = Form(""),
    image: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    """Admin endpoint: upload a new gallery image.
    
    Accepts multipart form data with:
        - title: Image title (required)
        - category: One of: traditional, realism, blackwork, japanese, geometric (required)
        - description: Optional description
        - image: Image file (JPG, PNG, WebP — max 5MB)
    
    The image is saved to backend/data/uploads/ with a UUID filename.
    The image_url stored in DB is relative: /uploads/{filename}
    The backend serves /uploads/ as a static files directory.
    """
    # Validate category
    valid_categories = ["traditional", "realism", "blackwork", "japanese", "geometric"]
    if category not in valid_categories:
        raise HTTPException(status_code=400, detail=f"Invalid category. Must be one of: {', '.join(valid_categories)}")

    # Validate file type
    allowed_types = ["image/jpeg", "image/png", "image/webp"]
    if image.content_type not in allowed_types:
        raise HTTPException(status_code=400, detail="Invalid file type. Must be JPG, PNG, or WebP.")

    # Validate file size (5MB max)
    contents = image.file.read()
    if len(contents) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum 5MB.")
    image.file.seek(0)  # Reset file pointer after reading

    # Generate unique filename
    ext = os.path.splitext(image.filename)[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    filepath = os.path.join(UPLOAD_DIR, filename)

    # Save file to disk
    with open(filepath, "wb") as f:
        f.write(contents)

    # Save to database
    gallery_image = GalleryImage(
        title=title,
        category=category,
        image_url=f"/uploads/{filename}",
        description=description if description else None,
    )
    db.add(gallery_image)
    db.commit()
    db.refresh(gallery_image)
    return gallery_image


@router.delete("/admin/gallery/{image_id}")
def delete_gallery_image(
    image_id: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    """Admin endpoint: delete a gallery image.
    
    Removes the image record from the database AND deletes the file from disk.
    Returns 404 if image_id doesn't exist.
    """
    image = db.query(GalleryImage).filter(GalleryImage.id == image_id).first()
    if not image:
        raise HTTPException(status_code=404, detail="Image not found")

    # Delete file from disk if it exists
    if image.image_url.startswith("/uploads/"):
        filepath = os.path.join(UPLOAD_DIR, image.image_url.replace("/uploads/", ""))
        if os.path.exists(filepath):
            os.remove(filepath)

    db.delete(image)
    db.commit()
    return {"success": True, "message": "Image deleted"}
```

### 4.15 File: `backend/routes/admin.py`

```python
"""Admin authentication and dashboard data endpoints."""

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models.admin import Admin
from models.contact import Contact
from models.booking import Booking
from auth import hash_password, verify_password, create_access_token, get_current_admin

router = APIRouter(prefix="/api/admin", tags=["admin"])


class LoginRequest(BaseModel):
    username: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"


class ContactListItem(BaseModel):
    id: int
    name: str
    email: str
    phone: Optional[str] = None
    style: Optional[str] = None
    message: str
    is_read: bool
    created_at: str

    class Config:
        from_attributes = True


@router.post("/login", response_model=LoginResponse)
def admin_login(data: LoginRequest, db: Session = Depends(get_db)):
    """Admin login endpoint.
    
    Accepts username + password, returns JWT token.
    On first ever login, if no admins exist in DB, creates the admin account
    using ADMIN_USERNAME and ADMIN_PASSWORD from environment variables.
    
    Returns:
        access_token: JWT token valid for 8 hours
        token_type: "bearer"
    """
    admin = db.query(Admin).filter(Admin.username == data.username).first()

    if not admin:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    if not verify_password(data.password, admin.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password",
        )

    token = create_access_token(data={"sub": admin.username})
    return LoginResponse(access_token=token)


@router.get("/contacts", response_model=list[ContactListItem])
def list_contacts(
    is_read: Optional[bool] = None,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    """Admin endpoint: list all contact form submissions.
    
    Query params:
        is_read (optional): filter by read status (true/false)
    
    Returns list ordered by created_at descending (newest first).
    """
    query = db.query(Contact)
    if is_read is not None:
        query = query.filter(Contact.is_read == is_read)
    contacts = query.order_by(Contact.created_at.desc()).all()
    # Convert datetime to string for JSON serialization
    result = []
    for c in contacts:
        item = ContactListItem(
            id=c.id,
            name=c.name,
            email=c.email,
            phone=c.phone,
            style=c.style,
            message=c.message,
            is_read=c.is_read,
            created_at=c.created_at.isoformat() if c.created_at else "",
        )
        result.append(item)
    return result


@router.patch("/contacts/{contact_id}/read")
def mark_contact_read(
    contact_id: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    """Admin endpoint: mark a contact submission as read."""
    contact = db.query(Contact).filter(Contact.id == contact_id).first()
    if not contact:
        raise HTTPException(status_code=404, detail="Contact not found")
    contact.is_read = True
    db.commit()
    return {"success": True}


@router.get("/dashboard")
def dashboard_stats(
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    """Admin endpoint: get dashboard summary statistics.
    
    Returns counts of bookings by status, unread contacts, and total gallery images.
    """
    total_bookings = db.query(Booking).count()
    pending_bookings = db.query(Booking).filter(Booking.status == "pending").count()
    confirmed_bookings = db.query(Booking).filter(Booking.status == "confirmed").count()
    deposit_paid = db.query(Booking).filter(Booking.status == "deposit_paid").count()
    completed_bookings = db.query(Booking).filter(Booking.status == "completed").count()
    unread_contacts = db.query(Contact).filter(Contact.is_read == False).count()

    return {
        "bookings": {
            "total": total_bookings,
            "pending": pending_bookings,
            "confirmed": confirmed_bookings,
            "deposit_paid": deposit_paid,
            "completed": completed_bookings,
        },
        "unread_contacts": unread_contacts,
    }
```

### 4.16 File: `backend/main.py`

```python
"""FastAPI application entry point."""

from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
import os

from config import get_settings
from database import create_tables, SessionLocal
from models.admin import Admin
from auth import hash_password

# Import route modules
from routes.contact import router as contact_router
from routes.gallery import router as gallery_router
from routes.admin import router as admin_router


settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown logic.
    
    On startup:
    1. Creates all database tables (if they don't exist)
    2. Creates the default admin user (if no admins exist)
    """
    # Startup
    create_tables()
    _seed_admin()
    yield
    # Shutdown (nothing to clean up)


def _seed_admin():
    """Create the initial admin user if the admins table is empty.
    
    Uses ADMIN_USERNAME and ADMIN_PASSWORD from environment variables.
    """
    db = SessionLocal()
    try:
        existing = db.query(Admin).first()
        if not existing:
            admin = Admin(
                username=settings.admin_username,
                password_hash=hash_password(settings.admin_password),
            )
            db.add(admin)
            db.commit()
            print(f"[STARTUP] Created admin user: {settings.admin_username}")
    finally:
        db.close()


app = FastAPI(
    title="Kevin's Tattoo Studio API",
    description="Backend API for Kevin's Tattoo Studio website",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS — allow the frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        settings.frontend_url,          # e.g., http://localhost:8080
        "http://localhost:8080",         # local dev
        "http://127.0.0.1:8080",        # local dev alt
        "https://kevinstattoo.com",      # production
        "https://www.kevinstattoo.com",  # production www
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve uploaded images as static files
# URL path /uploads/filename.jpg -> file at backend/data/uploads/filename.jpg
uploads_dir = os.path.join(os.path.dirname(__file__), "data", "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

# Register route modules
app.include_router(contact_router)
app.include_router(gallery_router)
app.include_router(admin_router)


@app.get("/api/health")
def health_check():
    """Health check endpoint. Used by Render to verify the service is running."""
    return {"status": "ok", "service": "Kevin's Tattoo Studio API"}
```

### 4.17 File: `backend/.env.example`

```bash
# Copy this file to .env and fill in real values
# NEVER commit .env to git

# App
SECRET_KEY=generate-a-64-char-random-string-use-python-secrets-module
ENVIRONMENT=development
FRONTEND_URL=http://localhost:8080
BACKEND_URL=http://localhost:8000

# Database (SQLite — file path relative to backend/)
DATABASE_URL=sqlite:///./data/studio.db

# Admin credentials (used to create initial admin on first startup)
ADMIN_USERNAME=kevin
ADMIN_PASSWORD=change-this-to-a-strong-password

# Stripe (get from https://dashboard.stripe.com/test/apikeys)
STRIPE_SECRET_KEY=sk_test_your_key_here
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_WEBHOOK_SECRET=whsec_your_webhook_secret_here

# Resend (get from https://resend.com/api-keys)
RESEND_API_KEY=re_your_key_here
ADMIN_EMAIL=kevin@kevinstattoo.com

# Deposit percentage (applied to estimated price)
DEPOSIT_PERCENTAGE=30
```

### 4.18 File: `backend/.gitignore`

```
__pycache__/
*.py[cod]
.env
data/studio.db
data/uploads/*
!data/uploads/.gitkeep
*.egg-info/
.venv/
venv/
```

Create the gitkeep file so the uploads directory is tracked:
```bash
touch backend/data/uploads/.gitkeep
```

### 4.19 How to Run Phase 2A Locally

```bash
# Terminal 1: Backend
cd /root/kevin_tatto/backend
cp .env.example .env  # Then edit .env with real values (at minimum set SECRET_KEY and ADMIN_PASSWORD)
pip install -r requirements.txt
uvicorn main:app --reload --port 8000

# Terminal 2: Frontend (unchanged from before)
cd /root/kevin_tatto
python3 -m http.server 8080
```

### 4.20 Phase 2A Verification

After starting the backend:
1. Open `http://localhost:8000/docs` — you should see Swagger UI with all endpoints
2. `GET http://localhost:8000/api/health` → `{"status": "ok"}`
3. `POST http://localhost:8000/api/admin/login` with body `{"username": "kevin", "password": "your-password"}` → returns JWT token
4. `POST http://localhost:8000/api/contact` with body `{"name": "Test", "email": "test@example.com", "message": "Hello"}` → saves to DB
5. `GET http://localhost:8000/api/gallery` → returns empty array (no images yet)
6. Check that `backend/data/studio.db` was created

---

## 5. Phase 2B — Booking System

**Goal:** Admin creates available time slots, clients see a date picker + available slots, clients submit booking requests, admin confirms/rejects bookings.

### 5.1 File: `backend/routes/booking.py`

```python
"""Booking and time slot management endpoints."""

from datetime import date, time, datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session
from typing import Optional
from database import get_db
from models.timeslot import TimeSlot
from models.booking import Booking
from auth import get_current_admin
from services.email import send_booking_confirmation

router = APIRouter(prefix="/api", tags=["booking"])


# === Pydantic Schemas ===

class SlotResponse(BaseModel):
    id: int
    date: str  # ISO format: "2025-03-15"
    start_time: str  # "14:00"
    end_time: str  # "15:00"
    is_booked: bool

    class Config:
        from_attributes = True


class CreateSlotsRequest(BaseModel):
    """Admin request to create time slots.
    
    Example: Create 1-hour slots from 11:00 to 19:00 on a specific date:
    {
        "date": "2025-03-15",
        "start_hour": 11,
        "end_hour": 19,
        "slot_duration_minutes": 60
    }
    """
    date: str  # "YYYY-MM-DD"
    start_hour: int  # 0-23
    end_hour: int  # 0-23 (exclusive — slots go up to but not including this hour)
    slot_duration_minutes: int = 60  # default 1-hour slots


class BulkCreateSlotsRequest(BaseModel):
    """Admin request to create slots for multiple dates at once.
    
    Example: Create slots for every Tue-Sat for the next 4 weeks:
    {
        "start_date": "2025-03-10",
        "end_date": "2025-04-06",
        "days_of_week": [1, 2, 3, 4, 5],
        "start_hour": 11,
        "end_hour": 19,
        "slot_duration_minutes": 60
    }
    """
    start_date: str  # "YYYY-MM-DD"
    end_date: str  # "YYYY-MM-DD"
    days_of_week: list[int]  # 0=Monday, 1=Tuesday, ..., 6=Sunday
    start_hour: int
    end_hour: int
    slot_duration_minutes: int = 60


class BookingRequest(BaseModel):
    client_name: str
    client_email: EmailStr
    client_phone: str = ""
    slot_id: int
    tattoo_style: str = ""
    tattoo_description: str = ""
    placement: str = ""


class BookingResponse(BaseModel):
    id: int
    client_name: str
    client_email: str
    client_phone: Optional[str] = None
    slot_id: Optional[int] = None
    tattoo_style: Optional[str] = None
    tattoo_description: Optional[str] = None
    placement: Optional[str] = None
    status: str
    estimated_price: Optional[float] = None
    deposit_amount: Optional[float] = None
    created_at: str
    # Include slot info
    slot_date: Optional[str] = None
    slot_start_time: Optional[str] = None
    slot_end_time: Optional[str] = None

    class Config:
        from_attributes = True


class UpdateBookingRequest(BaseModel):
    """Admin request to update a booking.
    
    status values: "confirmed", "cancelled", "completed"
    estimated_price: set when confirming (triggers deposit calculation)
    admin_notes: optional internal notes
    """
    status: Optional[str] = None
    estimated_price: Optional[float] = None
    admin_notes: Optional[str] = None


# === Public Endpoints ===

@router.get("/slots/dates")
def get_available_dates(month: str, db: Session = Depends(get_db)):
    """Public endpoint: get dates that have available (unbooked) slots for a given month.
    
    Query params:
        month: "YYYY-MM" format (e.g., "2025-03")
    
    Returns list of date strings that have at least one open slot.
    Example response: ["2025-03-11", "2025-03-12", "2025-03-14"]
    """
    try:
        year, m = month.split("-")
        start = date(int(year), int(m), 1)
        # Get first day of next month
        if int(m) == 12:
            end = date(int(year) + 1, 1, 1)
        else:
            end = date(int(year), int(m) + 1, 1)
    except (ValueError, IndexError):
        raise HTTPException(status_code=400, detail="Invalid month format. Use YYYY-MM.")

    slots = (
        db.query(TimeSlot.date)
        .filter(TimeSlot.date >= start, TimeSlot.date < end, TimeSlot.is_booked == False)
        .distinct()
        .all()
    )
    return [s.date.isoformat() for s in slots]


@router.get("/slots", response_model=list[SlotResponse])
def get_available_slots(date: str, db: Session = Depends(get_db)):
    """Public endpoint: get available time slots for a specific date.
    
    Query params:
        date: "YYYY-MM-DD" format
    
    Returns only unbooked slots for that date, ordered by start_time.
    """
    try:
        slot_date = datetime.strptime(date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    slots = (
        db.query(TimeSlot)
        .filter(TimeSlot.date == slot_date, TimeSlot.is_booked == False)
        .order_by(TimeSlot.start_time)
        .all()
    )
    return [
        SlotResponse(
            id=s.id,
            date=s.date.isoformat(),
            start_time=s.start_time.strftime("%H:%M"),
            end_time=s.end_time.strftime("%H:%M"),
            is_booked=s.is_booked,
        )
        for s in slots
    ]


@router.post("/book", response_model=BookingResponse)
def create_booking(data: BookingRequest, db: Session = Depends(get_db)):
    """Public endpoint: create a new booking.
    
    1. Checks that the selected slot exists and is not already booked
    2. Creates booking with status "pending"
    3. Marks the slot as booked
    4. Returns the booking details
    
    The admin must then confirm the booking via PATCH /api/admin/bookings/{id}
    """
    # Check slot
    slot = db.query(TimeSlot).filter(TimeSlot.id == data.slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Time slot not found")
    if slot.is_booked:
        raise HTTPException(status_code=409, detail="This time slot is already booked")

    # Create booking
    booking = Booking(
        client_name=data.client_name,
        client_email=data.client_email,
        client_phone=data.client_phone,
        slot_id=data.slot_id,
        tattoo_style=data.tattoo_style,
        tattoo_description=data.tattoo_description,
        placement=data.placement,
        status="pending",
    )
    db.add(booking)

    # Mark slot as booked
    slot.is_booked = True

    db.commit()
    db.refresh(booking)

    return _booking_to_response(booking, slot)


# === Admin Endpoints ===

@router.post("/admin/slots")
def create_slots(
    data: CreateSlotsRequest,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    """Admin endpoint: create time slots for a single date.
    
    Creates consecutive slots of the specified duration between start_hour and end_hour.
    Example: start_hour=11, end_hour=19, slot_duration_minutes=60
    Creates slots: 11:00-12:00, 12:00-13:00, ..., 18:00-19:00 (8 slots)
    
    Skips slots that already exist for that date/time.
    """
    try:
        slot_date = datetime.strptime(data.date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    created = []
    current_minutes = data.start_hour * 60
    end_minutes = data.end_hour * 60

    while current_minutes + data.slot_duration_minutes <= end_minutes:
        start_t = time(current_minutes // 60, current_minutes % 60)
        end_t = time((current_minutes + data.slot_duration_minutes) // 60,
                     (current_minutes + data.slot_duration_minutes) % 60)

        # Check if slot already exists
        existing = (
            db.query(TimeSlot)
            .filter(TimeSlot.date == slot_date, TimeSlot.start_time == start_t)
            .first()
        )
        if not existing:
            slot = TimeSlot(date=slot_date, start_time=start_t, end_time=end_t)
            db.add(slot)
            created.append(f"{start_t.strftime('%H:%M')}-{end_t.strftime('%H:%M')}")

        current_minutes += data.slot_duration_minutes

    db.commit()
    return {"created": len(created), "slots": created, "date": data.date}


@router.post("/admin/slots/bulk")
def create_slots_bulk(
    data: BulkCreateSlotsRequest,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    """Admin endpoint: create time slots for a date range.
    
    Creates slots for each day in the range that matches days_of_week.
    days_of_week uses Python's weekday convention: 0=Monday, 1=Tuesday, ..., 5=Saturday, 6=Sunday
    
    Example: Tue-Sat (1,2,3,4,5), 11:00-19:00, 60-min slots, for March 10-April 6
    """
    try:
        start = datetime.strptime(data.start_date, "%Y-%m-%d").date()
        end = datetime.strptime(data.end_date, "%Y-%m-%d").date()
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD.")

    total_created = 0
    current_date = start

    while current_date <= end:
        if current_date.weekday() in data.days_of_week:
            current_minutes = data.start_hour * 60
            end_minutes = data.end_hour * 60

            while current_minutes + data.slot_duration_minutes <= end_minutes:
                start_t = time(current_minutes // 60, current_minutes % 60)
                end_t = time((current_minutes + data.slot_duration_minutes) // 60,
                             (current_minutes + data.slot_duration_minutes) % 60)

                existing = (
                    db.query(TimeSlot)
                    .filter(TimeSlot.date == current_date, TimeSlot.start_time == start_t)
                    .first()
                )
                if not existing:
                    slot = TimeSlot(date=current_date, start_time=start_t, end_time=end_t)
                    db.add(slot)
                    total_created += 1

                current_minutes += data.slot_duration_minutes

        current_date += timedelta(days=1)

    db.commit()
    return {
        "created": total_created,
        "date_range": f"{data.start_date} to {data.end_date}",
        "days": data.days_of_week,
    }


@router.delete("/admin/slots/{slot_id}")
def delete_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    """Admin endpoint: delete a time slot. Cannot delete if already booked."""
    slot = db.query(TimeSlot).filter(TimeSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Slot not found")
    if slot.is_booked:
        raise HTTPException(status_code=409, detail="Cannot delete a booked slot. Cancel the booking first.")
    db.delete(slot)
    db.commit()
    return {"success": True}


@router.get("/admin/bookings", response_model=list[BookingResponse])
def list_bookings(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    """Admin endpoint: list all bookings.
    
    Query params:
        status (optional): filter by status (pending, confirmed, deposit_paid, completed, cancelled)
    """
    query = db.query(Booking)
    if status:
        query = query.filter(Booking.status == status)
    bookings = query.order_by(Booking.created_at.desc()).all()

    results = []
    for b in bookings:
        slot = db.query(TimeSlot).filter(TimeSlot.id == b.slot_id).first() if b.slot_id else None
        results.append(_booking_to_response(b, slot))
    return results


@router.patch("/admin/bookings/{booking_id}", response_model=BookingResponse)
def update_booking(
    booking_id: int,
    data: UpdateBookingRequest,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    """Admin endpoint: update a booking's status, price estimate, or notes.
    
    When status is changed to "confirmed":
    - estimated_price should also be set
    - deposit_amount is auto-calculated as estimated_price * deposit_percentage / 100
    - Confirmation email is sent to the client
    
    When status is changed to "cancelled":
    - The associated time slot is freed (is_booked = False)
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if data.estimated_price is not None:
        booking.estimated_price = data.estimated_price
        booking.deposit_amount = round(data.estimated_price * booking.deposit_percentage / 100, 2)

    if data.admin_notes is not None:
        booking.admin_notes = data.admin_notes

    if data.status is not None:
        valid_statuses = ["pending", "confirmed", "deposit_paid", "completed", "cancelled"]
        if data.status not in valid_statuses:
            raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {', '.join(valid_statuses)}")

        old_status = booking.status
        booking.status = data.status

        # If cancelling, free the slot
        if data.status == "cancelled" and booking.slot_id:
            slot = db.query(TimeSlot).filter(TimeSlot.id == booking.slot_id).first()
            if slot:
                slot.is_booked = False

        # If confirming, send confirmation email
        if data.status == "confirmed" and old_status != "confirmed":
            slot = db.query(TimeSlot).filter(TimeSlot.id == booking.slot_id).first() if booking.slot_id else None
            if slot:
                date_str = slot.date.strftime("%B %d, %Y")
                time_str = f"{slot.start_time.strftime('%I:%M %p')} - {slot.end_time.strftime('%I:%M %p')}"
                try:
                    send_booking_confirmation(booking.client_email, booking.client_name, date_str, time_str)
                except Exception as e:
                    print(f"Email error: {e}")

    db.commit()
    db.refresh(booking)
    slot = db.query(TimeSlot).filter(TimeSlot.id == booking.slot_id).first() if booking.slot_id else None
    return _booking_to_response(booking, slot)


def _booking_to_response(booking: Booking, slot: Optional[TimeSlot] = None) -> BookingResponse:
    """Helper: convert a Booking + optional TimeSlot to a BookingResponse."""
    return BookingResponse(
        id=booking.id,
        client_name=booking.client_name,
        client_email=booking.client_email,
        client_phone=booking.client_phone,
        slot_id=booking.slot_id,
        tattoo_style=booking.tattoo_style,
        tattoo_description=booking.tattoo_description,
        placement=booking.placement,
        status=booking.status,
        estimated_price=booking.estimated_price,
        deposit_amount=booking.deposit_amount,
        created_at=booking.created_at.isoformat() if booking.created_at else "",
        slot_date=slot.date.isoformat() if slot else None,
        slot_start_time=slot.start_time.strftime("%H:%M") if slot else None,
        slot_end_time=slot.end_time.strftime("%H:%M") if slot else None,
    )
```

### 5.2 Register the Booking Router

Add this import and include to `backend/main.py`:

**In the imports section (around line 10), add:**
```python
from routes.booking import router as booking_router
```

**After the line `app.include_router(admin_router)` (around line 80), add:**
```python
app.include_router(booking_router)
```

### 5.3 Phase 2B Verification

1. Start backend: `uvicorn main:app --reload --port 8000`
2. Login: `POST /api/admin/login` → get token
3. Create slots: `POST /api/admin/slots` with header `Authorization: Bearer <token>` and body:
   ```json
   {"date": "2025-03-15", "start_hour": 11, "end_hour": 19, "slot_duration_minutes": 60}
   ```
   → should return `{"created": 8, "slots": ["11:00-12:00", ...]}`
4. Get available dates: `GET /api/slots/dates?month=2025-03` → should return `["2025-03-15"]`
5. Get slots for date: `GET /api/slots?date=2025-03-15` → should return 8 slots
6. Create booking: `POST /api/book` with body:
   ```json
   {"client_name": "Test Client", "client_email": "test@test.com", "slot_id": 1, "tattoo_description": "Dragon sleeve"}
   ```
   → should return booking with status "pending"
7. Confirm booking: `PATCH /api/admin/bookings/1` with body:
   ```json
   {"status": "confirmed", "estimated_price": 500}
   ```
   → should return booking with deposit_amount = 150.00

---

## 6. Phase 2C — Stripe Payments

**Goal:** After admin confirms a booking and sets a price, a Stripe Checkout session is created for the deposit. Client pays via Stripe's hosted page. Webhook updates booking status.

### 6.1 File: `backend/services/stripe_service.py`

```python
"""Stripe payment integration for deposit collection."""

import stripe
from config import get_settings

settings = get_settings()
stripe.api_key = settings.stripe_secret_key


def create_checkout_session(
    booking_id: int,
    client_email: str,
    deposit_amount: float,
    description: str,
) -> str:
    """Create a Stripe Checkout Session for deposit payment.
    
    Args:
        booking_id: Internal booking ID (stored in metadata for webhook)
        client_email: Pre-filled in checkout
        deposit_amount: Dollar amount (e.g., 150.00)
        description: Line item description shown to client
    
    Returns:
        Stripe Checkout Session URL (redirect client here to pay)
    
    Raises:
        stripe.error.StripeError on API failure
    """
    session = stripe.checkout.Session.create(
        payment_method_types=["card"],
        mode="payment",
        customer_email=client_email,
        line_items=[
            {
                "price_data": {
                    "currency": "usd",
                    "unit_amount": int(deposit_amount * 100),  # Stripe uses cents
                    "product_data": {
                        "name": "Tattoo Session Deposit",
                        "description": description,
                    },
                },
                "quantity": 1,
            }
        ],
        metadata={
            "booking_id": str(booking_id),
        },
        success_url=f"{settings.frontend_url}?payment=success&booking_id={booking_id}",
        cancel_url=f"{settings.frontend_url}?payment=cancelled&booking_id={booking_id}",
    )
    return session.url


def construct_webhook_event(payload: bytes, sig_header: str):
    """Verify and construct a Stripe webhook event.
    
    Args:
        payload: Raw request body bytes
        sig_header: Value of the Stripe-Signature header
    
    Returns:
        stripe.Event object
    
    Raises:
        ValueError: Invalid payload
        stripe.error.SignatureVerificationError: Invalid signature
    """
    return stripe.Webhook.construct_event(
        payload, sig_header, settings.stripe_webhook_secret
    )
```

### 6.2 File: `backend/routes/payment.py`

```python
"""Stripe payment endpoints: create checkout session + webhook."""

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db
from models.booking import Booking
from models.timeslot import TimeSlot
from auth import get_current_admin
from services.stripe_service import create_checkout_session, construct_webhook_event
from services.email import send_deposit_request

router = APIRouter(prefix="/api", tags=["payment"])


class CreatePaymentRequest(BaseModel):
    booking_id: int


class PaymentResponse(BaseModel):
    checkout_url: str


@router.post("/admin/payment/create-session", response_model=PaymentResponse)
def create_payment_session(
    data: CreatePaymentRequest,
    db: Session = Depends(get_db),
    admin: dict = Depends(get_current_admin),
):
    """Admin endpoint: create a Stripe Checkout session for a booking's deposit.
    
    Prerequisites:
    - Booking must be in "confirmed" status
    - Booking must have an estimated_price set
    - deposit_amount is auto-calculated (estimated_price * deposit_percentage / 100)
    
    After creating the session, sends the payment link to the client via email.
    """
    booking = db.query(Booking).filter(Booking.id == data.booking_id).first()
    if not booking:
        raise HTTPException(status_code=404, detail="Booking not found")

    if booking.status != "confirmed":
        raise HTTPException(status_code=400, detail="Booking must be confirmed before requesting deposit")

    if not booking.deposit_amount or booking.deposit_amount <= 0:
        raise HTTPException(status_code=400, detail="Booking has no deposit amount. Set estimated_price first.")

    # Build description
    slot = db.query(TimeSlot).filter(TimeSlot.id == booking.slot_id).first() if booking.slot_id else None
    date_str = slot.date.strftime("%B %d, %Y") if slot else "TBD"
    description = f"Deposit for tattoo session on {date_str} — {booking.tattoo_style or 'Custom'}"

    # Create Stripe Checkout Session
    checkout_url = create_checkout_session(
        booking_id=booking.id,
        client_email=booking.client_email,
        deposit_amount=booking.deposit_amount,
        description=description,
    )

    # Email the payment link to the client
    try:
        send_deposit_request(
            client_email=booking.client_email,
            client_name=booking.client_name,
            amount=booking.deposit_amount,
            payment_url=checkout_url,
        )
    except Exception as e:
        print(f"Email error: {e}")
        # Don't fail — admin can manually share the URL

    return PaymentResponse(checkout_url=checkout_url)


@router.post("/payment/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """Stripe webhook endpoint. Called by Stripe when payment events occur.
    
    Handles the 'checkout.session.completed' event:
    - Extracts booking_id from session metadata
    - Updates booking status to 'deposit_paid'
    - Stores the Stripe payment ID
    
    IMPORTANT: This endpoint must receive the raw request body (not JSON-parsed)
    for signature verification. Do NOT add a Pydantic body model.
    
    Setup in Stripe Dashboard:
    1. Go to Developers → Webhooks
    2. Add endpoint: https://api.kevinstattoo.com/api/payment/webhook
    3. Listen for event: checkout.session.completed
    4. Copy the webhook signing secret to STRIPE_WEBHOOK_SECRET env var
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing Stripe-Signature header")

    try:
        event = construct_webhook_event(payload, sig_header)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle checkout completion
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        booking_id = session.get("metadata", {}).get("booking_id")

        if booking_id:
            booking = db.query(Booking).filter(Booking.id == int(booking_id)).first()
            if booking:
                booking.status = "deposit_paid"
                booking.stripe_payment_id = session.get("payment_intent")
                db.commit()
                print(f"[WEBHOOK] Booking #{booking_id} deposit paid. Payment: {booking.stripe_payment_id}")

    return {"received": True}
```

### 6.3 Register the Payment Router

Add to `backend/main.py`:

**In imports:**
```python
from routes.payment import router as payment_router
```

**After other `include_router` calls:**
```python
app.include_router(payment_router)
```

### 6.4 Stripe Webhook Testing (Local Development)

To test webhooks locally, use the Stripe CLI:

```bash
# Install Stripe CLI (macOS)
brew install stripe/stripe-cli/stripe

# Or download from https://stripe.com/docs/stripe-cli

# Login
stripe login

# Forward webhooks to your local server
stripe listen --forward-to localhost:8000/api/payment/webhook

# This prints a webhook signing secret (whsec_...) — put it in your .env as STRIPE_WEBHOOK_SECRET
```

### 6.5 Phase 2C Verification

1. Create a booking and confirm it with an estimated price (Phase 2B steps)
2. `POST /api/admin/payment/create-session` with `{"booking_id": 1}` → returns `{"checkout_url": "https://checkout.stripe.com/..."}`
3. Open the checkout URL in browser → Stripe test page appears
4. Pay with test card: `4242 4242 4242 4242`, any future expiry, any CVC
5. Check Stripe CLI output — should show webhook received
6. `GET /api/admin/bookings` → booking status should be "deposit_paid"
7. Check booking has a `stripe_payment_id` value

---

## 7. Phase 2D — Polish & Admin Dashboard

**Goal:** Build the admin dashboard UI (HTML page), add booking date picker to the public frontend, wire up all frontend JS to call the API.

### 7.1 File: `admin/index.html`

Create directory and file: `mkdir -p /root/kevin_tatto/admin`

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Dashboard — Kevin's Tattoo Studio</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700&family=Inter:wght@300;400;500;600&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
    <link rel="stylesheet" href="css/admin.css">
</head>
<body>
    <!-- Login Screen -->
    <div class="login-screen" id="loginScreen">
        <div class="login-card">
            <h1 class="login-logo">
                <span class="logo-text">KEVIN'S</span>
                <span class="logo-accent">TATTOO</span>
            </h1>
            <p class="login-subtitle">Admin Dashboard</p>
            <form id="loginForm">
                <div class="form-group">
                    <label for="loginUsername">Username</label>
                    <input type="text" id="loginUsername" required autocomplete="username">
                </div>
                <div class="form-group">
                    <label for="loginPassword">Password</label>
                    <input type="password" id="loginPassword" required autocomplete="current-password">
                </div>
                <p class="login-error" id="loginError"></p>
                <button type="submit" class="btn btn-primary btn-full">Login</button>
            </form>
        </div>
    </div>

    <!-- Dashboard (hidden until login) -->
    <div class="dashboard" id="dashboard" style="display: none;">
        <!-- Sidebar -->
        <aside class="sidebar">
            <div class="sidebar-logo">
                <span class="logo-text">KEVIN'S</span>
                <span class="logo-accent">TATTOO</span>
            </div>
            <nav class="sidebar-nav">
                <button class="sidebar-link active" data-tab="overview"><i class="fas fa-chart-bar"></i> Overview</button>
                <button class="sidebar-link" data-tab="bookings"><i class="fas fa-calendar-check"></i> Bookings</button>
                <button class="sidebar-link" data-tab="contacts"><i class="fas fa-envelope"></i> Messages</button>
                <button class="sidebar-link" data-tab="gallery"><i class="fas fa-images"></i> Gallery</button>
                <button class="sidebar-link" data-tab="slots"><i class="fas fa-clock"></i> Time Slots</button>
            </nav>
            <button class="sidebar-link sidebar-logout" id="logoutBtn"><i class="fas fa-sign-out-alt"></i> Logout</button>
        </aside>

        <!-- Main Content -->
        <main class="main-content">
            <!-- Overview Tab -->
            <div class="tab-content active" id="tab-overview">
                <h2 class="page-title">Dashboard Overview</h2>
                <div class="stats-grid" id="statsGrid">
                    <div class="stat-card">
                        <div class="stat-icon"><i class="fas fa-calendar-check"></i></div>
                        <div class="stat-info">
                            <span class="stat-value" id="statPending">0</span>
                            <span class="stat-label">Pending Bookings</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon confirmed"><i class="fas fa-check-circle"></i></div>
                        <div class="stat-info">
                            <span class="stat-value" id="statConfirmed">0</span>
                            <span class="stat-label">Confirmed</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon paid"><i class="fas fa-dollar-sign"></i></div>
                        <div class="stat-info">
                            <span class="stat-value" id="statPaid">0</span>
                            <span class="stat-label">Deposits Paid</span>
                        </div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-icon messages"><i class="fas fa-envelope-open"></i></div>
                        <div class="stat-info">
                            <span class="stat-value" id="statMessages">0</span>
                            <span class="stat-label">Unread Messages</span>
                        </div>
                    </div>
                </div>
                <div class="recent-section">
                    <h3>Recent Bookings</h3>
                    <div id="recentBookings" class="table-container">
                        <p class="empty-state">Loading...</p>
                    </div>
                </div>
            </div>

            <!-- Bookings Tab -->
            <div class="tab-content" id="tab-bookings">
                <h2 class="page-title">Manage Bookings</h2>
                <div class="filter-bar">
                    <select id="bookingStatusFilter">
                        <option value="">All Statuses</option>
                        <option value="pending">Pending</option>
                        <option value="confirmed">Confirmed</option>
                        <option value="deposit_paid">Deposit Paid</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
                <div id="bookingsList" class="table-container">
                    <p class="empty-state">Loading...</p>
                </div>
            </div>

            <!-- Contacts Tab -->
            <div class="tab-content" id="tab-contacts">
                <h2 class="page-title">Contact Messages</h2>
                <div id="contactsList" class="table-container">
                    <p class="empty-state">Loading...</p>
                </div>
            </div>

            <!-- Gallery Tab -->
            <div class="tab-content" id="tab-gallery">
                <h2 class="page-title">Manage Gallery</h2>
                <div class="upload-area" id="uploadArea">
                    <form id="uploadForm" enctype="multipart/form-data">
                        <div class="upload-dropzone" id="dropzone">
                            <i class="fas fa-cloud-upload-alt"></i>
                            <p>Drag & drop image here or click to browse</p>
                            <input type="file" id="imageFile" accept="image/jpeg,image/png,image/webp" hidden>
                        </div>
                        <div class="upload-fields">
                            <input type="text" id="imageTitle" placeholder="Image title" required>
                            <select id="imageCategory" required>
                                <option value="">Select category</option>
                                <option value="traditional">Traditional</option>
                                <option value="realism">Realism</option>
                                <option value="blackwork">Blackwork</option>
                                <option value="japanese">Japanese</option>
                                <option value="geometric">Geometric</option>
                            </select>
                            <button type="submit" class="btn btn-primary">Upload</button>
                        </div>
                    </form>
                </div>
                <div id="galleryGrid" class="admin-gallery-grid">
                    <p class="empty-state">Loading...</p>
                </div>
            </div>

            <!-- Time Slots Tab -->
            <div class="tab-content" id="tab-slots">
                <h2 class="page-title">Manage Time Slots</h2>
                <div class="slots-form-card">
                    <h3>Create Slots (Bulk)</h3>
                    <form id="slotsForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Start Date</label>
                                <input type="date" id="slotStartDate" required>
                            </div>
                            <div class="form-group">
                                <label>End Date</label>
                                <input type="date" id="slotEndDate" required>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Start Hour</label>
                                <input type="number" id="slotStartHour" value="11" min="0" max="23" required>
                            </div>
                            <div class="form-group">
                                <label>End Hour</label>
                                <input type="number" id="slotEndHour" value="19" min="0" max="23" required>
                            </div>
                            <div class="form-group">
                                <label>Duration (min)</label>
                                <input type="number" id="slotDuration" value="60" min="15" max="480" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Days of Week</label>
                            <div class="days-checkboxes">
                                <label><input type="checkbox" value="0"> Mon</label>
                                <label><input type="checkbox" value="1" checked> Tue</label>
                                <label><input type="checkbox" value="2" checked> Wed</label>
                                <label><input type="checkbox" value="3" checked> Thu</label>
                                <label><input type="checkbox" value="4" checked> Fri</label>
                                <label><input type="checkbox" value="5" checked> Sat</label>
                                <label><input type="checkbox" value="6"> Sun</label>
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">Create Slots</button>
                    </form>
                </div>
            </div>
        </main>
    </div>

    <script src="js/admin.js"></script>
</body>
</html>
```

### 7.2 File: `admin/js/admin.js`

```javascript
/**
 * Admin Dashboard JavaScript
 * 
 * Handles: login, tab navigation, CRUD for bookings/contacts/gallery/slots
 * 
 * IMPORTANT: Set API_BASE to your backend URL before deploying.
 */

const API_BASE = 'http://localhost:8000'; // Change to https://api.kevinstattoo.com in production

let authToken = localStorage.getItem('admin_token') || null;

// === INIT ===
document.addEventListener('DOMContentLoaded', () => {
    if (authToken) {
        showDashboard();
    }
    initLogin();
    initTabs();
    initLogout();
    initGalleryUpload();
    initSlotsForm();
    initBookingFilter();
});

// === AUTH ===
function initLogin() {
    document.getElementById('loginForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('loginUsername').value;
        const password = document.getElementById('loginPassword').value;
        const errorEl = document.getElementById('loginError');
        errorEl.textContent = '';

        try {
            const res = await apiFetch('/api/admin/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });
            authToken = res.access_token;
            localStorage.setItem('admin_token', authToken);
            showDashboard();
        } catch (err) {
            errorEl.textContent = err.message || 'Login failed';
        }
    });
}

function initLogout() {
    document.getElementById('logoutBtn').addEventListener('click', () => {
        authToken = null;
        localStorage.removeItem('admin_token');
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
    });
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';
    loadOverview();
}

// === TABS ===
function initTabs() {
    document.querySelectorAll('.sidebar-link[data-tab]').forEach(link => {
        link.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
            const tab = link.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
            document.getElementById(`tab-${tab}`).classList.add('active');

            // Load data for the tab
            if (tab === 'overview') loadOverview();
            if (tab === 'bookings') loadBookings();
            if (tab === 'contacts') loadContacts();
            if (tab === 'gallery') loadGallery();
        });
    });
}

// === API HELPER ===
async function apiFetch(path, options = {}) {
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (authToken && !path.includes('/login')) {
        headers['Authorization'] = `Bearer ${authToken}`;
    }
    // Don't set Content-Type for FormData (browser sets it with boundary)
    if (options.body instanceof FormData) {
        delete headers['Content-Type'];
    }
    const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
    if (res.status === 401) {
        authToken = null;
        localStorage.removeItem('admin_token');
        document.getElementById('dashboard').style.display = 'none';
        document.getElementById('loginScreen').style.display = 'flex';
        throw new Error('Session expired. Please login again.');
    }
    const data = await res.json();
    if (!res.ok) throw new Error(data.detail || 'Request failed');
    return data;
}

// === OVERVIEW ===
async function loadOverview() {
    try {
        const stats = await apiFetch('/api/admin/dashboard');
        document.getElementById('statPending').textContent = stats.bookings.pending;
        document.getElementById('statConfirmed').textContent = stats.bookings.confirmed;
        document.getElementById('statPaid').textContent = stats.bookings.deposit_paid;
        document.getElementById('statMessages').textContent = stats.unread_contacts;

        // Load recent bookings
        const bookings = await apiFetch('/api/admin/bookings');
        const recent = bookings.slice(0, 5);
        const container = document.getElementById('recentBookings');
        if (recent.length === 0) {
            container.innerHTML = '<p class="empty-state">No bookings yet</p>';
        } else {
            container.innerHTML = buildBookingsTable(recent);
        }
    } catch (err) {
        console.error('Failed to load overview:', err);
    }
}

// === BOOKINGS ===
function initBookingFilter() {
    document.getElementById('bookingStatusFilter').addEventListener('change', () => loadBookings());
}

async function loadBookings() {
    const status = document.getElementById('bookingStatusFilter').value;
    const query = status ? `?status=${status}` : '';
    try {
        const bookings = await apiFetch(`/api/admin/bookings${query}`);
        const container = document.getElementById('bookingsList');
        if (bookings.length === 0) {
            container.innerHTML = '<p class="empty-state">No bookings found</p>';
        } else {
            container.innerHTML = buildBookingsTable(bookings, true);
        }
    } catch (err) {
        console.error('Failed to load bookings:', err);
    }
}

function buildBookingsTable(bookings, showActions = false) {
    let html = `<table class="data-table">
        <thead><tr>
            <th>Client</th><th>Date</th><th>Style</th><th>Status</th><th>Price</th><th>Deposit</th>
            ${showActions ? '<th>Actions</th>' : ''}
        </tr></thead><tbody>`;
    for (const b of bookings) {
        const statusClass = `status-${b.status}`;
        html += `<tr>
            <td><strong>${b.client_name}</strong><br><small>${b.client_email}</small></td>
            <td>${b.slot_date || 'N/A'}<br><small>${b.slot_start_time || ''} - ${b.slot_end_time || ''}</small></td>
            <td>${b.tattoo_style || '-'}</td>
            <td><span class="status-badge ${statusClass}">${b.status}</span></td>
            <td>${b.estimated_price ? '$' + b.estimated_price.toFixed(2) : '-'}</td>
            <td>${b.deposit_amount ? '$' + b.deposit_amount.toFixed(2) : '-'}</td>
            ${showActions ? `<td class="actions-cell">
                ${b.status === 'pending' ? `
                    <button class="btn-sm btn-confirm" onclick="confirmBooking(${b.id})">Confirm</button>
                    <button class="btn-sm btn-cancel" onclick="cancelBooking(${b.id})">Cancel</button>
                ` : ''}
                ${b.status === 'confirmed' ? `
                    <button class="btn-sm btn-pay" onclick="sendDeposit(${b.id})">Send Deposit Link</button>
                ` : ''}
                ${b.status === 'deposit_paid' ? `
                    <button class="btn-sm btn-complete" onclick="completeBooking(${b.id})">Mark Complete</button>
                ` : ''}
            </td>` : ''}
        </tr>`;
    }
    html += '</tbody></table>';
    return html;
}

async function confirmBooking(id) {
    const price = prompt('Enter estimated price ($):');
    if (!price || isNaN(price)) return;
    try {
        await apiFetch(`/api/admin/bookings/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'confirmed', estimated_price: parseFloat(price) }),
        });
        loadBookings();
        loadOverview();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function cancelBooking(id) {
    if (!confirm('Cancel this booking?')) return;
    try {
        await apiFetch(`/api/admin/bookings/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'cancelled' }),
        });
        loadBookings();
        loadOverview();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function sendDeposit(id) {
    try {
        const res = await apiFetch('/api/admin/payment/create-session', {
            method: 'POST',
            body: JSON.stringify({ booking_id: id }),
        });
        alert('Deposit link sent to client! URL: ' + res.checkout_url);
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

async function completeBooking(id) {
    if (!confirm('Mark this booking as completed?')) return;
    try {
        await apiFetch(`/api/admin/bookings/${id}`, {
            method: 'PATCH',
            body: JSON.stringify({ status: 'completed' }),
        });
        loadBookings();
        loadOverview();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// === CONTACTS ===
async function loadContacts() {
    try {
        const contacts = await apiFetch('/api/admin/contacts');
        const container = document.getElementById('contactsList');
        if (contacts.length === 0) {
            container.innerHTML = '<p class="empty-state">No messages yet</p>';
            return;
        }
        let html = '<div class="contacts-list">';
        for (const c of contacts) {
            html += `<div class="contact-card ${c.is_read ? '' : 'unread'}">
                <div class="contact-header">
                    <strong>${c.name}</strong>
                    <span class="contact-date">${new Date(c.created_at).toLocaleDateString()}</span>
                </div>
                <p class="contact-email">${c.email} ${c.phone ? '| ' + c.phone : ''}</p>
                <p class="contact-style">${c.style ? 'Style: ' + c.style : ''}</p>
                <p class="contact-message">${c.message}</p>
                ${!c.is_read ? `<button class="btn-sm" onclick="markRead(${c.id})">Mark as Read</button>` : ''}
            </div>`;
        }
        html += '</div>';
        container.innerHTML = html;
    } catch (err) {
        console.error('Failed to load contacts:', err);
    }
}

async function markRead(id) {
    try {
        await apiFetch(`/api/admin/contacts/${id}/read`, { method: 'PATCH' });
        loadContacts();
        loadOverview();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// === GALLERY ===
function initGalleryUpload() {
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('imageFile');

    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => { e.preventDefault(); dropzone.classList.add('dragover'); });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        if (e.dataTransfer.files.length) {
            fileInput.files = e.dataTransfer.files;
            dropzone.querySelector('p').textContent = e.dataTransfer.files[0].name;
        }
    });
    fileInput.addEventListener('change', () => {
        if (fileInput.files.length) {
            dropzone.querySelector('p').textContent = fileInput.files[0].name;
        }
    });

    document.getElementById('uploadForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('image', fileInput.files[0]);
        formData.append('title', document.getElementById('imageTitle').value);
        formData.append('category', document.getElementById('imageCategory').value);

        try {
            await apiFetch('/api/admin/gallery', {
                method: 'POST',
                body: formData,
            });
            document.getElementById('uploadForm').reset();
            dropzone.querySelector('p').textContent = 'Drag & drop image here or click to browse';
            loadGallery();
        } catch (err) {
            alert('Upload error: ' + err.message);
        }
    });
}

async function loadGallery() {
    try {
        const images = await apiFetch('/api/gallery');
        const container = document.getElementById('galleryGrid');
        if (images.length === 0) {
            container.innerHTML = '<p class="empty-state">No images uploaded yet</p>';
            return;
        }
        let html = '';
        for (const img of images) {
            const imgUrl = img.image_url.startsWith('http') ? img.image_url : `${API_BASE}${img.image_url}`;
            html += `<div class="admin-gallery-item">
                <img src="${imgUrl}" alt="${img.title}">
                <div class="admin-gallery-info">
                    <strong>${img.title}</strong>
                    <span class="tag">${img.category}</span>
                    <button class="btn-sm btn-cancel" onclick="deleteImage(${img.id})"><i class="fas fa-trash"></i></button>
                </div>
            </div>`;
        }
        container.innerHTML = html;
    } catch (err) {
        console.error('Failed to load gallery:', err);
    }
}

async function deleteImage(id) {
    if (!confirm('Delete this image?')) return;
    try {
        await apiFetch(`/api/admin/gallery/${id}`, { method: 'DELETE' });
        loadGallery();
    } catch (err) {
        alert('Error: ' + err.message);
    }
}

// === TIME SLOTS ===
function initSlotsForm() {
    document.getElementById('slotsForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const days = [];
        document.querySelectorAll('.days-checkboxes input:checked').forEach(cb => {
            days.push(parseInt(cb.value));
        });

        const body = {
            start_date: document.getElementById('slotStartDate').value,
            end_date: document.getElementById('slotEndDate').value,
            days_of_week: days,
            start_hour: parseInt(document.getElementById('slotStartHour').value),
            end_hour: parseInt(document.getElementById('slotEndHour').value),
            slot_duration_minutes: parseInt(document.getElementById('slotDuration').value),
        };

        try {
            const res = await apiFetch('/api/admin/slots/bulk', {
                method: 'POST',
                body: JSON.stringify(body),
            });
            alert(`Created ${res.created} time slots!`);
        } catch (err) {
            alert('Error: ' + err.message);
        }
    });
}
```

### 7.3 File: `admin/css/admin.css`

```css
/* === Admin Dashboard Styles ===
   Uses the same CSS custom properties as the main site for consistency.
*/

:root {
    --bg-primary: #0a0a0a;
    --bg-secondary: #111111;
    --bg-tertiary: #1a1a1a;
    --bg-card: #141414;
    --bg-card-hover: #1c1c1c;
    --text-primary: #f5f5f5;
    --text-secondary: #a0a0a0;
    --text-muted: #666666;
    --accent: #c9a96e;
    --accent-hover: #d4b87a;
    --border: #2a2a2a;
    --border-light: #333333;
    --font-display: 'Cinzel', serif;
    --font-body: 'Inter', sans-serif;
    --radius-sm: 4px;
    --radius-md: 8px;
    --radius-lg: 12px;

    --success: #27ae60;
    --danger: #e74c3c;
    --warning: #f39c12;
    --info: #3498db;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
    font-family: var(--font-body);
    background: var(--bg-primary);
    color: var(--text-primary);
    min-height: 100vh;
}

/* Login */
.login-screen {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    padding: 24px;
}

.login-card {
    background: var(--bg-card);
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    padding: 48px;
    width: 100%;
    max-width: 400px;
    text-align: center;
}

.login-logo { margin-bottom: 8px; }
.login-subtitle { color: var(--text-muted); font-size: 14px; margin-bottom: 32px; }
.login-error { color: var(--danger); font-size: 13px; margin: 8px 0; min-height: 20px; }

.logo-text { font-family: var(--font-display); font-size: 20px; font-weight: 700; letter-spacing: 3px; }
.logo-accent { font-family: var(--font-display); font-size: 20px; font-weight: 400; color: var(--accent); letter-spacing: 3px; }

/* Form elements */
.form-group { display: flex; flex-direction: column; gap: 6px; margin-bottom: 16px; text-align: left; }
.form-group label { font-size: 12px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; color: var(--text-secondary); }
.form-group input, .form-group select, .form-group textarea {
    padding: 12px 16px; background: var(--bg-tertiary); border: 1px solid var(--border);
    border-radius: var(--radius-sm); color: var(--text-primary); font-size: 14px; outline: none;
    transition: border-color 0.2s;
}
.form-group input:focus, .form-group select:focus { border-color: var(--accent); }
.form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

/* Buttons */
.btn { display: inline-flex; align-items: center; gap: 8px; padding: 12px 28px; font-size: 13px; font-weight: 500; letter-spacing: 1px; text-transform: uppercase; border: none; border-radius: var(--radius-sm); cursor: pointer; transition: all 0.2s; }
.btn-primary { background: var(--accent); color: var(--bg-primary); }
.btn-primary:hover { background: var(--accent-hover); }
.btn-full { width: 100%; justify-content: center; }

.btn-sm { padding: 6px 14px; font-size: 11px; border-radius: var(--radius-sm); border: 1px solid var(--border); background: transparent; color: var(--text-secondary); cursor: pointer; transition: all 0.2s; }
.btn-sm:hover { border-color: var(--accent); color: var(--accent); }
.btn-confirm { border-color: var(--success); color: var(--success); }
.btn-cancel { border-color: var(--danger); color: var(--danger); }
.btn-pay { border-color: var(--accent); color: var(--accent); }
.btn-complete { border-color: var(--info); color: var(--info); }

/* Dashboard layout */
.dashboard { display: flex; min-height: 100vh; }

.sidebar {
    width: 240px; background: var(--bg-secondary); border-right: 1px solid var(--border);
    display: flex; flex-direction: column; padding: 24px 0; position: fixed; height: 100vh;
}
.sidebar-logo { padding: 0 24px 24px; border-bottom: 1px solid var(--border); margin-bottom: 16px; }
.sidebar-nav { flex: 1; display: flex; flex-direction: column; gap: 4px; padding: 0 12px; }
.sidebar-link {
    display: flex; align-items: center; gap: 12px; padding: 12px 16px; font-size: 14px;
    color: var(--text-secondary); border: none; background: none; cursor: pointer; border-radius: var(--radius-sm);
    transition: all 0.2s; width: 100%; text-align: left;
}
.sidebar-link:hover { background: var(--bg-tertiary); color: var(--text-primary); }
.sidebar-link.active { background: rgba(201,169,110,0.1); color: var(--accent); }
.sidebar-link i { width: 20px; text-align: center; }
.sidebar-logout { margin: 0 12px; border-top: 1px solid var(--border); padding-top: 16px; }

.main-content { flex: 1; margin-left: 240px; padding: 32px; }

/* Tabs */
.tab-content { display: none; }
.tab-content.active { display: block; }

.page-title { font-family: var(--font-display); font-size: 24px; font-weight: 600; margin-bottom: 24px; }

/* Stats Grid */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 32px; }
.stat-card {
    background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md);
    padding: 24px; display: flex; align-items: center; gap: 16px;
}
.stat-icon {
    width: 48px; height: 48px; border-radius: 50%; display: flex; align-items: center; justify-content: center;
    background: rgba(201,169,110,0.1); color: var(--accent); font-size: 20px;
}
.stat-icon.confirmed { background: rgba(39,174,96,0.1); color: var(--success); }
.stat-icon.paid { background: rgba(52,152,219,0.1); color: var(--info); }
.stat-icon.messages { background: rgba(243,156,18,0.1); color: var(--warning); }
.stat-value { font-family: var(--font-display); font-size: 28px; font-weight: 700; display: block; }
.stat-label { font-size: 13px; color: var(--text-muted); }

/* Tables */
.data-table { width: 100%; border-collapse: collapse; }
.data-table th { font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: var(--text-muted); padding: 12px 16px; text-align: left; border-bottom: 1px solid var(--border); }
.data-table td { padding: 16px; border-bottom: 1px solid var(--border); font-size: 14px; vertical-align: top; }
.data-table tr:hover { background: var(--bg-card-hover); }
.actions-cell { white-space: nowrap; display: flex; gap: 6px; }

/* Status badges */
.status-badge { padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: 500; text-transform: uppercase; letter-spacing: 0.5px; }
.status-pending { background: rgba(243,156,18,0.15); color: var(--warning); }
.status-confirmed { background: rgba(39,174,96,0.15); color: var(--success); }
.status-deposit_paid { background: rgba(52,152,219,0.15); color: var(--info); }
.status-completed { background: rgba(201,169,110,0.15); color: var(--accent); }
.status-cancelled { background: rgba(231,76,60,0.15); color: var(--danger); }

/* Contacts */
.contacts-list { display: flex; flex-direction: column; gap: 12px; }
.contact-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-md); padding: 20px; }
.contact-card.unread { border-left: 3px solid var(--accent); }
.contact-header { display: flex; justify-content: space-between; margin-bottom: 8px; }
.contact-date { font-size: 12px; color: var(--text-muted); }
.contact-email { font-size: 13px; color: var(--text-secondary); margin-bottom: 4px; }
.contact-style { font-size: 13px; color: var(--accent); margin-bottom: 8px; }
.contact-message { font-size: 14px; color: var(--text-primary); line-height: 1.6; margin-bottom: 12px; }

/* Gallery admin */
.upload-area { margin-bottom: 32px; }
.upload-dropzone {
    border: 2px dashed var(--border-light); border-radius: var(--radius-md); padding: 48px;
    text-align: center; cursor: pointer; transition: all 0.2s; margin-bottom: 16px;
}
.upload-dropzone:hover, .upload-dropzone.dragover { border-color: var(--accent); background: rgba(201,169,110,0.05); }
.upload-dropzone i { font-size: 32px; color: var(--text-muted); margin-bottom: 12px; display: block; }
.upload-dropzone p { color: var(--text-secondary); font-size: 14px; }
.upload-fields { display: flex; gap: 12px; align-items: end; }
.upload-fields input, .upload-fields select { flex: 1; padding: 12px 16px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); }

.admin-gallery-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
.admin-gallery-item { position: relative; border-radius: var(--radius-md); overflow: hidden; background: var(--bg-card); border: 1px solid var(--border); }
.admin-gallery-item img { width: 100%; aspect-ratio: 1; object-fit: cover; }
.admin-gallery-info { padding: 12px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.admin-gallery-info .tag { font-size: 11px; padding: 2px 10px; border: 1px solid var(--border); border-radius: 20px; color: var(--text-muted); }

/* Slots */
.slots-form-card { background: var(--bg-card); border: 1px solid var(--border); border-radius: var(--radius-lg); padding: 32px; max-width: 700px; }
.slots-form-card h3 { font-family: var(--font-display); font-size: 18px; margin-bottom: 20px; }
.days-checkboxes { display: flex; gap: 12px; flex-wrap: wrap; }
.days-checkboxes label { display: flex; align-items: center; gap: 6px; font-size: 14px; color: var(--text-secondary); cursor: pointer; }
.days-checkboxes input[type="checkbox"] { accent-color: var(--accent); }

/* Filter bar */
.filter-bar { margin-bottom: 20px; }
.filter-bar select { padding: 10px 16px; background: var(--bg-tertiary); border: 1px solid var(--border); border-radius: var(--radius-sm); color: var(--text-primary); font-size: 14px; }

/* Empty state */
.empty-state { text-align: center; padding: 48px; color: var(--text-muted); font-size: 14px; }

/* Responsive */
@media (max-width: 768px) {
    .sidebar { width: 60px; padding: 16px 0; }
    .sidebar-link span, .sidebar-logo .logo-text, .sidebar-logo .logo-accent { display: none; }
    .sidebar-link { justify-content: center; padding: 12px; }
    .main-content { margin-left: 60px; padding: 16px; }
    .stats-grid { grid-template-columns: repeat(2, 1fr); }
    .admin-gallery-grid { grid-template-columns: repeat(2, 1fr); }
    .form-row { grid-template-columns: 1fr; }
    .upload-fields { flex-direction: column; }
}
```

---

## 8. Frontend Integration Changes

These changes modify the existing frontend files to call the backend API instead of using hardcoded data.

### 8.1 Add API Config to `index.html`

**Location:** In `index.html`, BEFORE line 652 (`<script src="js/main.js">`), add:

```html
    <!-- API Configuration -->
    <script>
        // Change this to your backend URL in production
        const API_BASE = 'http://localhost:8000';
        // Change to: const API_BASE = 'https://api.kevinstattoo.com';
    </script>
```

### 8.2 Replace Contact Form Handler in `js/main.js`

**Replace** the entire `initContactForm()` function (lines 198-247 in `js/main.js`) with:

```javascript
/* === CONTACT FORM — API SUBMISSION === */
function initContactForm() {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const name = form.querySelector('#name');
        const email = form.querySelector('#email');
        const phone = form.querySelector('#phone');
        const style = form.querySelector('#style');
        const message = form.querySelector('#message');
        let isValid = true;

        [name, email, message].forEach(field => { field.style.borderColor = ''; });

        if (!name.value.trim()) { name.style.borderColor = '#e74c3c'; isValid = false; }
        if (!email.value.trim() || !isValidEmail(email.value)) { email.style.borderColor = '#e74c3c'; isValid = false; }
        if (!message.value.trim()) { message.style.borderColor = '#e74c3c'; isValid = false; }

        if (!isValid) return;

        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<span>Sending...</span> <i class="fas fa-spinner fa-spin"></i>';
        submitBtn.disabled = true;

        try {
            const response = await fetch(`${API_BASE}/api/contact`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: name.value.trim(),
                    email: email.value.trim(),
                    phone: phone.value.trim(),
                    style: style.value,
                    message: message.value.trim(),
                }),
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.detail || 'Failed to send message');
            }

            submitBtn.innerHTML = '<span>Message Sent!</span> <i class="fas fa-check"></i>';
            submitBtn.style.background = '#27ae60';
            form.reset();

            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.style.background = '';
                submitBtn.disabled = false;
            }, 3000);
        } catch (error) {
            submitBtn.innerHTML = '<span>Error — Try Again</span> <i class="fas fa-exclamation-triangle"></i>';
            submitBtn.style.background = '#e74c3c';
            submitBtn.disabled = false;

            setTimeout(() => {
                submitBtn.innerHTML = originalText;
                submitBtn.style.background = '';
            }, 3000);
        }
    });
}
```

### 8.3 Dynamic Gallery Loading in `js/main.js`

**Add this new function** at the end of `js/main.js`, and call it from the `DOMContentLoaded` handler (add `loadGalleryFromAPI();` after `initContactForm();` on line 21):

```javascript
/* === DYNAMIC GALLERY LOADING === */
async function loadGalleryFromAPI() {
    try {
        const response = await fetch(`${API_BASE}/api/gallery`);
        if (!response.ok) return; // Fall back to hardcoded HTML gallery
        const images = await response.json();
        if (images.length === 0) return; // Keep hardcoded gallery if DB is empty

        const grid = document.querySelector('.gallery-grid');
        grid.innerHTML = ''; // Clear hardcoded images

        images.forEach((img, index) => {
            const imgUrl = img.image_url.startsWith('http') ? img.image_url : `${API_BASE}${img.image_url}`;
            const item = document.createElement('div');
            item.className = 'gallery-item';
            item.dataset.category = img.category;
            item.setAttribute('data-aos', 'fade-up');
            item.setAttribute('data-aos-delay', String((index % 3) * 50 + 100));
            item.innerHTML = `
                <img src="${imgUrl}" alt="${img.title}" loading="lazy">
                <div class="gallery-overlay">
                    <span class="gallery-category">${img.category.charAt(0).toUpperCase() + img.category.slice(1)}</span>
                    <h3>${img.title}</h3>
                    <button class="gallery-zoom"><i class="fas fa-expand"></i></button>
                </div>
            `;
            grid.appendChild(item);
        });

        // Re-initialize gallery filter and lightbox for the new elements
        initGalleryFilter();
        if (typeof initLightbox === 'function') initLightbox();
        AOS.refresh();
    } catch (err) {
        console.log('Gallery API unavailable, using static gallery.');
    }
}
```

### 8.4 Re-export `initLightbox` for Re-initialization

In `js/lightbox.js`, the `initLightbox` function is currently called once on `DOMContentLoaded`. To allow re-initialization after dynamic gallery load, move it to the global scope.

**Change line 6-8 in `js/lightbox.js` FROM:**
```javascript
document.addEventListener('DOMContentLoaded', () => {
    initLightbox();
});
```

**TO:**
```javascript
document.addEventListener('DOMContentLoaded', () => {
    initLightbox();
});

// Make initLightbox available globally so it can be called after dynamic gallery load
window.initLightbox = initLightbox;
```

Wait — `initLightbox` is already a named function declared in the outer scope, so it IS globally accessible. No change needed. However, calling it a second time would add duplicate event listeners. To fix this, the function should remove existing listeners before re-adding. A simpler approach: use event delegation.

**Replace the event listener section** (lines 90-97 in `js/lightbox.js`) with this event delegation approach:

```javascript
    // Event delegation — works even after gallery items are dynamically replaced
    document.querySelector('.gallery-grid').addEventListener('click', (e) => {
        const item = e.target.closest('.gallery-item');
        if (!item) return;
        const visItems = getVisibleItems();
        const visIndex = visItems.indexOf(item);
        openLightbox(visIndex >= 0 ? visIndex : 0);
    });
```

And remove the original `galleryItems.forEach(...)` block.

Also update `getVisibleItems()` to query fresh DOM elements instead of using the stale `galleryItems` NodeList:

**Change the `getVisibleItems` function (line 22-24) to:**
```javascript
    function getVisibleItems() {
        return Array.from(document.querySelectorAll('.gallery-item:not(.hidden)'));
    }
```

And **remove** line 18 (`const galleryItems = document.querySelectorAll('.gallery-item');`) since it's no longer used.

---

## 9. Deployment

### 9.1 Buy Domain

1. Go to https://dash.cloudflare.com → "Registrar" → "Register Domain"
2. Search for `kevinstattoo.com` (or your preferred domain)
3. Purchase (~$10.11/year for .com)

### 9.2 Deploy Frontend to Cloudflare Pages

1. Push code to GitHub (the entire `kevin_tatto/` repo)
2. Go to Cloudflare Dashboard → Pages → "Create a project"
3. Connect your GitHub account and select the repository
4. Build settings:
   - **Build command:** leave empty (no build step — plain HTML)
   - **Build output directory:** `/` (root of the repo)
5. Click "Save and Deploy"
6. After deploy, go to "Custom Domains" → add `kevinstattoo.com`
7. Cloudflare will automatically configure DNS and SSL

**Change the `API_BASE` in the deployed `index.html`:**  
Edit the `<script>` tag to point to production: `const API_BASE = 'https://api.kevinstattoo.com';`

The same change is needed in `admin/js/admin.js` line 8.

### 9.3 Deploy Backend to Render

1. Go to https://render.com → "New" → "Web Service"
2. Connect GitHub repo, set root directory to `backend/`
3. Settings:
   - **Name:** `kevins-tattoo-api`
   - **Runtime:** Python 3
   - **Build command:** `pip install -r requirements.txt`
   - **Start command:** `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Starter ($7/month)
4. Add a **Persistent Disk:**
   - Mount path: `/data`
   - Size: 1 GB
   
   Then update `DATABASE_URL` env var to `sqlite:////data/studio.db` (4 slashes — absolute path)
5. Add **Environment Variables** (copy values from your `.env`):
   - `SECRET_KEY`
   - `ENVIRONMENT` = `production`
   - `FRONTEND_URL` = `https://kevinstattoo.com`
   - `BACKEND_URL` = `https://api.kevinstattoo.com`
   - `DATABASE_URL` = `sqlite:////data/studio.db`
   - `ADMIN_USERNAME`
   - `ADMIN_PASSWORD`
   - `STRIPE_SECRET_KEY` (use LIVE key only when ready)
   - `STRIPE_PUBLISHABLE_KEY`
   - `STRIPE_WEBHOOK_SECRET`
   - `RESEND_API_KEY`
   - `ADMIN_EMAIL`
   - `DEPOSIT_PERCENTAGE` = `30`
6. Click "Create Web Service"
7. After deploy, go to Settings → Custom Domain → add `api.kevinstattoo.com`
8. In Cloudflare DNS, add a CNAME record: `api` → `kevins-tattoo-api.onrender.com`

### 9.4 Configure Stripe Webhook (Production)

1. Go to Stripe Dashboard → Developers → Webhooks
2. Click "Add endpoint"
3. Endpoint URL: `https://api.kevinstattoo.com/api/payment/webhook`
4. Events to listen for: `checkout.session.completed`
5. Copy the signing secret → update `STRIPE_WEBHOOK_SECRET` env var on Render

### 9.5 Configure Resend (Production)

1. Go to Resend Dashboard → Domains → "Add Domain"
2. Add your domain (e.g., `kevinstattoo.com`)
3. Add the DNS records Resend shows you (MX, TXT for SPF/DKIM) in Cloudflare DNS
4. Wait for verification (usually a few minutes)
5. Now emails will send from `noreply@kevinstattoo.com` instead of `@resend.dev`

### 9.6 File: `backend/Dockerfile` (for Render)

```dockerfile
FROM python:3.12-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Create data directory for SQLite and uploads
RUN mkdir -p /data/uploads

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

Note: Render can auto-detect Python and may not need a Dockerfile. The Dockerfile is provided as a fallback if auto-detection fails.

### 9.7 File: `.gitignore` (project root)

```
__pycache__/
*.py[cod]
backend/.env
backend/data/studio.db
backend/data/uploads/*
!backend/data/uploads/.gitkeep
.venv/
venv/
node_modules/
.DS_Store
```

---

## 10. Verification Checklists

### Phase 2A Checklist
- [ ] `pip install -r requirements.txt` succeeds with no errors
- [ ] `uvicorn main:app --reload --port 8000` starts without errors
- [ ] `GET /api/health` returns `{"status": "ok"}`
- [ ] `backend/data/studio.db` file is created on first startup
- [ ] `POST /api/admin/login` with correct credentials returns a JWT token
- [ ] `POST /api/admin/login` with wrong password returns 401
- [ ] `POST /api/contact` saves to DB (verify by checking SQLite)
- [ ] `GET /api/gallery` returns empty array
- [ ] `POST /api/admin/gallery` with image file + auth token uploads successfully
- [ ] `GET /api/gallery` returns the uploaded image
- [ ] `DELETE /api/admin/gallery/{id}` removes the image
- [ ] CORS allows requests from `http://localhost:8080`
- [ ] Frontend contact form submits to API and shows success/error

### Phase 2B Checklist
- [ ] `POST /api/admin/slots` creates time slots for a date
- [ ] `POST /api/admin/slots/bulk` creates slots for a date range
- [ ] `GET /api/slots/dates?month=YYYY-MM` returns dates with open slots
- [ ] `GET /api/slots?date=YYYY-MM-DD` returns available slots for that date
- [ ] `POST /api/book` creates a booking and marks slot as booked
- [ ] `POST /api/book` with an already-booked slot returns 409
- [ ] `GET /api/admin/bookings` lists all bookings
- [ ] `PATCH /api/admin/bookings/{id}` with status "confirmed" + estimated_price calculates deposit_amount
- [ ] `PATCH /api/admin/bookings/{id}` with status "cancelled" frees the slot (is_booked = False)

### Phase 2C Checklist
- [ ] Stripe test keys are set in `.env`
- [ ] `POST /api/admin/payment/create-session` returns a Stripe Checkout URL
- [ ] Opening the URL shows Stripe's payment page
- [ ] Paying with test card `4242 4242 4242 4242` succeeds
- [ ] Webhook fires and updates booking status to "deposit_paid"
- [ ] Booking now has a `stripe_payment_id` value

### Phase 2D Checklist
- [ ] Admin dashboard login page loads at `/admin/`
- [ ] Login with correct credentials shows dashboard
- [ ] Overview tab shows correct stats
- [ ] Bookings tab lists bookings with action buttons
- [ ] Confirm, Cancel, Send Deposit Link, Mark Complete buttons work
- [ ] Contacts tab shows messages with "Mark as Read" button
- [ ] Gallery tab allows image upload via drag & drop or click
- [ ] Gallery tab shows uploaded images with delete button
- [ ] Time Slots tab creates bulk slots successfully
- [ ] Frontend gallery loads dynamically from API (or falls back to static)
- [ ] Frontend contact form posts to API

### Production Deployment Checklist
- [ ] Domain purchased and DNS configured
- [ ] Cloudflare Pages deploys successfully
- [ ] `kevinstattoo.com` loads the frontend with HTTPS
- [ ] Render deploys backend successfully
- [ ] `api.kevinstattoo.com/api/health` returns `{"status": "ok"}`
- [ ] CORS allows `kevinstattoo.com` origin
- [ ] Admin login works on production
- [ ] Stripe webhook endpoint configured in Stripe Dashboard
- [ ] Resend domain verified and emails send from custom domain
- [ ] `API_BASE` updated to production URL in both `index.html` and `admin/js/admin.js`
- [ ] `.env` values are set as env vars on Render (not committed to Git)
- [ ] Render persistent disk is mounted at `/data`
- [ ] `DATABASE_URL` uses absolute path `sqlite:////data/studio.db`
