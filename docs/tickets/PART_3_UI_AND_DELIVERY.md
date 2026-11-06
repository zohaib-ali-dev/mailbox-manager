# Mailbox Manager — Tickets · Part 3 (Phase 4 UI, Phase 5 Delivery)

Tickets 4.1 to 5.2. Requires Parts 1 and 2 to be complete. Same workflow: paste the prompt, review the plan, say "go", verify, commit, push, update your time log.

The UI order follows the brief's priority: admin list with retry and audit log before customer views. Every screen uses MUI and the tokens in `docs/reference/COLOR_SYSTEM.md`. No designs were provided with the brief, so the screens use a clean, standard MUI layout; if the company sends designs, give them to Claude Code with these tickets.

Every UI ticket must also pass `npm run build`, and must show **no hydration warnings** in the browser console.

---

## 🎫 TICKET 4.1 — MUI theme from tokens, app shell, login page, route protection, security headers

### Description

Put the visual foundation in place: the MUI theme built from `themeColors.json` with light and dark modes, the app shell with role-aware navigation, the login page, server-side route protection and security headers. After this ticket both seeded users can sign in through the browser and land on their home screens.

### Technical details

1. **Install** `@mui/material`, `@mui/icons-material`, `@emotion/react`, `@emotion/styled` and `@mui/material-nextjs` (use the App Router cache-provider import subpath that matches the installed Next.js major).
2. **Theme** exactly as `COLOR_SYSTEM.md`:
   - `src/styles/themeColors.json` with every token value from the document, light and dark, identical key sets.
   - `src/styles/theme.ts`: CSS variables enabled with `colorSchemeSelector: 'class'`; `colorSchemes.light` and `colorSchemes.dark` built by spreading `base` and every custom group into each palette; system font stack; border radius 10; component overrides (buttons without uppercase, outlined cards with the `orders.cardBorder` token, table head with `orders.tableHeaderBg`, chips). Exports the `tokens(theme)` helper.
   - `src/styles/mui-custom-theme.d.ts`: augments `Palette` and `PaletteOptions` with every custom group.
   - `src/styles/ThemeRegistry.tsx` (client component): App Router cache provider, `ThemeProvider`, `CssBaseline`.
   - `src/app/layout.tsx`: `InitColorSchemeScript` with the `class` attribute, `suppressHydrationWarning` on `<html>`, metadata with title template "%s · Mailbox Manager" and `robots: noindex, nofollow`.
