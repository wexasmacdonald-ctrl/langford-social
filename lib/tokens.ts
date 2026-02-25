import { getApiToken } from "@/lib/db";
import { getFacebookEnv, getInstagramEnv, getMetaRefreshEnv } from "@/lib/env";

function requireToken(token: string | undefined, name: string): string {
  if (!token) {
    throw new Error(`Missing ${name}. Set it in api_tokens table or environment variables.`);
  }
  return token;
}

export async function getInstagramAccessToken(): Promise<string> {
  const dbToken = await getApiToken("instagram");
  if (dbToken?.access_token) {
    return dbToken.access_token;
  }

  const env = getInstagramEnv();
  return requireToken(env.IG_ACCESS_TOKEN, "Instagram access token");
}

export async function getFacebookAccessToken(): Promise<string> {
  const dbFacebookToken = await getApiToken("facebook");
  if (dbFacebookToken?.access_token) {
    return dbFacebookToken.access_token;
  }

  const env = getFacebookEnv();
  if (env.FB_ACCESS_TOKEN) {
    return env.FB_ACCESS_TOKEN;
  }

  const dbInstagramToken = await getApiToken("instagram");
  if (dbInstagramToken?.access_token) {
    return dbInstagramToken.access_token;
  }

  const igEnv = getInstagramEnv();
  return requireToken(igEnv.IG_ACCESS_TOKEN, "Facebook access token");
}

export function canAutoRefreshTokens(): boolean {
  const refreshEnv = getMetaRefreshEnv();
  return Boolean(refreshEnv.META_APP_ID && refreshEnv.META_APP_SECRET);
}
