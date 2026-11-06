# AI worklog

How this project was built with Claude Code. Sections marked **(you)** are for the author to write
in their own words; Claude Code only pre-filled the factual parts.

## Planning approach (you)

_To write: how the brief was broken into phases and tickets before coding, where the tickets came
from, and how each plan was reviewed before Claude Code started._

## Key prompts (3 to 5)

Candidates, copied from the ticket documents in `docs/tickets/`. Keep three to five and add one
line each on why it worked.

1. **Ticket 1.3, order use cases** (`docs/tickets/PART_1_SETUP_AND_DOMAIN.md`): repositories, a
   transition service that is the only writer of status, idempotent creation with unique-violation
   recovery, and the five-concurrent-requests integration test.
   _Why it worked (you):_
2. **Ticket 2.2, background worker** (`docs/tickets/PART_2_WORKER_AND_API.md`): claim with
   `FOR UPDATE SKIP LOCKED`, processing outside transactions, heartbeat, fencing, sweeper and
   graceful shutdown, plus the two-worker and `kill -9` demonstrations.
   _Why it worked (you):_
3. **Ticket 3.2, orders HTTP API** (`docs/tickets/PART_2_WORKER_AND_API.md`): thin handlers,
   201/200 with `Idempotent-Replayed`, 422 on mismatch, curl demonstrations for both roles.
   _Why it worked (you):_
4. **Ticket 4.3, customer screens** (`docs/tickets/PART_3_UI_AND_DELIVERY.md`): the
   `useIdempotencyKey` rules and the double-click and failed-then-repeated submit checks.
   _Why it worked (you):_

## Times Claude Code was wrong (you)

| What it did | How I noticed | How I fixed it | Commit |
| ----------- | ------------- | -------------- | ------ |
|             |               |                |        |
|             |               |                |        |

Candidates Claude Code recorded during the session (real events; check each and rewrite in your
own words before using it):

- Installed `prisma@latest`, which npm resolved to an 8.0 release candidate while
  `@prisma/client` resolved to 7.10.1. Caught by `prisma --version`; pinned all Prisma packages to
  7.10.1. Commit `feat(db): prisma 7 wiring and validated env module`.
- Left the scaffold's `cacheComponents` and `partialPrefetching` flags on, which the system design
  forbids. Removed in `chore: tooling baseline, strict typescript and folder skeleton`.
- Assumed `prisma migrate dev` regenerates the client (Prisma 7 no longer does); the first seed run
  crashed with `Cannot read properties of undefined (reading 'findUnique')`. `db:migrate` now also
  runs `prisma generate`. Commit `feat(auth): bcrypt password module and idempotent user seed`.
- Double-clicking Retry in the admin list sent one request but the second click fell through the
  disabled button to the row and opened a stale detail page. Seen in the headed browser run; the
  actions cell now swallows clicks. Commit `feat(ui): order detail with live polling and admin
orders list with filters and retry`.
- Used MUI `sx` `width: 1` for screen-reader-only labels (MUI reads it as 100%), which made the
  page scroll sideways by 780 px on tablets. Found by measuring `scrollWidth` at every width.
  Commit `fix(ui): real 404 status, hidden labels widening the page, clearer copy`.
- Wrapped the protected layouts in a loading boundary, so the 404 page was served with HTTP 200.
  Found with `curl -w '%{http_code}'`. Same fix commit.

## What I changed by hand (you)

_To write: any edit made without Claude Code._

## Time per phase

**Draft** from `git log` timestamps (first and last commit of each phase, local time). Correct it
from your own time log; commit times do not include planning and review before the first commit.

| Phase                            | First commit | Last commit | Draft duration |
| -------------------------------- | ------------ | ----------- | -------------- |
| 0 Setup (0.1, 0.2)               | 16:02        | 16:13       | 11 min         |
| 1 Domain core (1.1 to 1.3)       | 16:15        | 16:24       | 9 min          |
| 2 Provider and worker (2.1, 2.2) | 16:30        | 16:35       | 5 min          |
| 3 Auth and API (3.1, 3.2)        | 16:38        | 16:41       | 3 min          |
| 4 UI (4.1 to 4.3)                | 16:51        | 17:09       | 18 min         |
| 5 Delivery (5.1, 5.2)            | 17:09        | (you)       | (you)          |
| **Total**                        |              |             | **(you)**      |
