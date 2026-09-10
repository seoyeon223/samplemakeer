import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Select,
  BlockStack,
  InlineStack,
  Text,
  PageActions,
  ResourceList,
  ResourceItem,
  Thumbnail,
  Badge,
  Button,
  EmptyState,
} from "@shopify/polaris";
import { TitleBar, useAppBridge } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { getPromotion, updatePromotion } from "../models/promotion.server";
import { addGift, removeGift, setGiftActive } from "../models/gift.server";
import db from "../db.server";
import { useTranslations } from "../i18n/LocaleContext";

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const promotion = await getPromotion(session.shop, params.id!);
  if (!promotion) {
    throw new Response("Not found", { status: 404 });
  }
  return { promotion };
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  const { session, admin } = await authenticate.admin(request);
  const shop = session.shop;
  const promotionId = params.id!;

  const owned = await getPromotion(shop, promotionId);
  if (!owned) {
    throw new Response("Not found", { status: 404 });
  }

  const formData = await request.formData();
  const intent = String(formData.get("intent"));

  if (intent === "update") {
    await updatePromotion(shop, promotionId, {
      name: String(formData.get("name") || "").trim(),
      conditionType: String(formData.get("conditionType")),
      conditionValue: String(formData.get("conditionValue") || "").trim(),
      assignmentMode: String(formData.get("assignmentMode")),
    });
    return { ok: true };
  }

  if (intent === "toggleActive") {
    await updatePromotion(shop, promotionId, {
      active: formData.get("active") === "true",
    });
    return { ok: true };
  }

  if (intent === "removeGift") {
    await removeGift(shop, String(formData.get("giftId")));
    return { ok: true };
  }

  if (intent === "toggleGiftActive") {
    await setGiftActive(
      shop,
      String(formData.get("giftId")),
      formData.get("active") === "true",
    );
    return { ok: true };
  }

  if (intent === "addGifts") {
    const variantIds = JSON.parse(String(formData.get("variantIds") || "[]")) as string[];
    const existing = await db.gift.findMany({
      where: { promotionId },
      select: { variantId: true },
    });
    const existingIds = new Set(existing.map((g) => g.variantId));
    const toAdd = variantIds.filter((id) => !existingIds.has(id));
    if (toAdd.length === 0) return { ok: true };

    const response = await admin.graphql(
      `#graphql
      query GiftVariants($ids: [ID!]!) {
        nodes(ids: $ids) {
          ... on ProductVariant {
            id
            title
            inventoryQuantity
            inventoryItem { id }
            image { url }
            product { id title featuredImage { url } }
          }
        }
      }`,
      { variables: { ids: toAdd } },
    );
    const json = await response.json();
    const nodes = (json.data?.nodes || []).filter(Boolean);

    for (const node of nodes) {
      const title =
        node.title && node.title !== "Default Title"
          ? `${node.product.title} - ${node.title}`
          : node.product.title;
      await addGift(shop, promotionId, {
        productId: node.product.id,
        variantId: node.id,
        inventoryItemId: node.inventoryItem.id,
        title,
        imageUrl: node.image?.url || node.product.featuredImage?.url || null,
        stock: node.inventoryQuantity ?? 0,
      });
    }
    return { ok: true };
  }

  return redirect(`/app/promotions/${promotionId}`);
};

