import type { Locale } from "./translations";

// Shopify Admin appends the merchant's admin language as a `locale` query
// param on the embedded app's initial URL. We use that as the default so a
// Korean-admin merchant sees Korean on first load; everyone else defaults to
// English. The client-side toggle (backed by localStorage) can override this
// afterwards.
export function detectLocale(request: Request): Locale {
  const url = new URL(request.url);
  const locale = url.searchParams.get("locale") || "";
  return locale.toLowerCase().startsWith("ko") ? "ko" : "en";
}
