import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate, useSubmit } from "@remix-run/react";
import {
  Page,
  Card,
  IndexTable,
  Badge,
  Text,
  EmptyState,
  Button,
  Link,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { listPromotions, deletePromotion } from "../models/promotion.server";
import { useTranslations } from "../i18n/LocaleContext";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const promotions = await listPromotions(session.shop);
  return { promotions };
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();
  const id = String(formData.get("id"));
  await deletePromotion(session.shop, id);
  return null;
};

export default function PromotionsIndex() {
  const { promotions } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const submit = useSubmit();
  const { t } = useTranslations();

  return (
    <Page>
      <TitleBar title={t.promotionsList.title}>
        <button variant="primary" onClick={() => navigate("/app/promotions/new")}>
          {t.promotionsList.addPromotion}
        </button>
      </TitleBar>
      <Card padding="0">
        {promotions.length === 0 ? (
          <EmptyState
            heading={t.promotionsList.emptyHeading}
            action={{
              content: t.promotionsList.addPromotion,
              onAction: () => navigate("/app/promotions/new"),
            }}
            image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
          >
            <p>{t.promotionsList.emptyBody}</p>
          </EmptyState>
        ) : (
          <IndexTable
            resourceName={{ singular: t.promotionsList.title, plural: t.promotionsList.title }}
            itemCount={promotions.length}
            selectable={false}
            headings={[
              { title: t.promotionsList.colName },
              { title: t.promotionsList.colCondition },
              { title: t.promotionsList.colAssignment },
              { title: t.promotionsList.colGifts },
              { title: t.promotionsList.colStatus },
              { title: "" },
            ]}
          >
            {promotions.map((promotion, index) => (
              <IndexTable.Row
                id={promotion.id}
                key={promotion.id}
                position={index}
              >
                <IndexTable.Cell>
                  <Link url={`/app/promotions/${promotion.id}`} removeUnderline>
                    <Text as="span" fontWeight="semibold">
                      {promotion.name}
                    </Text>
                  </Link>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  {t.conditionLabel[promotion.conditionType as keyof typeof t.conditionLabel]}
                  {promotion.conditionType === "MIN_AMOUNT"
                    ? ` ${promotion.conditionValue}`
                    : ""}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  {t.assignmentLabel[promotion.assignmentMode as keyof typeof t.assignmentLabel]}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  {t.promotionsList.giftsActive(
                    promotion.gifts.filter((g) => g.active).length,
                    promotion.gifts.length,
                  )}
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Badge tone={promotion.active ? "success" : undefined}>
                    {promotion.active ? t.promotionsList.active : t.promotionsList.inactive}
                  </Badge>
                </IndexTable.Cell>
                <IndexTable.Cell>
                  <Button
                    variant="plain"
                    tone="critical"
                    onClick={() => {
                      if (confirm(t.promotionsList.confirmDelete(promotion.name))) {
                        submit({ id: promotion.id }, { method: "post" });
                      }
                    }}
                  >
                    {t.promotionsList.delete}
                  </Button>
                </IndexTable.Cell>
              </IndexTable.Row>
            ))}
          </IndexTable>
        )}
      </Card>
    </Page>
  );
}
