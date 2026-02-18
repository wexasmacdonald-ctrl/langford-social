import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function deprecation() {
  return NextResponse.json(
    {
      error: {
        code: "DEPRECATED_ENDPOINT",
        message: "Use /api/schedule/preview for simulation preview and /api/publish-now for manual runs.",
      },
    },
    { status: 410 },
  );
}

export async function GET() {
  return deprecation();
}

export async function POST() {
  return deprecation();
}
