CREATE TABLE IF NOT EXISTS posts (
  id SERIAL PRIMARY KEY,
  image_url TEXT NOT NULL,
  caption TEXT,
  status TEXT NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'posted', 'failed')),
  posted_at TIMESTAMP NULL,
  order_index INT NOT NULL UNIQUE,
  last_error TEXT NULL,
  source_key TEXT NULL,
  target_date DATE NULL,
  media_urls JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_posts_status_order ON posts(status, order_index);
CREATE UNIQUE INDEX IF NOT EXISTS idx_posts_source_key_target_date
ON posts(source_key, target_date)
WHERE source_key IS NOT NULL AND target_date IS NOT NULL;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS source_key TEXT NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS target_date DATE NULL;
ALTER TABLE posts ADD COLUMN IF NOT EXISTS media_urls JSONB NULL;

CREATE TABLE IF NOT EXISTS state (
  id SERIAL PRIMARY KEY,
  last_post_index INT NOT NULL DEFAULT 0
);

INSERT INTO state (id, last_post_index)
VALUES (1, 0)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE IF NOT EXISTS scheduled_templates (
  weekday_key TEXT PRIMARY KEY CHECK (weekday_key IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  title_en TEXT NOT NULL,
  title_fr TEXT NOT NULL,
  media_urls JSONB NOT NULL,
  is_daily_special BOOLEAN NOT NULL,
  sort_order INT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE IF NOT EXISTS publish_runs (
  id SERIAL PRIMARY KEY,
  run_date DATE NOT NULL UNIQUE,
  weekday_key TEXT NOT NULL CHECK (weekday_key IN ('monday','tuesday','wednesday','thursday','friday','saturday','sunday')),
  status TEXT NOT NULL CHECK (status IN ('posted', 'failed', 'skipped')),
  ig_media_id TEXT NULL,
  fb_post_id TEXT NULL,
  error_message TEXT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE publish_runs ADD COLUMN IF NOT EXISTS fb_post_id TEXT NULL;

CREATE TABLE IF NOT EXISTS api_tokens (
  provider TEXT PRIMARY KEY CHECK (provider IN ('instagram','facebook')),
  access_token TEXT NOT NULL,
  expires_at TIMESTAMPTZ NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO scheduled_templates (weekday_key, title_en, title_fr, media_urls, is_daily_special, sort_order, active)
VALUES
  ('monday', 'Hamburger Platter', 'Assiette hamburger', '["/images/hamburger-platter.png","/images/pizza-pepperoni.png","/images/breakfast-deal.png"]'::jsonb, true, 1, true),
  ('tuesday', 'Smoked Meat Platter', 'Assiette sandwich à la viande fumée', '["/images/smoked-meat-platter.png","/images/pizza-pepperoni.png","/images/breakfast-deal.png"]'::jsonb, true, 2, true),
  ('wednesday', '8 Chicken Wings Platter', 'Assiette 8 ailes de poulet', '["/images/chicken-wings-platter.png","/images/pizza-pepperoni.png","/images/breakfast-deal.png","/images/bogo-pizza.jpg"]'::jsonb, true, 3, true),
  ('thursday', 'Chicken Finger Platter', 'Assiette doigts de poulet', '["/images/chicken-finger-platter.png","/images/pizza-pepperoni.png","/images/breakfast-deal.png","/images/bogo-pizza.jpg"]'::jsonb, true, 4, true),
  ('friday', 'Fish & Chips', 'Fish et frites', '["/images/fish-and-chips.png","/images/pizza-pepperoni.png","/images/breakfast-deal.png","/images/bogo-pizza.jpg"]'::jsonb, true, 5, true),
  ('saturday', 'Weekend Deals', 'Promotions du week-end', '["/images/pizza-pepperoni.png","/images/breakfast-deal.png"]'::jsonb, false, 6, true),
  ('sunday', 'Weekend Deals', 'Promotions du week-end', '["/images/pizza-pepperoni.png","/images/breakfast-deal.png"]'::jsonb, false, 7, true)
ON CONFLICT (weekday_key) DO NOTHING;
