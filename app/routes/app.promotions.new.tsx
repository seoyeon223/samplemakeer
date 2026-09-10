import { useState } from "react";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { redirect } from "@remix-run/node";
import { useActionData, useNavigate, useSubmit } from "@remix-run/react";
import {
  Page,
  Card,
  FormLayout,
  TextField,
  Select,
  BlockStack,
  PageActions,
  Banner,
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";
import { authenticate } from "../shopify.server";
import { createPromotion } from "../models/promotion.server";
import { useTranslations } from "../i18n/LocaleContext";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  await authenticate.admin(request);
  return null;
};

export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.admin(request);
  const formData = await request.formData();

  const name = String(formData.get("name") || "").trim();
  const conditionType = String(formData.get("conditionType") || "MIN_AMOUNT");
  const conditionValue = String(formData.get("conditionValue") || "").trim();
  const assignmentMode = String(formData.get("assignmentMode") || "SINGLE");

  if (!name || !conditionValue) {
    return { error: "MISSING_FIELDS" as const };
  }

  const promotion = await createPromotion(session.shop, {
    name,
    conditionType,
    conditionValue,
    assignmentMode,
  });

  return redirect(`/app/promotions/${promotion.id}`);
};

export default function NewPromotion() {
  const navigate = useNavigate();
  const submit = useSubmit();
  const actionData = useActionData<typeof action>();
  const { t } = useTranslations();

  const [name, setName] = useState("");
  const [conditionType, setConditionType] = useState("MIN_AMOUNT");
  const [conditionValue, setConditionValue] = useState("");
  const [assignmentMode, setAssignmentMode] = useState("SINGLE");

  const handleSubmit = () => {
    submit(
      { name, conditionType, conditionValue, assignmentMode },
      { method: "post" },
    );
  };

  return (
    <Page
      backAction={{ content: t.promotionForm.backToList, onAction: () => navigate("/app/promotions") }}
      title={t.promotionForm.addTitle}
    >
      <TitleBar title={t.promotionForm.addTitle} />
      <BlockStack gap="400">
        {actionData?.error && (
          <Banner tone="critical">{t.promotionForm.missingFields}</Banner>
        )}
        <Card>
          <FormLayout>
            <TextField
              label={t.promotionForm.nameLabel}
              value={name}
              onChange={setName}
              autoComplete="off"
              placeholder={t.promotionForm.namePlaceholder}
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
            {conditionType === "MIN_AMOUNT" ? (
              <TextField
                label={t.promotionForm.minAmountLabel}
                type="number"
                value={conditionValue}
                onChange={setConditionValue}
                autoComplete="off"
                prefix="₩"
              />
            ) : (
              <BlockStack gap="100">
                <TextField
                  label={t.promotionForm.productGidLabel}
                  value={conditionValue}
                  onChange={setConditionValue}
                  autoComplete="off"
                  helpText={t.promotionForm.productGidHelp}
                />
              </BlockStack>
            )}
            <Select
              label={t.promotionForm.assignmentLabel}
              options={[
                { label: t.promotionForm.assignmentSingle, value: "SINGLE" },
                { label: t.promotionForm.assignmentRandom, value: "RANDOM" },
                { label: t.promotionForm.assignmentRotating, value: "ROTATING" },
              ]}
              value={assignmentMode}
              onChange={setAssignmentMode}
              helpText={t.promotionForm.assignmentHelp}
            />
          </FormLayout>
        </Card>
      </BlockStack>
      <PageActions
        primaryAction={{ content: t.promotionForm.save, onAction: handleSubmit }}
        secondaryActions={[
          { content: t.promotionForm.cancel, onAction: () => navigate("/app/promotions") },
        ]}
      />
    </Page>
  );
}
