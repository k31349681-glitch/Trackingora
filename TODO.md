# TRACKORA upgrade outcomes

## Public TRACKORA tracking experience

- [x] The public tracking website works from the existing root route with TRACKORA branding, tagline, universal tracking search, shipment details, map context, live/local status metrics, recent shipment access, and responsive mobile/desktop layout.
- [x] Tracking references remain shareable through the existing `?track=` route state and resolve into shipment detail views.
- [x] The UI clearly distinguishes operational/local state from external provider data; no unsupported live provider response is fabricated.

## Private Crew command centre

- [x] A hidden `/crew` route provides a private dark mission-control surface with dashboard metrics, shipment table, filters, status actions, flight/provider overview, activity feed, and a responsive layout.
- [x] `/crew` is excluded from the public route manifest and public navigation.
- [ ] Production server-side authentication, Argon2id password hashing, secure HTTP-only sessions, rate limiting, CSRF protection, and forced first-login password change must be configured before deployment; the required environment contract is documented in `docs/DEPLOYMENT.md`.

## Operational data foundations

- [x] Existing shipment creation, assignment, status advancement, exception handling, route/map state, and persistent local storage are reused by Crew controls.
- [ ] PostgreSQL, Redis/BullMQ, provider adapters, notification delivery, and background synchronization remain deployment integrations and are documented with required credentials and failure behavior.

## Delivery readiness

- [x] `public/manus-routes.json` declares the public route set.
- [x] Deployment guidance, environment placeholders, provider adapter boundaries, health-check expectations, and migration notes are included.
- [ ] Run production security and provider integration verification after credentials and managed services are supplied.
