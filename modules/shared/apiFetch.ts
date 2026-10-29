/**
 * `fetch` for this app's own /api routes. The editor and preview live inside
 * the PHP app's iframe and have no login of their own: every request carries
 * the PHP access token that arrived with INIT_DATA, which the server checks
 * (see @shared/server/phpToken).
 */
let accessToken = "";

export function setApiToken(token: string) {
  accessToken = token;
}

export function apiFetch(input: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (accessToken) headers.set("x-access-token", accessToken);
  return fetch(input, { ...init, headers });
}

/**
 * Where PowerPoint exports go: the ppt-export Lambda's Function URL when
 * NEXT_PUBLIC_PPT_EXPORT_URL is set (large decks need its time and memory),
 * otherwise this app's own /api/generate-ppt.
 */
export const PPT_EXPORT_URL = process.env.NEXT_PUBLIC_PPT_EXPORT_URL || "/api/generate-ppt";
