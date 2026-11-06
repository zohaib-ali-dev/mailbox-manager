# Mailbox Manager — Tickets · Part 1 (Phase 0 Setup, Phase 1 Domain Core)

Tickets 0.1 to 1.3. Then **Part 2** (provider, worker, auth, HTTP API) and **Part 3** (UI and delivery). Implement strictly in order. The order follows the brief's own priority list: order creation and state machine → provider abstraction and worker → admin list with retry and audit log → customer views → tests.

---

## How to use this file with Claude Code

1. Paste the ticket's **Claude Code Prompt**. It tells Claude Code to read the ticket in this file, plus `docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md`, `docs/reference/COLOR_SYSTEM.md` and `CLAUDE.md`.
2. Claude Code shows a short plan first and waits. Check the plan against the ticket's **Technical details** and **Likely Claude Code mistakes**. Correct it if needed, then say "go". (This is your "planning and steering" evidence, worth 25 % of the grade.)
3. Check the **Acceptance criteria** yourself before it commits.
4. Write the ticket's start/end time and any mistake you caught in your time log.

Sections in every ticket: Description · Technical details · Edge cases to handle · Acceptance criteria · Likely Claude Code mistakes · Claude Code Prompt · This I need to do.

---

## Time plan (hard cap: 4 hours)

| Block | Tickets | Budget | Checkpoint (time since you started) |
|---|---|---|---|
| Setup | Setup guide, 0.1, 0.2 | 25 min | 0:25 |
| Domain core | 1.1, 1.2, 1.3 | 50 min | 1:15 |
| Worker | 2.1, 2.2 | 40 min | 1:55 |
| Auth + API | 3.1, 3.2 | 35 min | 2:30 |
| UI | 4.1, 4.2, 4.3 | 55 min | 3:25 |
| Delivery | 5.1, 5.2 (including the video) | 30 min | 3:55 |

**If you are more than 15 minutes behind a checkpoint, cut in this order:** dark-mode toggle (keep tokens, ship light mode only) → admin list auto-refresh → demo-credential quick-fill buttons → the route-level API test in 3.2 → the colour-literal lint rule. **Never cut:** idempotency, the state machine tests, worker safety, the audit log, README accuracy. Anything you cut goes into the README's "Unfinished" list (the brief asks for that list).

---

## Decisions that override your generic ticket template

- **Name:** `mailbox-manager` for the repo, folder and package. App title "Mailbox Manager". (Your template also said "BulkBillingDoctors"; that is from another project and is not used here.)
- **One Next.js app** holds both the UI and the API (route handlers). The worker is a second process started from the same codebase. There is no separate frontend or backend project and no monorepo.
- **No Docker for your development.** You use your existing PostgreSQL server with two new databases; nothing else on that server is touched. `docker-compose.yml` is still committed, because the brief requires it for the reviewers.
- **Internal tool:** marked `noindex`. No SEO work.
- **No UI designs were provided** with the brief, so the screens follow `COLOR_SYSTEM.md` and standard MUI layout. If the company sends designs, give them to Claude Code during Part 3.

---

## Stack reminders (apply to every ticket)

- Next.js App Router, strict TypeScript, MUI (no Tailwind), Prisma + PostgreSQL, Zod, Vitest, `jose` + `bcryptjs`, worker run with `tsx`.
- Latest stable versions, checked at install time. Follow the installed version's docs (see System Design §2 for known traps).
- Layered code: route handlers and components contain no business logic. Every order status change goes through the transition service and writes an audit event in the same transaction.
- One `.env` file at the repo root. Only `src/server/config/env.ts` reads `process.env`.
- Commits: small Conventional Commits, 1 to 3 per ticket, pushed after every ticket. Git identity is repo-local: `zohaib-ali-dev` / `zohaibali9798@gmail.com`.

---

## 🧭 LOCAL SETUP GUIDE (you do this once, before Ticket 0.1, about 10 minutes)

Open the **Terminal** app on your Mac. Type each command exactly, then press Enter.

### Step 1 — Check your tools (changes nothing)

1. `node -v` → must print `v22` or higher (`v24` and `v26` are fine). If it is lower, run `nvm install --lts` (if you use nvm) or install the LTS from nodejs.org.
2. `npm -v` → any 10.x or newer.
3. `ssh -T git@github.com` → must reply **"Hi zohaib-ali-dev!"**. You already push other projects from this Mac, so this should pass.
4. `psql --version` → prints a version. If you see "command not found" and you use Postgres.app, run:
   `export PATH="/Applications/Postgres.app/Contents/Versions/latest/bin:$PATH"`
5. `psql -d postgres -c "select version();"` → prints your server version without asking for a password. If that fails, try `psql -U postgres -d postgres -c "select version();"`. **Write down which command worked**; you tell Claude Code in Ticket 0.2.

Nothing in this step touches your existing databases.

### Step 2 — Connect your folder to the GitHub repo

If `~/Documents/projects/mailbox-manager` already exists (your prompt showed you inside it), make sure it is empty, then clone into it:

```
cd ~/Documents/projects/mailbox-manager
ls -A
git clone git@github.com:zohaib-ali-dev/mailbox-manager.git .
```

`ls -A` must print nothing. If it prints files, move them somewhere else first (for example to your Downloads folder).

If the folder does not exist yet:

```
mkdir -p ~/Documents/projects && cd ~/Documents/projects
git clone git@github.com:zohaib-ali-dev/mailbox-manager.git
cd mailbox-manager
```

