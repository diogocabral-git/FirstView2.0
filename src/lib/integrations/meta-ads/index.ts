import { NotImplementedError, type Integration } from "../types";

// Meta Marketing API (Facebook/Instagram Ads)
// Docs: https://developers.facebook.com/docs/marketing-api/insights
// Dados a sincronizar: gasto, impressões, cliques, compras e valor de compras por dia e campanha.
// Permissões: ads_read

export const metaAds: Integration = {
  provider: "meta_ads",

  getAuthorizeUrl({ state, redirectUri }) {
    const url = new URL("https://www.facebook.com/dialog/oauth");
    url.searchParams.set("client_id", process.env.META_APP_ID!);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", "ads_read");
    url.searchParams.set("state", state);
    return url.toString();
  },

  async handleCallback() {
    // TODO: trocar code → token curto → token de longa duração (60 dias); escolher a ad account.
    throw new NotImplementedError("Meta Ads OAuth callback");
  },

  async sync() {
    // TODO: GET /act_{ad_account_id}/insights?level=campaign&time_increment=1&fields=spend,impressions,clicks,actions,action_values
    throw new NotImplementedError("Meta Ads sync");
  },
};
