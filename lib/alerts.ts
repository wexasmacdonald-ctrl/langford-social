import { getRuntimeEnv } from "@/lib/env";
import type { WeekdayKey } from "@/lib/types";

type PublishFailureAlert = {
  runDate: string;
  weekdayKey: WeekdayKey;
  reason: string;
  errorMessage: string;
};

type PublishSuccessAlert = {
  runDate: string;
  weekdayKey: WeekdayKey;
  igMediaId: string;
  fbPostId: string;
  mode: "cron" | "manual";
};

async function postAlert(body: Record<string, unknown>, content: string): Promise<void> {
  const runtime = getRuntimeEnv();
  if (!runtime.ALERT_WEBHOOK_URL) {
    return;
  }

  try {
    await fetch(runtime.ALERT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...body,
        content,
      }),
    });
  } catch {
    return;
  }
}

export async function sendPublishFailureAlert(input: PublishFailureAlert): Promise<void> {
  await postAlert(
    {
      event: "publish_failed",
      service: "social-admin",
      run_date: input.runDate,
      weekday_key: input.weekdayKey,
      reason: input.reason,
      error_message: input.errorMessage,
      timestamp: new Date().toISOString(),
    },
    `❌ Publish failed (${input.weekdayKey} ${input.runDate}): ${input.errorMessage}`,
  );
}

export async function sendPublishSuccessAlert(input: PublishSuccessAlert): Promise<void> {
  await postAlert(
    {
      event: "publish_posted",
      service: "social-admin",
      run_date: input.runDate,
      weekday_key: input.weekdayKey,
      ig_media_id: input.igMediaId,
      fb_post_id: input.fbPostId,
      mode: input.mode,
      timestamp: new Date().toISOString(),
    },
    `✅ Post published (${input.weekdayKey} ${input.runDate}) ig=${input.igMediaId} fb=${input.fbPostId}`,
  );
}
