# Mailbox Manager — System Design & Folder Structure

Reference document for Claude Code. **Read this, `docs/reference/COLOR_SYSTEM.md` and `CLAUDE.md` before implementing any ticket.** It fixes the stack, the folder layout, what each layer may and may not do, the data model, the API contract, the error codes, the worker design, the environment variables and the definition of done.

> Do not confuse this file with `docs/ARCHITECTURE.md`. That is the graded deliverable written in Ticket 5.1, which names each design pattern, where it lives, why it was chosen and one rejected alternative. It summarises what this document prescribes.

---

## 1. Product in one paragraph

An internal tool for a company that sells pre-warmed Google and Microsoft mailboxes. Seeded users sign in as **CUSTOMER** (creates orders, sees only their own) or **ADMIN** (sees every order, filters, paginates, retries failed ones). An order is a domain, a provider (`google` or `microsoft`) and a mailbox count (1–50). A background worker provisions each mailbox through a mocked provider (1–3 s per call, about 20 % random failure) and moves the order `PENDING → PROVISIONING → ACTIVE` or `FAILED`. An admin can retry `FAILED → PENDING`. Every status change is written to an audit log shown on the order detail page.

---

## 2. Locked stack

| Layer | Choice |
|---|---|
| Runtime | Node.js ≥ 22 (LTS), npm |
| Framework | Next.js latest stable, App Router, `src/` directory |
| Language | TypeScript strict, plus `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch` |
| UI library | MUI (`@mui/material`, `@mui/icons-material`, `@mui/material-nextjs`, Emotion). **No Tailwind.** |
| Database | PostgreSQL. Development: the developer's existing local server with dedicated databases. Reviewers: `docker-compose.yml` (Postgres 16). |
| ORM | Prisma latest (migrations + seed). If the installed major is ≥ 7: `prisma.config.ts`, the `prisma-client` generator with an explicit output path, and the `@prisma/adapter-pg` driver adapter. |
| Validation | Zod latest (v4 API) |
| Auth | Custom: `bcryptjs` password hashes, `jose` HS256 JWT in an httpOnly cookie |
| Worker | Separate Node process from the same codebase, run with `tsx`; PostgreSQL is the queue (`FOR UPDATE SKIP LOCKED`) |
| Provider abstraction | Strategy pattern + registry (mock Google, mock Microsoft) |
| Tests | Vitest: unit tests + integration tests against a real test database |
| Lint / format | ESLint flat config (Next.js default) + Prettier |

Install the latest stable versions at implementation time; `package-lock.json` pins them. Before using an API, check the installed major version and follow that version's documentation. Known version traps: Next.js 15+ makes `params`, `searchParams` and `cookies()` asynchronous; recent Next.js removed `next lint`; Prisma 7 no longer reads `.env` by itself and requires a driver adapter; Zod 4 changed parts of the API; `@mui/material-nextjs` has a different import subpath per Next.js major. Do not enable experimental Next.js caching flags.

---

## 3. Locked product decisions

### 3.1 Roles and visibility

- **CUSTOMER**: creates orders; lists and opens only their own orders. Opening another customer's order returns **404**, never 403, so order ids cannot be probed.
- **ADMIN**: lists all orders with status and provider filters and pagination, opens any order, retries FAILED orders. Admins do not create orders (403).

### 3.2 Order status machine

Single source of truth: `src/server/domain/order-state-machine.ts`.

| From | To | Allowed actor | Meaning |
|---|---|---|---|
| (none) | PENDING | CUSTOMER | Order created. Recorded as the creation event; not a transition. |
| PENDING | PROVISIONING | WORKER | A worker claimed the order |
| PROVISIONING | ACTIVE | WORKER | Every mailbox is ACTIVE |
| PROVISIONING | FAILED | WORKER | At least one mailbox FAILED |
| PROVISIONING | FAILED | SYSTEM | Worker lease expired (crash recovery) |
| FAILED | PENDING | ADMIN | Admin retry |

Every other combination is rejected with `INVALID_TRANSITION` (409), including self-transitions and the wrong actor. ACTIVE is terminal. FAILED is not terminal because it can be retried.

