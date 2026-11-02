# TRACKORA upgrade plan

## Implementation

Preserve the existing TanStack Start + React + TypeScript + Tailwind app and its local tracking engine. Upgrade the public shell to the TRACKORA brand, keep the map and shipment state interactions intact, and add a hidden `/crew` route that reuses the real shipment actions for command-centre operations. Add route metadata and deployment documentation for the provider-backed production architecture described in the source brief.

The current workspace already provides persistent shipment, flight, driver, hub, route, exception, and status-transition state. This upgrade layers the product language and admin surface on that foundation without fabricating external provider data. Provider adapters, PostgreSQL/Redis production wiring, and server-side crew authentication remain documented follow-up work and must be configured before production deployment.

## Project structure

- `src/routes/index.tsx`: public tracking entry point.
- `src/routes/crew.tsx`: hidden crew login/dashboard route.
- `src/components/shell.tsx`: responsive public tracking shell and map workspace.
- `src/components/track-panel.tsx`: universal search and shipment detail access.
- `src/components/desk-panel.tsx`: local shipment operations and creation.
- `src/lib/store.ts`: persistent local tracking state and mutations.
- `public/manus-routes.json`: public route manifest; `/crew` is intentionally omitted.
- `docs/DEPLOYMENT.md`: production provider, database, auth, and worker configuration notes.

## Design

Three possible directions: **Signal Noir** (0.06), **Orbital Ledger** (0.08), **Field Console** (0.04). Chosen: **Signal Noir**.

- **Design Movement:** premium logistics command centre with quiet aerospace instrumentation and editorial restraint.
- **Core Principles:** fast scanning, high information density, luminous status accents, and clear public/private separation.
- **Color Philosophy:** near-black green graphite makes bright lime telemetry feel precise and ownable; warm coral is reserved for exceptions.
- **Layout Paradigm:** split map-and-sheet workspace on public pages, wide command canvas with rail navigation in Crew.
- **Signature Elements:** lime tracking pulse, compact mono telemetry labels, and route/status chips.
- **Interaction Philosophy:** every action gives a visible operational consequence; statuses are scannable before they are decorative.
- **Animation:** restrained pulse on live points and short status transitions; honor reduced-motion preferences.
- **Typography System:** Sora for product/UI text and IBM Plex Mono for codes, timestamps, and operational metrics.
- **Brand Essence:** Track every movement across air, road, sea, and last mile; precise, calm, global.
- **Brand Voice:** direct and assured. Example lines: “Everything moves. Track everything.” and “One reference. Every handoff.”
- **Wordmark & Logo:** TRACKORA wordmark paired with a split-orbit tracking mark.
- **Signature Brand Color:** signal lime `#d6f25c`.
