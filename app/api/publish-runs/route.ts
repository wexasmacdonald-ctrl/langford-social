import { NextResponse } from "next/server";
import { deleteAllPublishRuns, deletePublishRunByDate, listPublishRuns } from "@/lib/db";
import { getAuthEnv } from "@/lib/env";
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
    const limitParam = Number(url.searchParams.get("limit") ?? "30");
    const runs = await listPublishRuns(limitParam);
    return NextResponse.json({ runs }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonError(500, "PUBLISH_RUNS_FAILED", message);
  }
}

export async function DELETE(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return jsonError(401, "UNAUTHORIZED", "Missing or invalid bearer token");
    }

    const url = new URL(request.url);
    const clearAll = (url.searchParams.get("all") ?? "").toLowerCase();
    if (clearAll === "1" || clearAll === "true" || clearAll === "yes") {
      const deletedCount = await deleteAllPublishRuns();
      return NextResponse.json({ ok: true, deleted_count: deletedCount }, { status: 200 });
    }

    const runDate = url.searchParams.get("date")?.trim();

    if (!runDate || !/^\d{4}-\d{2}-\d{2}$/.test(runDate)) {
      return jsonError(400, "INVALID_DATE", "Query param `date` must be YYYY-MM-DD");
    }

    const deleted = await deletePublishRunByDate(runDate);
    return NextResponse.json({ ok: true, run_date: runDate, deleted }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected error";
    return jsonError(500, "PUBLISH_RUNS_DELETE_FAILED", message);
  }
}