The warning "You appear to have cloned an empty repository" is expected.

Set the Git identity **for this repo only** (your other projects are not affected):

```
git config user.name "zohaib-ali-dev"
git config user.email "zohaibali9798@gmail.com"
```

### Step 3 — Create the Next.js app (frontend and backend in one)

```
npx create-next-app@latest . --typescript --app --eslint --src-dir --no-tailwind --import-alias "@/*" --use-npm
```

If it asks extra questions, answer: **Turbopack → Yes**, **React Compiler → No**, **linter → ESLint**, anything else → press Enter for the default.

When it finishes, check it runs: `npm run dev`, open http://localhost:3000, you should see the Next.js starter page. Press **Ctrl + C** to stop it.

### Step 4 — Add the planning documents

```
mkdir -p docs/reference docs/tickets
```

Copy the five files you downloaded from me into place. If they are in your Downloads folder:

```
cp ~/Downloads/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md ~/Downloads/COLOR_SYSTEM.md docs/reference/
cp ~/Downloads/PART_1_SETUP_AND_DOMAIN.md ~/Downloads/PART_2_WORKER_AND_API.md ~/Downloads/PART_3_UI_AND_DELIVERY.md docs/tickets/
```

(Or drag them in Finder into those two folders.)

### Step 5 — Open VS Code and Claude Code

`code .` opens the folder in VS Code. Open the Claude Code panel (or type `claude` in the VS Code terminal).

### Step 6 — Start your time log (this is graded)

Open the Notes app (not inside the repo). Write your start time. For every ticket, note start time, end time, and **every time Claude Code got something wrong**: what it did, how you noticed, how you fixed it. `docs/AI_WORKLOG.md` needs at least two of these, plus time per phase. The "Likely Claude Code mistakes" list in each ticket tells you where to look.

---

## 🎫 TICKET 0.1 — Baseline: tooling, folder skeleton, CLAUDE.md, first commits and push

### Description

Turn the fresh create-next-app scaffold into the project baseline: strict TypeScript, scripts, Prettier, a colour-literal lint rule, the folder skeleton from the System Design document, `CLAUDE.md`, and the first three small commits pushed to `main`. No product features yet.

### Technical details

