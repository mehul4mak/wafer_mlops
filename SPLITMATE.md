# SplitMate – Shared Expense & Responsibility Platform

> A production-ready MVP: smarter alternative to Splitwise with task ownership and payment proof.

---

## Architecture Overview

```
splitmate/
├── backend/          # FastAPI + Supabase (Python)
├── frontend/         # Next.js 14 App Router (TypeScript)
└── mobile/           # Expo + React Native (TypeScript)
```

**Stack:**
| Layer | Technology | Hosting |
|-------|-----------|---------|
| API | FastAPI | Railway / Render (free tier) |
| Database | Supabase PostgreSQL | Supabase free tier |
| Auth | Supabase Auth | Supabase free tier |
| File Storage | Supabase Storage | Supabase free tier |
| Web Frontend | Next.js 14 | Vercel free tier |
| Mobile | Expo | Expo free workflow |
| Email | Resend | Resend free tier (3k/mo) |
| Monitoring | Sentry | Sentry free tier |

---

## Database Schema

```
profiles          ← extends auth.users
groups            ← trip / flatmate / project / event / wedding / office / family / custom
group_members     ← owner / admin / member roles
expenses          ← amount, payer, split_type, category, receipt_url
expense_splits    ← per-user split amounts, is_settled
settlements       ← payer → payee, status, proof_url
payment_proofs    ← file uploads for receipts and proof
tasks             ← linked to expense optionally, assigned_to, due_date, status
notifications     ← in-app + email notifications
```

All tables have Row-Level Security (RLS) policies.

---

## API Endpoints

```
POST   /api/v1/auth/register
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
PATCH  /api/v1/auth/me
POST   /api/v1/auth/me/avatar

GET    /api/v1/groups
POST   /api/v1/groups
POST   /api/v1/groups/join
GET    /api/v1/groups/{id}
PATCH  /api/v1/groups/{id}
DELETE /api/v1/groups/{id}
GET    /api/v1/groups/{id}/members
DELETE /api/v1/groups/{id}/members/{user_id}

GET    /api/v1/groups/{id}/expenses
POST   /api/v1/groups/{id}/expenses
GET    /api/v1/groups/{id}/expenses/{expense_id}
PATCH  /api/v1/groups/{id}/expenses/{expense_id}
DELETE /api/v1/groups/{id}/expenses/{expense_id}
POST   /api/v1/groups/{id}/expenses/{expense_id}/settle
POST   /api/v1/groups/{id}/expenses/{expense_id}/receipt

POST   /api/v1/settlements
GET    /api/v1/groups/{id}/settlements
GET    /api/v1/settlements/{id}
PATCH  /api/v1/settlements/{id}
POST   /api/v1/settlements/{id}/proof
GET    /api/v1/groups/{id}/balances
GET    /api/v1/groups/{id}/debts         ← simplified debt algorithm

GET    /api/v1/groups/{id}/tasks
POST   /api/v1/groups/{id}/tasks
GET    /api/v1/groups/{id}/tasks/{task_id}
PATCH  /api/v1/groups/{id}/tasks/{task_id}
DELETE /api/v1/groups/{id}/tasks/{task_id}

GET    /api/v1/notifications
POST   /api/v1/notifications/read
POST   /api/v1/notifications/read-all
GET    /api/v1/notifications/count

GET    /api/v1/dashboard
```

---

## Settlement Algorithm

Uses a **greedy debt simplification** algorithm (O(n log n)):

1. Compute net balance per member: `paid - owed`
2. Sort creditors (positive balance) and debtors (negative balance)
3. Greedily match: debtor pays creditor `min(debt, credit)`
4. Minimizes the number of transactions needed

This is the same approach used by Splitwise but implemented from scratch.

---

## Quickstart

### Backend

```bash
cd backend
cp .env.example .env        # Fill in your Supabase credentials
pip install -r requirements.txt
uvicorn app.main:app --reload
# API docs at http://localhost:8000/docs
```

### Database

Run `supabase/migrations/001_initial_schema.sql` in your Supabase SQL editor.
Create a storage bucket named `splitmate-files` (public).

### Frontend

```bash
cd frontend
cp .env.example .env.local   # Fill in Supabase + API URL
npm install
npm run dev
# Opens at http://localhost:3000
```

### Mobile

```bash
cd mobile
cp .env.example .env
npm install
npx expo start
# Scan QR with Expo Go app
```

---

## MVP Roadmap

### Week 1: Core (done ✅)
- [x] Auth (register, login, JWT)
- [x] Group creation with invite codes
- [x] Expense creation (equal / exact / percentage splits)
- [x] Settlement engine with debt simplification
- [x] Task/responsibility layer linked to expenses
- [x] File upload (receipts + payment proofs)
- [x] Dashboard with monthly analytics
- [x] In-app notifications
- [x] Next.js web frontend
- [x] Expo mobile app

### Week 2: Polish
- [ ] Email notifications via Resend
- [ ] Push notifications (Expo)
- [ ] Receipt OCR (Google Vision API)
- [ ] Group image upload
- [ ] Export to CSV / PDF

### Week 3: Growth
- [ ] Social proof / share group expense summary
- [ ] QR code invite links
- [ ] Recurring expenses
- [ ] Multi-currency with live conversion
- [ ] Google OAuth

### Week 4: Monetize
- [ ] Stripe integration for premium plans
- [ ] Analytics for group owners
- [ ] Bulk expense import
- [ ] API access for integrations

---

## Monetization

| Plan | Price | Features |
|------|-------|----------|
| Free | $0 | 3 groups, 50 expenses/mo, basic splits |
| Pro | $4.99/mo | Unlimited groups, receipt OCR, PDF export |
| Team | $12/mo | Priority support, analytics, API access |

---

## Investor Angle

**Market:** Splitwise has 50M+ users but hasn't innovated since 2014. The TAM for shared finance tools is $2B+.

**Differentiation:**
1. **Task ownership** — no competitor combines expense + responsibility tracking
2. **Payment proof** — builds trust, reduces disputes
3. **API-first** — can be embedded by fintechs, banks, travel apps
4. **AI-ready** — FastAPI backend can add expense categorization, fraud detection, smart reminders
5. **Mobile-first** — Expo enables iOS + Android from one codebase with 90% cost savings

**Path to scale:**
- 0-10k users: free tier, viral invite links
- 10k-100k: Pro tier, content marketing, ProductHunt
- 100k+: Team/Enterprise tier, bank integrations, white-label API
