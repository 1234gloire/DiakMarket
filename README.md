# DiakMarket

Panafrican marketplace (Vinted-like) launching in Sénégal 🇸🇳, Congo-Brazzaville 🇨🇬 and Gabon 🇬🇦.
See the full cahier des charges for product scope, roadmap and business rules.

**For current project status** (what's done, in progress, or not started across every
workstream — backend, mobile, payments, delivery, admin, deployment...), see
**[ROADMAP.md](./ROADMAP.md)**. Keep it updated as work lands.

## Monorepo layout

```text
mobile/     Flutter app — buyer MVP implemented; seller/courier screens not started
backend/    NestJS API — business logic, source of truth for pricing/state/RBAC
admin/      Next.js admin dashboard — not started yet (see ROADMAP.md, chantier 11)
```

`backend/` covers the cahier des charges' Phase 1-3 scope (architecture, NestJS modules,
PostgreSQL schema via Prisma, relations, REST API, RBAC, order state machine) plus a working
MVP slice (catalog, cart, checkout, mock payments, ledger/commissions skeleton, disputes,
reviews...). `mobile/` implements the buyer MVP (§38: auth, browse/search, product detail,
favorites, cart, checkout, payment, order tracking, delivery confirmation, rating) against
that API. See `backend/README.md` and `mobile/README.md` for setup and architecture notes.

## Local development

```bash
docker compose up -d      # Postgres+PostGIS and Redis for local dev
cd backend && npm install
cp .env.example .env
npx prisma migrate deploy && npx prisma db seed
npm run start:dev
```

API: `http://localhost:3000/api/v1` — Swagger: `http://localhost:3000/docs`

```bash
cd mobile && flutter pub get
cp .env.example .env   # fill in your Supabase project URL/anon key
flutter run
```

## Architecture

```text
Flutter (mobile/)
   │  HTTPS
   ▼
NestJS API (backend/)  ──►  Supabase Auth (JWT verification)
   │
   ├──► PostgreSQL / PostGIS (Supabase)   via Prisma
   ├──► Cloudinary                        media storage/CDN, metadata only in DB
   ├──► Redis / BullMQ                    async jobs, rate limiting
   └──► Payment / Delivery providers      behind abstractions (see backend/README.md)

Next.js admin (admin/, not started)  ──►  NestJS API
```

Money is always an integer minor unit tagged with a currency code — XOF (Sénégal) and XAF
(Congo, Gabon) are never merged. Country/currency/commission/delivery rules are database
configuration, not hardcoded, so a new country can be added without touching business logic.
