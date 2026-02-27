import { upsertPublishRun } from "@/lib/db";
import { buildScheduledPostPayload, getRunDateForNow, hasRunForDate } from "@/lib/daily-deals";
import { getRuntimeEnv } from "@/lib/env";
import { publishFacebookPost } from "@/lib/facebook";
import { refreshMetaTokens } from "@/lib/meta-refresh";
import {
  createCarouselContainer,
  createCarouselItemContainer,
  createMediaContainer,
  publishMediaContainer,
  waitForMediaReady,
} from "@/lib/instagram";
import { getFacebookAccessToken, getInstagramAccessToken } from "@/lib/tokens";
import { sendPublishFailureAlert } from "@/lib/alerts";
import type { ScheduledPublishResult } from "@/lib/types";

type RunScheduledPublishInput = {
  dateKey?: string;
  force?: boolean;
  mode: "cron" | "manual";
};

function stringifyError(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  return "Unknown error";
}

async function publishScheduledPayload(payload: { media_urls: string[]; caption: string }, accessToken: string): Promise<string> {
  if (payload.media_urls.length === 0) {
    throw new Error("Scheduled payload has no media URLs");
  }

  if (payload.media_urls.length === 1) {
    const creationId = await createMediaContainer(payload.media_urls[0], accessToken, payload.caption);
    await waitForMediaReady(creationId, accessToken);
    return publishMediaContainer(creationId, accessToken);
  }

  const childIds: string[] = [];
  for (const imageUrl of payload.media_urls) {
    const childId = await createCarouselItemContainer(imageUrl, accessToken);
    await waitForMediaReady(childId, accessToken);
    childIds.push(childId);
  }

  const carouselId = await createCarouselContainer(childIds, accessToken, payload.caption);
  await waitForMediaReady(carouselId, accessToken);
  return publishMediaContainer(carouselId, accessToken);
}

export async function runScheduledPublish(input: RunScheduledPublishInput): Promise<ScheduledPublishResult> {
  const runtime = getRuntimeEnv();
  const runDate = input.dateKey ?? getRunDateForNow();
  const existingRun = await hasRunForDate(runDate);
  let igMediaId: string | null = null;

  const shouldSkipForExistingRun = existingRun && !input.force && existingRun.status !== "failed";
  if (shouldSkipForExistingRun) {
    return {
      status: "skipped",
      run_date: runDate,
      weekday_key: existingRun.weekday_key,
      reason: `Already processed for ${runDate}`,
      ig_media_id: existingRun.ig_media_id,
      fb_post_id: existingRun.fb_post_id,
      error_message: existingRun.error_message,
      payload: null,
      existing_run: existingRun,
    };
  }

  const payload = await buildScheduledPostPayload(runDate);

  if (runtime.DRY_RUN) {
    await upsertPublishRun({
      runDate,
      weekdayKey: payload.weekday_key,
      status: "skipped",
      igMediaId: null,
      fbPostId: null,
      errorMessage: "Dry-run mode enabled. Publish not executed.",
    });

    return {
      status: "skipped",
      run_date: runDate,
      weekday_key: payload.weekday_key,
      reason: "Dry-run mode enabled. Publish not executed.",
      ig_media_id: null,
      fb_post_id: null,
      error_message: null,
      payload,
      existing_run: existingRun,
    };
  }

  try {
    await refreshMetaTokens();
    const instagramAccessToken = await getInstagramAccessToken();
    const facebookAccessToken = await getFacebookAccessToken();
    try {
      igMediaId = await publishScheduledPayload(payload, instagramAccessToken);
    } catch (error) {
      const igMessage = stringifyError(error);
      throw new Error(`Instagram publish failed: ${igMessage}`);
    }
    let fbPostId: string;
    try {
      fbPostId = await publishFacebookPost(payload.media_urls, payload.caption, facebookAccessToken);
    } catch (error) {
      const fbMessage = stringifyError(error);
      throw new Error(`Facebook publish failed: ${fbMessage}`);
    }
    await upsertPublishRun({
      runDate,
      weekdayKey: payload.weekday_key,
      status: "posted",
      igMediaId,
      fbPostId,
      errorMessage: null,
    });

    return {
      status: "posted",
      run_date: runDate,
      weekday_key: payload.weekday_key,
      reason: input.mode === "cron" ? "Scheduled post published" : "Manual publish completed",
      ig_media_id: igMediaId,
      fb_post_id: fbPostId,
      error_message: null,
      payload,
      existing_run: existingRun,
    };
  } catch (error) {
    const message = stringifyError(error);
    await upsertPublishRun({
      runDate,
      weekdayKey: payload.weekday_key,
      status: "failed",
      igMediaId,
      fbPostId: null,
      errorMessage: message,
    });
    await sendPublishFailureAlert({
      runDate,
      weekdayKey: payload.weekday_key,
      reason: "Publish failed",
      errorMessage: message,
    });

    return {
      status: "failed",
      run_date: runDate,
      weekday_key: payload.weekday_key,
      reason: "Publish failed",
      ig_media_id: igMediaId,
      fb_post_id: null,
      error_message: message,
      payload,
      existing_run: existingRun,
    };
  }
}
