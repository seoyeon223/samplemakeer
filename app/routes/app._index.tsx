import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData } from "@remix-run/react";
import {
  Page,
  Layout,
  Text,
  Card,
  BlockStack,
  InlineStack,
  Link,
  Badge,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { getGwpOrderCount } from "../models/promotion.server";
import { getShopPlan } from "../models/shop.server";
import { FREE_PLAN, FREE_PLAN_MONTHLY_ORDER_LIMIT } from "../billing";
import { useTranslations } from "../i18n/LocaleContext";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;

  const [activePromotionCount, gwpOrders30d, plan] = await Promise.all([
    db.promotion.count({ where: { shop, active: true } }),
    getGwpOrderCount(shop, 30),
    getShopPlan(shop),
  ]);

  let totalOrders30d: number | null = null;
  try {
    const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const response = await admin.graphql(
      `#graphql
      query OrdersCount($query: String!) {
        ordersCount(query: $query) {
          count
        }
      }`,
      { variables: { query: `created_at:>=${since}` } },
    );
    const json = await response.json();
    totalOrders30d = json.data?.ordersCount?.count ?? null;
  } catch {
    totalOrders30d = null;
  }

  const gwpRatio =
    totalOrders30d && totalOrders30d > 0
      ? Math.round((gwpOrders30d / totalOrders30d) * 1000) / 10
      : null;

  return { activePromotionCount, gwpOrders30d, totalOrders30d, gwpRatio, plan };
};

export default function Index() {
  const { activePromotionCount, gwpOrders30d, totalOrders30d, gwpRatio, plan } =
    useLoaderData<typeof loader>();
  const { t } = useTranslations();
  const isFreePlan = plan === FREE_PLAN;
  const orderLimitReached = isFreePlan && gwpOrders30d >= FREE_PLAN_MONTHLY_ORDER_LIMIT;
  const orderLimitApproaching =
    isFreePlan && !orderLimitReached && gwpOrders30d >= FREE_PLAN_MONTHLY_ORDER_LIMIT * 0.8;

  return (
    <Page
      titleMetadata={<Badge tone={isFreePlan ? undefined : "success"}>{plan}</Badge>}
    >
      <TitleBar title={t.dashboard.title} />
      <BlockStack gap="500">
        {orderLimitReached && <Banner tone="critical">{t.dashboard.planLimitReached}</Banner>}
        {orderLimitApproaching && (
          <Banner tone="warning">
            {t.dashboard.planLimitApproaching(gwpOrders30d, FREE_PLAN_MONTHLY_ORDER_LIMIT)}
          </Banner>
        )}
        <Banner tone="info">{t.dashboard.earlyStageNotice}</Banner>
        <Layout>
          <Layout.Section>
            <Card>
              <BlockStack gap="400">
                <Text as="h2" variant="headingMd">
                  {t.dashboard.recent30d}
                </Text>
                <InlineStack gap="600">
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      {t.dashboard.activePromotions}
                    </Text>
                    <Text as="span" variant="heading2xl">
                      {activePromotionCount}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      {t.dashboard.gwpOrders}
                    </Text>
                    <Text as="span" variant="heading2xl">
                      {gwpOrders30d}
                    </Text>
                  </BlockStack>
                  <BlockStack gap="100">
                    <Text as="span" variant="bodySm" tone="subdued">
                      {t.dashboard.gwpRatio}
                    </Text>
                    <Text as="span" variant="heading2xl">
                      {gwpRatio !== null ? `${gwpRatio}%` : "—"}
                    </Text>
                    {totalOrders30d !== null && (
                      <Text as="span" variant="bodySm" tone="subdued">
                        {t.dashboard.outOfTotalOrders(totalOrders30d)}
                      </Text>
                    )}
                  </BlockStack>
                  {isFreePlan && (
                    <BlockStack gap="100">
                      <Text as="span" variant="bodySm" tone="subdued">
                        {t.dashboard.planUsage(gwpOrders30d, FREE_PLAN_MONTHLY_ORDER_LIMIT)}
                      </Text>
                    </BlockStack>
                  )}
                </InlineStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          <Layout.Section variant="oneThird">
            <Card>
              <BlockStack gap="300">
                <InlineStack align="space-between">
                  <Text as="h2" variant="headingMd">
                    {t.dashboard.gettingStarted}
                  </Text>
                  <Badge tone="info">{t.dashboard.installNeeded}</Badge>
                </InlineStack>
                <Text as="p" variant="bodyMd">
                  {t.dashboard.step1}
                  <Link url="/app/promotions/new">{t.dashboard.step1Link}</Link>
                  {t.dashboard.step1Rest}
                </Text>
                <Text as="p" variant="bodyMd">
                  {t.dashboard.step2}
                </Text>
                <Text as="p" variant="bodyMd">
                  {t.dashboard.step3}
                </Text>
              </BlockStack>
            </Card>
          </Layout.Section>
        </Layout>
      </BlockStack>
    </Page>
  );
}
