import { NextResponse } from "next/server";
import { getAuthEnv } from "@/lib/env";
import { buildScheduledPostPayload, getRunDateForNow, hasRunForDate } from "@/lib/daily-deals";
import { getBearerToken, jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

function isAuthorized(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") {
    return true;
  }

  const token = getBearerToken(request);
  if (!token) {
    return false;
  }

  const env = getAuthEnv();
  return token === env.PUBLISH_CRON_SECRET || (!!env.CRON_SECRET && token === env.CRON_SECRET);
}

export async function GET(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return jsonError(401, "UNAUTHORIZED", "Missing or invalid bearer token");
    }

    const url = new URL(request.url);
    const dateQuery = url.searchParams.get("date")?.trim();
    const runDate = dateQuery || getRunDateForNow();

    const payload = await buildScheduledPostPayload(runDate);
    const existingRun = await hasRunForDate(runDate);

    return NextResponse.json({ ok: true, payload, existingRun }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message.includes("Invalid date format") ? 400 : 500;
    return jsonError(status, "PREVIEW_FAILED", message);
  }
}
