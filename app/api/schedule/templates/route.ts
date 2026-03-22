import { NextResponse } from "next/server";
import { getAuthEnv } from "@/lib/env";
import { listScheduledTemplates } from "@/lib/db";
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

    const templates = await listScheduledTemplates();
    return NextResponse.json({ ok: true, templates }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonError(500, "TEMPLATES_FAILED", message);
  }
}
