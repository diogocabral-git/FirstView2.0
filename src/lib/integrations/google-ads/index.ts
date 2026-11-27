import { NotImplementedError, type Integration } from "../types";

// Google Ads API
// Docs: https://developers.google.com/google-ads/api/docs/start
// Requer: developer token (pedir cedo, a aprovação demora), OAuth client e customer id.
// Dados a sincronizar: metrics.cost_micros, conversions, conversions_value por dia e campanha (GAQL).

export const googleAds: Integration = {
  provider: "google_ads",

  getAuthorizeUrl({ state, redirectUri }) {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", "https://www.googleapis.com/auth/adwords");
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    return url.toString();
  },

  async handleCallback() {
    // TODO: trocar code por access + refresh token em https://oauth2.googleapis.com/token
    throw new NotImplementedError("Google Ads OAuth callback");
  },

  async sync() {
    // TODO: googleAds:searchStream com GAQL:
    // SELECT segments.date, campaign.id, metrics.cost_micros, metrics.conversions_value FROM campaign WHERE segments.date BETWEEN ...
    throw new NotImplementedError("Google Ads sync");
  },
};
