import { NextResponse } from "next/server";
import { getAuthEnv } from "@/lib/env";
import { getBearerToken, jsonError } from "@/lib/http";
import { refreshMetaTokens } from "@/lib/meta-refresh";

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

export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return jsonError(401, "UNAUTHORIZED", "Missing or invalid bearer token");
    }

    const result = await refreshMetaTokens();
    return NextResponse.json({
      ok: true,
      refreshed: result.refreshed,
      expires_at: result.expiresAt,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonError(500, "TOKEN_REFRESH_FAILED", message);
  }
}
