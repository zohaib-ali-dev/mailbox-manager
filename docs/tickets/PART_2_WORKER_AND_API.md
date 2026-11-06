# Mailbox Manager — Tickets · Part 2 (Phase 2 Provider & Worker, Phase 3 Auth & HTTP API)

Tickets 2.1 to 3.2. Requires Part 1 (Tickets 0.1–1.3) to be complete. Same workflow as Part 1: paste the prompt, review the plan Claude Code shows you, say "go", verify the acceptance criteria, let it commit and push, update your time log.

The worker comes before the HTTP API because it is the brief's second priority and does not depend on login. Ticket 2.2 includes a small command-line script so you can create orders and watch the worker before any screen exists.

---

## 🎫 TICKET 2.1 — Provider abstraction (Strategy): MailboxProvider interface, mock Google and Microsoft providers, registry, timeout

### Description

Define how the system talks to mailbox providers, so the worker never knows whether it is talking to Google or Microsoft. Two mock providers simulate a real API: a delay of a few seconds per call and roughly 20 % random failure. A registry picks the right provider for an order. Everything is deterministic in tests.

### Technical details

1. **`src/server/providers/mailbox-provider.ts`:** the `MailboxProvider` interface with a `name` (the provider enum value) and one method, `provisionMailbox(request)`, where the request carries `orderId`, `mailboxId`, `address`, `domain` and an `idempotencyKey` (the mailbox id, so a real provider could de-duplicate retries). It resolves with `{ externalId, provisionedAt }` or rejects with a `ProviderError`. `ProviderError` carries a client-safe message and a `retryable` flag; `ProviderTimeoutError` extends it.
2. **`src/server/providers/mock-mailbox.provider.ts`:** a configurable base class for mock providers. Options: `minDelayMs`, `maxDelayMs`, `failureRate`, an injectable random function (defaults to `Math.random`), an injectable sleep function (defaults to a real timer), an external-id prefix and a list of realistic failure messages. Each call waits a random delay within the bounds, then fails with probability `failureRate` (picking one of the messages) or succeeds with a unique external id.
3. **`google-mock.provider.ts`** and **`microsoft-mock.provider.ts`:** two separate classes built on the base, each with its own name, id prefix (`g-`, `ms-`) and its own failure messages (for example "Google Workspace API: rate limit exceeded", "Google Workspace API: domain verification pending", "Microsoft Graph: request throttled", "Microsoft Graph: tenant license unavailable"). Separate classes keep the Strategy pattern visible and make a third provider an additive change.
4. **`src/server/providers/provider-registry.ts`:** maps each provider enum value to its instance; `get(provider)` uses an exhaustive switch (a new enum value is a compile error until it is handled) and throws for unknown values at runtime. The container builds the registry from `env` (`MOCK_PROVIDER_*` values).
5. **`src/server/providers/with-timeout.ts`:** wraps a promise and rejects with `ProviderTimeoutError` after the given number of milliseconds, clearing its timer in every outcome.
6. **Unit tests** (no real waiting): with a fixed random sequence, the expected calls succeed and fail; `failureRate` 0 never fails over many calls; `failureRate` 1 always fails; the requested delay is always within the bounds (checked through the injected sleep); external ids are unique; failure messages differ per provider; the registry returns the right class for each provider; `withTimeout` rejects on time and leaves no timer running.

### Edge cases to handle

- `failureRate` outside 0–1 or min delay above max delay is already rejected by env validation; the base class also guards its own constructor arguments.
- No real network calls anywhere.
- Error messages contain nothing secret and are safe to show on the order detail page.
- Tests must not sleep for real (inject the sleep function).

### Acceptance criteria

- `npm run test:unit` passes, including the provider tests, in under a few seconds.
- Adding a third provider would only need a new class and a registry entry; nothing in the worker changes (explain this in one sentence in the PR/commit body).
- lint and typecheck pass; committed and pushed.

### Likely Claude Code mistakes

- Puts an `if (provider === 'google')` branch inside the worker instead of using the registry.
- Calls `Math.random` and `setTimeout` directly inside the provider, making tests slow or flaky.
- One class with a `name` parameter instead of two strategies (works, but weakens the pattern you have to explain).

### Claude Code Prompt

