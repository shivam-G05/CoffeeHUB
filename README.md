# CoffeeHub

Multi-vendor coffee marketplace and B2B sourcing platform: buyers discover
products and verified suppliers, vendors onboard, get verified and sell, and
B2B buyers post requirements (RFQs) and compare supplier quotes. Built to the
Phase 1 Developer PRD (React + Vite frontend, Spring Boot backend, PostgreSQL,
JWT auth). The platform name shown in the UI is a setting, not a constant.

## Stack

| Layer     | Technology                                   |
| --------- | --------------------------------------------- |
| Frontend  | React 19 + Vite + TypeScript + Tailwind CSS 4, React Router, Axios, Framer Motion, Recharts |
| Backend   | Java 17 + Spring Boot 3 (Web, Security, Data JPA) |
| Database  | PostgreSQL 16                                 |
| Auth      | JWT (stateless), BCrypt password hashing, role-based access |

## Project structure

```
CoffeeHub/
├── backend/          Spring Boot API (Dockerized — no local Java/Maven needed)
├── frontend/          React + Vite SPA
├── docker-compose.yml  Postgres + backend, for local dev
└── .env.example        Copy to .env before running docker compose
```

## Running locally

You need **Docker** (for Postgres + the backend API) and **Node.js 18+**
(for the frontend dev server). Java/Maven are not required on your machine —
the backend builds inside its Docker image.

### 1. Backend + database

```bash
cp .env.example .env      # adjust values if you want, defaults work for local dev
docker compose up --build
```

This starts:
- **PostgreSQL** on `localhost:5432`
- **Spring Boot API** on `http://localhost:8080`

On first boot the backend auto-creates an admin account (from `.env`):
- Email: `admin@coffeehub.in`
- Password: `Admin@12345`

### 2. Frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env.local   # VITE_API_BASE_URL=http://localhost:8080
npm install
npm run dev
```

Open **http://localhost:5173**.

- Register as a buyer at `/register` or as a seller at `/register/seller`.
- Log in as the seeded admin to reach `/admin`. A seller must upload documents
  and be approved under **Vendor Verification** before they can submit
  products, and each product must be approved under **Product Moderation**
  before it is public.
- Without SMTP configured, emails (password reset links, notifications) are
  written to the backend log: `docker compose logs backend`.

## Environment variables

### Root `.env` (used by `docker-compose.yml`)

| Variable              | Purpose                                              | Local default |
| ---------------------- | ----------------------------------------------------- | -------------- |
| `POSTGRES_DB`          | Database name                                         | `coffeehub` |
| `POSTGRES_USER`        | Database user                                         | `coffeehub` |
| `POSTGRES_PASSWORD`    | Database password                                     | `coffeehub` |
| `JWT_SECRET`           | Signing key for auth tokens — **must** be a long random string in any shared/deployed environment | dev placeholder |
| `JWT_EXPIRATION_MS`    | Token lifetime in ms                                  | `86400000` (24h) |
| `FRONTEND_URL`         | Allowed CORS origin(s), comma-separated               | `http://localhost:5173` |
| `ADMIN_SEED_EMAIL`     | Auto-created admin account email                      | `admin@coffeehub.in` |
| `ADMIN_SEED_PASSWORD`  | Auto-created admin account password                   | `Admin@12345` |
| `SEED_ADMIN`           | Set `false` to skip auto-creating the admin account    | `true` |
| `JPA_DDL_AUTO`         | Hibernate schema strategy (`update` for dev)           | `update` |
| `APP_PUBLIC_URL`       | Frontend base URL used in links inside emails          | `http://localhost:5173` |
| `PAYMENTS_MOCK_ENABLED`| Enables the simulated "pay online" method. **Keep `false` in production** until a real gateway is integrated | `true` in docker-compose, `false` otherwise |
| `SPRING_MAIL_HOST` / `_PORT` / `_USERNAME` / `_PASSWORD` | SMTP server for real email delivery (optional) | unset: emails are logged |
| `MAIL_FROM`            | From address for emails                               | `no-reply@coffeehub.local` |

### `frontend/.env.local`

| Variable               | Purpose                          |
| ----------------------- | --------------------------------- |
| `VITE_API_BASE_URL`     | Base URL of the backend API       |

## What's implemented (Phase 1 PRD)

**Roles** (enforced server-side): Guest, Buyer (`CUSTOMER`), Vendor (`SELLER`), Admin.

- **Auth**: separate buyer and seller registration, login with email or
  mobile, forgot/reset password, email verification, login history, rate
  limiting on auth endpoints.
- **Vendor onboarding**: business profile, document upload (GST, PAN, FSSAI,
  company registration, IEC, bank proof, address proof, certifications), bank
  details, status model `DRAFT -> PENDING_VERIFICATION -> UNDER_REVIEW ->
  APPROVED / REJECTED / SUSPENDED`. Only approved vendors can sell; the
  "Verified" badge appears only after admin approval.
- **Storefronts and supplier directory** with SEO-friendly URLs.
- **Catalogue**: admin-managed category tree, category-specific structured
  attributes (green / roasted / instant coffee, equipment, accessories,
  business supplies), image upload, product moderation
  (`DRAFT / PENDING / APPROVED / REJECTED / OUT_OF_STOCK / SUSPENDED`, rejection
  reason, edit and resubmit).
