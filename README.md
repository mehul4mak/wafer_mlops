# SplitMate

A production-ready MVP full-stack application — a smarter alternative to Splitwise that combines **expense tracking**, **task/responsibility ownership**, and **payment proof** in one platform.

Supports: Trips · Flatmates · Projects · Startup teams · Families · Events · Weddings · Office teams

---

## What's inside

```
wafer_mlops/
├── backend/          # FastAPI REST API (Python 3.12)
├── frontend/         # Next.js 14 web app (TypeScript)
├── mobile/           # Expo React Native app (TypeScript)
└── SPLITMATE.md      # Architecture, API reference, roadmap
```

---

## Tech stack

| Layer | Technology | Free hosting |
|-------|-----------|-------------|
| API | FastAPI + Uvicorn | Railway / Render |
| Database | Supabase PostgreSQL | Supabase free tier |
| Auth | Supabase Auth (JWT) | Supabase free tier |
| File Storage | Supabase Storage | Supabase free tier |
| Web | Next.js 14 App Router | Vercel free tier |
| Mobile | Expo (iOS + Android) | Expo free workflow |
| Email | Resend | 3,000 emails/mo free |
| Monitoring | Sentry | Sentry free tier |

---

## Prerequisites

Make sure you have these installed before starting:

- **Python 3.12+** — [python.org](https://python.org)
- **Node.js 20+** — [nodejs.org](https://nodejs.org)
- **npm 10+** — comes with Node
- **Git** — [git-scm.com](https://git-scm.com)
- **Expo Go app** on your phone (for mobile) — App Store / Play Store

You also need a free **Supabase** account:
- Sign up at [supabase.com](https://supabase.com)
- Create a new project (any region, remember the database password)
- Wait ~2 minutes for the project to provision

---

## Step 1 — Set up Supabase

### 1a. Run the database migration

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New query**
4. Copy the entire contents of `backend/supabase/migrations/001_initial_schema.sql`
5. Paste it into the editor and click **Run**

This creates all 9 tables, RLS policies, triggers, and the `group_balances` view.

### 1b. Create storage bucket

1. Click **Storage** in the left sidebar
2. Click **New bucket**
3. Name it `splitmate-files`
4. Check **Public bucket** (so uploaded receipts are viewable)
5. Click **Save**

### 1c. Get your credentials

From your Supabase project dashboard go to **Settings → API**. You need:

| Value | Where to find it |
|-------|-----------------|
| `SUPABASE_URL` | Project URL (e.g. `https://abcdef.supabase.co`) |
| `SUPABASE_ANON_KEY` | `anon` `public` key |
| `SUPABASE_SERVICE_KEY` | `service_role` `secret` key (keep this private) |
| `JWT_SECRET` | Settings → API → JWT Settings → JWT Secret |

---

## Step 2 — Run the backend

```bash
cd backend

# Copy the example env file
cp .env.example .env
```

Open `.env` and fill in the values:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIs...   # service_role key
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...      # anon key
JWT_SECRET=your-jwt-secret-from-supabase
APP_ENV=development
CORS_ORIGINS=http://localhost:3000,http://localhost:19006
RESEND_API_KEY=                                  # optional — leave blank for now
FROM_EMAIL=noreply@yourdomain.com
SENTRY_DSN=                                      # optional — leave blank for now
STORAGE_BUCKET=splitmate-files
```

Install dependencies and start:

```bash
# Create a virtual environment (recommended)
python -m venv venv
source venv/bin/activate        # Mac/Linux
# venv\Scripts\activate         # Windows

pip install -r requirements.txt

uvicorn app.main:app --reload --port 8000
```

The API is now running at **http://localhost:8000**

- Interactive docs (Swagger): http://localhost:8000/docs
- Health check: http://localhost:8000/health

---

## Step 3 — Run the frontend

```bash
cd frontend

# Copy the example env file
cp .env.example .env.local
```

Open `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

Install and run:

```bash
npm install
npm run dev
```

The web app is now running at **http://localhost:3000**

| Page | URL |
|------|-----|
| Landing | http://localhost:3000 |
| Register | http://localhost:3000/register |
| Login | http://localhost:3000/login |
| Dashboard | http://localhost:3000/dashboard |
| Groups | http://localhost:3000/groups |

---

## Step 4 — Run the mobile app

```bash
cd mobile

# Copy the example env file
cp .env.example .env
```

Open `.env` and fill in:

```env
EXPO_PUBLIC_API_URL=http://YOUR_LOCAL_IP:8000/api/v1
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

> **Important:** Replace `YOUR_LOCAL_IP` with your machine's local IP address (e.g. `192.168.1.10`), not `localhost`. Your phone needs to reach your laptop on the same Wi-Fi network.
>
> Find your IP: `ipconfig` (Windows) or `ifconfig` / `ip addr` (Mac/Linux)

Install and run:

```bash
npm install
npx expo start
```

Scan the QR code with:
- **iOS** — the Camera app
- **Android** — the Expo Go app

---

## Project structure walkthrough

### Backend (`backend/`)

```
backend/
├── app/
│   ├── main.py                  # FastAPI app, CORS, Sentry, routes
│   ├── core/
│   │   ├── config.py            # All env vars via pydantic-settings
│   │   ├── database.py          # Supabase client singleton
│   │   ├── security.py          # JWT decode / verify
│   │   └── dependencies.py      # FastAPI Depends: get_current_user_id, get_db
│   ├── schemas/                 # Pydantic request/response models
│   │   ├── auth.py
│   │   ├── groups.py
│   │   ├── expenses.py
│   │   ├── settlements.py
│   │   ├── tasks.py
│   │   ├── notifications.py
│   │   └── dashboard.py
│   ├── services/                # Business logic (no HTTP here)
│   │   ├── auth_service.py      # Register, login, profile
│   │   ├── group_service.py     # CRUD, invite codes, roles
│   │   ├── expense_service.py   # Splitting logic (equal/exact/percentage)
│   │   ├── settlement_service.py # Debt simplification algorithm
│   │   ├── task_service.py      # Task lifecycle
│   │   ├── notification_service.py
│   │   ├── storage_service.py   # File uploads to Supabase Storage
│   │   └── dashboard_service.py # Analytics aggregation
│   └── api/v1/                  # Route handlers (thin — delegates to services)
│       ├── auth.py
│       ├── groups.py
│       ├── expenses.py
│       ├── settlements.py
│       ├── tasks.py
│       ├── notifications.py
│       ├── dashboard.py
│       └── router.py            # Assembles all routers under /api/v1
└── supabase/migrations/
    └── 001_initial_schema.sql   # Full DB schema — run this in Supabase
```

### Frontend (`frontend/`)

```
frontend/src/
├── app/
│   ├── layout.tsx               # Root layout (font, providers)
│   ├── page.tsx                 # Landing page
│   ├── providers.tsx            # React Query + Toast provider
│   ├── (auth)/
│   │   ├── login/page.tsx       # Login form
│   │   └── register/page.tsx    # Register form
│   └── (dashboard)/
│       ├── layout.tsx           # Auth guard + Sidebar + Header
│       ├── dashboard/page.tsx   # Overview: balances, chart, activity
│       ├── groups/
│       │   ├── page.tsx         # Groups list
│       │   └── [id]/page.tsx    # Group detail: Expenses/Balances/Settlements/Tasks tabs
│       ├── notifications/page.tsx
│       └── profile/page.tsx
├── components/
│   ├── layout/
│   │   ├── Sidebar.tsx          # Nav sidebar
│   │   └── Header.tsx           # Top bar with notification badge
│   ├── groups/
│   │   ├── CreateGroupModal.tsx # Create group with type picker
│   │   └── JoinGroupModal.tsx   # Join by invite code
│   ├── expenses/
│   │   └── AddExpenseModal.tsx  # Full expense form (split types + optional task)
│   ├── settlements/
│   │   └── SettlementCard.tsx   # Confirm/view settlement
│   └── tasks/
│       └── TaskCard.tsx         # Click to cycle task status
├── lib/
│   ├── api.ts                   # Axios client + all API calls (auto token refresh)
│   ├── supabase.ts              # Supabase browser client
│   └── utils.ts                 # formatCurrency, formatDate, getInitials, etc.
├── store/
│   └── auth.ts                  # Zustand auth store (persisted)
└── types/
    └── index.ts                 # All shared TypeScript types
```

### Mobile (`mobile/`)

```
mobile/
├── app/
│   ├── _layout.tsx              # Root: QueryClient + PaperProvider + auth check
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx          # Bottom tab bar
│   │   ├── index.tsx            # Dashboard tab
│   │   ├── groups.tsx           # Groups list tab
│   │   ├── activity.tsx         # Notifications tab
│   │   └── profile.tsx          # Profile + logout tab
│   └── group/
│       └── [id].tsx             # Group detail: Expenses/Balances/Tasks
└── src/
    ├── lib/api.ts               # Axios + SecureStore token handling
    ├── store/auth.ts            # Zustand auth store
    └── types/index.ts           # Shared types
```

---

## Features built

| Feature | Backend | Web | Mobile |
|---------|---------|-----|--------|
| Email + password auth | ✅ | ✅ | ✅ |
| User profile management | ✅ | ✅ | ✅ |
| Create groups (8 types) | ✅ | ✅ | ✅ |
| Join group via invite code | ✅ | ✅ | ✅ |
| Owner / admin / member roles | ✅ | ✅ | — |
| Add expenses | ✅ | ✅ | — |
| Equal split | ✅ | ✅ | — |
| Exact amount split | ✅ | ✅ | — |
| Percentage split | ✅ | ✅ | — |
| Upload receipt photo | ✅ | ✅ | — |
| Linked task on expense | ✅ | ✅ | — |
| Task assignment + due date | ✅ | ✅ | ✅ |
| Task status lifecycle | ✅ | ✅ | ✅ |
| Overdue task highlighting | ✅ | ✅ | ✅ |
| Settlement engine | ✅ | ✅ | ✅ |
| Debt simplification | ✅ | ✅ | ✅ |
| Upload payment proof | ✅ | ✅ | — |
| Confirm settlement | ✅ | ✅ | ✅ |
| In-app notifications | ✅ | ✅ | ✅ |
| Dashboard analytics | ✅ | ✅ | ✅ |
| Monthly spending chart | ✅ | ✅ | — |
| JWT auto-refresh | ✅ | ✅ | ✅ |
| Row-level security (DB) | ✅ | — | — |

---

## Running with Docker (backend only)

```bash
cd backend
cp .env.example .env   # fill in values
docker-compose up --build
```

API available at http://localhost:8000

---

## Useful commands

```bash
# Backend — type check / lint
cd backend && python -m py_compile app/main.py

# Frontend — type check
cd frontend && npm run type-check

# Frontend — lint
cd frontend && npm run lint

# Mobile — check for issues
cd mobile && npx expo-doctor
```

---

## What's next (Week 2+)

- [ ] Email notifications (Resend is wired, just needs API key)
- [ ] Google OAuth login
- [ ] Receipt OCR (auto-fill amount from photo)
- [ ] Push notifications via Expo
- [ ] Export group expenses to CSV / PDF
- [ ] QR code invite links
- [ ] Recurring expenses
- [ ] Multi-currency with live FX rates
- [ ] Stripe billing for Pro plan

See `SPLITMATE.md` for the full roadmap, API reference, monetization plan, and investor brief.

---

## Environment variables reference

### Backend `.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Your Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | service_role key (never expose publicly) |
| `SUPABASE_ANON_KEY` | Yes | anon key |
| `JWT_SECRET` | Yes | JWT secret from Supabase dashboard |
| `APP_ENV` | No | `development` or `production` |
| `CORS_ORIGINS` | No | Comma-separated allowed origins |
| `RESEND_API_KEY` | No | For email notifications |
| `SENTRY_DSN` | No | For error tracking |
| `STORAGE_BUCKET` | No | Supabase bucket name (default: `splitmate-files`) |

### Frontend `.env.local`

| Variable | Required | Description |
|----------|----------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | anon key |
| `NEXT_PUBLIC_API_URL` | Yes | Backend URL (e.g. `http://localhost:8000/api/v1`) |

### Mobile `.env`

| Variable | Required | Description |
|----------|----------|-------------|
| `EXPO_PUBLIC_API_URL` | Yes | Backend URL — use your local IP, not localhost |
| `EXPO_PUBLIC_SUPABASE_URL` | Yes | Your Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Yes | anon key |
