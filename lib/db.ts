import { neon } from "@neondatabase/serverless";
import { getDbEnv } from "@/lib/env";
import type {
  ApiTokenProvider,
  ApiTokenRow,
  PostRow,
  PublishRunRow,
  PublishRunStatus,
  ScheduledTemplateRow,
  WeekdayKey,
} from "@/lib/types";

function getSql() {
  const env = getDbEnv();
  return neon(env.NEON_DATABASE_URL);
}

let schemaReady: Promise<void> | null = null;

const WEEKDAY_SET = new Set<WeekdayKey>([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

function normalizeMediaUrls(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === "string" && item.length > 0);
  }

  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value) as unknown;
      if (Array.isArray(parsed)) {
        return parsed.filter((item): item is string => typeof item === "string" && item.length > 0);
      }
    } catch {
      return [];
    }
  }

  return [];
}

function toWeekdayKey(value: unknown): WeekdayKey {
  const normalized = String(value ?? "").toLowerCase();
  if (WEEKDAY_SET.has(normalized as WeekdayKey)) {
    return normalized as WeekdayKey;
  }
  return "monday";
}

function normalizePostRow(row: Record<string, unknown>): PostRow {
  return {
    id: Number(row.id),
    image_url: String(row.image_url ?? ""),
    media_urls: normalizeMediaUrls(row.media_urls),
    caption: (row.caption as string | null) ?? null,
    status: (row.status as PostRow["status"]) ?? "queued",
    posted_at: (row.posted_at as string | null) ?? null,
    order_index: Number(row.order_index ?? 0),
    last_error: (row.last_error as string | null) ?? null,
    source_key: (row.source_key as string | null) ?? null,
    target_date: (row.target_date as string | null) ?? null,
  };
}

function normalizeTemplateRow(row: Record<string, unknown>): ScheduledTemplateRow {
  return {
    weekday_key: toWeekdayKey(row.weekday_key),
    title_en: String(row.title_en ?? ""),
    title_fr: String(row.title_fr ?? ""),
    media_urls: normalizeMediaUrls(row.media_urls),
    is_daily_special: Boolean(row.is_daily_special),
    sort_order: Number(row.sort_order ?? 0),
    active: Boolean(row.active),
  };
}

function normalizePublishRunRow(row: Record<string, unknown>): PublishRunRow {
  return {
    id: Number(row.id ?? 0),
    run_date: String(row.run_date ?? ""),
    weekday_key: toWeekdayKey(row.weekday_key),
    status: (String(row.status ?? "skipped") as PublishRunStatus),
    ig_media_id: (row.ig_media_id as string | null) ?? null,
    fb_post_id: (row.fb_post_id as string | null) ?? null,
    error_message: (row.error_message as string | null) ?? null,
    created_at: String(row.created_at ?? ""),
  };
}

function toApiTokenProvider(value: unknown): ApiTokenProvider {
  return String(value ?? "").toLowerCase() === "facebook" ? "facebook" : "instagram";
}

function normalizeApiTokenRow(row: Record<string, unknown>): ApiTokenRow {
  return {
    provider: toApiTokenProvider(row.provider),
    access_token: String(row.access_token ?? ""),
    expires_at: (row.expires_at as string | null) ?? null,
    updated_at: String(row.updated_at ?? ""),
  };
}