- **Search and browse**: global search across products, suppliers and
  categories; server-side pagination; filters in the URL (category, price,
  seller, location, rating, stock, MOQ and per-category attributes).
- **Cart and checkout**: multi-vendor cart; one parent order (`CH-100001`) plus
  a sub-order per vendor (`CH-100001-A`, `-B`); vendors only ever see their own
  sub-orders and financials.
- **Payments foundation**: order value, included tax, shipping, platform fee,
  gateway fee, vendor payable, refunds and settlement status stored separately;
  commission configurable per category; methods are cash on delivery, bank
  transfer (admin confirms receipt) and a simulated online payment for
  development. **No real payment gateway is integrated yet.**
- **Fulfilment**: vendor-managed shipping with courier, tracking number/link
  and dispatch date; buyers track from the order page.
- **RFQ and quotes**: buyers post requirements, admin reviews and routes them
  to suggested vendors, vendors quote, buyers compare side by side and select.
- **Messaging** attached to products, RFQs and orders, with phone/email masking.
- **Reviews** (verified purchase only, separate product and seller ratings,
  admin moderation) and **disputes** (evidence, vendor response, admin
  resolution with optional refund).
- **Settlements**: payable-per-vendor view, payout recording, payout hold when
  bank details change, CSV exports.
- **Notifications**: in-app plus email, raised from one central service.
- **Admin**: KPIs, vendor verification, product moderation, categories and
  commission, orders/payments/refunds, RFQs, settlements, reviews, disputes,
  reports, CMS (banners, FAQs, articles, policy pages), settings, audit log.
- **Analytics** funnel events and **SEO** (readable URLs, meta, canonical,
  product structured data).

Kept from the earlier MVP and unchanged: café listings, table reservations,
loyalty points, referrals and the machine comparison tool.

### Known gaps / before a public launch

- Integrate a real payment gateway (the ledger and `Payment` record are ready
  for it) and keep `PAYMENTS_MOCK_ENABLED=false` until then.
- Configure SMTP so emails are actually delivered.
- The seeded policy pages are placeholders and need legal wording.
- Uploaded files are stored in PostgreSQL; move to object storage + CDN as
  volume grows.
- Product variants are not modelled (one price and stock per listing).
- The schema is still managed by `ddl-auto=update` (see Deploying); adopt
  Flyway/Liquibase before relying on it long term.

### Upgrading an existing database

On startup the backend migrates data from the earlier MVP: existing sellers
get a vendor record in `DRAFT`, and existing products are linked to it. Their
listings stay hidden from the public site until the seller completes
verification and an admin approves them.

## Testing

`backend/scripts/api_smoke_test.py` drives the whole API end to end (vendor
onboarding and verification, product moderation, multi-vendor checkout,
fulfilment, reviews, disputes, refunds, settlements, RFQ and quotes, messaging,
permissions between vendors). Run it against a local backend on a fresh
database only; see the header of the script.

## Go-live checklist

1. **Back up the production database.**
2. **Check for leftover tables.** If the production database ever ran an
   earlier vendor prototype, the new backend cannot start on it. Run this
   against production; it must return no rows before the first deploy:
   ```sql
   select table_name from information_schema.tables
   where table_schema = 'public'
     and table_name in ('vendor', 'vendor_document', 'vendor_bank_account', 'vendor_status_history');
   ```
3. **Set these on the backend host:** a random `JWT_SECRET`, `FRONTEND_URL` and
   `APP_PUBLIC_URL` (both the public frontend URL), `PAYMENTS_MOCK_ENABLED=false`,
   the `SPRING_MAIL_*` SMTP settings and `MAIL_FROM`.
4. **Change the admin password** if it is still the documented default.
5. **After deploying, read the backend log.** It prints a `SECURITY:` or
   `PAYMENTS:` warning for each unsafe setting still in place, and `ERROR` lines
   if a schema change failed.
6. **Tell existing sellers** their listings are hidden until they complete
   verification and are approved.
7. Replace the placeholder policy pages (Admin > Content) with reviewed wording.

## Deploying later

Nothing here is tied to `localhost`; every URL/secret is an env var.

- **Frontend**: `frontend/Dockerfile` builds a static bundle served by nginx
  (works on Render/Railway/Fly, or skip Docker and deploy `frontend/` straight
  to Vercel/Netlify — set `VITE_API_BASE_URL` to your deployed API).
- **Backend**: `backend/Dockerfile` builds a self-contained jar image — deploy
  it to Render, Railway, Fly, or AWS (ECS/EC2). Set the same env vars as in
  `.env` on the host, pointing `SPRING_DATASOURCE_URL` at a managed Postgres
  (Supabase, RDS, Railway Postgres, etc.) and `FRONTEND_URL` at your deployed
  frontend origin.
- **Database**: point `SPRING_DATASOURCE_URL` at any managed PostgreSQL
  instance. Switch `JPA_DDL_AUTO` to `validate` and introduce a migration tool
  (Flyway/Liquibase) before your first production deploy — `update` is a dev
  convenience, not a production migration strategy.
- Generate a real `JWT_SECRET` for any non-local environment: `openssl rand -base64 48`.
