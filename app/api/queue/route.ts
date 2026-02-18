import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

function deprecation() {
  return NextResponse.json(
    {
      error: {
        code: "DEPRECATED_ENDPOINT",
        message: "Manual queue is removed. Use /api/schedule/preview and /api/publish-now.",
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
