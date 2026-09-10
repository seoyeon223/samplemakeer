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
  //
  // Controlled by its own env var (not NODE_ENV) so hosting providers that
  // set NODE_ENV=production for unrelated reasons (build optimizations, etc.)
  // don't silently switch this to real billing. Defaults to test mode —
  // set BILLING_TEST_MODE=false only once you're ready to accept real charges
  // from live merchant stores (development stores can never be charged for
  // real regardless of this flag).
  const isTest = process.env.BILLING_TEST_MODE !== "false";
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
