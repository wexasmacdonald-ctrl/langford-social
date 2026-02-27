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
- `IG_ACCESS_TOKEN` (optional bootstrap token; app prefers `api_tokens` table)
- `FB_PAGE_ID`
- `FB_ACCESS_TOKEN` (optional bootstrap token; app prefers `api_tokens` table)
- `META_APP_ID` (optional but recommended; enables automatic token refresh)
- `META_APP_SECRET` (optional but recommended; enables automatic token refresh)
- `GRAPH_API_VERSION` (default `v20.0`)
- `PUBLISH_CRON_SECRET`
- `CRON_SECRET`
- `BUSINESS_TIMEZONE` (default `America/Toronto`)
- `DAILY_POST_HOUR` (default `8`)
- `PUBLIC_BASE_URL` (must be `https://` in production)
- `DRY_RUN` (`true` disables real Instagram publishing and records `skipped`)
- `ALERT_WEBHOOK_URL` (optional; receives JSON alert on publish failures for IG/FB)

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
- `POST /api/tokens/refresh`
  - Forces Meta token refresh and stores new tokens in `api_tokens`.
- `GET|POST /api/queue`
  - Deprecated (manual queue removed).
- `GET|POST /api/cron/queue-today`
  - Deprecated.

## Cron

`vercel.json` runs `/api/cron/daily` at `12:00`, `12:30`, `13:00`, and `13:30` UTC.
- This covers DST and gives one automatic retry within the same local 8 AM hour.
- If the first attempt fails and writes `failed`, later cron attempts on the same date will retry automatically.
- Cron publishing uses a local-hour window (`DAILY_POST_HOUR` through +2 hours) so delayed Vercel cron invocations still post the same morning.

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

- Instagram publish requires `IG_USER_ID` and a valid token in `api_tokens(provider='instagram')` (or env fallback).
- Facebook publish requires `FB_PAGE_ID` and a valid token in `api_tokens(provider='facebook')` (or env fallback).
- If `META_APP_ID` and `META_APP_SECRET` are set, tokens are refreshed automatically during publish runs.
- Before go-live, set `DRY_RUN=true` for safe end-to-end testing, then switch to `false`.
