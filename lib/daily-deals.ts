import { getPublishRunByDate, getScheduledTemplateByWeekday } from "@/lib/db";
import { getScheduleEnv } from "@/lib/env";
import type {
  PublishRunRow,
  ScheduleWindowResult,
  ScheduledPostPayload,
  ScheduledTemplateRow,
  WeekdayKey,
} from "@/lib/types";

const DAY_NAMES_EN: Record<WeekdayKey, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const DAY_NAMES_FR: Record<WeekdayKey, string> = {
  monday: "Lundi",
  tuesday: "Mardi",
  wednesday: "Mercredi",
  thursday: "Jeudi",
  friday: "Vendredi",
  saturday: "Samedi",
  sunday: "Dimanche",
};

const WEEKDAY_SET = new Set<WeekdayKey>([
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
]);

function parseWeekday(value: string): WeekdayKey {
  const normalized = value.toLowerCase();
  if (WEEKDAY_SET.has(normalized as WeekdayKey)) {
    return normalized as WeekdayKey;
  }
  throw new Error(`Invalid weekday value: ${value}`);
}

function formatLocalDateParts(date: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);

  const year = parts.find((part) => part.type === "year")?.value ?? "0000";
  const month = parts.find((part) => part.type === "month")?.value ?? "01";
  const day = parts.find((part) => part.type === "day")?.value ?? "01";
  const dateKey = `${year}-${month}-${day}`;
  return { year, month, day, dateKey };
}

function formatLocalWeekday(date: Date, timeZone: string): WeekdayKey {
  const weekday = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    timeZone,
  }).format(date);
  return parseWeekday(weekday);
}

function asDateFromDateKey(dateKey: string): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new Error("Invalid date format. Use YYYY-MM-DD.");
  }
  return new Date(`${dateKey}T12:00:00.000Z`);
}

function buildAbsoluteMediaUrl(value: string): string {
  if (/^https?:\/\//i.test(value)) {
    if (process.env.NODE_ENV === "production" && !/^https:\/\//i.test(value)) {
      throw new Error("Scheduled template media URLs must use https in production.");
    }
    return value;
  }

  const env = getScheduleEnv();
  const base = env.PUBLIC_BASE_URL.replace(/\/+$/, "");
  if (process.env.NODE_ENV === "production" && !/^https:\/\//i.test(base)) {
    throw new Error("PUBLIC_BASE_URL must use https in production.");
  }

  const path = value.startsWith("/") ? value : `/${value}`;
  return `${base}${path}`;
}

function buildBilingualCaption(template: ScheduledTemplateRow): string {
  const weekday = template.weekday_key;
  const englishHeader = template.is_daily_special ? `${DAY_NAMES_EN[weekday]} Special` : DAY_NAMES_EN[weekday];
  const frenchHeader = template.is_daily_special
    ? `Spécial du ${DAY_NAMES_FR[weekday].toLowerCase()}`
    : DAY_NAMES_FR[weekday];

  const englishLines: string[] = [englishHeader, ""];
  const frenchLines: string[] = [frenchHeader, ""];

  if (template.is_daily_special) {
    englishLines.push(`${template.title_en} - $10.44`);
    englishLines.push("");
    frenchLines.push(`${template.title_fr} - 10,44 $`);
    frenchLines.push("");
  }

  englishLines.push("Everyday Deals:");
  englishLines.push('- 9" Pizza of Your Choice + 355ml beverage - $10.44');

  frenchLines.push("Promotions quotidiennes:");
  frenchLines.push('- Pizza 9" de votre choix + breuvage 355ml - 10,44 $');

  englishLines.push("");
  englishLines.push("Call for pickup (+1 819-647-2933)");

  frenchLines.push("");
  frenchLines.push("Appelez pour commander aujourd'hui : +1 819-647-2933");

  return [...englishLines, "", ...frenchLines].join("\n");
}

export function getRunDateForNow(now = new Date()): string {
  const env = getScheduleEnv();
  return formatLocalDateParts(now, env.BUSINESS_TIMEZONE).dateKey;
}

export async function getScheduledTemplateForDate(dateKey: string): Promise<ScheduledTemplateRow> {
  const env = getScheduleEnv();
  const date = asDateFromDateKey(dateKey);
  const weekday = formatLocalWeekday(date, env.BUSINESS_TIMEZONE);
  const template = await getScheduledTemplateByWeekday(weekday);
  if (!template) {
    throw new Error(`No active scheduled template for ${weekday}`);
  }
  return template;
}

export async function buildScheduledPostPayload(dateKey: string): Promise<ScheduledPostPayload> {
  const template = await getScheduledTemplateForDate(dateKey);
  const mediaUrls = template.media_urls.map(buildAbsoluteMediaUrl);
  if (mediaUrls.length === 0) {
    throw new Error(`Template ${template.weekday_key} has no media URLs`);
  }

  return {
    run_date: dateKey,
    weekday_key: template.weekday_key,
    media_urls: mediaUrls,
    caption: buildBilingualCaption(template),
    template,
  };
}

export async function hasRunForDate(dateKey: string): Promise<PublishRunRow | null> {
  return getPublishRunByDate(dateKey);
}

export function canRunNow(now = new Date()): ScheduleWindowResult {
  const env = getScheduleEnv();
  const dateMeta = formatLocalDateParts(now, env.BUSINESS_TIMEZONE);
  const weekday = formatLocalWeekday(now, env.BUSINESS_TIMEZONE);
  const hourPart = new Intl.DateTimeFormat("en-US", {
    timeZone: env.BUSINESS_TIMEZONE,
    hour: "numeric",
    hour12: false,
  })
    .formatToParts(now)
    .find((part) => part.type === "hour")?.value;

  const localHour = Number(hourPart ?? "0");
  if (localHour !== env.DAILY_POST_HOUR) {
    return {
      should_run: false,
      reason: `Not posting hour yet (${localHour}:00 local)`,
      run_date: dateMeta.dateKey,
      weekday_key: weekday,
      local_hour: localHour,
    };
  }

  return {
    should_run: true,
    reason: "Within schedule window",
    run_date: dateMeta.dateKey,
    weekday_key: weekday,
    local_hour: localHour,
  };
}
