# بابلو — Pablo

Arabic RTL ride-request pilot for Egypt, with passenger/captain accounts, shared trips, map-selected endpoints and opt-in foreground location sharing.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — run the API server (use its managed workflow)
- `pnpm --filter @workspace/pablo run dev` — web frontend (use its managed workflow)
- `node artifacts/api-server/checks/run.mjs` — isolated route integration check with temporary test identities, creates and cleans up its own development records
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- Required env: `DATABASE_URL` — Postgres connection string

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- API: Express 5
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod (`zod/v4`), `drizzle-zod`
- API codegen: Orval (from OpenAPI spec)
- Build: esbuild (CJS bundle)

## Where things live

- Web frontend: `artifacts/pablo`; public manifest and offline-only service worker in `public/`.
- API contracts: `lib/api-spec/openapi.yaml`; regenerate after editing.
- API routes: `artifacts/api-server/src/routes`; Drizzle schemas: `lib/db/src/schema`.

## Architecture decisions

- This is a pilot, not a production passenger transport operator. Do not imply verified drivers, insurance, guaranteed dispatch, fares or payments.
- Map positions are chosen explicitly; editable address labels are not automatically geocoded.
- OSM public tiles and OSRM public demo routing are for evaluation; commercial operation needs a suitable hosted service and capacity review.
- Web location sharing is foreground-only, opt-in, and does not promise background GPS when the app closes or the phone locks.

## Product

The owner accepted the pre-commercial operating requirements, with implementation and some operating details deferred. See `docs/operating-readiness.ar.md` for launch gates, the owner-approved but unimplemented fare and commission policy, and pilot-safe marketing copy. Acceptance of requirements is not approval to launch.

The owner approved EGP 20 start + EGP 10/km + EGP 1/minute, minimum EGP 40; cash from rider to captain; and 20% Pablo commission debited from captain wallet on acceptance, waived on the first two completed rides, refunded on rider cancellation and forfeited on captain cancellation. This is a business requirement only: fare calculation, wallet, top-ups, debits, refunds, and provider settlement are not implemented.

Passengers request and cancel rides, captains accept/arrive/start/complete them, and passengers can rate completed trips. Clerk handles authentication. Development and production accounts are separate. The web app supports home-screen installation after publishing; it is not an APK.

## User preferences

Preserve the supplied Pablo identity: Arabic RTL, navy/black and yellow. The user requested matching their shared visual reference and adding maps and tracking.

## Gotchas

- Do not cache authenticated API responses in the service worker.
- The test identity middleware exists only in the isolated check build and must never be imported into the running API.

## Pointers

- See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details
