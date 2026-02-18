import { getRuntimeEnv } from "@/lib/env";
import type { WeekdayKey } from "@/lib/types";

type PublishFailureAlert = {
  runDate: string;
  weekdayKey: WeekdayKey;
  reason: string;
  errorMessage: string;
};

export async function sendPublishFailureAlert(input: PublishFailureAlert): Promise<void> {
  const runtime = getRuntimeEnv();
  if (!runtime.ALERT_WEBHOOK_URL) {
    return;
  }

  const body = {
    event: "publish_failed",
    service: "social-admin",
    run_date: input.runDate,
    weekday_key: input.weekdayKey,
    reason: input.reason,
    error_message: input.errorMessage,
    timestamp: new Date().toISOString(),
  };

  try {
    await fetch(runtime.ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch {
    return;
  }
}
