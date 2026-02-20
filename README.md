# Social Admin

Recurring Instagram + Facebook autoposter for daily restaurant specials.

## What It Does

- Publishes **one carousel post per day** at 8:00 AM local time (`America/Toronto` by default).
- Publishes to Instagram Graph API and Facebook Pages Graph API in the same run.
- Uses recurring weekday templates from `scheduled_templates` (not daily queue rows).
- Writes idempotent run history to `publish_runs` so each date runs once unless forced.
- Supports local/admin preview and simulation by date.

## Setup

1. Install dependencies:
   - `npm install`
2. Create env file:
   - Copy `.env.example` to `.env.local`
3. Fill required env values in `.env.local`.
4. Run `scripts/init.sql` in Neon SQL Editor.
5. Start app:
   - `npm run dev`
6. Open admin:
   - `http://localhost:3000/admin`

## Required Environment Variables

- `NEON_DATABASE_URL`
- `IG_USER_ID`
- `IG_ACCESS_TOKEN`
- `FB_PAGE_ID`
- `FB_ACCESS_TOKEN` (optional if same as `IG_ACCESS_TOKEN`)
- `GRAPH_API_VERSION` (default `v20.0`)
- `PUBLISH_CRON_SECRET`
- `CRON_SECRET`
- `BUSINESS_TIMEZONE` (default `America/Toronto`)
- `DAILY_POST_HOUR` (default `8`)
- `PUBLIC_BASE_URL` (must be `https://` in production)
- `DRY_RUN` (`true` disables real Instagram publishing and records `skipped`)
- `ALERT_WEBHOOK_URL` (optional; receives JSON alert on publish success and failures for IG/FB)

## API Endpoints

- `GET /api/health`
  - DB/app health check.
- `GET /api/schedule/preview?date=YYYY-MM-DD`
  - Returns the scheduled payload (media URLs + bilingual caption) for a date.
- `POST /api/publish-now?date=YYYY-MM-DD&force=true`
  - Publishes scheduled payload for date (or today if omitted).
- `GET|POST /api/cron/daily`
  - Cron entrypoint; checks local time window and publishes when due.
- `GET /api/publish-runs?limit=30`
  - Returns recent run history.
- `GET|POST /api/queue`
  - Deprecated (manual queue removed).
- `GET|POST /api/cron/queue-today`
  - Deprecated.

## Cron

`vercel.json`:

- Path: `/api/cron/daily`
- Schedule: `0 * * * *` (hourly UTC)

The route itself enforces local posting hour, so DST stays correct.

## Weekly Carousel Rules

- Monday/Tuesday:
  - Slide 1: daily special
  - Slide 2: 9" pizza
  - Slide 3: BLT/breakfast
- Wednesday/Thursday/Friday:
  - Slide 1: daily special
  - Slide 2: 9" pizza
  - Slide 3: BLT/breakfast
  - Slide 4: 2-for-1 14" pepperoni & cheese
- Saturday/Sunday:
  - Slide 1: 9" pizza
  - Slide 2: BLT/breakfast

## Notes

- Instagram publish requires real Meta credentials (`IG_USER_ID`, `IG_ACCESS_TOKEN`).
- Facebook publish requires a real Page ID (`FB_PAGE_ID`) and valid Page token (`FB_ACCESS_TOKEN` or fallback `IG_ACCESS_TOKEN`).
- Before go-live, set `DRY_RUN=true` for safe end-to-end testing, then switch to `false`.