### 3.3 Mailbox statuses

`PENDING → ACTIVE` or `PENDING → FAILED`. On admin retry, only FAILED mailboxes go back to PENDING. ACTIVE mailboxes are never provisioned twice.

### 3.4 Failure semantics

One provider call per mailbox. An order becomes ACTIVE only when all its mailboxes are ACTIVE; otherwise it becomes FAILED with event metadata `{ active, failed, total }` and a readable `last_error` such as "3 of 10 mailboxes failed". With 20 % failure per call, small orders usually succeed and large orders usually fail. Retries converge because only the failed mailboxes are tried again.

### 3.5 Idempotent order creation

- The client sends an `Idempotency-Key` header: 8–128 characters from `[A-Za-z0-9_-]`. The UI sends a UUID.
- Keys are scoped per user. The unique constraint on `(user_id, idempotency_key)` in the database is the final arbiter.
- `request_hash` is the SHA-256 of the normalised payload (domain trimmed and lowercased, provider, mailbox count), so `Example.COM` and `example.com` count as the same request.
- First request → **201 Created**, header `Idempotent-Replayed: false`.
- Same key and same payload → **200 OK** with the same order, header `Idempotent-Replayed: true`. No new rows.
- Same key and different payload → **422** `IDEMPOTENCY_KEY_MISMATCH` (as recommended by the IETF Idempotency-Key draft).
- Missing or malformed key → **400** `IDEMPOTENCY_KEY_REQUIRED`.
- Concurrent duplicates: the losing request hits the unique constraint, re-reads the winner and replays it. Never a 500.
- The order, all of its mailboxes and the creation event are written in one transaction. There is never an order without mailboxes.

### 3.6 Live updates

Polling. The order detail page polls `GET /api/orders/:id` every 2 s while the order is PENDING or PROVISIONING, pauses while the browser tab is hidden and stops at ACTIVE or FAILED. Lists refresh on demand and auto-refresh while any visible row is in progress.

### 3.7 Pagination

Offset pagination with `page` (≥ 1, default 1) and `pageSize` (1–50, default 20; the UI offers 10, 20 and 50). Sorted by `created_at DESC, id DESC` so ties are stable. Responses carry `meta: { page, pageSize, total, totalPages }`. A page past the end returns an empty list, not an error.

### 3.8 Identifiers and dates

UUIDs for every id. The API returns dates as ISO-8601 UTC strings. The browser renders local time, and only on the client, to avoid hydration mismatches.

---

## 4. Folder structure

