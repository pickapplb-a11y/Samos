# VANTA: custom hoodie e-commerce with a 3D design studio

A Next.js 15 + TypeScript + Tailwind + React Three Fiber + PostgreSQL store. Customers design a hoodie in real-time 3D, save it, and order it. Admins get the exact approved artwork as 300 DPI print files.

> **"VANTA" is a placeholder brand name.** Change it in `src/lib/site.ts`, `src/components/layout/*` and `src/app/opengraph-image.tsx`.

## Quick start

```bash
cp .env.example .env              # then set AUTH_SECRET (openssl rand -hex 32)
docker compose up -d db           # or point DATABASE_URL at your own Postgres 14+
npm install
npx prisma db push                # create tables
npm run db:seed                   # catalog, inventory, graphics library, showcase designs, admin user
npm run dev                       # http://localhost:3000
```

Seeded accounts (change them before going live):
- **Admin:** `admin@vanta.local` / `ChangeMe!2026` (set by `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`)
- **Demo customer:** `demo@vanta.local` / `Demo!2026pass`

Product photography is rendered from the 3D model itself. With the dev server running:

```bash
npm run render:shots              # add --force to re-render everything
```

Tests:

```bash
npm test                          # unit: constraints, pricing, schema, SVG sanitiser
npm run test:e2e                  # end-to-end API flow against a running server
```

## Deploy on Railway

`railway.json` sets everything up: build `npm run build`, start `npm run start:prod`. Start syncs the schema, seeds the store **only if the database is empty**, then starts Next.js.

1. railway.com → New Project → **Deploy from GitHub repo** → pick this repo.
2. In the project: **+ Create → Database → PostgreSQL**.
3. App service → **Settings → Networking → Generate Domain**.
4. App service → **Volumes → + New Volume**, mount path `/data`. Customer uploads and print files live here.
5. App service → **Variables**:

| Variable | Value |
|---|---|
| `DATABASE_URL` | `${{Postgres.DATABASE_URL}}` |
| `AUTH_SECRET` | 64 random characters (e.g. `openssl rand -hex 32`) |
| `NEXT_PUBLIC_SITE_URL` | `https://<your-domain>.up.railway.app` |
| `STORAGE_DIR` | `/data` |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | your admin login (used on first boot) |

Railway redeploys on every push to `main`.

## What's where

| Area | Path |
|---|---|
| 3D garment (procedural geometry, fabric, print-zone patches) | `src/components/hoodie/` |
| Studio UI, state (undo/redo), 2D precision editor, texture + print rendering | `src/components/studio/` |
| Shared design model: zones, layer schema, constraints, pricing, renderer | `src/lib/design/` |
| Server-side pricing, order creation, stock reservation | `src/lib/orders.ts` |
| Private storage (local disk or S3) and upload validation / SVG sanitisation | `src/lib/storage.ts`, `src/lib/uploads.ts` |
| Auth (JWT cookie + bcrypt), guest identity, RBAC | `src/lib/auth.ts`, `src/lib/session.ts`, `src/middleware.ts` |
| Admin dashboard | `src/app/admin/`, `src/app/actions/admin.ts` |
| Customer account | `src/app/account/`, `src/app/actions/account.ts` |

## How the studio stays accurate

