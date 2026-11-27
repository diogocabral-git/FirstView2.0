import { NotImplementedError, type Integration } from "../types";

// Gmail API (apoio ao cliente)
// Docs: https://developers.google.com/gmail/api
// Usa o mesmo OAuth client da Google. Scopes: gmail.readonly (+ gmail.send para responder pela plataforma).

export const gmail: Integration = {
  provider: "gmail",

  getAuthorizeUrl({ state, redirectUri }) {
    const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID!);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set(
      "scope",
      ["https://www.googleapis.com/auth/gmail.readonly", "https://www.googleapis.com/auth/gmail.send"].join(" "),
    );
    url.searchParams.set("access_type", "offline");
    url.searchParams.set("prompt", "consent");
    url.searchParams.set("state", state);
    return url.toString();
  },

  async handleCallback() {
    throw new NotImplementedError("Gmail OAuth callback");
  },

  async sync() {
    // TODO: listar threads recentes (users.threads.list) e guardar em `support_tickets`.
    throw new NotImplementedError("Gmail sync");
  },
};
