import { getFacebookEnv, getInstagramEnv, getMetaRefreshEnv } from "@/lib/env";
import { upsertApiToken } from "@/lib/db";
import { getInstagramAccessToken } from "@/lib/tokens";

type ExchangeResponse = {
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  error?: {
    message?: string;
    code?: number;
    type?: string;
  };
};

function extractGraphError(payload: ExchangeResponse): string {
  return payload.error?.message ?? "Meta token refresh failed";
}

function toIsoFromExpiresIn(expiresIn: number | undefined): string | null {
  if (!expiresIn || !Number.isFinite(expiresIn)) {
    return null;
  }
  return new Date(Date.now() + expiresIn * 1000).toISOString();
}

export async function refreshMetaTokens(): Promise<{
  refreshed: boolean;
  expiresAt: string | null;
}> {
  const refreshEnv = getMetaRefreshEnv();
  if (!refreshEnv.META_APP_ID || !refreshEnv.META_APP_SECRET) {
    return { refreshed: false, expiresAt: null };
  }

  const instagramEnv = getInstagramEnv();
  const facebookEnv = getFacebookEnv();
  const currentToken = await getInstagramAccessToken();
  const endpoint = `https://graph.facebook.com/${instagramEnv.GRAPH_API_VERSION}/oauth/access_token`;
  const query = new URLSearchParams({
    grant_type: "fb_exchange_token",
    client_id: refreshEnv.META_APP_ID,
    client_secret: refreshEnv.META_APP_SECRET,
    fb_exchange_token: currentToken,
  });

  const response = await fetch(`${endpoint}?${query.toString()}`, { method: "GET" });
  const payload = (await response.json()) as ExchangeResponse;
  if (!response.ok || !payload.access_token) {
    throw new Error(extractGraphError(payload));
  }

  const expiresAt = toIsoFromExpiresIn(payload.expires_in);
  await upsertApiToken({
    provider: "instagram",
    accessToken: payload.access_token,
    expiresAt,
  });

  if (facebookEnv.FB_PAGE_ID) {
    const pageTokenEndpoint = `https://graph.facebook.com/${instagramEnv.GRAPH_API_VERSION}/${facebookEnv.FB_PAGE_ID}`;
    const pageTokenQuery = new URLSearchParams({
      fields: "access_token",
      access_token: payload.access_token,
    });
    const pageTokenResponse = await fetch(`${pageTokenEndpoint}?${pageTokenQuery.toString()}`, {
      method: "GET",
    });
    const pagePayload = (await pageTokenResponse.json()) as ExchangeResponse;
    if (!pageTokenResponse.ok || !pagePayload.access_token) {
      throw new Error(`Could not fetch Facebook Page token: ${extractGraphError(pagePayload)}`);
    }

    await upsertApiToken({
      provider: "facebook",
      accessToken: pagePayload.access_token,
      expiresAt: null,
    });
  }

  return { refreshed: true, expiresAt };
}
