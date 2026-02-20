import { getFacebookEnv } from "@/lib/env";

type GraphApiError = {
  error?: {
    message?: string;
  };
};

type PhotoCreateResponse = {
  id?: string;
  post_id?: string;
} & GraphApiError;

type FeedCreateResponse = {
  id?: string;
} & GraphApiError;

function extractGraphError(payload: GraphApiError): string {
  return payload.error?.message ?? "Facebook Graph API request failed";
}

async function uploadUnpublishedPhoto(imageUrl: string): Promise<string> {
  const env = getFacebookEnv();
  const endpoint = `https://graph.facebook.com/${env.GRAPH_API_VERSION}/${env.FB_PAGE_ID}/photos`;
  const body = new URLSearchParams({
    url: imageUrl,
    published: "false",
    access_token: env.FB_ACCESS_TOKEN,
  });

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const payload = (await response.json()) as PhotoCreateResponse;
  if (!response.ok || !payload.id) {
    throw new Error(extractGraphError(payload));
  }

  return payload.id;
}

export async function publishFacebookPost(mediaUrls: string[], caption: string): Promise<string> {
  if (mediaUrls.length === 0) {
    throw new Error("Facebook publish requires at least one media URL");
  }

  const env = getFacebookEnv();

  if (mediaUrls.length === 1) {
    const endpoint = `https://graph.facebook.com/${env.GRAPH_API_VERSION}/${env.FB_PAGE_ID}/photos`;
    const body = new URLSearchParams({
      url: mediaUrls[0],
      caption,
      published: "true",
      access_token: env.FB_ACCESS_TOKEN,
    });

    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: body.toString(),
    });

    const payload = (await response.json()) as PhotoCreateResponse;
    if (!response.ok || (!payload.post_id && !payload.id)) {
      throw new Error(extractGraphError(payload));
    }

    return payload.post_id ?? payload.id ?? "";
  }

  const photoIds: string[] = [];
  for (const mediaUrl of mediaUrls) {
    const photoId = await uploadUnpublishedPhoto(mediaUrl);
    photoIds.push(photoId);
  }

  const endpoint = `https://graph.facebook.com/${env.GRAPH_API_VERSION}/${env.FB_PAGE_ID}/feed`;
  const body = new URLSearchParams({
    message: caption,
    access_token: env.FB_ACCESS_TOKEN,
  });

  for (let index = 0; index < photoIds.length; index += 1) {
    body.append(`attached_media[${index}]`, JSON.stringify({ media_fbid: photoIds[index] }));
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const payload = (await response.json()) as FeedCreateResponse;
  if (!response.ok || !payload.id) {
    throw new Error(extractGraphError(payload));
  }

  return payload.id;
}