Read Ticket 2.1 in docs/tickets/PART_2_WORKER_AND_API.md, plus sections 4, 5 and 9 of docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md and CLAUDE.md. Show me a short plan first and wait for my go-ahead. Create the MailboxProvider interface with ProviderError (client-safe message and retryable flag) and ProviderTimeoutError, a configurable mock base class with injectable random and sleep functions, delay bounds, failure rate, external-id prefix and failure messages, separate Google and Microsoft mock provider classes with their own prefixes and realistic failure messages, a provider registry with an exhaustive switch built in the container from the MOCK_PROVIDER env values, and a withTimeout helper that always clears its timer. Write fast unit tests with injected random and sleep covering success and failure sequences, failure rates 0 and 1, delay bounds, unique external ids, per-provider messages, registry lookup and timeout behaviour. Run lint, typecheck and test:unit, then commit and push.

### This I need to do

Nothing.

---

## 🎫 TICKET 2.2 — Background worker: safe claiming with SKIP LOCKED, per-mailbox provisioning, heartbeat and fencing, stale-lease sweeper, graceful shutdown, dev CLI

### Description

The worker turns PENDING orders into ACTIVE or FAILED ones. The brief says running it twice must never process the same order twice, and 20 % of the grade is correctness and robustness, so this ticket is about safety: claiming with `FOR UPDATE SKIP LOCKED`, a lease with heartbeat, fencing on the final write, recovery when a worker dies, and clean shutdown. Includes a small CLI to create orders before the UI exists.

### Technical details

1. **Entry point** `src/server/worker/main.ts`, started by `npm run worker` (runs with `tsx`, loads `.env` with `dotenv`). Generates a worker id `<hostname>:<pid>:<short random>` and logs its effective settings at start (no secrets).
2. **Claim** — `ProvisioningService.claimNextOrder(workerId)`: one short interactive transaction. A parameter-free raw query in `OrderRepository` selects the id of the oldest PENDING order (`ORDER BY created_at, id`) with `FOR UPDATE SKIP LOCKED LIMIT 1`, using the mapped table and column names. If none, return null. Otherwise call `OrderTransitionService.transition` for PENDING → PROVISIONING (actor WORKER, label = worker id) setting `locked_by` to the worker id, `locked_at` to the database time and incrementing `attempts`. Commit. The row lock held between the select and the update guarantees no other worker can claim the same order.
3. **Process** — `ProvisioningService.processOrder(orderId, workerId)`, **outside any transaction**: load the mailboxes that are not ACTIVE; get the provider strategy from the registry; call `provisionMailbox` for each with at most `PROVIDER_CONCURRENCY` calls in flight (`p-limit` or a tiny hand-written pool) and `withTimeout(PROVIDER_CALL_TIMEOUT_MS)`. On success: mailbox ACTIVE, `external_id`, `provisioned_at`, attempts + 1 (conditional on the mailbox not already being ACTIVE). On failure: mailbox FAILED, safe `last_error`, attempts + 1.
4. **Heartbeat** every `WORKER_HEARTBEAT_INTERVAL_MS` while processing: update `locked_at` to the database time where id matches, status is PROVISIONING and `locked_by` is this worker. If no row is updated, the lease is lost: stop starting new provider calls, let in-flight calls settle, and skip finalisation. The heartbeat timer is always cleared when processing ends.
5. **Finalize** — one transaction: count mailbox statuses; all ACTIVE → transition PROVISIONING → ACTIVE with metadata `{ active, total }`; otherwise PROVISIONING → FAILED with metadata `{ active, failed, total }` and `last_error` "N of M mailboxes failed". Both pass `expectedLockedBy` = this worker (fencing) and clear `locked_by` / `locked_at`. If the transition reports a concurrent modification, log "lease lost, result discarded" and move on.
6. **Sweeper** — `ProvisioningService.failStaleOrders()`: finds PROVISIONING orders whose `locked_at` is older than `WORKER_LEASE_TIMEOUT_MS` **by the database clock**, locks them with `SKIP LOCKED`, and transitions each to FAILED (actor SYSTEM, reason "Worker lease expired", metadata with the previous worker id), clearing the lock fields. Runs at the start of every loop iteration (cheap indexed query).
7. **Loop** (`worker.ts`): while running → sweep → claim → if an order was claimed, process and finalize it; otherwise sleep `WORKER_POLL_INTERVAL_MS`. Errors inside one iteration are logged and followed by a short backoff; the loop never dies silently. If the database is unreachable at start, retry with backoff and a clear log line.
8. **Shutdown:** on SIGINT or SIGTERM stop claiming, wait for the current order to finish (up to `WORKER_SHUTDOWN_GRACE_MS`), disconnect Prisma, exit 0. A second signal exits immediately with code 1 (the sweeper will recover that order later).
9. **Logger** (`logger.ts`): one JSON line per event with time, level, workerId, orderId (when relevant) and message; honours `LOG_LEVEL`; idle polling logs at debug level only, so the terminal is not flooded.
10. **Dev CLI** `scripts/create-order.ts` (`npm run order:create -- --email customer@example.com --domain example.com --provider google --count 3`): creates an order through `OrderService` with a random idempotency key and prints its id. Refuses to run in production.
11. **Integration tests** (`tests/integration/worker.test.ts`), using zero-delay providers with a controlled failure rate:
    - two concurrent `claimNextOrder` calls with one PENDING order → exactly one gets it;
    - ten PENDING orders and three concurrent claim loops → ten distinct claims, no duplicates;
    - failure rate 0 → order ACTIVE, all mailboxes ACTIVE, events PENDING → PROVISIONING → ACTIVE (actor WORKER);
    - failure rate 1 → order FAILED, all mailboxes FAILED, metadata counts correct;
    - partial failure, then admin retry, then process again → only the previously failed mailboxes are called again (ACTIVE mailboxes keep their original `provisioned_at` and `external_id`);
    - fencing: an order whose `locked_by` changed during processing is not finalised by the old worker;
    - sweeper: a PROVISIONING order with an old `locked_at` becomes FAILED with a SYSTEM event; a fresh one is untouched.

