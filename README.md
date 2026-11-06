# Mailbox Manager

Demo video: <link>

An internal tool for a company that sells pre-warmed Google and Microsoft mailboxes. Customers
create idempotent orders, a background worker provisions every mailbox through a mocked provider,
and admins filter all orders, read each order's audit log and retry failed ones.

**Stack:** Next.js 16 (App Router, route handlers for the API), TypeScript (strict), MUI 9,
PostgreSQL with Prisma 7, Zod 4, `jose` + `bcryptjs` sessions, a separate Node worker run with
`tsx`, Vitest.

## Quick start with Docker (reviewer path)

Prerequisites: Node 22 or newer, npm, Docker Desktop running.

```bash
git clone git@github.com:zohaib-ali-dev/mailbox-manager.git
cd mailbox-manager
cp .env.example .env          # works as is: Docker port 5433 and a development-only secret
docker compose up -d          # Postgres 16 on localhost:5433, creates the dev and test databases
npm ci                        # also runs prisma generate
npm run db:deploy             # applies the migrations
npm run db:seed               # 3 users and 12 sample orders
```

Then, in two terminals:

```bash
npm run dev       # terminal 1: the app on http://localhost:3000
npm run worker    # terminal 2: the background worker
```

Open http://localhost:3000 and sign in with one of the accounts below (the login page also has
"Use" buttons that fill them in).

## Alternative: an existing local PostgreSQL

If you already run PostgreSQL locally with password-less superuser access (`psql -d postgres`
works), skip Docker:

```bash
scripts/db/setup-local.sh     # creates only the mailbox_manager role and the two databases
cp .env.example .env
```

In `.env`, switch both URLs to port 5432 (the commented lines in `.env.example`):

```
DATABASE_URL=postgresql://mailbox_manager:mailbox_manager@localhost:5432/mailbox_manager_dev
TEST_DATABASE_URL=postgresql://mailbox_manager:mailbox_manager@localhost:5432/mailbox_manager_test
```

Then continue with `npm ci`, `npm run db:deploy` and `npm run db:seed` as above. The script is
idempotent, honours `PGHOST` and `PGPORT`, and never touches other roles or databases.
`scripts/db/teardown-local.sh` removes exactly what it created.

## Logins

| Role     | Email                   | Password       |
| -------- | ----------------------- | -------------- |
| Admin    | `admin@example.com`     | `Admin123!`    |
| Customer | `customer@example.com`  | `Customer123!` |
| Customer | `customer2@example.com` | `Customer123!` |

## Running tests

```bash
npm test                  # unit, then integration
npm run test:unit         # no database, no network
npm run test:integration  # needs the test database
```

Integration tests run against `TEST_DATABASE_URL` and refuse to start unless the database name
ends in `_test`. Docker creates `mailbox_manager_test` automatically; the local path creates it
with `scripts/db/setup-local.sh`. Migrations are applied to it on every run.

## Scripts

| Script                     | What it does                                                                 |
| -------------------------- | ---------------------------------------------------------------------------- |
| `npm run dev`              | Next.js dev server on port 3000                                              |
| `npm run build`            | Production build                                                             |
| `npm start`                | Serve the production build                                                   |
| `npm run worker`           | Background worker (run several for more throughput)                          |
| `npm run order:create`     | Create an order from the terminal, e.g. `-- --count 20 --provider microsoft` |
| `npm run lint`             | ESLint, including the no-hard-coded-colour rule                              |
| `npm run typecheck`        | Route type generation, then `tsc --noEmit`                                   |
| `npm run format`           | Prettier write                                                               |
| `npm run format:check`     | Prettier check                                                               |
| `npm test`                 | Unit and integration tests                                                   |
| `npm run test:unit`        | Unit tests only                                                              |
| `npm run test:integration` | Integration tests only (test database)                                       |
| `npm run test:watch`       | Unit tests in watch mode                                                     |
| `npm run db:generate`      | `prisma generate` (also runs on install)                                     |
| `npm run db:migrate`       | Create and apply a migration in development, then regenerate                 |
| `npm run db:deploy`        | Apply migrations                                                             |
| `npm run db:seed`          | Seed users and sample orders (idempotent)                                    |
| `npm run db:reset`         | Drop and recreate the development database                                   |
| `npm run db:studio`        | Prisma Studio                                                                |