async function ensureSchemaExtensions(): Promise<void> {
  if (schemaReady) {
    return schemaReady;
  }

  schemaReady = (async () => {
    const sql = getSql();

    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_key TEXT NULL`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS target_date DATE NULL`;
    await sql`ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls JSONB NULL`;
    await sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_source_key_target_date
      ON posts(source_key, target_date)
      WHERE source_key IS NOT NULL AND target_date IS NOT NULL
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS scheduled_templates (
        weekday_key TEXT PRIMARY KEY CHECK (weekday_key IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
        title_en TEXT NOT NULL,
        title_fr TEXT NOT NULL,
        media_urls JSONB NOT NULL,
        is_daily_special BOOLEAN NOT NULL,
        sort_order INT NOT NULL,
        active BOOLEAN NOT NULL DEFAULT true
      )
    `;

    await sql`
      CREATE TABLE IF NOT EXISTS publish_runs (
        id SERIAL PRIMARY KEY,
        run_date DATE NOT NULL UNIQUE,
        weekday_key TEXT NOT NULL CHECK (weekday_key IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
        status TEXT NOT NULL CHECK (status IN ('posted','failed','skipped')),
        ig_media_id TEXT NULL,
        fb_post_id TEXT NULL,
        error_message TEXT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;
    await sql`ALTER TABLE publish_runs ADD COLUMN IF NOT EXISTS fb_post_id TEXT NULL`;
    await sql`
      CREATE TABLE IF NOT EXISTS api_tokens (
        provider TEXT PRIMARY KEY CHECK (provider IN ('instagram','facebook')),
        access_token TEXT NOT NULL,
        expires_at TIMESTAMPTZ NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `;

    await sql`
      INSERT INTO scheduled_templates (weekday_key, title_en, title_fr, media_urls, is_daily_special, sort_order, active)
      VALUES
        ('monday', 'Hamburger Platter', 'Assiette hamburger', '["/images/hamburger-platter.png","/images/pizza-pepperoni.png","/images/breakfast-deal.png"]'::jsonb, true, 1, true),
        ('tuesday', 'Smoked Meat Platter', 'Assiette sandwich à la viande fumée', '["/images/smoked-meat-platter.png","/images/pizza-pepperoni.png","/images/breakfast-deal.png"]'::jsonb, true, 2, true),
        ('wednesday', '8 Chicken Wings Platter', 'Assiette 8 ailes de poulet', '["/images/chicken-wings-platter.png","/images/pizza-pepperoni.png","/images/breakfast-deal.png","/images/bogo-pizza.jpg"]'::jsonb, true, 3, true),
        ('thursday', 'Chicken Finger Platter', 'Assiette doigts de poulet', '["/images/chicken-finger-platter.png","/images/pizza-pepperoni.png","/images/breakfast-deal.png","/images/bogo-pizza.jpg"]'::jsonb, true, 4, true),
        ('friday', 'Fish & Chips', 'Fish et frites', '["/images/fish-and-chips.png","/images/pizza-pepperoni.png","/images/breakfast-deal.png","/images/bogo-pizza.jpg"]'::jsonb, true, 5, true),
        ('saturday', 'Weekend Deals', 'Promotions du week-end', '["/images/pizza-pepperoni.png","/images/breakfast-deal.png"]'::jsonb, false, 6, true),
        ('sunday', 'Weekend Deals', 'Promotions du week-end', '["/images/pizza-pepperoni.png","/images/breakfast-deal.png"]'::jsonb, false, 7, true)
      ON CONFLICT (weekday_key) DO NOTHING
    `;
  })();

  return schemaReady;
}

export async function checkDbHealth(): Promise<void> {
  await ensureSchemaExtensions();
  const sql = getSql();
  await sql`SELECT 1`;
}

export async function getScheduledTemplateByWeekday(weekdayKey: WeekdayKey): Promise<ScheduledTemplateRow | null> {
  await ensureSchemaExtensions();
  const sql = getSql();
  const rows = await sql`
    SELECT weekday_key, title_en, title_fr, media_urls, is_daily_special, sort_order, active
    FROM scheduled_templates
    WHERE weekday_key = ${weekdayKey} AND active = true
    LIMIT 1
  `;
  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? normalizeTemplateRow(row) : null;
}

export async function listScheduledTemplates(): Promise<ScheduledTemplateRow[]> {
  await ensureSchemaExtensions();
  const sql = getSql();
  const rows = await sql`
    SELECT weekday_key, title_en, title_fr, media_urls, is_daily_special, sort_order, active
    FROM scheduled_templates
    ORDER BY sort_order ASC
  `;
  return (rows as Record<string, unknown>[]).map(normalizeTemplateRow);
}

export async function getPublishRunByDate(runDate: string): Promise<PublishRunRow | null> {
  await ensureSchemaExtensions();
  const sql = getSql();
  const rows = await sql`
    SELECT id, run_date, weekday_key, status, ig_media_id, fb_post_id, error_message, created_at
    FROM publish_runs
    WHERE run_date = ${runDate}
    LIMIT 1
  `;
  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? normalizePublishRunRow(row) : null;
}

export async function deletePublishRunByDate(runDate: string): Promise<boolean> {
  await ensureSchemaExtensions();
  const sql = getSql();
  const rows = await sql`
    DELETE FROM publish_runs
    WHERE run_date = ${runDate}
    RETURNING id
  `;
  return rows.length > 0;
}

export async function deleteAllPublishRuns(): Promise<number> {
  await ensureSchemaExtensions();
  const sql = getSql();
  const rows = await sql`
    DELETE FROM publish_runs
    RETURNING id
  `;
  return rows.length;
}

export async function upsertPublishRun(input: {
  runDate: string;
  weekdayKey: WeekdayKey;
  status: PublishRunStatus;
  igMediaId?: string | null;
  fbPostId?: string | null;
  errorMessage?: string | null;
}): Promise<PublishRunRow> {
  await ensureSchemaExtensions();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO publish_runs (run_date, weekday_key, status, ig_media_id, fb_post_id, error_message)
    VALUES (${input.runDate}, ${input.weekdayKey}, ${input.status}, ${input.igMediaId ?? null}, ${input.fbPostId ?? null}, ${input.errorMessage ?? null})
    ON CONFLICT (run_date)
    DO UPDATE SET
      weekday_key = EXCLUDED.weekday_key,
      status = EXCLUDED.status,
      ig_media_id = EXCLUDED.ig_media_id,
      fb_post_id = EXCLUDED.fb_post_id,
      error_message = EXCLUDED.error_message,
      created_at = NOW()
    RETURNING id, run_date, weekday_key, status, ig_media_id, fb_post_id, error_message, created_at
  `;
  return normalizePublishRunRow(rows[0] as Record<string, unknown>);
}

export async function listPublishRuns(limit = 30): Promise<PublishRunRow[]> {
  await ensureSchemaExtensions();
  const sql = getSql();
  const safeLimit = Math.max(1, Math.min(200, Math.trunc(limit)));
  const rows = await sql`
    SELECT id, run_date, weekday_key, status, ig_media_id, fb_post_id, error_message, created_at
    FROM publish_runs
    ORDER BY run_date DESC
    LIMIT ${safeLimit}
  `;
  return (rows as Record<string, unknown>[]).map(normalizePublishRunRow);
}

export async function getApiToken(provider: ApiTokenProvider): Promise<ApiTokenRow | null> {
  await ensureSchemaExtensions();
  const sql = getSql();
  const rows = await sql`
    SELECT provider, access_token, expires_at, updated_at
    FROM api_tokens
    WHERE provider = ${provider}
    LIMIT 1
  `;
  const row = rows[0] as Record<string, unknown> | undefined;
  return row ? normalizeApiTokenRow(row) : null;
}

export async function upsertApiToken(input: {
  provider: ApiTokenProvider;
  accessToken: string;
  expiresAt?: string | null;
}): Promise<ApiTokenRow> {
  await ensureSchemaExtensions();
  const sql = getSql();
  const rows = await sql`
    INSERT INTO api_tokens (provider, access_token, expires_at)
    VALUES (${input.provider}, ${input.accessToken}, ${input.expiresAt ?? null})
    ON CONFLICT (provider)
    DO UPDATE SET
      access_token = EXCLUDED.access_token,
      expires_at = EXCLUDED.expires_at,
      updated_at = NOW()
    RETURNING provider, access_token, expires_at, updated_at
  `;
  return normalizeApiTokenRow(rows[0] as Record<string, unknown>);
}

export async function listQueuedPosts(): Promise<PostRow[]> {
  await ensureSchemaExtensions();
  const sql = getSql();
  const rows = await sql`
    SELECT id, image_url, media_urls, caption, status, posted_at, order_index, last_error, source_key, target_date
    FROM posts
    WHERE status = 'queued'
    ORDER BY order_index ASC
  `;
  return (rows as Record<string, unknown>[]).map(normalizePostRow);
}

export async function getAllPosts(): Promise<PostRow[]> {
  await ensureSchemaExtensions();
  const sql = getSql();
  const rows = await sql`
    SELECT id, image_url, media_urls, caption, status, posted_at, order_index, last_error, source_key, target_date
    FROM posts
    ORDER BY order_index ASC
  `;
  return (rows as Record<string, unknown>[]).map(normalizePostRow);
}