```
mailbox-manager/
├── CLAUDE.md                              read automatically by Claude Code
├── README.md                              clean-clone instructions (Ticket 5.1)
├── docker-compose.yml                     Postgres 16 for reviewers only (host port 5433)
├── docker/postgres/init/                  creates mailbox_manager_test on first container start
├── .env.example                           every variable, documented (one .env file only)
├── .nvmrc  .editorconfig  .prettierrc  .prettierignore
├── eslint.config.mjs  next.config.ts  tsconfig.json  vitest.config.ts
├── prisma.config.ts                       Prisma ≥ 7: schema path, migrations, seed, loads .env
├── prisma/
│   ├── schema.prisma
│   ├── migrations/                        committed; never edited after being applied
│   └── seed.ts                            idempotent: users + sample orders
├── scripts/
│   ├── db/setup-local.sh                  creates role + dev/test databases on an existing local server
│   ├── db/teardown-local.sh               drops only what setup-local created
│   └── create-order.ts                    dev CLI: create an order through OrderService (tests the worker)
├── docs/
│   ├── ARCHITECTURE.md                    graded deliverable (Ticket 5.1)
│   ├── AI_WORKLOG.md                      graded deliverable (Ticket 5.1 + you)
│   ├── reference/
│   │   ├── SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md
│   │   └── COLOR_SYSTEM.md
│   └── tickets/                           PART_1, PART_2, PART_3
├── tests/
│   ├── unit/                              pure tests, no database, no network
│   ├── integration/                       real Postgres (mailbox_manager_test)
│   └── helpers/                           db reset, factories, test container, fake providers
└── src/
    ├── app/
    │   ├── layout.tsx                     root: ThemeRegistry, InitColorSchemeScript, noindex metadata
    │   ├── page.tsx                       redirects by role (customer → /orders, admin → /admin/orders)
    │   ├── login/page.tsx
    │   ├── error.tsx  not-found.tsx  loading.tsx
    │   ├── (app)/layout.tsx               requires a session, renders AppShell
    │   ├── (app)/orders/page.tsx          customer: my orders
    │   ├── (app)/orders/new/page.tsx      customer: create order
    │   ├── (app)/orders/[id]/page.tsx     order detail (owner or admin)
    │   ├── (app)/admin/layout.tsx         requires ADMIN (404 otherwise)
    │   ├── (app)/admin/orders/page.tsx    admin: all orders
    │   └── api/
    │       ├── auth/login/route.ts
    │       ├── auth/logout/route.ts
    │       ├── auth/me/route.ts
    │       ├── orders/route.ts            GET own list, POST create
    │       ├── orders/[id]/route.ts       GET detail
    │       ├── admin/orders/route.ts      GET all with filters
    │       └── admin/orders/[id]/retry/route.ts
    ├── features/
    │   ├── auth/components/               LoginForm, DemoCredentials
    │   ├── orders/components/             OrdersTable, CreateOrderForm, OrderDetailView, MailboxTable,
    │   │                                  AuditLogTimeline, OrderStatusChip, MailboxStatusChip, ProviderChip
    │   ├── orders/hooks/                  useOrderPolling, useIdempotencyKey
    │   ├── orders/styles/ordersStyles.ts
    │   └── admin/components/              AdminOrdersView, OrderFilters, RetryOrderButton
    ├── components/
    │   ├── layout/                        AppShell, NavLinks, UserMenu, ThemeToggle
    │   └── feedback/                      PageHeader, EmptyState, ErrorState, LoadingState, LocalTime
    ├── lib/
    │   ├── api-client.ts                  browser fetch wrapper → typed ApiError
    │   └── format.ts                      date / number formatting helpers
    ├── shared/                            safe in the browser AND on the server
    │   ├── schemas/                       zod: order.schema.ts, auth.schema.ts
    │   ├── types/                         DTO types: order.dto.ts, auth.dto.ts
    │   ├── errors/error-codes.ts          code → { status, defaultMessage }
    │   └── constants.ts                   APP_NAME, MIN/MAX_MAILBOXES, page sizes, poll interval
    ├── styles/
    │   ├── themeColors.json               the only place colours live
    │   ├── theme.ts                       builds the MUI theme from tokens
    │   ├── mui-custom-theme.d.ts          palette type augmentation
    │   └── ThemeRegistry.tsx              AppRouterCacheProvider + ThemeProvider + CssBaseline
    ├── generated/prisma/                  Prisma ≥ 7 client output (gitignored, created by postinstall)
    └── server/                            server code; never imported by client components
        ├── config/env.ts                  the ONLY reader of process.env (zod, fail fast)
        ├── db/prisma.ts                   PrismaClient singleton
        ├── container.ts                   composition root: wires repositories, services, providers
        ├── domain/
        │   ├── order-state-machine.ts     transition table, canTransition, assertTransition
        │   ├── errors.ts                  AppError hierarchy
        │   ├── request-hash.ts            idempotency payload fingerprint
        │   └── mailbox-address.ts         mailbox address generation
        ├── auth/
        │   ├── password.ts                bcryptjs hash / verify (pure)
        │   ├── session-token.ts           jose sign / verify (pure)
        │   ├── session.ts                 Next.js cookies() read/write ('server-only')
        │   └── guards.ts                  getCurrentViewer, requireViewer/Customer/Admin ('server-only')
        ├── repositories/                  user, order, mailbox, order-event
        ├── services/                      auth, order, order-transition, provisioning
        ├── mappers/order.mapper.ts        entity → DTO (explicit whitelist)
        ├── providers/                     mailbox-provider.ts, mock-mailbox.provider.ts,
        │                                  google-mock.provider.ts, microsoft-mock.provider.ts,
        │                                  provider-registry.ts, with-timeout.ts
        ├── http/                          route wrapper, success/error responses, JSON + origin checks
        └── worker/                        main.ts (entry), worker.ts (loop), logger.ts
```

