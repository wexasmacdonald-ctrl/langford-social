import { NextResponse } from "next/server";
import type { ErrorPayload } from "@/lib/types";

export function jsonError(status: number, code: string, message: string) {
  const payload: ErrorPayload = { error: { code, message } };
  return NextResponse.json(payload, { status });
}

export function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization");
  if (!header || !header.toLowerCase().startsWith("bearer ")) {
    return null;
  }
  return header.slice(7).trim();
}
