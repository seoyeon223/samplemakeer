import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";
import { advanceRotation } from "../models/promotion.server";

type OrderLineItem = {
  variant_id: number | null;
  quantity: number;
  properties?: Array<{ name: string; value: string }>;
};

// Marks which promotions actually shipped a gift on a real, paid order, so the
// dashboard ratio is accurate and ROTATING promotions advance to the next gift.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const order = payload as { id: number | string; line_items?: OrderLineItem[] };
  const orderId = String(order.id);
  const lineItems = order.line_items || [];

  for (const line of lineItems) {
    const promotionId = line.properties?.find(
      (p) => p.name === "_gwp_promotion_id",
    )?.value;
    if (!promotionId || !line.variant_id) continue;

    const variantGid = `gid://shopify/ProductVariant/${line.variant_id}`;
    const gift = await db.gift.findFirst({
      where: { shop, promotionId, variantId: variantGid },
    });
    if (!gift) continue;

    try {
      await db.gwpOrderLog.create({
        data: {
          shop,
          orderId,
          promotionId,
          giftId: gift.id,
          variantId: variantGid,
          quantity: line.quantity || 1,
        },
      });
    } catch {
      // Unique constraint hit on webhook redelivery of the same order/line — safe to skip.
      continue;
    }

    const promotion = await db.promotion.findUnique({ where: { id: promotionId } });
    if (promotion?.assignmentMode === "ROTATING") {
      await advanceRotation(shop, promotionId);
    }
  }

  return new Response();
};