### Edge cases to handle

- Never hold a database transaction open during provider calls (long locks, connection exhaustion).
- Lease comparisons use the database clock (`now()`), never the worker's clock, so workers on different machines agree.
- Raw SQL uses the snake_case table and column names from the `@@map` mapping, and enum comparisons work against the Postgres enum type.
- Orders created while no worker is running are picked up later, oldest first.
- Ctrl + C during a provider call: graceful path waits; a second Ctrl + C exits; nothing is left half-written that the sweeper cannot fix.
- A crashed worker's order is recovered by the sweeper of any other (or the restarted) worker.

### Acceptance criteria

- `npm run test:integration` passes all worker cases above.
- Manual check (Claude Code runs it and shows the output): start two workers in two terminals, create five orders with the CLI, and show from the `order_events` table that each order has exactly one PENDING → PROVISIONING event.
- Manual check: start a worker, create a 20-mailbox order, kill the worker hard (`kill -9`) while it is PROVISIONING, start a worker again; after the lease timeout the order is FAILED by SYSTEM.
- Ctrl + C on an idle worker exits within a second with code 0.
- lint, typecheck and all tests pass; committed and pushed.

### Likely Claude Code mistakes

- Claims with `findFirst` then `update` (a race: two workers take the same order) instead of `FOR UPDATE SKIP LOCKED`.
- Wraps the whole provisioning (with multi-second provider calls) in one transaction.
- Compares lease age with the JavaScript `Date` instead of the database's `now()`.
- Finalises without the `locked_by` check, overwriting a result the sweeper already decided.
- Uses quoted Prisma model names (`"Order"`) in raw SQL instead of the mapped table names.
- Imports a module that pulls in `server-only` or `next/headers`, so `npm run worker` crashes on start.

### Claude Code Prompt

Read Ticket 2.2 in docs/tickets/PART_2_WORKER_AND_API.md, plus section 9 of docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md and CLAUDE.md. Show me a short plan first and wait for my go-ahead. Implement a ProvisioningService with claimNextOrder (one short transaction that selects the oldest PENDING order id with FOR UPDATE SKIP LOCKED LIMIT 1 using the mapped snake_case names, then transitions PENDING to PROVISIONING through OrderTransitionService with locked_by, database-time locked_at and attempts plus one), processOrder (outside any transaction, only non-active mailboxes, provider from the registry, bounded concurrency and per-call timeout, each mailbox updated as its call settles), a heartbeat that renews the lease with the database clock and stops new calls when the lease is lost, finalize with fencing on locked_by and a FAILED summary of N of M mailboxes, and failStaleOrders that moves expired PROVISIONING orders to FAILED as SYSTEM. Add the worker loop, entry point, JSON logger and graceful shutdown on SIGINT and SIGTERM with a forced exit on the second signal, the npm run worker script, and scripts/create-order.ts behind npm run order:create. Make sure nothing the worker imports pulls in server-only or Next modules. Write integration tests for concurrent claims, ten orders across three claimers, success, full failure, partial failure plus retry re-provisioning only failed mailboxes, fencing and the sweeper. Then run two workers, create five orders with the CLI and show me from order_events that each was claimed exactly once, and demonstrate crash recovery with kill -9. Commit in small Conventional Commits and push.