## How it works

A customer's order (domain, provider, 1 to 50 mailboxes) is written together with its mailboxes
and a creation audit event in one transaction. The `Idempotency-Key` header plus a unique
`(user_id, idempotency_key)` constraint make retries and double clicks safe. The worker claims the
oldest PENDING order with `FOR UPDATE SKIP LOCKED`, provisions each mailbox outside any
transaction, keeps a heartbeat lease and finalizes with a fenced update; a sweeper fails orders
whose worker died. Every status change goes through one transition service that checks a state
machine and appends to the audit log in the same transaction. Details, diagrams and the reasoning
behind each pattern are in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## API

All responses are JSON with `Cache-Control: no-store`: `{ data, meta? }` or
`{ error: { code, message, details? } }`. POST requests must come from the same origin.

| Method | Path                          | Who            | Purpose                                    |
| ------ | ----------------------------- | -------------- | ------------------------------------------ |
| POST   | `/api/auth/login`             | anyone         | Sign in, sets the httpOnly session cookie  |
| POST   | `/api/auth/logout`            | anyone         | Clear the session                          |
| GET    | `/api/auth/me`                | signed in      | Current user                               |
| POST   | `/api/orders`                 | customer       | Create an order (`Idempotency-Key` header) |
| GET    | `/api/orders`                 | customer       | Own orders, paginated                      |
| GET    | `/api/orders/:id`             | owner or admin | Order detail with mailboxes and audit log  |
| GET    | `/api/admin/orders`           | admin          | All orders, `status`/`provider` filters    |
| POST   | `/api/admin/orders/:id/retry` | admin          | Retry a FAILED order                       |

## Demo tips

- The mock provider fails about 20 % **per mailbox**, and an order is ACTIVE only when every
  mailbox is. So 1 or 2 mailboxes usually succeed and 20 or more usually fail.
- Retry re-provisions only the failed mailboxes; active ones keep their result.
- Two workers can run at once (`npm run worker` in two terminals); each order is still processed
  once.
- `npm run order:create -- --email customer@example.com --domain example.com --provider google --count 3`
  creates an order without the browser.
- `MOCK_PROVIDER_FAILURE_RATE`, `MOCK_PROVIDER_MIN_DELAY_MS` and `MOCK_PROVIDER_MAX_DELAY_MS` in
  `.env` change how often and how slowly the mock fails (restart the worker after a change).

## Known limitations

- No login rate limiting.
- No Content-Security-Policy (MUI and Emotion inject inline styles).
- Idempotency keys never expire.
- Live updates use polling (every 2 s on the detail page), not push.
- Non-ASCII domains must be entered in punycode (`xn--...`).
- One order at a time per worker process; scale by running more workers.
- Mailbox addresses are generated (`box-NN-<order id prefix>@<domain>`), not chosen.
- No sign-up: only the seeded users exist.

## Unfinished

- The demo video link above is still a placeholder.

## Troubleshooting

- **Port 5433 already in use:** another Postgres or container is on it. Stop it, or change the
  host port in `docker-compose.yml` and both URLs in `.env`.
- **Port 3000 already in use:** stop the other app, or run `npm run dev -- -p 3001`.
- **Node version errors:** use Node 22 or newer (`.nvmrc` says 22; `nvm use`).
- **"Cannot find module '@/generated/prisma'" after pulling:** run `npm run db:generate`.
- **"Can't reach database server":** start Docker Desktop, then `docker compose up -d`.
- **"Invalid environment configuration":** the message names the missing or invalid variables;
  compare `.env` with `.env.example`.