1. **Commit the untouched scaffold first** as its own commit, before any change, so the history shows what create-next-app produced versus what was added.
2. **Clean the starter:** remove any Tailwind, PostCSS or Biome files if they were added; replace the starter home page with a minimal "Mailbox Manager" placeholder; delete unused starter images in `public/`; remove the starter Google font imports; reduce `globals.css` to a minimal reset (MUI's `CssBaseline` arrives in Ticket 4.1).
3. **tsconfig:** keep `strict`, add `noUncheckedIndexedAccess`, `noImplicitOverride`, `noFallthroughCasesInSwitch`; keep the `@/*` alias; make sure `tests/`, `prisma/` and `scripts/` are type-checked.
4. **package.json:** name `mailbox-manager`, private, `engines.node` `>=22`, scripts `dev`, `build`, `start`, `lint` (runs ESLint directly; `next lint` no longer exists), `typecheck` (TypeScript with no emit), `format`, `format:check`. Database, test and worker scripts are added by later tickets.
5. **Prettier** with `eslint-config-prettier` placed last in the flat config; `.prettierignore` covering `.next`, `node_modules`, `coverage`, `src/generated` and `prisma/migrations`.
6. **Colour rule:** an ESLint `no-restricted-syntax` rule that flags string literals that look like colours (3, 4, 6 or 8-digit hex, `rgb(`, `rgba(`, `hsl(`) anywhere under `src/`, with `src/styles/**` excluded (see `COLOR_SYSTEM.md`).
7. `.nvmrc` containing `22`, and an `.editorconfig`.
8. **.gitignore:** add every `.env` variant with an exception for `.env.example`, plus `coverage` and `src/generated`.
9. **Folder skeleton** exactly as System Design §4, with `.gitkeep` files in empty folders.
10. **CLAUDE.md** (under 150 lines): one-paragraph summary; short stack table; commands table listing every planned script with "(added in Ticket X)" for those not created yet; where the docs live; the ticket workflow (read ticket and references → short plan and wait → implement → verify acceptance criteria → lint, typecheck, test → small Conventional Commits → push); and the **hard rules**, copied from System Design §5 and §14: no business logic in route handlers or components; only `order-transition.service.ts` changes order status and it always writes an order event in the same transaction; no Prisma or repository imports in `src/app`; no `process.env` outside `env.ts`; zod at every boundary with strict objects; responses only through mappers and DTOs; no `src/server` imports in client components; `server-only` only in the two Next-specific auth modules; no hard-coded colours; one `.env` file; never edit an applied migration; tests never touch the dev database; never change global git config. Link to the reference docs rather than copying them.
11. **README.md stub:** title, one paragraph, "Full setup instructions arrive in Ticket 5.1".
12. **Commits:** (a) `chore: scaffold next.js app with create-next-app` (untouched scaffold), (b) `chore: tooling baseline, strict typescript and folder skeleton`, (c) `docs: add CLAUDE.md, reference docs and tickets`. Push `main`.

### Edge cases to handle

- If the GitHub repo already has a commit (for example a README created on github.com), fetch and rebase on top of it. Never force-push.
- `.env.example` must stay tracked: `git check-ignore .env.example` prints nothing.
- The colour rule must not fire in `src/styles/**`, JSON files or anything under `tests/`.
- Lint must pass on the cleaned scaffold (no leftover unused imports).
- Never use `git config --global`.

### Acceptance criteria

- `npm run lint`, `npm run typecheck`, `npm run build` and `npm run format:check` all pass.
- `git config user.email` inside the repo prints `zohaibali9798@gmail.com`.
- `git log --oneline` shows the three commits, and they are visible on `main` on GitHub.
- A throwaway file in `src/app` containing a hex colour is flagged by ESLint; the same literal in `src/styles` is not. The throwaway files are then deleted.
- `CLAUDE.md`, `docs/reference/*` and `docs/tickets/*` are committed; every folder from System Design §4 exists.

### Likely Claude Code mistakes

- Uses `next lint`, which no longer exists, or leaves Tailwind/PostCSS config behind.
- Makes one big commit, or edits the scaffold before committing it (losing the clean "scaffold" commit).
- Writes a CLAUDE.md that copies the whole System Design document instead of linking to it.

### Claude Code Prompt

Read Ticket 0.1 in docs/tickets/PART_1_SETUP_AND_DOMAIN.md, plus docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md and docs/reference/COLOR_SYSTEM.md. This folder is a fresh create-next-app scaffold inside a clone of git@github.com:zohaib-ali-dev/mailbox-manager.git, with a repo-local git identity already set; never touch global git config. Show me a short plan first and wait for my go-ahead. Then: commit the untouched scaffold as its own commit; clean the starter (remove Tailwind, PostCSS or Biome leftovers if present, starter images, starter fonts and the boilerplate page); make tsconfig strict with noUncheckedIndexedAccess, noImplicitOverride and noFallthroughCasesInSwitch while keeping the @/* alias and type-checking tests, prisma and scripts; set the package name to mailbox-manager, engines node >=22, and scripts dev, build, start, lint (ESLint directly, not next lint), typecheck, format and format:check; add Prettier with eslint-config-prettier last, a .prettierignore, .nvmrc with 22, an .editorconfig, and a .gitignore covering every .env variant except .env.example plus coverage and src/generated; add an ESLint rule that flags hex, rgb, rgba and hsl colour literals under src except src/styles; create the folder skeleton from section 4 of the System Design document with .gitkeep files; write CLAUDE.md under 150 lines with the summary, stack, commands table, doc links, the ticket workflow and the hard rules from sections 5 and 14 of the System Design document; write a README stub. Verify lint, typecheck, build and format:check, prove the colour rule fires in src/app but not in src/styles and delete the throwaway files, then make the tooling commit and the docs commit with Conventional Commit messages and push main.

### This I need to do

1. Finish the Local Setup Guide (Steps 1 to 6) first.
2. When Claude Code asks permission to run `npm install` or `git push`, approve it.
3. Open https://github.com/zohaib-ali-dev/mailbox-manager and check the three commits are on `main`.
4. Time log: ticket start/end, and anything you changed in its plan.

---

## 🎫 TICKET 0.2 — Database: isolated local databases, docker-compose for reviewers, Prisma wiring, validated env

### Description

Prepare persistence without touching any other project on your local PostgreSQL server: a dedicated role and two databases created by an idempotent script; a `docker-compose.yml` for reviewers (required by the brief, never needed by you); Prisma installed and wired; and the single validated env module that every other part of the app reads.

### Technical details

1. **`scripts/db/setup-local.sh`:**
   - finds a working `psql` (on PATH, Homebrew, or `/Applications/Postgres.app/Contents/Versions/latest/bin`) and a password-less superuser connection (`psql -d postgres`, then `psql -U postgres -d postgres`); honours `PGHOST` and `PGPORT` overrides;
   - prints the list of databases **before**;
   - creates the role `mailbox_manager` if missing: `LOGIN`, password `mailbox_manager`, `NOSUPERUSER`, `NOCREATEROLE`, `CREATEDB`. CREATEDB is needed only because `prisma migrate dev` creates and drops a temporary "shadow" database; the role still cannot touch any existing database;
   - creates `mailbox_manager_dev` and `mailbox_manager_test`, owned by that role, UTF8, if missing;
   - prints the list of databases **after**, and the difference (must be exactly the two new databases);
   - is idempotent (a second run reports "already exists" and changes nothing) and never edits `pg_hba.conf`, `postgresql.conf`, other roles or other databases.
2. **`scripts/db/teardown-local.sh`:** drops only those two databases and that role, after the user types a confirmation word.
3. **`docker-compose.yml`:** one service `postgres` using `postgres:16-alpine`; user and password `mailbox_manager`; `POSTGRES_DB` `mailbox_manager_dev`; host port **5433** mapped to container port 5432 (so a reviewer's own Postgres on 5432 does not clash); a named volume; a `pg_isready` healthcheck; and `docker/postgres/init/` mounted as the init folder with one SQL file that creates `mailbox_manager_test` owned by `mailbox_manager`. No app or worker containers.
4. **Prisma:** install the latest `prisma` (dev dependency) and `@prisma/client`. If the installed major is 7 or newer, also install `@prisma/adapter-pg`, `pg` and `dotenv`, and create `prisma.config.ts` (schema path, migrations path, seed command placeholder, loads `.env` explicitly because Prisma 7 no longer does). Generator output `src/generated/prisma` (gitignored). A `postinstall` script runs `prisma generate` so a clean clone type-checks right after `npm install`. The schema starts with the datasource and generator only; models come in Ticket 1.1. Scripts: `db:generate`, `db:migrate` (migrate dev), `db:deploy` (migrate deploy), `db:seed`, `db:reset` (migrate reset with force, development database only), `db:studio`.
5. **`src/server/config/env.ts`**, the only reader of `process.env`: a zod schema with every variable and default from System Design §10; numbers coerced from strings; `MOCK_PROVIDER_FAILURE_RATE` between 0 and 1; min delay ≤ max delay; 3 × heartbeat < lease timeout; `SESSION_SECRET` at least 32 characters and, when `NODE_ENV` is `production`, not equal to the `.env.example` placeholder. On failure it throws one error listing variable names and problems, never values. Exports a typed `env`. It must not import `server-only` (the worker and tests use it).
6. **`src/server/db/prisma.ts`:** a PrismaClient singleton, cached on `globalThis` outside production so hot reload does not open new pools; uses the driver adapter if Prisma ≥ 7; connection string from `env`; logs warnings and errors (queries only when `LOG_LEVEL` is `debug`).
7. **`.env.example`:** every variable with a one-line comment. `DATABASE_URL` and `TEST_DATABASE_URL` default to the Docker port 5433, with a commented local-server variant on 5432. `SESSION_SECRET` holds a clearly labelled development placeholder that passes validation, so a reviewer's clean clone works without generating anything; production refuses it.
8. **One `.env` file** at the repo root for Next.js, the Prisma CLI, the worker, the seed and the tests. No `.env.local`.

### Edge cases to handle

- Both Postgres.app and Homebrew installed: the script uses the `psql` that actually connects.
- Server on a non-default port: `PGPORT` works.
- Role or database already exists: skip with a message; setup never drops anything.
- Passwords with special characters must be URL-encoded in connection strings; say so in a comment in `.env.example`.
- `npm install` on a clean clone must succeed **before** `.env` exists: `prisma generate` must not need a database connection or a valid env.
- Env validation errors print names only, never values.

### Acceptance criteria

- `setup-local.sh` succeeds twice; the second run reports "already exists"; the before/after lists differ only by `mailbox_manager_dev` and `mailbox_manager_test`.
- Connecting with `postgresql://mailbox_manager:mailbox_manager@localhost:5432/mailbox_manager_dev` and running `select current_user` prints `mailbox_manager`.
- `npx prisma validate` passes, and `npm run db:generate` works with `.env` temporarily renamed.
- Removing `SESSION_SECRET` from `.env` makes a script that imports `env` fail with a message naming `SESSION_SECRET` and printing no values.
- `docker-compose.yml` is valid (`docker compose config` if Docker is installed; otherwise a YAML parse check). You are not required to run it.
- lint and typecheck pass; commits pushed.

### Likely Claude Code mistakes

- Creates the role as `SUPERUSER`, or runs commands against databases other than `postgres` and the two new ones.
- Uses `.env.local` (the Prisma CLI and the worker would not see it).
- Writes Prisma 6-style setup on Prisma 7: URL inside `schema.prisma`, no driver adapter, relying on automatic `.env` loading.
- Reads `process.env` directly in `prisma.ts` or elsewhere.

### Claude Code Prompt

Read Ticket 0.2 in docs/tickets/PART_1_SETUP_AND_DOMAIN.md, plus docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md and CLAUDE.md. Show me a short plan first and wait for my go-ahead. My local PostgreSQL uses password-less superuser access with the command I will tell you, and it hosts databases for other projects that must not be touched. Create scripts/db/setup-local.sh that finds the working psql (PATH, Homebrew or Postgres.app), honours PGHOST and PGPORT, prints the database list before and after, and idempotently creates the role mailbox_manager (LOGIN, password mailbox_manager, NOSUPERUSER, NOCREATEROLE, CREATEDB for the Prisma shadow database) and the databases mailbox_manager_dev and mailbox_manager_test owned by it, never touching any other role, database or config file; add scripts/db/teardown-local.sh that drops only those three objects after a typed confirmation. Add docker-compose.yml with a single postgres:16-alpine service for reviewers on host port 5433 with a healthcheck, a named volume and an init SQL file that creates mailbox_manager_test. Install the latest Prisma; if it is version 7 or newer use prisma.config.ts that loads .env with dotenv, the prisma-client generator with output src/generated/prisma and the @prisma/adapter-pg driver adapter; add a postinstall prisma generate that works without a .env file, and the scripts db:generate, db:migrate, db:deploy, db:seed, db:reset and db:studio. Create src/server/config/env.ts as the only process.env reader with a zod schema for every variable in section 10 of the System Design document, including the cross-field checks, failing with variable names only and without importing server-only, and src/server/db/prisma.ts as a hot-reload-safe singleton. Write a complete .env.example with Docker-port defaults, commented local-server variants and a development-only SESSION_SECRET placeholder that production rejects. Run the setup script twice and show me the before and after database lists, verify prisma validate, generate without .env, and the missing-secret error, then commit in small Conventional Commits and push.

### This I need to do

1. Tell Claude Code which command worked in Setup Step 1.5 (`psql -d postgres` or `psql -U postgres -d postgres`).
2. Approve running `scripts/db/setup-local.sh`. Check its before/after lists: only `mailbox_manager_dev` and `mailbox_manager_test` should be new. Your other projects' databases are untouched.
3. Create your own `.env`: run `cp .env.example .env`, open `.env` in VS Code and change both database URLs to port **5432** (your local server):
   - `DATABASE_URL=postgresql://mailbox_manager:mailbox_manager@localhost:5432/mailbox_manager_dev`
   - `TEST_DATABASE_URL=postgresql://mailbox_manager:mailbox_manager@localhost:5432/mailbox_manager_test`
   If your Postgres runs on a different port, use that port.
4. Generate your own session secret: run `openssl rand -base64 48` and paste the output as the value of `SESSION_SECRET` in `.env`.
5. You do **not** need Docker. (Optional, at the very end: if you have Docker Desktop, `docker compose up -d` once to prove the reviewer path works.)

---

## 🎫 TICKET 1.1 — Data model: Prisma schema, first migration with database constraints, user seed

### Description

Create the four tables the whole system rests on (`users`, `orders`, `mailboxes`, `order_events`), with the constraints the database must enforce even if application code is wrong, plus an idempotent seed for the three demo users.

### Technical details

1. **Models** exactly as System Design §6: `User`, `Order`, `Mailbox`, `OrderEvent`; enums `Role` (CUSTOMER, ADMIN), `Provider` (lowercase `google`, `microsoft`), `OrderStatus` (PENDING, PROVISIONING, ACTIVE, FAILED), `MailboxStatus` (PENDING, ACTIVE, FAILED), `ActorType` (CUSTOMER, ADMIN, WORKER, SYSTEM). Every model and column mapped to snake_case names (`@@map`, `@map`); UUID ids; `timestamptz` timestamps; `updated_at` maintained automatically.
2. **Relations:** order → user `RESTRICT`; mailbox → order `CASCADE`; order event → order `RESTRICT`.
3. **Uniques and indexes** as listed in §6 (including unique `(user_id, idempotency_key)`, unique `(order_id, position)`, unique `address`, and the four order indexes).
4. **Migration `init_schema`:** generate with `migrate dev --create-only`, append CHECK constraints to the SQL (mailbox count between 1 and 50, position ≥ 1, `domain = lower(domain)`, `email = lower(email)`), **then** apply it. Commit the migration folder.
5. **`src/server/auth/password.ts`:** hash and verify with `bcryptjs` (cost 10). Pure module, no `server-only`. Also export a precomputed dummy hash used later for timing-safe login.
6. **`prisma/seed.ts`** (run by `db:seed` through `tsx`): upserts three users by email:
   - `admin@example.com` / `Admin123!` — ADMIN, name "Ada Admin"
   - `customer@example.com` / `Customer123!` — CUSTOMER, name "Casey Customer"
   - `customer2@example.com` / `Customer123!` — CUSTOMER, name "Chris Customer"
   Prints a summary. Refuses to run when `NODE_ENV` is `production`. Sample orders are added in Ticket 1.3.

### Edge cases to handle

- Running the seed twice still leaves exactly three users.
- Lowercase Prisma enum values (`google`) must round-trip through Prisma and raw SQL.
- `migrate deploy` must apply cleanly to an empty database (the reviewer path); verify against `mailbox_manager_test`.
- A CHECK violation surfaces as a database error. Application validation (Ticket 1.2) prevents it; the database is the safety net.

### Acceptance criteria

- `npm run db:migrate` applies `init_schema`; describing the `orders` table in psql shows the CHECK constraints and indexes.
- Inserting an order with `mailbox_count = 0` directly in psql fails with a check violation (demonstrated inside a transaction that is rolled back, or against the test database).
- `npm run db:seed` twice → three users; `password_hash` values are bcrypt hashes.
- Applying migrations to the test database with `prisma migrate deploy` (using the test URL) succeeds.
- lint and typecheck pass; committed and pushed.

### Likely Claude Code mistakes

- Forgets `@@map` / `@map`, so the raw SQL in Ticket 2.2 later fails on `"Order"` vs `orders`.
- Applies the migration first and then edits the applied SQL to add CHECKs (checksum mismatch). It must use `--create-only`.
- Tries to express CHECK constraints in `schema.prisma` (not supported) and silently loses them.
- Stores email addresses without lowercasing them.

### Claude Code Prompt

Read Ticket 1.1 in docs/tickets/PART_1_SETUP_AND_DOMAIN.md, plus section 6 of docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md and CLAUDE.md. Show me a short plan first and wait for my go-ahead. In prisma/schema.prisma define the User, Order, Mailbox and OrderEvent models and the Role, Provider (lowercase google and microsoft), OrderStatus, MailboxStatus and ActorType enums exactly as section 6 specifies, mapped to snake_case table and column names, with UUID ids, timestamptz timestamps, the listed relations with their delete behaviour, and every unique constraint and index. Create the init_schema migration with migrate dev --create-only, add CHECK constraints for mailbox count 1 to 50, position at least 1, lowercase domain and lowercase email to the generated SQL, and only then apply it. Add src/server/auth/password.ts with bcryptjs hash and verify at cost 10 plus a precomputed dummy hash, without server-only. Write prisma/seed.ts, run through tsx by db:seed, that upserts admin@example.com (Admin123!, ADMIN), customer@example.com and customer2@example.com (Customer123!, CUSTOMER) idempotently and refuses to run in production. Show me the orders table definition, prove a mailbox_count of 0 is rejected by the database, run the seed twice, apply migrations to the test database with migrate deploy, then commit and push.

### This I need to do

Nothing. Optional: `npm run db:studio` opens a browser view of the tables so you can see the three users.

---

## 🎫 TICKET 1.2 — Domain core: order state machine, error hierarchy, shared zod schemas, Vitest and unit tests

### Description

Build the pure rules of the system: the order status machine (the single authority on which transitions are allowed and by whom), the error classes every layer throws, the shared zod schemas used by both server and browser, and the unit tests the brief requires for the state machine.

### Technical details

1. **`src/server/domain/order-state-machine.ts`:** the transition table from System Design §3.2 written as data, not as if/else. Exports: the table, `canTransition(from, to, actor)`, `assertTransition(from, to, actor)` (throws `InvalidTransitionError` with details `{ from, to, actor }`), `allowedTransitions(from, actor)`, `isTerminal(status)` (only ACTIVE), `isInProgress(status)` (PENDING, PROVISIONING). Uses its own string-literal types for statuses and actors (no Prisma import) plus a compile-time check that these types equal the Prisma enums, so the two can never drift.
2. **`src/server/domain/errors.ts`:** an `AppError` base class (code from the shared registry, client-safe message, HTTP status, optional details) and one subclass per row of System Design §8.
3. **`src/shared/errors/error-codes.ts`:** a constant registry mapping each code to `{ status, defaultMessage }`, used by both server and browser.
4. **`src/shared/constants.ts`:** `APP_NAME` ("Mailbox Manager"), `MIN_MAILBOXES` 1, `MAX_MAILBOXES` 50, `DEFAULT_PAGE_SIZE` 20, `MAX_PAGE_SIZE` 50, `PAGE_SIZE_OPTIONS` 10/20/50, `ORDER_POLL_INTERVAL_MS` 2000, `IDEMPOTENCY_KEY_HEADER`.
5. **`src/shared/schemas/order.schema.ts`** (Zod v4 API):
   - `domainSchema`: trim → lowercase → strip one trailing dot → validate: total length ≤ 253, at least two labels, each label 1–63 characters of a–z, 0–9 and hyphen, not starting or ending with a hyphen, last label alphabetic (2–63) or punycode (`xn--…`). Clear messages for URLs, emails, IP addresses, ports, wildcards and non-ASCII names ("use the punycode form, e.g. xn--…").
   - `providerSchema`: `google` or `microsoft` only.
   - `mailboxCountSchema`: a number, integer, 1–50. **No coercion**: the string "5" and the boolean `true` are rejected.
   - `createOrderSchema`: the three fields, strict (unknown fields rejected).
   - `idempotencyKeySchema`: 8–128 characters of `[A-Za-z0-9_-]`.
   - `orderListQuerySchema`: `page` and `pageSize` coerced from query strings with the bounds in System Design §3.7.
   - `adminOrderListQuerySchema`: adds optional `status` (one of the four statuses) and `provider`; an empty string or `all` means "no filter".
6. **`src/shared/schemas/auth.schema.ts`:** `loginSchema` with email (trimmed, lowercased, valid) and password (1–200 characters, not trimmed), strict.
7. **`src/server/domain/request-hash.ts`:** SHA-256 of the canonical JSON of the normalised create payload, with a fixed key order.
8. **`src/server/domain/mailbox-address.ts`:** builds `box-NN-<first 8 chars of the order id>@<domain>` with NN zero-padded to two digits.
9. **Vitest:** install `vitest` and `vite-tsconfig-paths`; `vitest.config.ts` defines two projects: `unit` (`tests/unit/**`, node environment) and `integration` (`tests/integration/**`, files run one at a time; setup arrives in Ticket 1.3). Scripts: `test` (both), `test:unit`, `test:integration`, `test:watch`.
10. **Unit tests:**
    - State machine: every combination of 4 from-statuses × 4 to-statuses × 4 actors (64 cases) checked against an expected table written independently in the test; self-transitions rejected; ACTIVE has no outgoing transitions; the thrown error carries `from`, `to` and `actor`.
    - Domain schema, valid: `example.com`, `sub.example.co.uk`, `xn--bcher-kva.example`, `Example.COM` (→ `example.com`), `example.com.` (→ `example.com`), `  example.com  `.
    - Domain schema, invalid: empty, `localhost`, `-bad.com`, `bad-.com`, `a..com`, `http://example.com`, `example.com/path`, `user@example.com`, `*.example.com`, `192.168.1.1`, `exa mple.com`, a 64-character label, a 254-character name, `münchen.de`, `example.com:8080`, `example.123`.
    - Mailbox count: accepts 1 and 50; rejects 0, 51, 2.5, -1, "5", `true`, `null`.
    - Provider: rejects `Google`, `yahoo`, empty.
    - Create schema rejects an unknown field.
    - Idempotency key: accepts a UUID; rejects 7 characters, 129 characters, spaces and `/`.
    - Request hash: identical across domain case/whitespace and key order; different when any field differs.
    - Mailbox address: format, zero padding, different orders produce different addresses.

### Edge cases to handle

- IP addresses look like domains: the alphabetic-TLD rule rejects them.
- The state machine must not depend on Prisma at runtime, so it is usable in the worker, the mapper and tests.
- Error messages are safe to show to users (no internals).
- `src/shared/**` must not import Node modules: `request-hash.ts` (which uses `node:crypto`) lives in `src/server/domain`, not `src/shared`.

### Acceptance criteria

- `npm run test:unit` passes, with at least 64 state machine cases.
- A compile-time check ties the domain status and actor types to the Prisma enums (adding a value to only one side breaks `npm run typecheck`).
- `src/shared/**` imports nothing from `src/server` or Node built-ins.
- lint and typecheck pass; committed and pushed.

### Likely Claude Code mistakes

- Adds "convenient" extra transitions (PENDING → FAILED, PROVISIONING → PENDING, ACTIVE → FAILED) or forgets the actor dimension.
- Uses `z.coerce.number()` for the mailbox count, which silently accepts "5" and `true`.
- A domain regex that accepts `localhost` or IP addresses.
- Zod 3 syntax while Zod 4 is installed.

### Claude Code Prompt

Read Ticket 1.2 in docs/tickets/PART_1_SETUP_AND_DOMAIN.md, plus sections 3, 5 and 8 of docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md and CLAUDE.md. Show me a short plan first and wait for my go-ahead. Implement src/server/domain/order-state-machine.ts with the transition table from section 3.2 written as data including the allowed actor for each transition, exporting canTransition, assertTransition throwing InvalidTransitionError with from, to and actor, allowedTransitions, isTerminal and isInProgress, using its own literal types with a compile-time check against the Prisma enums and no runtime Prisma import. Add the AppError hierarchy in src/server/domain/errors.ts matching section 8, the shared error-code registry, src/shared/constants.ts, the zod v4 schemas in src/shared/schemas for domain normalisation and validation, provider, mailbox count without coercion, strict create order, idempotency key, list and admin list queries, and login, plus src/server/domain/request-hash.ts and mailbox-address.ts. Set up Vitest with unit and integration projects and the test, test:unit, test:integration and test:watch scripts. Write unit tests for the full 64-case state machine matrix against an independently written expected table, and every valid and invalid example listed in the ticket for the schemas, request hash and mailbox address. Run lint, typecheck and test:unit, then commit in small Conventional Commits and push.

### This I need to do

Read the transition table in the test file yourself (about one minute) and confirm it matches the brief exactly: PENDING → PROVISIONING → ACTIVE or FAILED, and admin-only FAILED → PENDING. This is the core of the "critical review" grade.

---

## 🎫 TICKET 1.3 — Order use cases: repositories, transition service with audit, idempotent creation, queries, mappers, integration tests, sample seed

### Description

Implement the order use cases on top of the domain: data access in repositories, one transition service that is the only way to change an order's status (always writing the audit event in the same transaction), idempotent order creation that is safe under concurrent duplicates, read queries for both roles, the admin retry use case, DTO mappers, and the integration test the brief requires for order creation.

### Technical details

1. **Repositories** (`src/server/repositories`), each method optionally accepting a transaction client:
   - `UserRepository`: `findByEmail`, `findById`.
   - `OrderRepository`: `createWithMailboxes` (order + all mailboxes with `createMany`), `findByUserAndKey`, `findDetailById` (mailboxes ordered by position, events oldest first, customer email), `listForUser(userId, page, pageSize)`, `listAll(filters, page, pageSize)` returning items and total (count and page query together), both sorted `created_at DESC, id DESC`; `updateStatusIfCurrent(id, from, to, extraFields, expectedLockedBy?)` returning the number of rows updated.
   - `MailboxRepository`: `resetFailedToPending(orderId)`, `markActive`, `markFailed`, `listNotActive(orderId)`, `countByStatus(orderId)`.
   - `OrderEventRepository`: `append` and reads only; no update or delete methods exist.
2. **`OrderTransitionService`:** `transition({ tx, orderId, from, to, actor: { type, id, label }, reason?, metadata?, extraFields?, expectedLockedBy? })` → `assertTransition` → conditional update (matches only if the status is still `from`, and `locked_by` still equals `expectedLockedBy` when given) → if nothing was updated, re-read: missing order → `NotFoundError`, otherwise `ConcurrentModificationError` with the actual status → append the order event. Also `recordCreation(tx, order, actor)` writing the event with `from_status` null and `to_status` PENDING (documented as "not a transition").
3. **`OrderService`:**
   - `createOrder(viewer, input, idempotencyKey)`: only CUSTOMER (otherwise `ForbiddenError`) → validate with the shared schemas → compute the request hash → look up `(userId, key)`: found with the same hash → return `{ order, replayed: true }`; found with a different hash → `IdempotencyKeyMismatchError` → otherwise, in one transaction, create the order, its N mailboxes and the creation event → `{ order, replayed: false }`. If the insert hits the unique constraint on `(user_id, idempotency_key)` (a concurrent duplicate), re-read and apply the same same-hash / different-hash rule.
   - `getOrderForViewer(viewer, orderId)`: customers who do not own the order get `NotFoundError`; admins see any order.
   - `listOrdersForCustomer(viewer, query)` and `listOrdersForAdmin(viewer, query)` (admin only).
   - `retryOrder(viewer, orderId)`: admin only → one transaction: transition FAILED → PENDING (actor ADMIN, reason "Retried by admin", clearing `locked_by`, `locked_at` and `last_error`) and reset FAILED mailboxes to PENDING (ACTIVE ones untouched) → return the detail.
   - A `Viewer` is `{ id, email, role }`.
4. **Mappers** (`src/server/mappers/order.mapper.ts`): `toOrderSummary`, `toAdminOrderSummary`, `toOrderDetail(order, viewer)` exactly as System Design §7. `canRetry` = viewer is ADMIN and `canTransition(status, PENDING, ADMIN)`. `progress` counts mailboxes by status. Dates as ISO strings. DTO types in `src/shared/types/order.dto.ts`. Nothing outside the whitelist is ever returned.
5. **Composition root** `src/server/container.ts`: constructs the Prisma client, repositories and services with constructor injection. It is the only place services are created. Tests build their own container.
6. **Integration test setup** (`tests/helpers`, `tests/integration`): refuses to run unless the `TEST_DATABASE_URL` database name ends with `_test`; points the app's database URL at the test database before anything imports the Prisma client; applies migrations once with `prisma migrate deploy`; truncates all tables (restart identity, cascade) before each test; helper to create users; files run one at a time.
7. **`tests/integration/order-creation.test.ts`** (the brief's required integration test):
   - creates an order → exactly 1 order, N mailboxes all PENDING, 1 creation event (from null to PENDING, actor CUSTOMER), DTO shape correct;
   - same key + same payload → same id, `replayed: true`, still 1 order;
   - same key + `EXAMPLE.com` instead of `example.com` → treated as the same payload (replay);
   - same key + different count → `IdempotencyKeyMismatchError`;
   - five concurrent identical requests (`Promise.all`) → exactly 1 order, all five return the same id;
   - the same key used by two different customers → two orders;
   - an admin creating an order → `ForbiddenError`;
   - invalid input → `ValidationError` with details, nothing written;
   - count 50 → 50 mailboxes with unique addresses.
8. **`tests/integration/order-retry.test.ts`:** FAILED → PENDING writes an ADMIN event and resets only FAILED mailboxes; retrying an ACTIVE order → `InvalidTransitionError`; two concurrent retries → one succeeds, one gets a 409-class error; a customer retrying → `ForbiddenError`; a customer opening another customer's order → `NotFoundError`.
9. **Seed extension:** about 12 sample orders across both customers and both providers, in ACTIVE and FAILED states (no PENDING, so the worker stays idle until you create a real order), built through the transition service so every order has a coherent event history (one of them with a retry in its history). Fixed idempotency keys (`seed-001` …) keep the seed idempotent.

### Edge cases to handle

- Unique-violation detection must check that the conflicting constraint is the `(user_id, idempotency_key)` one, not any unique error.
- No order ever exists without its mailboxes (single transaction).
- A page past the end returns an empty list with the correct total.
- Stable ordering when timestamps tie.
- Customers get 404, never 403, for orders they do not own.
- Events are returned in chronological order.

### Acceptance criteria

- `npm run test:integration` passes every case above against `mailbox_manager_test`, and its output shows the test database name.
- `npm run test:unit` still passes.
- `npm run db:seed` twice → the same 3 users and the same ~12 orders.
- A search for status writes outside `order-transition.service.ts` finds nothing (show the command and its output).
- lint and typecheck pass; committed and pushed.

### Likely Claude Code mistakes

- Updates `status` directly with Prisma inside `OrderService` (bypassing the transition service and the audit event).
- "Check, then insert" with no handling of the unique-constraint race, so the concurrency test fails or returns 500.
- Returns 403 instead of 404 for another customer's order.
- Integration tests that run against the development database.
- Returns Prisma objects straight from services instead of mapped DTOs.

### Claude Code Prompt

Read Ticket 1.3 in docs/tickets/PART_1_SETUP_AND_DOMAIN.md, plus sections 3, 5, 6, 7 and 12 of docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md and CLAUDE.md. Show me a short plan first and wait for my go-ahead. Implement the User, Order, Mailbox and OrderEvent repositories with optional transaction clients and no business rules, where the order event repository can only append and read; an OrderTransitionService that is the only code changing order status by asserting the transition, doing a conditional update on the current status and optional expected locked_by, mapping zero updated rows to NotFound or ConcurrentModification, and appending the order event in the same transaction, plus recordCreation for the creation event; an OrderService with idempotent createOrder (customer only, request-hash replay, mismatch error, single transaction for order, mailboxes and creation event, and unique-violation recovery for concurrent duplicates), getOrderForViewer with 404 for non-owners, customer and admin list queries with pagination, and admin retryOrder that moves FAILED to PENDING and resets only failed mailboxes; mappers producing the DTOs in section 7 including canRetry computed with the state machine; and src/server/container.ts as the composition root. Build the integration test setup that refuses any database whose name does not end in _test, applies migrations with migrate deploy and truncates between tests, then write tests/integration/order-creation.test.ts and order-retry.test.ts covering every case listed in the ticket, including five concurrent identical requests producing one order. Extend the seed with about twelve coherent ACTIVE and FAILED sample orders built through the transition service with fixed idempotency keys. Run unit and integration tests, run the seed twice, show me a search proving status is only written in the transition service, then commit in small Conventional Commits and push.

### This I need to do

1. Run `npm run test:integration` yourself once and check the output mentions `mailbox_manager_test`.
2. Open one integration test and read the concurrency case. If you can explain it in your own words, you can explain it in the follow-up call.
3. Time log: you are at the 1:15 checkpoint. Note it.

---

*Continue with **Part 2** (`PART_2_WORKER_AND_API.md`): provider abstraction, background worker, authentication and the HTTP API.*