### This I need to do

1. Watch the two-worker demo Claude Code runs. You will repeat it in your own terminals to understand it: open two VS Code terminals, run `npm run worker` in each, then in a third run `npm run order:create -- --email customer@example.com --domain example.com --provider google --count 3` a few times and watch which worker picks up each order.
2. Press **Ctrl + C** in each worker terminal to stop them.
3. Time log: checkpoint 1:55.

---

## 🎫 TICKET 3.1 — Authentication and HTTP foundation: session cookie, guards, login/logout/me, route wrapper, error envelope, same-origin check

### Description

Let the seeded users sign in, and build the HTTP layer every route handler uses: one wrapper that validates, maps errors to the standard envelope and never leaks internals. Sessions are a signed JWT in an httpOnly cookie; the user is re-read from the database on every request so role changes and deletions take effect immediately.

### Technical details

1. **`src/server/auth/session-token.ts`** (pure, no Next imports): sign and verify HS256 JWTs with `jose` using `SESSION_SECRET`; claims `sub` (user id), `role`, `iat`, `exp` (`SESSION_TTL_HOURS`), `iss` `mailbox-manager`, `aud` `mailbox-manager-web`. Verification rejects wrong signature, wrong issuer or audience and expired tokens.
2. **`src/server/auth/session.ts`** (imports `server-only` and `next/headers`): read, set and clear the `mm_session` cookie (httpOnly, `SameSite=Lax`, `Secure` when `NODE_ENV` is production, path `/`, max age = TTL).
3. **`src/server/auth/guards.ts`** (`server-only`): `getCurrentViewer()` verifies the cookie, loads the user through the container (so a deleted user or changed role is respected), returns a `Viewer` or null; `requireViewer()`, `requireCustomer()`, `requireAdmin()` throw `UnauthorizedError` / `ForbiddenError`.
4. **`AuthService.login(email, password)`:** finds the user by lowercased email; when no user exists it still runs a bcrypt compare against the dummy hash (so response time does not reveal which emails exist); any failure throws `InvalidCredentialsError` with one generic message.
5. **HTTP layer** (`src/server/http`):
   - `route(handler)` wrapper: runs the handler and maps every thrown error: `AppError` → its status, code, message and details; a ZodError → 400 `VALIDATION_ERROR` with `details` `[{ path, message }]` (never echoing input values); anything else → 500 `INTERNAL_ERROR` with a generic message, while the real error and stack are logged server-side.
   - Response helpers: `ok(data, meta?)`, `created(data)`, all with `Cache-Control: no-store`, success shape `{ data }` or `{ data, meta }`, error shape `{ error: { code, message, details? } }`.
   - `readJsonBody(request, schema)`: requires `Content-Type: application/json` (415 otherwise), limits the body to 10 KB (413), maps invalid JSON or a non-object body to 400 `INVALID_JSON`, then validates with the schema.
   - `assertSameOrigin(request)`: for mutating methods, the `Origin` header (or `Referer` when Origin is absent) must match the request host, otherwise 403 `CSRF_REJECTED`.
6. **Routes:**
   - `POST /api/auth/login`: same-origin check → read and validate the body → `AuthService.login` → set the cookie → 200 `{ data: { user: { id, email, name, role } } }`.
   - `POST /api/auth/logout`: same-origin check → clear the cookie → 200 `{ data: { ok: true } }` even if no one was logged in.
   - `GET /api/auth/me`: `requireViewer` → 200 with the user, or 401.
   Each handler is a few lines: no business logic.
