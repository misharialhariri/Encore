# Encore

A marketplace for reselling women's guest wedding attire in Saudi Arabia. Resellers list dresses they've worn once; buyers browse and buy at a fraction of retail. Not a store — a peer-to-peer marketplace.

## Stack

| Layer | Choice |
|---|---|
| Mobile | React Native (Expo) — iOS + Android from one codebase |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Prisma ORM) |
| Image storage | AWS S3, presigned direct upload |
| Auth | JWT + phone OTP (Saudi numbers), Google/Apple sign-in, biometric unlock |
| OTP SMS | Unifonic |
| Payments | Moyasar (mada, Apple Pay, STC Pay) — wired in Phase 4 |
| Maps | Google Maps API — wired in Phase 4 |

## Repo layout

```
apps/
  mobile/   React Native app (Expo)
  api/      Express backend
  admin/    Web admin panel (Phase 7)
packages/
  shared-types/  TS types shared across apps
infra/
  docker-compose.yml   local Postgres
docs/
  erd.md
```

## Phase 1 — Foundation (done)

- Full database schema for the approved ERD (`apps/api/prisma/schema.prisma`), migrated and seeded with all 13 Saudi regions/cities, starter brands, style tags, and platform settings.
- Auth: phone OTP registration (5-min expiry, 3-attempt lockout), JWT access/refresh tokens, Google and Apple sign-in.
- Profile: get/update, photo upload via presigned S3 URLs, city/region selection.
- Mobile: navigation shell (auth → profile setup → main tabs), phone entry, OTP verify, profile setup, biometric unlock, language toggle (Arabic/English) with RTL support, bottom-tab placeholders for Home/Search/Sell/Chat (built out in later phases).
- 23 backend tests (OTP flow, lockout, JWT refresh, profile updates, rate limiting) passing against a live PostgreSQL instance.

## Getting started

### Backend

```bash
cd apps/api
cp .env.example .env        # fill in real secrets for anything beyond local dev
npm install
npx prisma migrate dev      # applies schema, needs a running Postgres (see infra/docker-compose.yml)
npx prisma db seed          # regions, cities, brands, style tags, platform settings
npm run dev                 # http://localhost:4000
```

Without `UNIFONIC_APP_SID` set, OTP codes are logged to the console instead of sent by SMS — the request/verify flow still works end-to-end for local development.

Run the test suite (uses a separate `encore_test` database via `.env.test`):

```bash
npm test
```

### Mobile

```bash
cd apps/mobile
cp .env.example .env
npm install
npm start                   # then press i / a / w, or scan the QR code with Expo Go
```

Set `EXPO_PUBLIC_API_URL` to your machine's LAN IP (not `localhost`) when testing on a physical device.

## Build order

Phase 1 (this delivery) → Reseller core → Buyer core → Transactions & payments → Chat & notifications → Trust & safety → Admin panel → Localization/polish/launch prep. Each phase ships for review before the next begins, per the approved plan.