3. **Feedback components** (`src/components/feedback`): `PageHeader` (title, subtitle, actions), `EmptyState` (icon, message, optional action), `ErrorState`, `LoadingState` (skeletons), `LocalTime` (renders an ISO date in the browser's local time **after mount**, with the full timestamp in a tooltip, so server and client HTML match). App-level `error.tsx`, `not-found.tsx` and `loading.tsx` use them.
4. **Status and provider chips** (`src/features/orders/components`): `OrderStatusChip`, `MailboxStatusChip` and `ProviderChip`, using the status → token mapping table in `COLOR_SYSTEM.md` (label, icon, bg/text/border tokens). The only place that mapping exists.
5. **Browser API client** `src/lib/api-client.ts`: JSON requests with same-origin credentials; parses the success and error envelopes; throws a typed `ApiError` with `code`, `message`, `details`, `status` and a `kind` of `api` or `network`.
6. **Route protection** (server-side, in layouts — not only in a proxy/middleware file):
   - `src/app/page.tsx`: no viewer → `/login`; CUSTOMER → `/orders`; ADMIN → `/admin/orders`.
   - `src/app/(app)/layout.tsx`: `getCurrentViewer()`; no viewer → redirect to `/login?next=<current path>`; otherwise render `AppShell` with the viewer's email, name and role.
   - `src/app/(app)/admin/layout.tsx`: non-admins get `notFound()` (404, so the admin area is not revealed).
7. **App shell** (`src/components/layout`): top app bar with the "Mailbox Manager" brand, navigation by role (customer: "My orders", "New order"; admin: "All orders"), active link highlighted with the `shell.navActive*` tokens, the user's email and a role chip, the `ThemeToggle` (light / dark / system through `useColorScheme`, placeholder until mounted), and a logout button (calls `POST /api/auth/logout`, then replaces the route with `/login` and refreshes). Content in a `Container` with max width `lg`. On narrow screens the navigation collapses into a menu.
8. **Login page** `src/app/login/page.tsx`: a logged-in viewer is redirected home. `LoginForm` (client): email and password fields with correct `autocomplete` attributes, show/hide password, submit disabled while sending, error `Alert` showing the server's message, on success navigate to `next` (accepted only if it is a relative path starting with a single `/`, otherwise home) and refresh. `DemoCredentials` box (shown when `SHOW_DEMO_CREDENTIALS` is true; the server page reads the flag through `env` and passes it as a prop) listing the three seeded accounts with "use" buttons that fill the form. Styled with the `auth` tokens.
9. **`next.config.ts`:** headers `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy: camera=(), microphone=(), geolocation=()`; `poweredByHeader: false`.
10. **Unit test:** `themeColors.json` light and dark have exactly the same key sets, and every value is a hex, `rgb(a)` colour or a shadow string.

### Edge cases to handle

- No flash of the wrong theme on first load (check in a private window) and no hydration warnings on any page.
- An expired or invalid session on any app page redirects to login.
- `next=https://evil.test` or `next=//evil.test` is ignored (open-redirect protection).
- Logout works from every page and the back button does not show protected content with live data.
- Colours only through tokens (the lint rule from 0.1 enforces it).
- Keyboard: the whole login form and navigation work with Tab and Enter.

### Acceptance criteria

- Logging in as the customer lands on `/orders` (placeholder content is fine until 4.3) with customer navigation; as the admin, on `/admin/orders` (placeholder until 4.2) with admin navigation.
- A customer visiting `/admin/orders` gets the 404 page.
- Wrong password shows the generic error in an Alert; the demo boxes fill the form.
- The theme toggle switches light/dark/system and survives a reload with no flash.
- Response headers include the four security headers; the page source contains the noindex meta tag.
- lint, typecheck, test and build pass; no hydration warnings; committed and pushed.

### Likely Claude Code mistakes

- Uses the `theme.custom.*` pattern from other projects instead of palette tokens through `tokens(theme)` (dark mode then shows light colours).
- Wrong `@mui/material-nextjs` import subpath for the installed Next.js version.
- Formats dates on the server with the server's time zone (hydration mismatch).
- Protects routes only in a proxy/middleware file instead of in server layouts.
- Hard-codes colours in `sx`.

### Claude Code Prompt

Read Ticket 4.1 in docs/tickets/PART_3_UI_AND_DELIVERY.md, plus docs/reference/COLOR_SYSTEM.md, sections 4, 5 and 11 of docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md and CLAUDE.md. Show me a short plan first and wait for my go-ahead. Install MUI with Emotion and the App Router cache provider for the installed Next.js major. Create themeColors.json with every token value from COLOR_SYSTEM.md, theme.ts using CSS variables with a class colour-scheme selector and light and dark colour schemes built by spreading the base palette and every custom group, a tokens(theme) helper, the palette type augmentation, ThemeRegistry, and the root layout with InitColorSchemeScript, suppressHydrationWarning and noindex metadata. Add the feedback components including a LocalTime component that formats dates only after mount, app-level error, not-found and loading pages, the order status, mailbox status and provider chips from the mapping table, and the browser api-client with a typed ApiError. Protect routes in server layouts: role redirect at the root, session required in the (app) layout with a next parameter, and 404 for non-admins in the admin layout. Build the AppShell with role-aware navigation, user email and role chip, ThemeToggle using useColorScheme and logout, and the login page with LoginForm, safe relative-only next redirects and a DemoCredentials box controlled by SHOW_DEMO_CREDENTIALS through env. Add the security headers and poweredByHeader false, and a unit test for light and dark token parity. Verify both logins in the browser flow, the 404 for customers on admin pages, the theme toggle without flash, the headers, and no hydration warnings, run lint, typecheck, test and build, then commit in small Conventional Commits and push.

### This I need to do

1. Run `npm run dev`, open http://localhost:3000, and log in once as each user (`customer@example.com` / `Customer123!`, `admin@example.com` / `Admin123!`). Click the theme toggle.
2. If you want any visual change (spacing, wording, layout), tell Claude Code now, in one message, before the screens are built on top of it.

---

## 🎫 TICKET 4.2 — Order detail (per-mailbox status, audit log, live polling) and admin orders list (filters, pagination, retry)

### Description

Build the screens the brief ranks third: the order detail page (per-mailbox status and the audit log, updating live while the worker runs) and the admin list with status and provider filters, pagination and a retry button. The detail page is shared by customers (their own orders) and admins (any order).

### Technical details

1. **`src/app/(app)/orders/[id]/page.tsx`** (server): `requireViewer` → `OrderService.getOrderForViewer` → `notFound()` when the service reports not found → render `OrderDetailView` with the initial `OrderDetail` DTO.
2. **`useOrderPolling(id, initial)`** (`src/features/orders/hooks`): polls `GET /api/orders/:id` every `ORDER_POLL_INTERVAL_MS` while the status is PENDING or PROVISIONING; pauses while the tab is hidden and resumes when visible; stops at ACTIVE or FAILED; resumes after a successful retry; aborts the in-flight request on unmount; keeps the last good data on errors and shows a small inline warning after three consecutive failures.
3. **`OrderDetailView`** (client):
   - Header (`PageHeader`): domain, `ProviderChip`, `OrderStatusChip`, created time (`LocalTime`), order id with a copy button, back link (customers → `/orders`, admins → `/admin/orders`).
   - Summary cards: total, active, failed, pending mailboxes, and a progress bar (active / total) using the `orders.progress*` tokens.
   - When FAILED: an `Alert` with `lastError`, and, only when the DTO says `canRetry` (admin), a `RetryOrderButton`.
   - `MailboxTable`: position, address, `MailboxStatusChip`, provisioned time, error (truncated, full text in a tooltip). Up to 50 rows, no pagination needed; scrolls horizontally inside its card on small screens.
   - `AuditLogTimeline`: events oldest first; each shows the time (`LocalTime`), "Created" for the creation event or the from → to status chips, the actor (Customer / Admin / Worker / System, coloured with the `audit.actor*` tokens) with `actorLabel`, the reason, and a short metadata summary such as "3 of 10 mailboxes failed".
4. **`RetryOrderButton`** (`src/features/admin/components`): calls `POST /api/admin/orders/:id/retry`; disabled with a spinner while in flight (prevents double clicks); on success shows a snackbar "Order queued for retry" and updates the view (detail: new DTO and polling resumes; list: `router.refresh()`); on error shows the server's message in a snackbar (for example 409 when someone already retried). Styled with the `admin.retryButton*` tokens.
5. **`src/app/(app)/admin/orders/page.tsx`** (server): reads `searchParams` (awaited), parses them with `adminOrderListQuerySchema`; invalid values fall back to defaults instead of an error page; calls `listOrdersForAdmin`; passes items and meta to `AdminOrdersView`. Filters and page live in the URL, so they survive refresh and can be shared.
6. **`AdminOrdersView`** (client):
   - `OrderFilters` bar (`admin.filterBar*` tokens): Status select (All, Pending, Provisioning, Active, Failed), Provider select (All, Google, Microsoft), a Reset button. Changing a filter updates the URL and resets the page to 1.
   - Table: created (`LocalTime`), customer email, domain, `ProviderChip`, mailboxes, `OrderStatusChip`, attempts, actions (`RetryOrderButton` when `canRetry`, and a View link). Clicking a row opens the detail page.
   - `TablePagination` driven by the server: page and page size (10/20/50) written to the URL; if a filter change leaves the page past the end, go to the last page.
   - A Refresh button (`router.refresh()`), and auto-refresh every 5 s while any visible row is PENDING or PROVISIONING.
   - Empty state "No orders match these filters" with a Reset action.
7. No business rules in components: retry visibility comes only from `canRetry`; statuses are displayed, never interpreted.

### Edge cases to handle

- Dates render in local time without hydration mismatches (always through `LocalTime`).
- Double-clicking Retry sends one request; a second admin retrying the same order gets a readable 409 message, not a crash.
- Polling stops on unmount and when the tab is hidden; no duplicate intervals after a retry.
- The URL `?status=banana&page=-3` shows the default list, not an error.
- An order id the viewer may not see shows the 404 page (same as a missing id).
- Narrow screens: tables scroll inside their cards; the page itself never scrolls sideways.

### Acceptance criteria

- With the worker running: create an order with the CLI (`npm run order:create …`), open its detail page as the customer, and watch the status and mailbox chips change without reloading; the audit log grows (Created → Provisioning → Active/Failed).
- As admin: filter by Failed + Microsoft (URL updates), page through the seeded orders, retry a FAILED order from the list → snackbar, status becomes Pending, then the worker picks it up.
- The admin sees the Retry button on FAILED orders; the customer never sees it on their own FAILED order.
- No hydration warnings; lint, typecheck, test and build pass; committed and pushed.

### Likely Claude Code mistakes

- Fetches the admin list in a client `useEffect` instead of rendering it on the server from `searchParams`.
- Decides retry eligibility in the component (`status === 'FAILED' && role === 'ADMIN'`) instead of using `canRetry`.
- Starts a new polling interval on every render or after every retry (multiple timers).
- Formats dates directly in server-rendered markup.

### Claude Code Prompt

Read Ticket 4.2 in docs/tickets/PART_3_UI_AND_DELIVERY.md, plus docs/reference/COLOR_SYSTEM.md, sections 3, 5 and 7 of docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md and CLAUDE.md. Show me a short plan first and wait for my go-ahead. Build the order detail page as a server page that loads the DTO through OrderService and returns notFound when the viewer may not see it, and a client OrderDetailView with header, summary cards and progress bar, a failure alert, a RetryOrderButton shown only when canRetry is true, a MailboxTable and an AuditLogTimeline with actor colours from the audit tokens, all dates through LocalTime. Add useOrderPolling that polls every ORDER_POLL_INTERVAL_MS only while PENDING or PROVISIONING, pauses on hidden tabs, stops at terminal states, resumes after retry, aborts on unmount and tolerates errors. Build the admin orders page rendered on the server from awaited, validated searchParams with safe defaults, and a client AdminOrdersView with URL-driven status and provider filters, server-driven pagination with 10, 20 and 50 rows, a Refresh button, auto-refresh while any row is in progress, row links to the detail page, inline retry and an empty state. RetryOrderButton prevents double clicks and reports success and errors in a snackbar. Use only tokens and keep business rules out of components. With the worker running, demonstrate live updates on a CLI-created order and an admin retry, check there are no hydration warnings, run lint, typecheck, test and build, then commit in small Conventional Commits and push.

### This I need to do

1. Keep two terminals open: `npm run dev` and `npm run worker`.
2. In the browser as admin: filter to Failed, click Retry on one order, and watch it go Pending → Provisioning → Active or Failed on its detail page.
3. Time log: note anything you asked Claude Code to change in the UI.

---

## 🎫 TICKET 4.3 — Customer screens: my orders list and the idempotent create-order form

### Description

Finish the customer side: the "My orders" list and the create-order form. The form is where idempotency becomes visible: double-clicks, slow networks and retries must never create two orders.

### Technical details

1. **`src/app/(app)/orders/page.tsx`** (server): `requireViewer`; admins are redirected to `/admin/orders`; reads `page` and `pageSize` from the awaited `searchParams` with safe defaults; calls `listOrdersForCustomer`; renders `OrdersTable`.
2. **`OrdersTable`** (client): `PageHeader` "My orders" with a "New order" button; columns created (`LocalTime`), domain, `ProviderChip`, mailboxes, `OrderStatusChip`; row click opens the detail page; server-driven `TablePagination` in the URL; auto-refresh every 3 s while any visible row is PENDING or PROVISIONING (stops when none are); `EmptyState` "No orders yet" with a "Create your first order" button.
3. **`src/app/(app)/orders/new/page.tsx`** (server): `requireViewer`; admins are redirected to `/admin/orders`; renders `CreateOrderForm`.
4. **`useIdempotencyKey()`** (`src/features/orders/hooks`): holds one key per submission attempt. Rules:
   - created once when the form mounts (not on every render);
   - **reused** when the user resubmits the **same** payload after a failure (network error, timeout, 5xx), so a retry can never create a second order;
   - **regenerated** when the user changes any field after a failed attempt (it is a new request);
   - regenerated after a successful create (the form then navigates away anyway).
   Uses `crypto.randomUUID()` with a fallback based on `crypto.getRandomValues` when `randomUUID` is unavailable (it only exists in secure contexts: `localhost` works, a LAN IP over http does not).
5. **`CreateOrderForm`** (client):
   - Domain text field (helper text "e.g. example.com"; shows the normalised lowercase value on blur).
   - Provider choice: two large selectable cards or a toggle group, "Google" and "Microsoft" (text only, provider tokens, no brand logos).
   - Mailbox count: a number field limited to 1–50 plus quick-pick chips (1, 5, 10, 25, 50).
   - A summary line: "You are ordering 10 Microsoft mailboxes for example.com".
   - Validation with the shared `createOrderSchema` on blur and on submit; server `VALIDATION_ERROR` details mapped to the matching fields; other errors in an `Alert` (a 422 mismatch explains that the request changed and asks to submit again).
   - Submit button disabled while sending; Enter cannot submit twice; on 201 or 200 (replay) navigate to `/orders/<id>` with a snackbar "Order created". Cancel returns to `/orders`.
6. **Optional unit test** for `useIdempotencyKey` rules (same payload after failure → same key; changed payload → new key). Cut first if behind.

### Edge cases to handle

- An empty count field must not turn into 0 silently; it is a validation error.
- Decimals ("2.5"), negative numbers and text in the count field are rejected with a message.
- Pasting `https://Example.com/` into the domain field shows the URL error with a hint to type only the domain.
- Browser back after creating an order shows a fresh form with a fresh key.
- Double-clicking Submit creates exactly one order (verify in the database).
- Admins can never reach the customer screens.

### Acceptance criteria

- As the customer: create a 1-mailbox order → land on its detail page → with the worker running it reaches ACTIVE (usually) live; create a 20-mailbox order → it usually reaches FAILED; both appear in "My orders" and update while in progress.
- Double-clicking Submit produces one order (Claude Code shows the row count before and after).
- Simulated network failure (DevTools offline, or a test of the hook) then resubmit with the same values → still one order.
- Every invalid input listed above shows a field error; server and client messages agree.
- lint, typecheck, test and build pass; no hydration warnings; committed and pushed.

### Likely Claude Code mistakes

- Generates the key inline or in a `useMemo` without stable dependencies, so every click gets a new key (duplicates).
- Converts the count with `Number(value)`, turning an empty field into 0.
- Trusts client validation only (the server must still validate; it already does — make sure the form shows server errors).
- Lets admins open `/orders/new`.

### Claude Code Prompt

Read Ticket 4.3 in docs/tickets/PART_3_UI_AND_DELIVERY.md, plus docs/reference/COLOR_SYSTEM.md, sections 3.5, 5 and 7 of docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md and CLAUDE.md. Show me a short plan first and wait for my go-ahead. Build the customer My orders page rendered on the server from awaited searchParams with admins redirected to the admin list, and a client OrdersTable with header and New order button, provider and status chips, LocalTime dates, row links, URL-driven pagination, auto-refresh only while a visible row is in progress, and an empty state. Build the new-order page and CreateOrderForm with domain, provider cards, a 1 to 50 count with quick picks, a summary line, validation with the shared schema on blur and submit, server validation details mapped to fields, other errors in an Alert, a submit that cannot fire twice and navigation to the detail page on 201 or 200. Implement useIdempotencyKey that creates one key on mount, reuses it when the same payload is resubmitted after a failure, regenerates it when the payload changes or after success, and falls back to getRandomValues when randomUUID is unavailable. Demonstrate a small and a large order end to end with the worker running, prove a double click and a failed-then-repeated submit each create one order by showing database counts, run lint, typecheck, test and build, check there are no hydration warnings, then commit in small Conventional Commits and push.

### This I need to do

1. Create two orders yourself in the browser as the customer: one with 1 mailbox, one with 20. Watch both on their detail pages with the worker running.
2. Time log: checkpoint 3:25. If you are behind, skip the optional hook test.

---

## 🎫 TICKET 5.1 — Deliverable documents: README (clean clone in under 10 minutes), docs/ARCHITECTURE.md, docs/AI_WORKLOG.md

### Description

Write the documents the reviewers grade: a README that works on a clean machine, the architecture document naming every design pattern, and the AI worklog skeleton (Claude Code fills the factual parts; you write the personal parts).

### Technical details

1. **README.md**, in this order:
   - **Demo video link at the very top** (placeholder line "Demo video: <link>" until Ticket 5.2).
   - What it is (two sentences) and the stack.
   - **Quick start with Docker** (reviewer path): prerequisites (Node ≥ 22, npm, Docker); `git clone`, `cd`, `cp .env.example .env` (works as is: the development secret placeholder is valid outside production), `docker compose up -d`, `npm ci`, `npm run db:deploy`, `npm run db:seed`, `npm run dev` (terminal 1), `npm run worker` (terminal 2), open http://localhost:3000.
   - **Alternative: existing local PostgreSQL** (your path): `scripts/db/setup-local.sh`, then set both URLs in `.env` to port 5432.
   - **Logins** table: the three seeded accounts with roles and passwords.
   - **Running tests**: `npm test`, `npm run test:unit`, `npm run test:integration` (needs the test database; Docker creates it automatically; the local path uses the setup script).
   - **Scripts** table (every npm script, one line each).
   - **How it works** in a few lines, linking to `docs/ARCHITECTURE.md`.
   - **API** table (method, path, who, purpose), short.
   - **Demo tips:** the mock fails about 20 % **per mailbox**, so 1–2 mailboxes usually succeed and 20+ usually fail; retry re-provisions only the failed mailboxes; two workers can run at once; `npm run order:create` creates orders from the terminal.
   - **Known limitations** (honest list): no login rate limiting; no Content-Security-Policy; idempotency keys never expire; polling instead of push updates; non-ASCII domains must be entered in punycode; one order per worker process at a time; mailbox addresses are generated, not chosen; no sign-up (seeded users only).
   - **Unfinished** (anything cut from the plan, or "None").
   - **Troubleshooting:** port 5433 or 3000 already in use; Node version; `prisma generate` after pulling; Docker not running.
   - Every command in the README must exist in `package.json` and every port must match `.env.example` and `docker-compose.yml`.
2. **docs/ARCHITECTURE.md** (graded at 20 %): a short overview with two Mermaid diagrams (the order state diagram, and the sequence of a create request plus a worker run), then one section per pattern with **what**, **where** (file paths), **why**, and **one rejected alternative and why**:
   - Layered architecture (route handler → service → repository) — rejected: logic in route handlers / Server Actions with inline Prisma.
   - Service layer with constructor injection and a composition root (`container.ts`) — rejected: a DI framework (overkill) or module-level singletons everywhere (hard to test).
   - Repository pattern — rejected: calling Prisma directly from services.
   - State machine as a transition table, with a single transition service as the only writer of status — rejected: scattered if/else status checks, or XState (too heavy for four states).
   - Unit of work: status change and audit event in one transaction — rejected: writing the audit log asynchronously (could lose events).
   - Strategy + registry for providers — rejected: if/else on provider in the worker.
   - Queue and worker on PostgreSQL (`FOR UPDATE SKIP LOCKED`), with lease, heartbeat, fencing and a sweeper — rejected: BullMQ + Redis (extra infrastructure), pg-boss (hides the mechanism being graded), `LISTEN/NOTIFY` (messages lost while no worker listens).
   - Idempotency key with request fingerprint and a database unique constraint as the arbiter — rejected: in-memory or Redis key cache (lost on restart, races).
   - DTO / mapper with field whitelists and derived permissions (`canRetry`) — rejected: returning ORM objects.
   - Error hierarchy mapped to one HTTP envelope — rejected: try/catch per route.
   - Polling for live status — rejected: WebSockets / Server-Sent Events (more moving parts for a 2-second refresh need).
   - Design tokens for colours — rejected: hard-coded colours per component.
   - A short "trade-offs and what I would do next" section.
   Every statement must match the code that exists; Claude Code checks each file path it cites.
3. **docs/AI_WORKLOG.md** skeleton with these headings:
   - **Planning approach** — left for you to write.
   - **Key prompts (3–5)** — Claude Code pre-fills candidates (the prompts of Tickets 1.3, 2.2, 3.2 and 4.3 are good ones) for you to choose from and trim.
   - **Times Claude Code was wrong** — a table with columns "What it did", "How I noticed", "How I fixed it", "Commit"; empty rows for you.
   - **What I changed by hand** — left for you.
   - **Time per phase** — a table pre-filled as a **draft** from `git log` timestamps (first and last commit per phase), with a note that you must correct it from your own time log; and a total.
4. **CLAUDE.md:** refresh the commands table so it lists every script that now exists.

### Edge cases to handle

- The README must not mention scripts, files or features that do not exist.
- `.env.example` copied as is must work for the Docker path (port 5433, valid development secret).
- ARCHITECTURE.md must not claim tests or protections that are not in the code.
- Claude Code must not invent your personal worklog content (planning approach, mistakes, hand changes). It leaves those for you.

### Acceptance criteria

- Every command in the README is in `package.json`; ports agree across README, `.env.example` and `docker-compose.yml` (Claude Code shows the check).
- ARCHITECTURE.md covers every pattern above with what / where / why / rejected alternative, and every cited path exists.
- AI_WORKLOG.md has all five sections; personal sections are clearly marked for you to complete.
- Committed and pushed.

### Likely Claude Code mistakes

- Writes README commands from memory (`npm run migrate`, `npm run seed`) that don't match the real script names.
- Describes features or tests that were cut.
- Fills the "Claude Code was wrong" section with invented examples.

### Claude Code Prompt

Read Ticket 5.1 in docs/tickets/PART_3_UI_AND_DELIVERY.md, plus docs/reference/SYSTEM_DESIGN_AND_FOLDER_STRUCTURE.md and CLAUDE.md, and look at the actual package.json, .env.example, docker-compose.yml and source tree. Show me a short plan first and wait for my go-ahead. Write README.md with the demo video placeholder at the very top, the Docker quick start that works with .env.example copied unchanged, the existing-PostgreSQL alternative, the logins table, test instructions, a scripts table, a short how-it-works section, an API table, demo tips explaining the per-mailbox failure rate, known limitations, an Unfinished list and troubleshooting, using only commands and ports that really exist. Write docs/ARCHITECTURE.md with the order state diagram and a create-plus-worker sequence diagram in Mermaid, then one section per pattern listed in the ticket stating what it is, where it lives with real file paths, why it was chosen and one rejected alternative, plus a short trade-offs section, checking every path you cite. Create docs/AI_WORKLOG.md with the five sections from the ticket, pre-filling only candidate key prompts and a draft time-per-phase table from git log timestamps marked as a draft, and leaving the planning approach, mistakes and hand changes for me. Refresh the CLAUDE.md commands table. Show me the check that README commands and ports match the repository, then commit in small Conventional Commits and push.

### This I need to do

1. Fill the personal sections of `docs/AI_WORKLOG.md` from your time log, in your own words:
   - **Planning approach:** how you broke the brief into phases and tickets before coding, where those tickets came from, how you reviewed each plan before letting Claude Code start.
   - **Key prompts:** keep 3–5 of the candidates; add one line each on why it worked.
   - **Times Claude Code was wrong:** at least two real ones from your notes (what it did, how you noticed, how you fixed it, the commit).
   - **What I changed by hand:** any edit you made yourself.
   - **Time per phase:** correct the draft from your notes and write the total.
2. Commit it yourself: `git add docs/AI_WORKLOG.md`, `git commit -m "docs: complete AI worklog"`, `git push`.

---

## 🎫 TICKET 5.2 — Final verification: clean-clone rehearsal, full checks, layer audit, demo video, submission

### Description

Prove the README works on a clean checkout, run every check one last time, and record the demo video. A README that fails on a clean machine is one of the brief's red flags, so the rehearsal is not optional.

### Technical details

1. **Clean-clone rehearsal** (Claude Code): clone the GitHub repo into a scratch folder outside the project; follow the README literally using the existing-PostgreSQL path with **temporary** database names (for example `mailbox_manager_clean_dev` and `mailbox_manager_clean_test`, created and later dropped by the same role, never touching your real dev data); `npm ci`, `db:deploy`, `db:seed`, `build`, `test`; start the app on another port (for example 3100) and the worker; log in and create an order via `curl`; time the whole run (target under 10 minutes). Fix the README (or the code) for every step that does not work as written, then drop the temporary databases and delete the scratch folder.
2. **Full checks** in the real repo: `npm run lint`, `npm run typecheck`, `npm test`, `npm run build` all pass.
3. **Layer audit** (show each command and its output):
   - no Prisma, `src/server/db` or `src/server/repositories` imports under `src/app`;
   - no `process.env` outside `env.ts`, `next.config.ts`, `prisma.config.ts` and test setup;
   - no order status writes outside `order-transition.service.ts`;
   - no colour literals outside `src/styles`;
   - no `src/server` imports in `'use client'` files;
   - no `console.log` left in `src` (except the worker logger).
4. **Commit history check:** `git log --oneline` shows small, meaningful commits (no giant commit).
5. **Brief checklist:** go through every line of the brief (features, technical rules, Claude Code evidence, submission items) and mark each done or listed in "Unfinished". Fix anything small that is missing.
6. Final commit and push. Optionally tag `v1.0.0`.

### Edge cases to handle

- The rehearsal must never run destructive commands against `mailbox_manager_dev` or `mailbox_manager_test`.
- If something cannot be fixed in time, it goes in the README's "Unfinished" list instead of being hidden.

### Acceptance criteria

- The clean-clone rehearsal completes following only the README, with the measured time reported.
- lint, typecheck, test and build pass; the layer audit is clean.
- The brief checklist is complete, with every item done or listed as unfinished.
- Pushed to `main`.

### Likely Claude Code mistakes

- "Verifies" the README by running commands from memory instead of copying them from the README.
- Uses the real dev database for the rehearsal.
- Marks items as done that were cut.

### Claude Code Prompt

Read Ticket 5.2 in docs/tickets/PART_3_UI_AND_DELIVERY.md, plus the README and CLAUDE.md. Show me a short plan first and wait for my go-ahead. Clone the GitHub repo into a scratch folder outside this project and follow the README literally, using the existing-PostgreSQL path with temporary databases named mailbox_manager_clean_dev and mailbox_manager_clean_test so my real databases are never touched; run npm ci, db:deploy, db:seed, build and test, start the app on port 3100 and the worker, log in and create an order with curl, and time the whole run. Fix the README or code for every step that does not work as written, then drop the temporary databases and delete the scratch folder. In the real repo run lint, typecheck, test and build, run the layer audit commands listed in the ticket and show each output, show git log --oneline, and walk through every requirement of the brief marking it done or adding it to the README Unfinished list. Commit any fixes in small Conventional Commits and push.

### This I need to do

1. **Record the 2–3 minute demo video** (the brief's required flow):
   - 0:00 — one sentence: what the app is.
   - Start `npm run dev` and `npm run worker` in two visible terminals.
   - Log in as **customer**, create a **1-mailbox** order → detail page → watch it reach **Active** (success).
   - Create a **20-mailbox** order → watch it reach **Failed**, show the per-mailbox statuses and the audit log.
   - Log out, log in as **admin**, filter **Failed**, open that order, show the **audit log**, click **Retry**, watch it go Pending → Provisioning → Active/Failed.
   - In a terminal run `npm test` and show it passing.
   - Tools: QuickTime Player → File → New Screen Recording (built into your Mac), or Loom. Record a couple of takes; the random failures may need a second try.
2. **Upload it:** YouTube (visibility **Unlisted**), Loom, or Google Drive (Share → "Anyone with the link"). Copy the link.
3. **Put the link at the top of README.md**, then: `git add README.md`, `git commit -m "docs: add demo video link"`, `git push`.
4. **Share the repo:** if it is private, GitHub → your repo → **Settings** → **Collaborators** → **Add people** → type the reviewers' GitHub usernames (ask the company for them). Or make it public: **Settings** → **General** → scroll to **Danger Zone** → **Change visibility** → Public.
5. **If you hit 4 hours, stop.** Make sure the README "Unfinished" list is accurate, push, and send it anyway.
6. Reply to the company with the repo link and the video link.

---

## Summary of all tickets

| Ticket | Delivers | Brief priority |
|---|---|---|
| 0.1 | Baseline tooling, skeleton, CLAUDE.md, first commits | Claude Code evidence |
| 0.2 | Isolated local databases, docker-compose, Prisma, validated env | Technical rules |
| 1.1 | Schema, migration with CHECK constraints, user seed | 1 |
| 1.2 | State machine, errors, shared schemas, unit tests | 1, 5 |
| 1.3 | Repositories, transition service + audit, idempotent creation, retry, integration tests, sample seed | 1, 3, 5 |
| 2.1 | Provider Strategy, mock Google/Microsoft, registry | 2 |
| 2.2 | Worker: SKIP LOCKED claim, heartbeat, fencing, sweeper, shutdown, CLI | 2 |
| 3.1 | Login, session cookie, guards, HTTP error envelope | 3 |
| 3.2 | Orders API: create, lists, detail, admin filters, retry | 1, 3 |
| 4.1 | MUI theme from tokens, shell, login page, route protection | 3, 4 |
| 4.2 | Order detail with mailboxes and audit log; admin list, filters, pagination, retry | 3 |
| 4.3 | Customer list and idempotent create form | 4 |
| 5.1 | README, ARCHITECTURE.md, AI_WORKLOG.md | Submission |
| 5.2 | Clean-clone rehearsal, audit, video, submission | Submission |
