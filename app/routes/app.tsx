import type { HeadersFunction, LoaderFunctionArgs } from "@remix-run/node";
import { Link, Outlet, useLoaderData, useRouteError } from "@remix-run/react";
import { boundary } from "@shopify/shopify-app-remix/server";
import { AppProvider } from "@shopify/shopify-app-remix/react";
import { NavMenu } from "@shopify/app-bridge-react";
import polarisStyles from "@shopify/polaris/build/esm/styles.css?url";

import { authenticate } from "../shopify.server";
import { detectLocale } from "../i18n/detectLocale.server";
import { LocaleProvider, useTranslations } from "../i18n/LocaleContext";
import { LanguageToggle } from "../i18n/LanguageToggle";
import { syncShopPlan } from "../models/shop.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, billing } = await authenticate.admin(request);

  // Plan selection itself happens on Shopify's own Managed Pricing page
  // during install — by the time this loader runs the shop already has a
  // plan (Free or Pro). We just read which one, cache it, and let route-level
  // code (dashboard badge, storefront order-limit check) use it from there.
  //
  // isTest must stay true for development stores (which can only ever
  // subscribe in test mode) to be recognized as having picked a real plan.
  // Controlled by its own env var rather than NODE_ENV — see the comment
  // history on this file for why that matters once this app is live.
  const isTest = process.env.BILLING_TEST_MODE !== "false";
  const { appSubscriptions } = await billing.check({ isTest });
  await syncShopPlan(session.shop, appSubscriptions);

  return {
    apiKey: process.env.SHOPIFY_API_KEY || "",
    locale: detectLocale(request),
  };
};

export default function App() {
  const { apiKey, locale } = useLoaderData<typeof loader>();

  return (
    <LocaleProvider initialLocale={locale}>
      <AppLayout apiKey={apiKey} />
    </LocaleProvider>
  );
}

function AppLayout({ apiKey }: { apiKey: string }) {
  const { t } = useTranslations();

  return (
    <AppProvider isEmbeddedApp apiKey={apiKey}>
      <NavMenu>
        <Link to="/app" rel="home">
          {t.nav.dashboard}
        </Link>
        <Link to="/app/promotions">{t.nav.promotions}</Link>
      </NavMenu>
      <div style={{ display: "flex", justifyContent: "flex-end", padding: "12px 20px 0" }}>
        <LanguageToggle />
      </div>
      <Outlet />
    </AppProvider>
  );
}

// Shopify needs Remix to catch some thrown responses, so that their headers are included in the response.
export function ErrorBoundary() {
  return boundary.error(useRouteError());
}

export const headers: HeadersFunction = (headersArgs) => {
  return boundary.headers(headersArgs);
};