Import boundaries:

- `src/shared/**` must work in the browser: no `node:*` modules, no Prisma, no `next/headers`, no `server-only`.
- `src/server/**` is never imported by a file that starts with `'use client'`.
- `server-only` is imported **only** by `src/server/auth/session.ts` and `src/server/auth/guards.ts`. Services, repositories, domain, providers and the worker must stay importable from plain Node (`tsx`, Vitest), where `server-only` throws.
- `next/headers` and `next/navigation` are never imported by services, repositories, domain, providers or the worker.

---

## 5. Layer rules

| Layer | Location | May | Must not |
|---|---|---|---|
| Route handler | `src/app/api/**/route.ts` | Guard → validate input → call **one** service method → return an envelope through `src/server/http` | Business rules, status checks, Prisma or repository access, hand-written try/catch (the wrapper maps errors) |
| Server page / layout | `src/app/**/page.tsx`, `layout.tsx` | Guard and redirect, call a service for initial data, pass DTOs to feature components | Prisma or repository access, business rules |
| Client component | `src/features/**`, `src/components/**` | UI state, call the API through `src/lib/api-client.ts`, render DTO fields such as `canRetry` | Decide business rules (for example which transitions are allowed), import `src/server/**` |
| Service | `src/server/services/**` | Orchestrate a use case, own transactions, enforce role and ownership, use the state machine, repositories, providers and mappers | Read `process.env`, import Next.js modules |
| Transition service | `src/server/services/order-transition.service.ts` | The **only** code that changes `orders.status`: assert the transition → conditional update → append the audit event, inside the caller's transaction | — |
| Repository | `src/server/repositories/**` | Prisma queries, optionally on a transaction client passed in; parameterised raw SQL where Prisma cannot express the query | Business decisions; starting their own transactions for multi-step use cases |
| Domain | `src/server/domain/**` | Pure logic: state machine, errors, hashing, address generation | Any I/O |
| Mapper | `src/server/mappers/**` | Entity → DTO with an explicit field whitelist; derived permissions (`canRetry`) computed with the state machine | Pass Prisma objects through |
| Provider | `src/server/providers/**` | Implement the `MailboxProvider` strategy | Touch the database |
| Worker | `src/server/worker/**` | Loop, signals, logging; calls `ProvisioningService` | Business rules beyond scheduling |

DTOs include derived permissions computed in the mapper, so components never re-implement rules.

Services are classes with constructor injection. `src/server/container.ts` is the only place that constructs them (composition root). Tests build their own container with a test Prisma client and fake providers.

---

## 6. Data model

Prisma models mapped to snake_case tables and columns with `@@map` / `@map`. All timestamps are `timestamptz`. All ids are UUIDs.

### users

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| email | text, unique | stored lowercased (CHECK) |
| name | text | |
| password_hash | text | bcrypt |
| role | enum `Role` (CUSTOMER, ADMIN) | |
| created_at, updated_at | timestamptz | |

### orders

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| user_id | uuid FK → users, ON DELETE RESTRICT | |
| domain | text | normalised; CHECK `domain = lower(domain)` |
| provider | enum `Provider` (google, microsoft) | lowercase values, as in the brief |
| mailbox_count | int | CHECK between 1 and 50 |
| status | enum `OrderStatus` (PENDING, PROVISIONING, ACTIVE, FAILED) | default PENDING |
| idempotency_key | text | UNIQUE (user_id, idempotency_key) |
| request_hash | text | |
| attempts | int, default 0 | incremented on every claim |
| locked_by | text, null | id of the worker holding the lease (fencing token) |
| locked_at | timestamptz, null | lease heartbeat, database clock |
| last_error | text, null | safe, human-readable summary |
| created_at, updated_at | timestamptz | |

Indexes: `(status, created_at)` for the worker claim, `(user_id, created_at)` for the customer list, `(status, provider, created_at)` for admin filters, `(created_at)` for the unfiltered admin list.

