# TRACKORA deployment guide

The workspace runs as a Vite/TanStack Start application. For a production deployment, build with `npm run build` and serve the generated Nitro/Vercel output using the platform adapter selected by the deployment target. Keep the existing `npm run db:migrate` step in the release pipeline.

## Required environment contract

Create these secrets in Render or the selected deployment platform. Use placeholders only in `.env.example` and never commit values:

```env
DATABASE_URL=postgresql://user:password@host:5432/trackora
REDIS_URL=redis://host:6379
ADMIN_PASSWORD_HASH=argon2id-hash-generated-outside-the-browser
SESSION_SECRET=replace-with-a-long-random-secret
FLIGHT_API_KEY=provider-key
SHIPMENT_TRACKING_API_KEY=provider-key
EMAIL_API_KEY=provider-key
```

Optional provider credentials should be named per adapter, for example `AFTERSHIP_API_KEY`, `TRACK17_API_KEY`, `AVIATIONSTACK_API_KEY`, or a private carrier key. Provider secrets belong only in the server environment and must never be returned from public or Crew JSON responses.

## Production boundaries

The current front end reuses the existing persistent local store so the demo and preview remain functional without pretending to have live provider data. Before production, move the authoritative shipment, event, audit, notification, provider, and session records into PostgreSQL through Prisma or the existing Kysely layer. Keep provider integrations behind independent adapters with carrier detection, request limits, retries, fallback priority, and explicit unsupported-reference responses.

Use Redis-compatible storage for cache keys and BullMQ workers for scheduled refreshes, exponential-backoff retries, exception detection, and notification jobs. Prefer provider webhooks when available and enforce each provider's terms and rate limits. Add a `/api/health` check that verifies the application process and database connectivity without revealing credentials.

## Crew authentication

The `/crew` route is intentionally absent from `public/manus-routes.json`. Production access must be enforced server-side, not by hiding the path. Hash the initial administrator password with Argon2id before setting `ADMIN_PASSWORD_HASH`, require a password change after first login, issue short-lived secure HTTP-only cookies with `SameSite=Lax` (or `None; Secure` when embedded cross-site in a public HTTPS Preview), rate-limit failures with temporary lockouts, validate CSRF tokens on mutations, and record successful and failed login events in `AuditLogs`.

Admin endpoints must check the session and role on the server before reading or mutating shipments, flights, providers, files, notifications, or settings. Never place session tokens in URLs or logs.

## Data and files

Use migrations for `AdminUsers`, `AdminSessions`, `Users`, `Shipments`, `ShipmentEvents`, `Carriers`, `Flights`, `FlightEvents`, `TrackingProviders`, `TrackingRequests`, `Notifications`, `NotificationTemplates`, `UploadedFiles`, `AuditLogs`, and `SystemSettings`. Add unique indexes for tracking references, timestamps on every mutation, and privacy flags for personal sender/recipient information. Store uploaded documents in private object storage with signed access links.

## Release checklist

Run `npm run typecheck`, `npm run lint`, and `npm test` before deployment. Supply managed PostgreSQL, Redis, email, flight, and shipment-provider credentials in the deployment environment. Run migrations before the new release receives traffic, verify `/api/health`, test Crew login with an invalid and a valid password, verify unauthenticated admin requests fail, and confirm public tracking never exposes private sender or recipient details.
