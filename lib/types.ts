export type PostStatus = "queued" | "posted" | "failed";

export type WeekdayKey =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export type QueueInput = {
  image_url: string;
  caption?: string;
};

export type PostRow = {
  id: number;
  image_url: string;
  media_urls?: string[] | null;
  caption: string | null;
  status: PostStatus;
  posted_at: string | null;
  order_index: number;
  last_error: string | null;
  source_key?: string | null;
  target_date?: string | null;
};

export type ScheduledTemplateRow = {
  weekday_key: WeekdayKey;
  title_en: string;
  title_fr: string;
  media_urls: string[];
  is_daily_special: boolean;
  sort_order: number;
  active: boolean;
};

export type ScheduledPostPayload = {
  run_date: string;
  weekday_key: WeekdayKey;
  media_urls: string[];
  caption: string;
  template: ScheduledTemplateRow;
};

export type PublishRunStatus = "posted" | "failed" | "skipped";

export type PublishRunRow = {
  id: number;
  run_date: string;
  weekday_key: WeekdayKey;
  status: PublishRunStatus;
  ig_media_id: string | null;
  fb_post_id: string | null;
  error_message: string | null;
  created_at: string;
};

export type ScheduledPublishResult = {
  status: PublishRunStatus;
  run_date: string;
  weekday_key: WeekdayKey;
  reason: string;
  ig_media_id: string | null;
  fb_post_id: string | null;
  error_message: string | null;
  payload: ScheduledPostPayload | null;
  existing_run: PublishRunRow | null;
};

export type ScheduleWindowResult = {
  should_run: boolean;
  reason: string;
  run_date: string;
  weekday_key: WeekdayKey;
  local_hour: number;
};

export type PublishAttempt = {
  postId: number;
  orderIndex: number;
  status: "posted" | "failed";
  message: string;
};

export type PublishResult = {
  posted: number;
  failed: number;
  skipped: number;
  attempts: PublishAttempt[];
};

export type ErrorPayload = {
  error: {
    code: string;
    message: string;
  };
};

export type ApiTokenProvider = "instagram" | "facebook";

export type ApiTokenRow = {
  provider: ApiTokenProvider;
  access_token: string;
  expires_at: string | null;
  updated_at: string;
};
