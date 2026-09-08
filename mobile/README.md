# DiakMarket — Mobile (Flutter)

Buyer-side MVP app (cahier des charges §38): sign up/in, browse by category, search &
filter, product detail, favorites, cart, checkout, Mobile Money payment, order tracking,
delivery confirmation, and rating the seller. Seller/courier screens are a future addition —
this app only implements the buyer flows.

## Stack

- **Flutter 3.35** + Dart, Riverpod 3 (no code generation — plain `Notifier`/`AsyncNotifier`),
  `go_router` for navigation
- **Supabase Auth** (`supabase_flutter`) — the ONLY thing this app talks to directly besides
  the backend. All marketplace data and business rules go through the NestJS API.
- **Dio** for HTTP, with an interceptor that attaches the current Supabase access token to
  every request
- `flutter_dotenv` for runtime config (`.env`, bundled as an asset)

## Setup

```bash
flutter pub get
cp .env.example .env
```

Edit `.env`:

- `SUPABASE_URL` / `SUPABASE_ANON_KEY` — from your Supabase project (Settings > API). The anon
  key is safe to embed in a client app by design; never put the service role key here.
- `API_BASE_URL` — the NestJS backend, including `/api/v1`. Defaults to
  `http://10.0.2.2:3000/api/v1` (Android emulator's alias for the host machine's localhost).
  Use `http://localhost:3000/api/v1` for iOS simulator/macOS/web, or your LAN IP for a
  physical device.

Run the backend first (see `../backend/README.md`), then:

```bash
flutter run
```

## Architecture

```text
lib/
  main.dart                    bootstrap: load .env, init Supabase, run app
  src/
    app.dart                   MaterialApp.router
    core/
      config/                  AppConfig (.env access)
      network/                 ApiClient (Dio + auth interceptor), ApiException
      router/                  GoRouter + auth-based redirect
      theme/                   AppTheme
      utils/                   money formatting (integer minor units, never divided by 100)
    models/                    plain Dart classes mirroring the backend's JSON shapes
    features/
      auth/                    Supabase sign up/in, session state
      profile/                 current user, edit profile, first-run country selection
      reference/                countries/cities/categories (public backend endpoints)
      products/                 search/filters, product detail
      favorites/                 favorite products
      cart/                      cart
      checkout/                  addresses, delivery mode, checkout
      payments/                  Mobile Money payment (initiate + status polling)
      orders/                    order list/detail, status timeline, confirm receipt
      reviews/                   rate the seller after a completed order
    shared/widgets/             ProductCard, etc.
```

Each feature follows `data/` (repository + Riverpod providers talking to the API) →
`providers/` (app state built on top of the repository, when there's more than a plain fetch)
→ `presentation/` (screens/widgets). Money is always an integer in the currency's minor unit,
exactly like the backend — `formatMoney()` never divides by 100 (XOF/XAF have zero decimal
digits).

## Payment testing without a real PSP

The backend's `MockPaymentProvider` is the only payment provider implemented so far (see
`../backend/README.md`). In debug builds, the payment screen shows "Simuler succès / Simuler
échec" buttons that call a dev-only backend endpoint
(`POST /payments/dev/simulate`, disabled when `NODE_ENV=production`) to fire the mock webhook
directly, so the whole checkout → payment → order-tracking flow can be exercised without a real
Mobile Money network.
