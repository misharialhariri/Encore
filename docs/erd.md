# Database ERD

Source of truth is `apps/api/prisma/schema.prisma`. This doc is the human-readable summary approved before Phase 1 began.

## Identity, catalog & commerce

```mermaid
erDiagram
    USERS ||--o{ LISTINGS : sells
    USERS ||--o{ VERIFICATION_REQUESTS : submits
    USERS ||--o| RESELLER_BANK_ACCOUNTS : has
    USERS ||--o{ ADDRESSES : has
    USERS ||--o{ WISHLISTS : saves
    USERS ||--o{ SAVED_SEARCHES : saves
    USERS ||--o{ OFFERS : "makes (buyer)"
    USERS ||--o{ ORDERS : "buys / sells"
    USERS ||--o{ REVIEWS : writes
    USERS ||--o{ PAYOUTS : requests

    BRANDS ||--o{ LISTINGS : categorizes
    LISTINGS ||--o{ LISTING_IMAGES : has
    LISTINGS }o--o{ STYLE_TAGS : tagged
    LISTINGS ||--o{ WISHLISTS : "saved in"
    LISTINGS ||--o{ OFFERS : receives
    LISTINGS ||--o| ORDERS : "sold via"

    OFFERS ||--o| OFFERS : "countered by"
    OFFERS ||--o| ORDERS : "accepted into"

    ORDERS ||--o| PAYMENTS : "paid by"
    ORDERS }o--|| ADDRESSES : "ships to"
    ORDERS ||--o| REVIEWS : "reviewed via"
```

## Communication, trust & admin

```mermaid
erDiagram
    USERS ||--o{ CONVERSATIONS : "buyer side"
    USERS ||--o{ CONVERSATIONS : "reseller side"
    CONVERSATIONS ||--o{ MESSAGES : contains
    USERS ||--o{ MESSAGES : sends
    OFFERS ||--o| MESSAGES : "shown as offer card"
    USERS ||--o{ BLOCKED_USERS : blocks

    USERS ||--o{ NOTIFICATIONS : receives
    USERS ||--o{ NOTIFICATION_PREFS : configures

    USERS ||--o{ REPORTS : files
    LISTINGS ||--o{ REPORTS : reported
    ORDERS ||--o{ DISPUTES : disputed

    ADMIN_USERS ||--o{ DISPUTES : resolves
    ADMIN_USERS ||--o{ REPORTS : reviews
    ADMIN_USERS ||--o{ VERIFICATION_REQUESTS : reviews
    ADMIN_USERS ||--o{ PLATFORM_SETTINGS : configures
```

## Notes

- Escrow is modeled as a status on `payments` (`HELD` → `RELEASED`/`REFUNDED`) rather than a separate ledger table. A dedicated `ledger_entries` table can be added before Phase 4 if a full audit trail of fund movements is needed.
- `regions`/`cities` are reference tables seeded with all 13 Saudi administrative regions — see `apps/api/prisma/seed.ts`.
- `platform_settings` is a key/value table holding the configurable knobs from the brief: service fee %, minimum listing price, max photos per listing, OTP expiry, payout minimum threshold, dispute window, boost pricing.