7. **Unit tests:** session token (round trip, expired, tampered payload, wrong secret, wrong audience); password hash/verify; the error mapper for every error class, a ZodError and an unknown error (asserting no stack or message leak); `readJsonBody` for wrong content type, oversized body, invalid JSON and an array body; `assertSameOrigin` for matching, mismatching and missing origins.

### Edge cases to handle

- Email matching is case-insensitive (`Customer@Example.com` logs in).
- Unknown email and wrong password produce the same status, code and message.
- A valid token for a user that no longer exists is treated as logged out.
- The role always comes from the database, never from the token alone.
- The cookie is never set when login fails.
- `server-only` and `next/headers` appear only in `session.ts` and `guards.ts`; services and the worker still import cleanly from plain Node (prove it by running `npm run worker` for two seconds).
- No login rate limiting (documented as a known limitation in Ticket 5.1).

### Acceptance criteria

- Claude Code demonstrates with `curl` (sending a matching `Origin` header): login as `customer@example.com` sets the cookie; `GET /api/auth/me` with that cookie returns the user; logout clears it; `me` then returns 401.
- Wrong password and unknown email both return 401 `INVALID_CREDENTIALS` with identical messages.
- Malformed JSON returns 400 `INVALID_JSON` in the standard envelope; a request with `Origin: http://evil.test` returns 403 `CSRF_REJECTED`.
- Unit tests pass; the worker still starts.
- lint and typecheck pass; committed and pushed.

### Likely Claude Code mistakes

- Stores the token in `localStorage` or returns it in the JSON body.
- Returns `password_hash` inside the user object.
- Different messages for unknown email vs wrong password.
- Imports `next/headers` inside a service, breaking the worker and the tests.
- Hand-written try/catch in every route instead of the shared wrapper.

### Claude Code Prompt

Read Ticket 3.1 in docs/tickets/PART_2_WORKER_AND_API.md, plus sections 4, 5, 7, 8 and 11 of docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md and CLAUDE.md. Show me a short plan first and wait for my go-ahead. Implement a pure jose HS256 session token module with iss, aud and exp; session.ts and guards.ts as the only server-only modules, handling the httpOnly SameSite Lax mm_session cookie and getCurrentViewer, requireViewer, requireCustomer and requireAdmin that re-read the user from the database; and AuthService.login with lowercased email lookup, a dummy-hash comparison for unknown emails and one generic InvalidCredentialsError. Build src/server/http with a route wrapper that maps AppError, ZodError and unknown errors to the standard envelope without leaking internals, ok and created helpers with Cache-Control no-store, readJsonBody enforcing JSON content type, a 10 KB limit and object bodies, and assertSameOrigin for mutating requests. Add thin route handlers for POST /api/auth/login, POST /api/auth/logout and GET /api/auth/me. Write unit tests for tokens, passwords, the error mapper, body reading and the origin check. Demonstrate login, me, logout and the failure cases with curl, prove npm run worker still starts, then commit in small Conventional Commits and push.

### This I need to do

Nothing. (The seeded logins are `customer@example.com` / `Customer123!` and `admin@example.com` / `Admin123!`.)

---

## 🎫 TICKET 3.2 — Orders HTTP API: idempotent create, customer list, order detail, admin list with filters and pagination, admin retry

### Description

Expose the order use cases over HTTP exactly as System Design §7 specifies. Every handler is thin: guard, parse, call one service method, respond. All rules already live in the services from Ticket 1.3.

### Technical details

1. **`POST /api/orders`:** same-origin check → `requireCustomer` (admins get 403) → read the `Idempotency-Key` header and validate it (missing or malformed → 400 `IDEMPOTENCY_KEY_REQUIRED`) → `readJsonBody` with `createOrderSchema` → `OrderService.createOrder` → **201** with `Idempotent-Replayed: false` for a new order, **200** with `Idempotent-Replayed: true` for a replay; payload mismatch → 422 `IDEMPOTENCY_KEY_MISMATCH`.
2. **`GET /api/orders`:** `requireCustomer` → validate `page` and `pageSize` → `listOrdersForCustomer` → `{ data: OrderSummary[], meta }`.
3. **`GET /api/orders/[id]`:** `requireViewer` → an id that is not a UUID → 404 → `getOrderForViewer` → `{ data: OrderDetail }`. This is the endpoint the detail page polls.
4. **`GET /api/admin/orders`:** `requireAdmin` → validate `status`, `provider`, `page`, `pageSize` (invalid values → 400 `VALIDATION_ERROR`) → `listOrdersForAdmin` → `{ data: AdminOrderSummary[], meta }`.
5. **`POST /api/admin/orders/[id]/retry`:** same-origin check → `requireAdmin` → `retryOrder` → 200 `{ data: OrderDetail }`; not FAILED → 409 `INVALID_TRANSITION` with `details: { from, to }`; unknown id → 404.
6. Route `params` are awaited (asynchronous in current Next.js). No route handler imports Prisma, repositories or the state machine.
7. **Route-level integration test** (`tests/integration/orders-api.test.ts`): calls the exported `POST` handler of `/api/orders` with a constructed `Request`, with the session module mocked to return a seeded customer, and asserts: 201 + header on first call, 200 + replay header on the same key, 422 on a changed payload, 400 without the key, 400 on a string count, 403 for an admin viewer, 415 without JSON content type. (First thing to cut if you are behind; the service-level test from 1.3 already satisfies the brief.)

