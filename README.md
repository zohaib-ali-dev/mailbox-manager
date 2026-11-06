# Mailbox Manager

**🎬 Demo video: [https://youtu.be/z4s4yHosa_0](https://youtu.be/z4s4yHosa_0)**

## In one minute

**What it is:** an internal tool for a company that sells pre-warmed Google and Microsoft
mailboxes. A **customer** orders mailboxes for a domain. A **background worker** creates each
mailbox through a mocked provider (1 to 3 s per mailbox, about 20 % random failure). An **admin**
sees every order, reads its audit log and retries failed ones.

**How it flows:** `PENDING -> PROVISIONING -> ACTIVE or FAILED`, and an admin retry moves
`FAILED -> PENDING`. Every change is written to an audit log shown on the order page. Creating an
order is idempotent (double clicks and retries never make two orders), and two workers never
process the same order.

**Stack:** Next.js 16 (UI and API in one app), TypeScript strict, MUI 9, PostgreSQL + Prisma 7,
Zod 4, cookie sessions with `jose` + `bcryptjs`, a separate Node worker (`tsx`), Vitest.

**Accounts** (seeded; there is no sign-up):

| Role     | Email                   | Password       |
| -------- | ----------------------- | -------------- |
| Admin    | `admin@example.com`     | `Admin123!`    |
| Customer | `customer@example.com`  | `Customer123!` |
| Customer | `customer2@example.com` | `Customer123!` |

## Set up in under 5 minutes

You need **Node 22+**, **npm** and **Docker Desktop (running)**. From an empty folder:

```bash
git clone git@github.com:zohaib-ali-dev/mailbox-manager.git
cd mailbox-manager
cp .env.example .env                 # works unchanged: Docker DB on port 5433, dev-only secret
docker compose up -d --wait          # Postgres 16; --wait returns once the database is healthy
npm ci                               # installs and generates the Prisma client
npm run db:deploy && npm run db:seed # tables, then 3 users and 12 sample orders
```

Then start two processes (two terminals):

```bash
npm run dev      # app on http://localhost:3000
npm run worker   # background worker; without it, orders stay Pending
```

Open http://localhost:3000, click **Use** next to an account on the login page, then **Sign in**.
A clean clone took about 3 minutes end to end in testing.

**No Docker, but PostgreSQL is installed locally?** Run `scripts/db/setup-local.sh` (creates only
the `mailbox_manager` role and two databases; safe to run twice), then in `.env` switch both
database URLs to port **5432** (the commented lines in `.env.example` show them). Continue with
`npm ci` and the rest as above.

**Check it works:** `npm test` (about 15 s; unit tests, then integration tests against the
`_test` database, which Docker and the local script both create).

## Try it (2 minutes)

1. Sign in as the **customer**, click **New order**, order **1** Google mailbox: it turns Active in
   a few seconds while you watch.
2. Order **20** Microsoft mailboxes: with 20 % failure per mailbox it almost always ends **Failed**.
   The page shows which mailboxes failed and why.
3. Sign out, sign in as the **admin**, filter **Failed**, open that order, read the audit log and
   click **Retry**: only the failed mailboxes are sent again.

Notifications appear at the bottom centre of the screen (signed in, signed out, order placed, order
ready or failed, retry queued). Hover a status or provider chip, a column header with an info icon,
a progress number or an audit-log actor for an explanation.

## For AI coding agents

Read these, in this order, before changing anything:

1. [`CLAUDE.md`](CLAUDE.md): commands, ticket workflow and the **hard rules** (layering, the single
   writer of order status, no `process.env` outside `env.ts`, colours only through tokens).
2. [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md): diagrams and the 12 patterns with file paths.
3. [`docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md`](docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md):
   the full design (data model, API contract, error codes, worker design, env vars).

Verify any change with `npm run lint`, `npm run typecheck`, `npm test` and, for UI changes,
`npm run build`.

### Project map

| Path                                              | What lives there                                                         |
| ------------------------------------------------- | ------------------------------------------------------------------------ |
| `src/app/`                                        | Pages and `api/**/route.ts` handlers: guard, parse, one service call     |
| `src/server/services/`                            | Business rules: orders, retries, auth, provisioning (the worker's logic) |
| `src/server/services/order-transition.service.ts` | The only code that changes an order's status                             |
| `src/server/domain/`                              | State machine, error classes, request hash, mailbox addresses            |
| `src/server/repositories/`                        | All database queries (Prisma, plus raw SQL for `SKIP LOCKED`)            |
| `src/server/providers/`                           | Mock Google and Microsoft providers behind one interface                 |
| `src/server/worker/`                              | Worker entry point and loop (`npm run worker`)                           |
| `src/server/http/`                                | Route wrapper, JSON envelope, body limits, same-origin check             |
| `src/server/auth/`                                | Session cookie, guards, password hashing                                 |
| `src/server/container.ts`                         | Wires repositories, providers and services together                      |
| `src/shared/`                                     | Zod schemas, DTO types, constants, error codes (browser-safe)            |
| `src/features/`, `src/components/`                | UI components; `src/styles/` holds the theme and colour tokens           |
| `prisma/`                                         | Schema, migrations (with CHECK constraints) and the seed                 |
| `tests/unit/`, `tests/integration/`               | Vitest suites; integration uses the `_test` database only                |

## Scripts

| Script                     | What it does                                                                 |
| -------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`              | App on port 3000                                                             |
| `npm run worker`           | Background worker (run two to see safe parallel processing)                  |
| `npm run order:create`     | Create an order from the terminal, e.g. `-- --count 20 --provider microsoft` |
| `npm test`                 | Unit and integration tests                                                   |
| `npm run test:unit`        | Unit tests only (no database)                                                |
| `npm run test:integration` | Integration tests only (test database)                                       |
| `npm run test:watch`       | Unit tests in watch mode                                                     |
| `npm run lint`             | ESLint, including a rule that blocks hard-coded colours                      |
| `npm run typecheck`        | Route type generation, then `tsc --noEmit`                                   |
| `npm run format`           | Prettier write (`npm run format:check` only checks)                          |
| `npm run build`            | Production build (`npm start` serves it; see Troubleshooting)                |
| `npm run db:deploy`        | Apply migrations                                                             |
| `npm run db:seed`          | Seed users and sample orders (safe to run again)                             |
| `npm run db:migrate`       | Create and apply a new migration in development                              |
| `npm run db:reset`         | Drop and recreate the development database                                   |
| `npm run db:generate`      | Regenerate the Prisma client (also runs on install)                          |
| `npm run db:studio`        | Browse the database in Prisma Studio                                         |

## How it works

An order (domain, provider, 1 to 50 mailboxes) is saved with all of its mailboxes and a creation
audit event in one transaction. The browser sends an `Idempotency-Key` header; with a unique
`(user_id, idempotency_key)` constraint the same request can never create two orders. The worker
claims the oldest PENDING order with `FOR UPDATE SKIP LOCKED`, calls the provider for each mailbox
outside any transaction, keeps a heartbeat lease and finalizes with an update fenced on its own
worker id; a sweeper fails orders whose worker died. One transition service checks every status
change against the state machine and writes the audit event in the same transaction. Full detail:
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## API

JSON only: `{ data, meta? }` on success, `{ error: { code, message, details? } }` on failure, always
`Cache-Control: no-store`. POST requests must come from the same origin.

| Method | Path                          | Who            | Purpose                                     |
| ------ | ----------------------------- | -------------- | ------------------------------------------- |
| POST   | `/api/auth/login`             | anyone         | Sign in (sets an httpOnly session cookie)   |
| POST   | `/api/auth/logout`            | anyone         | Sign out                                    |
| GET    | `/api/auth/me`                | signed in      | Current user                                |
| POST   | `/api/orders`                 | customer       | Create an order (`Idempotency-Key` header)  |
| GET    | `/api/orders`                 | customer       | Own orders, paginated                       |
| GET    | `/api/orders/:id`             | owner or admin | Order with mailboxes and audit log          |
| GET    | `/api/admin/orders`           | admin          | All orders, `status` and `provider` filters |
| POST   | `/api/admin/orders/:id/retry` | admin          | Retry a FAILED order                        |

## Demo tips

- Failure is about 20 % **per mailbox** and an order is Active only if every mailbox is, so 1 or 2
  mailboxes usually succeed and 20 or more usually fail.
- Retry re-sends only the failed mailboxes; active ones keep their result.
- Run `npm run worker` in two terminals: each order is still processed exactly once.
- `npm run order:create -- --email customer@example.com --domain example.com --provider google --count 3`
  creates an order without the browser.
- `MOCK_PROVIDER_FAILURE_RATE`, `MOCK_PROVIDER_MIN_DELAY_MS` and `MOCK_PROVIDER_MAX_DELAY_MS` in
  `.env` tune the mock (restart the worker afterwards). Every variable is explained in
  `.env.example`.

## Known limitations

- No login rate limiting.
- No Content-Security-Policy (MUI and Emotion inject inline styles).
- Idempotency keys never expire.
- Live updates use polling (every 2 s on the order page), not push.
- Non-ASCII domains must be entered in punycode (`xn--...`).
- One order at a time per worker process; run more workers to scale.
- Mailbox addresses are generated (`box-NN-<order id prefix>@<domain>`), not chosen.
- No sign-up: only the seeded users exist.

## Unfinished

None. Every requirement in the brief is implemented.

## Troubleshooting

- **Port 5433 already in use:** stop whatever uses it, or change the host port in
  `docker-compose.yml` and both URLs in `.env`.
- **Port 3000 already in use:** stop the other app, or run `npm run dev -- -p 3001`.
- **`docker compose up --wait` not recognised:** update Docker Desktop, or run
  `docker compose up -d` and wait about 10 seconds before `npm run db:deploy`.
- **"Can't reach database server":** start Docker Desktop, then `docker compose up -d --wait`.
- **Node version errors:** use Node 22 or newer (`.nvmrc` says 22; `nvm use`).
- **"Cannot find module '@/generated/prisma'" after pulling:** run `npm run db:generate`.
- **Orders stay Pending:** the worker is not running; start `npm run worker`.
- **`npm start` stops with "SESSION_SECRET: is the development placeholder":** production mode
  refuses the `.env.example` secret on purpose. Generate one with `openssl rand -base64 48` and put
  it in `.env` (`npm run build` itself works with the placeholder).
- **"Invalid environment configuration":** the message names the missing or invalid variables;
  compare `.env` with `.env.example`.
