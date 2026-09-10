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
import { MONTHLY_PLAN } from "../billing.server";

export const links = () => [{ rel: "stylesheet", href: polarisStyles }];

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing } = await authenticate.admin(request);

  // Gates every /app/* page behind an active (or trialing) subscription.
  // A shop without one is redirected to Shopify's hosted charge confirmation
  // screen and lands back here once approved.
  const isTest = process.env.NODE_ENV !== "production";
  await billing.require({
    plans: [MONTHLY_PLAN],
    isTest,
    onFailure: async () => billing.request({ plan: MONTHLY_PLAN, isTest }),
  });

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