### mailboxes

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK → orders, ON DELETE CASCADE | |
| position | int | CHECK ≥ 1; UNIQUE (order_id, position) |
| address | text, unique | `box-NN-<first 8 chars of order id>@<domain>` |
| status | enum `MailboxStatus` (PENDING, ACTIVE, FAILED) | default PENDING |
| external_id | text, null | id returned by the provider |
| last_error | text, null | safe message |
| attempts | int, default 0 | |
| provisioned_at | timestamptz, null | |
| created_at, updated_at | timestamptz | |

### order_events (audit log, append-only)

| Column | Type | Notes |
|---|---|---|
| id | uuid PK | |
| order_id | uuid FK → orders, ON DELETE RESTRICT | |
| from_status | `OrderStatus`, null | null = creation event |
| to_status | `OrderStatus` | |
| actor_type | enum `ActorType` (CUSTOMER, ADMIN, WORKER, SYSTEM) | |
| actor_id | text, null | user id or worker id |
| actor_label | text, null | snapshot for display: user email or worker id |
| reason | text, null | e.g. "Retried by admin", "Worker lease expired" |
| metadata | jsonb, null | e.g. `{ active, failed, total }` |
| created_at | timestamptz | |

Index `(order_id, created_at)`. The repository exposes insert and read only, never update or delete.

CHECK constraints are added by editing the generated migration SQL **before** it is applied (`prisma migrate dev --create-only`), because Prisma's schema language cannot express them.

---

## 7. HTTP API contract

JSON only. Success: `{ "data": ... }`; lists add `"meta"`. Error: `{ "error": { "code", "message", "details"? } }`. Every API response sends `Cache-Control: no-store`. Mutating requests (POST) require `Content-Type: application/json` (when a body is sent) and an `Origin` header matching the host.

| Method and path | Who | Request | Success | Errors |
|---|---|---|---|---|
| POST `/api/auth/login` | public | `{ email, password }` | 200 `{ data: { user } }` + session cookie | 400, 401 `INVALID_CREDENTIALS` |
| POST `/api/auth/logout` | anyone | — | 200 `{ data: { ok: true } }`, cookie cleared | — |
| GET `/api/auth/me` | session | — | 200 `{ data: { user } }` | 401 |
| POST `/api/orders` | CUSTOMER | header `Idempotency-Key`; body `{ domain, provider, mailboxCount }` | 201 (new) / 200 (replay) `{ data: OrderDetail }` + `Idempotent-Replayed` | 400, 401, 403, 415, 422 |
| GET `/api/orders` | CUSTOMER | `?page&pageSize` | 200 `{ data: OrderSummary[], meta }` | 400, 401, 403 |
| GET `/api/orders/:id` | owner or ADMIN | — | 200 `{ data: OrderDetail }` | 401, 404 |
| GET `/api/admin/orders` | ADMIN | `?status&provider&page&pageSize` | 200 `{ data: AdminOrderSummary[], meta }` | 400, 401, 403 |
| POST `/api/admin/orders/:id/retry` | ADMIN | — | 200 `{ data: OrderDetail }` | 401, 403, 404, 409 |

`user` in auth responses: `{ id, email, name, role }`.

DTO shapes (types in `src/shared/types`):

- **OrderSummary**: id, domain, provider, mailboxCount, status, createdAt, updatedAt.
- **AdminOrderSummary**: OrderSummary + customerEmail, attempts, canRetry.
- **OrderDetail**: OrderSummary + attempts, lastError, canRetry, progress `{ total, active, failed, pending }`, mailboxes `[{ id, position, address, status, lastError, provisionedAt }]`, events `[{ id, fromStatus, toStatus, actorType, actorLabel, reason, metadata, createdAt }]` (oldest first).
- Never exposed: `password_hash`, `request_hash`, `idempotency_key`, `locked_by`, `locked_at`, `external_id`, other users' ids.

---

## 8. Error codes

Registry in `src/shared/errors/error-codes.ts`, used by the server (to build responses) and the client (to branch on codes).

