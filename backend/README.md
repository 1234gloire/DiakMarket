# DiakMarket — Backend (NestJS)

Business-logic API for DiakMarket. NestJS is the backend of record: Supabase provides
PostgreSQL + Auth + PostGIS, but every marketplace rule (pricing, order state, payments,
commissions, RBAC) is enforced here — never trust the client, never put business logic in
Supabase or Flutter.

## Stack

- **NestJS 12** (ESM) + TypeScript
- **Prisma ORM 7** (`prisma-client` generator, `@prisma/adapter-pg` driver adapter) against
  **PostgreSQL** (Supabase in staging/prod, local Docker in dev) with **PostGIS**
- **Supabase Auth** (JWT verified via `passport-jwt`, HS256 secret or JWKS)
- **Cloudinary** for media (the API only ever stores URLs/metadata, never file bytes)
- **Redis + BullMQ** (registered; queue processors land in Phase 5)
- **Swagger/OpenAPI** at `/docs`, REST API mounted under `/api/v1`

## Prerequisites

- Node.js 24+
- Docker (for local Postgres+PostGIS and Redis)

## Setup

```bash
# 1. From the repo root: start local Postgres+PostGIS and Redis
docker compose up -d

# 2. Install dependencies
cd backend
npm install

# 3. Configure environment
cp .env.example .env
# The defaults already point at the local Docker Postgres/Redis — fill in Supabase,
# Cloudinary and payment provider credentials as you get them. Never commit .env.

# 4. Apply migrations and seed reference data (currencies, SN/CG/GA, cities, categories,
#    default commission rules)
npx prisma migrate deploy
npx prisma db seed

# 5. Run the API
npm run start:dev
```

API: `http://localhost:3000/api/v1` — Swagger docs: `http://localhost:3000/docs`

## Database workflow (Prisma 7)

Prisma 7 moved connection URLs out of `schema.prisma` and into `prisma.config.ts`:

- `DIRECT_URL` is used by the Prisma **CLI** (migrations/introspection) — Supabase's pgbouncer
  pooler doesn't support the session features migrations need.
- `DATABASE_URL` (pooled) is used by the **running app** — `PrismaService` builds its own
  `@prisma/adapter-pg` connection from it at runtime, independent of `prisma.config.ts`.
- `SHADOW_DATABASE_URL` is only needed locally, so `prisma migrate dev` can diff schema changes.

```bash
npx prisma migrate dev --name <change>   # create + apply a migration (interactive, local dev)
npx prisma migrate deploy                # apply pending migrations (CI/staging/prod, non-interactive)
npx prisma studio                        # browse data
```

PostGIS columns (`courier_locations.location`, `delivery_zones.boundary`) are declared as
`Unsupported("geography(...)")` in the schema — Prisma has no native geography type, so they
are read/written via raw SQL in a dedicated service, not through the generated client directly.

## Architecture

See `src/` — one folder per bounded module (`products`, `orders`, `payments`, `deliveries`,
`disputes`, `ledger`, ...), each with its own `.module.ts` / `.controller.ts` / `.service.ts` /
`dto/`. Cross-cutting concerns live in `src/common/` (guards, decorators, filters, pipes) and
`src/auth/` (Supabase JWT verification + RBAC).

**Auth & RBAC**: every route requires a valid Supabase-issued JWT by default (`JwtAuthGuard` is
global); mark a route `@Public()` to opt out. `@Roles(...)` gates by coarse role
(`USER`/`SELLER`/`PRO_SELLER`/`COURIER`/`DELIVERY_PARTNER`/`SUPPORT`/`MODERATOR`/`ADMIN`/`SUPER_ADMIN`).
`@RequirePermissions(...)` gates by fine-grained, DB-configurable permission codes resolved
through `RolePermission` — use it when a check needs to change without a redeploy.

**Money**: always an integer in the currency's minor unit (`amount: 30000` = "30 000 XOF").
XOF and XAF are never merged, even though both are colloquially "CFA". The backend always
computes the final order total server-side — Flutter's total is a display estimate only.

**Orders**: `OrderStatusService` (`src/order-status/`) owns the state machine and the
`OrderStatusHistory` audit trail. Every transition goes through `transition()` — never write
`order.status` directly.

**Payments**: `PaymentProvider` (`src/payments/providers/`) is an abstraction; only
`MockPaymentProvider` is implemented today (development/test only — `PaymentsService` refuses
to select it when `NODE_ENV=production`). Real PSP adapters (Wave, Orange Money, MTN MoMo,
Airtel Money, Moov Money) plug into the same interface once credentials/API contracts exist.

**What's intentionally not implemented yet** (see the cahier des charges roadmap, Phases 5-6):
ledger double-entry postings on settlement, real PSP integrations, courier dispatch via
PostGIS proximity search, QR/OTP delivery confirmation, FCM push delivery. Each has a `TODO`
comment at the exact integration point in the code.

## Scripts

```bash
npm run start:dev   # watch mode
npm run build        # compile to dist/
npm run test          # unit tests (vitest)
npm run test:e2e      # e2e tests
npm run lint           # oxlint
```
