import { NextResponse } from "next/server";
import { getAuthEnv, getRuntimeEnv } from "@/lib/env";
import { canRunNow } from "@/lib/daily-deals";
import { getBearerToken, jsonError } from "@/lib/http";
import { runScheduledPublish } from "@/lib/publisher";

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
  return POST(request);
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return jsonError(401, "UNAUTHORIZED", "Missing or invalid bearer token");
    }

    const window = canRunNow();
    const runtime = getRuntimeEnv();
    if (!window.should_run) {
      return NextResponse.json(
        {
          ok: true,
          skipped: true,
          dry_run: runtime.DRY_RUN,
          reason: window.reason,
          weekday: window.weekday_key,
          localHour: window.local_hour,
          date: window.run_date,
        },
        { status: 200 },
      );
    }

    const publishResult = await runScheduledPublish({
      dateKey: window.run_date,
      force: false,
      mode: "cron",
    });

    return NextResponse.json(
      {
        ok: true,
        skipped: publishResult.status === "skipped",
        dry_run: runtime.DRY_RUN,
        reason: publishResult.reason,
        publish: publishResult,
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonError(500, "CRON_RUN_FAILED", message);
  }
}
