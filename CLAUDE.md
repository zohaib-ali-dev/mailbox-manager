# CLAUDE.md

Mailbox Manager is an internal tool for a company that sells pre-warmed Google and Microsoft
mailboxes. Customers create idempotent orders (domain, provider, 1 to 50 mailboxes). A separate
worker process provisions each mailbox through a mocked provider and moves the order
`PENDING -> PROVISIONING -> ACTIVE | FAILED`. Admins list and filter every order, read the audit log
and retry failed orders (`FAILED -> PENDING`). Every status change writes an audit event.

@AGENTS.md

## Stack

| Layer      | Choice                                                                       |
| ---------- | ---------------------------------------------------------------------------- |
| Framework  | Next.js (App Router, `src/`), one app for UI and API route handlers          |
| Language   | TypeScript strict + `noUncheckedIndexedAccess`                               |
| UI         | MUI + Emotion, colours only through tokens (no Tailwind)                     |
| Data       | PostgreSQL, Prisma (driver adapter `@prisma/adapter-pg`, `prisma.config.ts`) |
| Validation | Zod v4, strict objects at every boundary                                     |
| Auth       | `bcryptjs` hashes, `jose` HS256 JWT in an httpOnly cookie                    |
| Worker     | Separate Node process run with `tsx`; Postgres is the queue (`SKIP LOCKED`)  |
| Tests      | Vitest: `unit` and `integration` projects                                    |

## Commands

| Command                                  | What it does                                       |
| ---------------------------------------- | -------------------------------------------------- |
| `npm run dev`                            | Next.js dev server                                 |
| `npm run build` / `npm start`            | Production build / serve it                        |
| `npm run lint`                           | ESLint (flat config; `next lint` no longer exists) |
| `npm run typecheck`                      | Route type generation + `tsc --noEmit`             |
| `npm run format` / `format:check`        | Prettier write / check                             |
| `scripts/db/setup-local.sh`              | Create role + dev/test databases on a local server |
| `scripts/db/teardown-local.sh`           | Drop only what setup-local created                 |
| `npm run db:generate`                    | `prisma generate` (also runs on `postinstall`)     |
| `npm run db:migrate`                     | `prisma migrate dev` (development database)        |
| `npm run db:deploy`                      | `prisma migrate deploy`                            |
| `npm run db:seed`                        | Seed users and sample orders (idempotent)          |
| `npm run db:reset`                       | Reset the development database                     |
| `npm run db:studio`                      | Prisma Studio                                      |
| `npm test`                               | Unit + integration tests                           |
| `npm run test:unit` / `test:integration` | One Vitest project                                 |
| `npm run test:watch`                     | Vitest watch mode                                  |
| `npm run worker`                         | Background worker (added in Ticket 2.2)            |
| `npm run order:create -- ...`            | Dev CLI to create an order (added in Ticket 2.2)   |

## Where the docs live

- [docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md](docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md):
  stack, folder layout, layer rules, data model, API contract, error codes, worker design, env vars,
  definition of done. **The authority.**
- [docs/reference/COLOR_SYSTEM.md](docs/reference/COLOR_SYSTEM.md): every colour token and how to use it.
- `docs/tickets/PART_1_*.md`, `PART_2_*.md`, `PART_3_*.md`: the tickets, implemented strictly in order.

## Ticket workflow

1. Read the ticket and the reference sections it names.
2. Show a short plan and wait for the go-ahead.
3. Implement.
4. Verify every acceptance criterion and show the commands and results.
5. `npm run lint`, `npm run typecheck`, `npm test` (UI tickets also `npm run build`).
6. Small Conventional Commits (1 to 3 per ticket), then push `main`.

## Hard rules

- No business logic in route handlers or components. Route handlers: guard, validate, call **one**
  service method, respond through `src/server/http`.
- Only `src/server/services/order-transition.service.ts` changes `orders.status`, and it always
  appends an `order_events` row in the same transaction.
- No Prisma, `src/server/db` or `src/server/repositories` imports anywhere under `src/app`.
- No `process.env` outside `src/server/config/env.ts` (exceptions: `next.config.ts`,
  `prisma.config.ts`, test setup files).
- Zod at every boundary; object schemas are strict (unknown fields rejected).
- Responses only through mappers and DTOs (`src/server/mappers`, `src/shared/types`). Never return
  Prisma objects, `password_hash`, `request_hash`, `idempotency_key`, `locked_by`, `locked_at`,
  `external_id` or other users' ids.
- No `src/server/**` imports in files that start with `'use client'`.
- `server-only` is imported only by `src/server/auth/session.ts` and `src/server/auth/guards.ts`.
  Services, repositories, domain, providers and the worker must import cleanly from plain Node.
- `src/shared/**` runs in the browser: no `node:*`, Prisma, `next/headers` or `server-only`.
- No hard-coded colours outside `src/styles` (ESLint enforces it). Use `tokens(theme)`.
- One `.env` file at the repo root. No `.env.local`.
- Never edit an applied migration. CHECK constraints go into a `--create-only` migration before it
  is applied.
- Tests never touch the development database; integration tests refuse any database whose name does
  not end in `_test`.
- Never change global git config. Never force-push.
- No em dash characters anywhere (code, docs, commits).

## Layer audit (run before every commit)

```bash
grep -rnE "generated/prisma|server/db|server/repositories" src/app   # expect nothing
grep -rn "process.env" src --include=*.ts --include=*.tsx | grep -v src/server/config/env.ts
grep -rnE "status:" src/server --include=*.ts | grep -v order-transition.service.ts | grep -i "orderStatus\|status: to"
```