### Edge cases to handle

- The `Idempotency-Key` header is read case-insensitively (standard `Headers` behaviour).
- An extra body field, a string count ("5"), a count of 0 or 51 → 400 with field details.
- `page=0`, `page=-1`, `page=abc`, `pageSize=51` → 400.
- Status filter values must be the exact uppercase statuses; provider filter values lowercase.
- A customer calling any `/api/admin/*` route → 403; anyone without a session → 401.
- Methods that are not defined (e.g. `DELETE /api/orders`) → Next.js 405 automatically.
- Retrying twice quickly: the second call → 409, never 500.

### Acceptance criteria

- Claude Code demonstrates with `curl` and a customer cookie: create (201 + `Idempotent-Replayed: false`); same request again (200 + same id + `Idempotent-Replayed: true`); same key with a different count (422); no key (400); list (200 with `meta`); detail (200).
- With the admin cookie: list with `?status=FAILED&provider=microsoft&page=1&pageSize=10` (200, only matching rows); retry a seeded FAILED order (200, status PENDING, new ADMIN event in `events`); retry an ACTIVE order (409).
- With the customer cookie: opening another customer's order id → 404; `GET /api/admin/orders` → 403.
- A search shows no imports of Prisma, `src/server/db` or `src/server/repositories` under `src/app` (show the command and empty output).
- All tests pass; lint and typecheck pass; committed and pushed.

### Likely Claude Code mistakes

- Puts status or ownership checks inside a route handler ("if order.status !== 'FAILED'") instead of relying on the service.
- Forgets to await `params`.
- Returns 500 for a zod error or for a duplicate-key race.
- Returns the raw Prisma order (leaking `request_hash`, `locked_by`, `idempotency_key`).

### Claude Code Prompt

Read Ticket 3.2 in docs/tickets/PART_2_WORKER_AND_API.md, plus sections 3, 5, 7 and 8 of docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md and CLAUDE.md. Show me a short plan first and wait for my go-ahead. Add thin route handlers using the src/server/http wrapper: POST /api/orders (same-origin, customer only, validated Idempotency-Key header, JSON body with createOrderSchema, 201 or 200 with the Idempotent-Replayed header, 422 on mismatch), GET /api/orders with pagination, GET /api/orders/[id] returning 404 for non-UUID ids and orders the viewer may not see, GET /api/admin/orders with validated status, provider and pagination filters, and POST /api/admin/orders/[id]/retry returning 409 INVALID_TRANSITION when the order is not FAILED. Await route params, keep every handler to guard, parse, one service call and respond, and import nothing from Prisma, repositories or the domain in src/app. Add tests/integration/orders-api.test.ts calling the POST handler with a mocked session for the cases listed in the ticket. Demonstrate every acceptance criterion with curl for both roles, show me a search proving src/app has no Prisma or repository imports, run all tests, then commit in small Conventional Commits and push.

### This I need to do

1. Time log: checkpoint 2:30. If you are behind, skip the route-level test (step 7) and add it to the "Unfinished" list.
2. Optional: start `npm run worker` in a second terminal while Claude Code demonstrates the retry, so you see the retried order go back to PROVISIONING.

---

*Continue with **Part 3** (`PART_3_UI_AND_DELIVERY.md`): theme and shell, admin and customer screens, README, ARCHITECTURE.md, AI_WORKLOG.md and the demo video.*