| Code | HTTP | When |
|---|---|---|
| VALIDATION_ERROR | 400 | Zod validation failed; `details: [{ path, message }]` without echoing input values |
| INVALID_JSON | 400 | Body is not valid JSON or not an object |
| IDEMPOTENCY_KEY_REQUIRED | 400 | Header missing or malformed |
| UNAUTHENTICATED | 401 | No valid session |
| INVALID_CREDENTIALS | 401 | Login failed (same message for unknown email and wrong password) |
| FORBIDDEN | 403 | Wrong role |
| CSRF_REJECTED | 403 | Mutating request from another origin |
| NOT_FOUND | 404 | Missing resource, or an order the viewer may not see |
| INVALID_TRANSITION | 409 | State machine rejected the change; `details: { from, to }` |
| CONCURRENT_MODIFICATION | 409 | Conditional update matched no row because someone else changed the order first |
| PAYLOAD_TOO_LARGE | 413 | Body above 10 KB |
| UNSUPPORTED_MEDIA_TYPE | 415 | Body sent without `application/json` |
| IDEMPOTENCY_KEY_MISMATCH | 422 | Key reused with a different payload |
| INTERNAL_ERROR | 500 | Anything unexpected; generic message, stack logged server-side only |

---

## 9. Worker design

1. **Claim** (one short transaction): select the oldest PENDING order id with `FOR UPDATE SKIP LOCKED LIMIT 1`, then call the transition service for `PENDING → PROVISIONING` (actor WORKER), setting `locked_by` to this worker's id, `locked_at` to the database's `now()` and `attempts + 1`. Commit. Two workers can never claim the same row.
2. **Process** outside any transaction: for every mailbox that is not ACTIVE, call the provider with at most `PROVIDER_CONCURRENCY` calls in flight and a `PROVIDER_CALL_TIMEOUT_MS` timeout each. Update each mailbox row as soon as its call settles.
3. **Heartbeat** every `WORKER_HEARTBEAT_INTERVAL_MS`: set `locked_at = now()` only where the id matches, status is PROVISIONING and `locked_by` is this worker. If no row is updated, the lease is lost: stop starting new calls.
4. **Finalize** (one transaction): transition to ACTIVE or FAILED with the expected `locked_by` = this worker (fencing). If the conditional update matches no row, the result is discarded and logged; another actor already decided.
5. **Sweep**: PROVISIONING orders whose `locked_at` is older than `WORKER_LEASE_TIMEOUT_MS` (database clock) move to FAILED with actor SYSTEM and reason "Worker lease expired". Their unfinished mailboxes stay PENDING and are provisioned on retry.
6. **Shutdown**: SIGINT/SIGTERM stops claiming, waits for the current order up to `WORKER_SHUTDOWN_GRACE_MS`, disconnects Prisma and exits 0. A second signal exits immediately with code 1; the sweeper recovers the order later.
7. **Scale** by running more worker processes. Each process handles one order at a time.

---

## 10. Environment variables

One `.env` file at the repo root, read by Next.js, the Prisma CLI, the worker, the seed and the tests. No `.env.local`.

| Variable | Required | Default | Used by | Purpose |
|---|---|---|---|---|
| NODE_ENV | no | development | all | |
| DATABASE_URL | yes | — | app, worker, Prisma CLI, seed | Development database |
| TEST_DATABASE_URL | for integration tests | — | Vitest | Database name must end with `_test` |
| SESSION_SECRET | yes | development placeholder in `.env.example` | app | HS256 key, ≥ 32 chars; the placeholder is rejected when NODE_ENV=production |
| SESSION_TTL_HOURS | no | 8 | app | Cookie and token lifetime |
| SHOW_DEMO_CREDENTIALS | no | true | app (login page) | Show seeded logins on /login |
| LOG_LEVEL | no | info | app, worker | debug, info, warn, error |
| WORKER_POLL_INTERVAL_MS | no | 1000 | worker | Sleep when no order is pending |
| WORKER_HEARTBEAT_INTERVAL_MS | no | 5000 | worker | Lease renewal interval |
| WORKER_LEASE_TIMEOUT_MS | no | 60000 | worker | Must be greater than 3 × heartbeat |
| WORKER_SHUTDOWN_GRACE_MS | no | 30000 | worker | Wait for the in-flight order on shutdown |
| PROVIDER_CONCURRENCY | no | 5 | worker | Mailboxes provisioned in parallel per order (1–10) |
| PROVIDER_CALL_TIMEOUT_MS | no | 10000 | worker | Per provider call |
| MOCK_PROVIDER_MIN_DELAY_MS | no | 1000 | worker | Mock latency lower bound |
| MOCK_PROVIDER_MAX_DELAY_MS | no | 3000 | worker | Mock latency upper bound (≥ min) |
| MOCK_PROVIDER_FAILURE_RATE | no | 0.2 | worker | Probability that one mailbox call fails (0–1) |

