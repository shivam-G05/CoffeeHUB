# CoffeeHub India

Coffee ecosystem platform — discover cafés, buy beans & machines, and manage a
multi-role marketplace. This repo is the **Phase 1 MVP**: Customer, Seller,
Café Owner, and Super Admin panels, built on the stack recommended in the
product spec (React + Vite frontend, Java Spring Boot backend, PostgreSQL,
JWT auth).

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

- Register as a Customer, Seller, or Café Owner from the site.
- Log in as `admin@coffeehub.in` / `Admin@12345` to reach `/admin` and approve
  seller products / café listings (they're hidden from the public site until
  approved).

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

### `frontend/.env.local`

| Variable               | Purpose                          |
| ----------------------- | --------------------------------- |
| `VITE_API_BASE_URL`     | Base URL of the backend API       |

**No payment, maps, or notification env vars are required to run this MVP.**
The product spec calls for Razorpay, Google Maps, and Firebase Cloud
Messaging in later phases — those aren't wired up yet, so there's nothing to
configure for them until that work starts.

## What's implemented (Phase 1)

- JWT auth with 4 roles: Customer, Seller, Café Owner, Admin (self-registration
  disabled for Admin — seeded on backend startup instead)
- Customer: browse approved beans/machines & cafés with detail pages, place
  orders, view order history, wishlist, table reservations, edit profile
- Seller: list/edit/delete products, view & fulfil orders for their products
- Café Owner: list/edit a café listing, manage table reservations
- Admin: platform stats dashboard, user management (enable/disable), product
  & café approval queues, view all orders

**Engagement & growth features** (from the product spec's Customer feature
list): product/café reviews & star ratings, wishlist, loyalty points (1 pt
per ₹100 spent), a referral program (unique code per customer, 50 bonus
points to both sides on signup), café table reservations, and a machine
comparison tool. "CoffeeHub Pro membership" is shown on the homepage as a
teaser only — no real billing behind it yet since Razorpay isn't wired up.

Everything else in the product spec (Used Machine Marketplace, Distributor,
Service Engineer, Delivery Partner panels, subscriptions, franchise
marketplace, payments, notifications, search, maps) is **Phase 2/3** per the
spec's own phased plan, and isn't built yet. The data model (users, products,
cafés, orders) is structured so those can be added as new modules without
reworking what's here.

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