1. **Print zones in real units.** Each style defines its printable areas in inches (`src/lib/design/zones.ts`). Oversized front 12″×14″, back 14″×16″, sleeves 3.5″×14″, zip-up left chest 4.5″×4.5″. Layers are stored in zone units (100 per inch).
2. **One renderer, three outputs.** `drawZone()` draws the 3D texture, the 2D lite preview and the 300 DPI print file, so they can't drift apart.
3. **Arc-length UV mapping.** The garment is generated at real-world scale (metres). Each print zone is a patch of the actual garment surface, with UVs laid out by arc length. A 10″ graphic measures 10″ on the 3D hoodie and wraps the body curvature.
4. **Hard boundaries.** Every move, resize, rotation and style change goes through `constrainLayer()`, which keeps the rotated bounding box inside the zone. The server re-checks with `isInside()` and rejects anything out of bounds.
5. **Print files per revision.** "Save" or "Add to cart" renders one transparent PNG per used zone at exactly `inches × 300` px. The server verifies format and exact pixel dimensions, embeds 300 DPI metadata, and stores them as immutable assets tied to the design revision. Orders freeze a snapshot of the layers, zone specs, price breakdown and print-file IDs. Editing the design later never changes an existing order.
6. **Admin retrieval.** The order page shows a live 3D view of the frozen design, each print file, a layer spec in inches, original source uploads, and a one-click ZIP (`print-*.png` + `sources/` + `order.json`).

## Security

- Passwords hashed with bcrypt (cost 12). Sessions are signed httpOnly, SameSite=Lax JWT cookies. The admin role is re-read from the database on every admin page, action and API call.
- CSRF: mutating API requests must come from the site's own origin (middleware). Server Actions get Next's built-in origin check.
- Uploads: magic-byte sniffing (not the file extension), 15 MB / 8000 px limits, rasters decoded and re-encoded (strips EXIF and polyglots). SVGs sanitised with DOMPurify: no scripts, event handlers, `foreignObject`, `<image>`, `<use>`, `href`, external `url()` or entities. Assets are served with `nosniff` and a sandbox CSP.
- Private storage: design files live outside `/public` (or in S3) and are served only through `/api/assets/[id]`. That route checks owner, same guest browser, admin, the order's secret link, or explicitly public library/showcase assets.
- All prices are computed server-side from the database: product prices, custom designs priced from their validated layers, discounts, delivery and COD fees. Client prices are display-only.
- Orders are visible only to their account, admins, or holders of the unguessable `accessToken` link.
- Rate limits on login (per IP + per account), registration, uploads, design saves, orders, AI, contact, newsletter, reviews and order lookup.
- Payments use hosted Stripe Checkout, so card data never touches this server. Only the signature-verified webhook can mark an order paid, and only if the paid amount matches.
- Security headers (HSTS, frame-deny, nosniff, referrer and permissions policy).

## Configuration notes and production checklist

- **Card payments** appear only when `STRIPE_SECRET_KEY` is set. Point a Stripe webhook at `/api/stripe/webhook` (events `checkout.session.completed`, `checkout.session.expired`, `checkout.session.async_payment_*`) and set `STRIPE_WEBHOOK_SECRET`. Unpaid card orders release their stock when the session expires.
- **AI design assistant** appears only when `OPENAI_API_KEY` is set (signed-in users, 10 per hour). It hasn't been exercised against the live API in this build, so test it with your key before launch.
- **Storage:** local `./storage` by default. Set `S3_BUCKET` (+ region/endpoint/keys) for S3, R2 or MinIO in production. The bucket must be private.
- **Rate limiting** is in-memory (per instance). Use Redis or Upstash when running more than one instance.
- **Emails are not sent.** No email provider is wired in. Customers get an order page with a secret tracking link, plus "Track an order" (number + email). Add transactional email (Resend, Postmark, etc.) in `createOrder` and `updateOrderStatus`.
- **Analytics:** Plausible loads only after cookie consent when `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is set.
- **Retention:** run `npm run cleanup` daily. It removes guest designs and uploads older than 90 days that aren't part of an order, which the privacy policy promises.
- **The 3D hoodie is procedural**, built in code, so it carries no third-party licence. It isn't a photogrammetry scan. Swapping in a commercial GLB means re-deriving the print patches from that mesh's UVs. `zonePatches()` in `src/components/hoodie/geometry.ts` is the single place to replace.
- **Product images** are renders of that model. Upload real photography from Admin → Products (Upload) whenever you have it.
- **Legal pages** are solid templates, not legal advice. Have them reviewed for your jurisdiction.
- Change the seeded admin password and `AUTH_SECRET`. Run behind HTTPS.
