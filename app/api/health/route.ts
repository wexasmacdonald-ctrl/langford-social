import { NextResponse } from "next/server";
import { checkDbHealth } from "@/lib/db";
import { getRuntimeEnv } from "@/lib/env";
import { jsonError } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await checkDbHealth();
    const runtime = getRuntimeEnv();
    return NextResponse.json(
      {
        ok: true,
        dry_run: runtime.DRY_RUN,
        alert_webhook_configured: Boolean(runtime.ALERT_WEBHOOK_URL),
        facebook_configured: Boolean(process.env.FB_PAGE_ID && (process.env.FB_ACCESS_TOKEN || process.env.IG_ACCESS_TOKEN)),
      },
      { status: 200 },
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonError(503, "HEALTHCHECK_FAILED", message);
  }
}
