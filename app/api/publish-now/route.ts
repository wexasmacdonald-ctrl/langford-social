import { NextResponse } from "next/server";
import { getAuthEnv, getRuntimeEnv } from "@/lib/env";
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
  if (token === env.PUBLISH_CRON_SECRET) {
    return true;
  }

  if (env.CRON_SECRET && token === env.CRON_SECRET) {
    return true;
  }

  return false;
}

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return jsonError(401, "UNAUTHORIZED", "Missing or invalid bearer token");
    }

    const url = new URL(request.url);
    const dateQuery = url.searchParams.get("date")?.trim();
    const forceQuery = url.searchParams.get("force")?.trim().toLowerCase();
    const force = forceQuery === "1" || forceQuery === "true" || forceQuery === "yes";

    const result = await runScheduledPublish({
      dateKey: dateQuery || undefined,
      force,
      mode: "manual",
    });
    const runtime = getRuntimeEnv();
    return NextResponse.json({ ...result, dry_run: runtime.DRY_RUN }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    const status = message.includes("Invalid date format") ? 400 : 500;
    return jsonError(status, "PUBLISH_FAILED", message);
  }
}