---

## 11. Security baseline

- Validate every input with zod at the boundary; object schemas are `.strict()` so unknown fields are rejected.
- Session cookie: httpOnly, `SameSite=Lax`, `Secure` in production, path `/`. JWT HS256 with `iss`, `aud`, `exp`. The user is re-read from the database on every request, so role and existence are always current.
- CSRF: `Origin` must match the host on mutating requests, and bodies must be JSON.
- Login: one generic error for unknown email and wrong password; bcrypt compare against a dummy hash when the email is unknown, so timing does not reveal accounts.
- Authorisation lives in services (ownership, role), never only in the UI.
- Responses never contain secrets, stack traces, SQL or Prisma errors. Unexpected errors return a generic 500 and are logged server-side.
- Security headers in `next.config.ts` (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a minimal `Permissions-Policy`), `poweredByHeader: false`, `robots: noindex, nofollow` (internal tool).
- Raw SQL only in repositories, with parameters or constant literals.
- Documented limitations: no login rate limiting, no Content-Security-Policy (MUI/Emotion inline styles), idempotency keys never expire.

---

## 12. Testing strategy

- **Unit** (`tests/unit`, no database): state machine (full matrix), zod schemas, request hash, mailbox address, mappers, providers (injected random and sleep functions), session token, HTTP error mapping.
- **Integration** (`tests/integration`, real `mailbox_manager_test`): order creation including idempotent replay, payload mismatch and concurrent duplicates; admin retry; worker claim concurrency; processing; fencing; sweeper.
- The integration setup refuses to run unless the database name ends with `_test`, applies migrations with `prisma migrate deploy`, truncates every table before each test and runs test files one at a time.
- No test touches the development database or the network.

---

## 13. Conventions

- Server modules: kebab-case files with a role suffix (`order.service.ts`, `order.repository.ts`). React components: PascalCase files (`OrderStatusChip.tsx`).
- Named exports, except where Next.js requires default exports (pages, layouts).
- Booleans read as predicates: `isTerminal`, `canRetry`, `hasMore`.
- Shared limits and intervals live in `src/shared/constants.ts`; no magic numbers in components.
- The worker logs one JSON line per event with level, workerId, orderId and message. Logs contain ids and domains, never passwords, tokens or cookies.
- Conventional Commits, small and meaningful: `feat(orders): ...`, `feat(worker): ...`, `test(orders): ...`, `docs: ...`, `chore: ...`. One ticket = 1 to 3 commits. Push after every ticket.

---

## 14. Definition of done (every ticket)

1. Every acceptance criterion is verified, with the commands run and their results shown.
2. `npm run lint`, `npm run typecheck` and `npm test` pass; UI tickets also pass `npm run build`.
3. New env variables are added to `.env.example`, `src/server/config/env.ts` and section 10 of this document.
4. The layer audit is clean:
   - no imports of Prisma, `src/server/db` or `src/server/repositories` under `src/app`
   - no `process.env` outside `src/server/config/env.ts` (allowed exceptions: `next.config.ts`, `prisma.config.ts`, test setup files)
   - no write to `orders.status` outside `order-transition.service.ts`
   - no colour literals outside `src/styles`
   - no `src/server` imports in files starting with `'use client'`
5. Changes are committed with Conventional Commit messages and pushed to `main`.
