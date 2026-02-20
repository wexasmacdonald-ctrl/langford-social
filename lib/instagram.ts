import { getInstagramEnv } from "@/lib/env";

type GraphApiError = {
  error?: {
    message?: string;
    type?: string;
    code?: number;
  };
};

type MediaCreateResponse = {
  id: string;
} & GraphApiError;

type MediaPublishResponse = {
  id: string;
} & GraphApiError;

type MediaStatusResponse = {
  id?: string;
  status_code?: string;
  status?: string;
} & GraphApiError;

function extractGraphError(payload: GraphApiError): string {
  return payload.error?.message ?? "Instagram Graph API request failed";
}

async function getMediaStatus(creationId: string): Promise<MediaStatusResponse> {
  const env = getInstagramEnv();
  const endpoint = `https://graph.facebook.com/${env.GRAPH_API_VERSION}/${creationId}`;
  const query = new URLSearchParams({
    fields: "status_code,status",
    access_token: env.IG_ACCESS_TOKEN,
  });

  const response = await fetch(`${endpoint}?${query.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
  });

  const payload = (await response.json()) as MediaStatusResponse;
  if (!response.ok) {
    throw new Error(extractGraphError(payload));
  }

  return payload;
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

export async function waitForMediaReady(
  creationId: string,
  options?: { timeoutMs?: number; pollMs?: number },
): Promise<void> {
  const timeoutMs = options?.timeoutMs ?? 90_000;
  const pollMs = options?.pollMs ?? 2_500;
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const status = await getMediaStatus(creationId);
    const code = (status.status_code ?? "").toUpperCase();

    if (code === "FINISHED" || code === "PUBLISHED") {
      return;
    }

    if (code === "ERROR" || code === "EXPIRED") {
      const message = status.status || "Instagram media processing failed";
      throw new Error(`Media container ${creationId} failed: ${message}`);
    }

    await delay(pollMs);
  }

  throw new Error(`Timed out waiting for media container ${creationId} to be ready`);
}

export async function createMediaContainer(imageUrl: string, caption?: string): Promise<string> {
  const env = getInstagramEnv();
  const endpoint = `https://graph.facebook.com/${env.GRAPH_API_VERSION}/${env.IG_USER_ID}/media`;

  const body = new URLSearchParams({
    image_url: imageUrl,
    caption: caption ?? "",
    is_published: "false",
    access_token: env.IG_ACCESS_TOKEN,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const payload = (await response.json()) as MediaCreateResponse;
  if (!response.ok || !payload.id) {
    throw new Error(extractGraphError(payload));
  }

  return payload.id;
}

export async function createCarouselItemContainer(imageUrl: string): Promise<string> {
  const env = getInstagramEnv();
  const endpoint = `https://graph.facebook.com/${env.GRAPH_API_VERSION}/${env.IG_USER_ID}/media`;

  const body = new URLSearchParams({
    image_url: imageUrl,
    is_carousel_item: "true",
    access_token: env.IG_ACCESS_TOKEN,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const payload = (await response.json()) as MediaCreateResponse;
  if (!response.ok || !payload.id) {
    throw new Error(extractGraphError(payload));
  }

  return payload.id;
}

export async function createCarouselContainer(childIds: string[], caption?: string): Promise<string> {
  const env = getInstagramEnv();
  const endpoint = `https://graph.facebook.com/${env.GRAPH_API_VERSION}/${env.IG_USER_ID}/media`;

  const body = new URLSearchParams({
    media_type: "CAROUSEL",
    children: childIds.join(","),
    caption: caption ?? "",
    access_token: env.IG_ACCESS_TOKEN,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const payload = (await response.json()) as MediaCreateResponse;
  if (!response.ok || !payload.id) {
    throw new Error(extractGraphError(payload));
  }

  return payload.id;
}

export async function publishMediaContainer(creationId: string): Promise<string> {
  const env = getInstagramEnv();
  const endpoint = `https://graph.facebook.com/${env.GRAPH_API_VERSION}/${env.IG_USER_ID}/media_publish`;

  const body = new URLSearchParams({
    creation_id: creationId,
    access_token: env.IG_ACCESS_TOKEN,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const payload = (await response.json()) as MediaPublishResponse;
  if (!response.ok || !payload.id) {
    throw new Error(extractGraphError(payload));
  }

  return payload.id;
}