export default function EditPromotion() {
  const { promotion } = useLoaderData<typeof loader>();
  const navigate = useNavigate();
  const fetcher = useFetcher();
  const shopify = useAppBridge();
  const { t } = useTranslations();

  const [name, setName] = useState(promotion.name);
  const [conditionType, setConditionType] = useState(promotion.conditionType);
  const [conditionValue, setConditionValue] = useState(promotion.conditionValue);
  const [assignmentMode, setAssignmentMode] = useState(promotion.assignmentMode);

  const handleSave = () => {
    fetcher.submit(
      { intent: "update", name, conditionType, conditionValue, assignmentMode },
      { method: "post" },
    );
  };

  const handlePickProducts = async () => {
    const selection = await shopify.resourcePicker({
      type: "product",
      multiple: true,
      action: "select",
    });
    if (!selection) return;
    const variantIds: string[] = [];
    for (const product of selection) {
      for (const variant of product.variants || []) {
        if (variant.id) variantIds.push(variant.id);
      }
    }
    if (variantIds.length === 0) return;
    fetcher.submit(
      { intent: "addGifts", variantIds: JSON.stringify(variantIds) },
      { method: "post" },
    );
  };

  return (
    <Page
      backAction={{ content: t.promotionEdit.backToList, onAction: () => navigate("/app/promotions") }}
      title={promotion.name}
      titleMetadata={
        <Badge tone={promotion.active ? "success" : undefined}>
          {promotion.active ? t.promotionsList.active : t.promotionsList.inactive}
        </Badge>
      }
      secondaryActions={[
        {
          content: promotion.active ? t.promotionEdit.deactivate : t.promotionEdit.activate,
          onAction: () =>
            fetcher.submit(
              { intent: "toggleActive", active: String(!promotion.active) },
              { method: "post" },
            ),
        },
      ]}
    >
      <TitleBar title={promotion.name} />
      <BlockStack gap="400">
        <Card>
          <FormLayout>
            <TextField
              label={t.promotionForm.nameLabel}
              value={name}
              onChange={setName}
              autoComplete="off"
            />
            <Select
              label={t.promotionForm.conditionLabel}
              options={[
                { label: t.promotionForm.conditionMinAmount, value: "MIN_AMOUNT" },
                { label: t.promotionForm.conditionSpecificProduct, value: "SPECIFIC_PRODUCT" },
              ]}
              value={conditionType}
              onChange={setConditionType}
            />
            <TextField
              label={
                conditionType === "MIN_AMOUNT"
                  ? t.promotionForm.minAmountLabel
                  : t.promotionForm.productGidLabel
              }
              value={conditionValue}
              onChange={setConditionValue}
              autoComplete="off"
              prefix={conditionType === "MIN_AMOUNT" ? "₩" : undefined}
            />
            <Select
              label={t.promotionForm.assignmentLabel}
              options={[
                { label: t.promotionForm.assignmentSingle, value: "SINGLE" },
                { label: t.promotionForm.assignmentRandom, value: "RANDOM" },
                { label: t.promotionForm.assignmentRotating, value: "ROTATING" },
              ]}
              value={assignmentMode}
              onChange={setAssignmentMode}
            />
          </FormLayout>
        </Card>

        <Card>
          <BlockStack gap="400">
            <InlineStack align="space-between">
              <Text as="h2" variant="headingMd">
                {t.promotionEdit.giftsHeading}
              </Text>
              <Button onClick={handlePickProducts}>{t.promotionEdit.addFromProducts}</Button>
            </InlineStack>
            {promotion.gifts.length === 0 ? (
              <EmptyState
                heading={t.promotionEdit.emptyGiftsHeading}
                image="https://cdn.shopify.com/s/files/1/0262/4071/2726/files/emptystate-files.png"
              >
                <p>{t.promotionEdit.emptyGiftsBody}</p>
              </EmptyState>
            ) : (
              <ResourceList
                resourceName={{ singular: t.promotionEdit.giftSingular, plural: t.promotionEdit.giftPlural }}
                items={promotion.gifts}
                renderItem={(gift) => (
                  <ResourceItem
                    id={gift.id}
                    onClick={() => {}}
                    media={
                      <Thumbnail
                        source={gift.imageUrl || ""}
                        alt={gift.title}
                      />
                    }
                  >
                    <InlineStack align="space-between" blockAlign="center">
                      <BlockStack gap="050">
                        <Text as="span" fontWeight="semibold">
                          {gift.title}
                        </Text>
                        <Text as="span" tone="subdued">
                          {t.promotionEdit.stock(gift.stock)}
                        </Text>
                      </BlockStack>
                      <InlineStack gap="200">
                        <Badge tone={gift.active ? "success" : "critical"}>
                          {gift.active
                            ? t.promotionEdit.giftActive
                            : gift.stock <= 0
                              ? t.promotionEdit.giftOutOfStock
                              : t.promotionEdit.giftInactive}
                        </Badge>
                        <Button
                          onClick={() =>
                            fetcher.submit(
                              {
                                intent: "toggleGiftActive",
                                giftId: gift.id,
                                active: String(!gift.active),
                              },
                              { method: "post" },
                            )
                          }
                        >
                          {gift.active ? t.promotionEdit.pause : t.promotionEdit.resume}
                        </Button>
                        <Button
                          tone="critical"
                          onClick={() =>
                            fetcher.submit(
                              { intent: "removeGift", giftId: gift.id },
                              { method: "post" },
                            )
                          }
                        >
                          {t.promotionEdit.remove}
                        </Button>
                      </InlineStack>
                    </InlineStack>
                  </ResourceItem>
                )}
              />
            )}
          </BlockStack>
        </Card>
      </BlockStack>
      <PageActions
        primaryAction={{ content: t.promotionEdit.save, onAction: handleSave }}
      />
    </Page>
  );
}
