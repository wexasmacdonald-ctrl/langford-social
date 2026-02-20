type DbEnv = {
  NEON_DATABASE_URL: string;
};

type InstagramEnv = {
  IG_USER_ID: string;
  IG_ACCESS_TOKEN: string;
  GRAPH_API_VERSION: string;
};

type FacebookEnv = {
  FB_PAGE_ID: string;
  FB_ACCESS_TOKEN: string;
  GRAPH_API_VERSION: string;
};

type AuthEnv = {
  PUBLISH_CRON_SECRET: string;
  CRON_SECRET?: string;
};

type ScheduleEnv = {
  BUSINESS_TIMEZONE: string;
  DAILY_POST_HOUR: number;
  PUBLIC_BASE_URL: string;
};

type RuntimeEnv = {
  DRY_RUN: boolean;
  ALERT_WEBHOOK_URL?: string;
};

function parseBoolean(value: string | undefined, defaultValue = false): boolean {
  if (!value) {
    return defaultValue;
  }
  const normalized = value.trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "on";
}

function requireValue(key: string, value: string): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }
  return value;
}

export function getDbEnv(): DbEnv {
  return {
    NEON_DATABASE_URL: requireValue("NEON_DATABASE_URL", process.env.NEON_DATABASE_URL ?? ""),
  };
}

export function getInstagramEnv(): InstagramEnv {
  return {
    IG_USER_ID: requireValue("IG_USER_ID", process.env.IG_USER_ID ?? ""),
    IG_ACCESS_TOKEN: requireValue("IG_ACCESS_TOKEN", process.env.IG_ACCESS_TOKEN ?? ""),
    GRAPH_API_VERSION: process.env.GRAPH_API_VERSION ?? "v20.0",
  };
}

export function getFacebookEnv(): FacebookEnv {
  const instagramToken = process.env.IG_ACCESS_TOKEN ?? "";
  return {
    FB_PAGE_ID: requireValue("FB_PAGE_ID", process.env.FB_PAGE_ID ?? ""),
    FB_ACCESS_TOKEN: requireValue("FB_ACCESS_TOKEN", process.env.FB_ACCESS_TOKEN ?? instagramToken),
    GRAPH_API_VERSION: process.env.GRAPH_API_VERSION ?? "v20.0",
  };
}

export function getAuthEnv(): AuthEnv {
  return {
    PUBLISH_CRON_SECRET: requireValue("PUBLISH_CRON_SECRET", process.env.PUBLISH_CRON_SECRET ?? ""),
    CRON_SECRET: process.env.CRON_SECRET,
  };
}

export function getScheduleEnv(): ScheduleEnv {
  const parsedHour = Number(process.env.DAILY_POST_HOUR ?? "8");
  const hour = Number.isFinite(parsedHour) ? parsedHour : 8;

  return {
    BUSINESS_TIMEZONE: process.env.BUSINESS_TIMEZONE ?? "America/Toronto",
    DAILY_POST_HOUR: Math.max(0, Math.min(23, Math.trunc(hour))),
    PUBLIC_BASE_URL: requireValue("PUBLIC_BASE_URL", process.env.PUBLIC_BASE_URL ?? ""),
  };
}

export function getRuntimeEnv(): RuntimeEnv {
  return {
    DRY_RUN: parseBoolean(process.env.DRY_RUN, false),
    ALERT_WEBHOOK_URL: process.env.ALERT_WEBHOOK_URL?.trim() || undefined,
  };
}
