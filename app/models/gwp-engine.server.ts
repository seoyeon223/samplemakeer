import db from "../db.server";
import { CONDITION_TYPES, getGwpOrderCount } from "./promotion.server";
import { getShopPlan } from "./shop.server";
import { FREE_PLAN, FREE_PLAN_MONTHLY_ORDER_LIMIT } from "../billing";

export type CartLineInput = {
  productId: string; // gid://shopify/Product/...
  variantId: string; // gid://shopify/ProductVariant/...
  quantity: number;
};

export type EvaluateInput = {
  shop: string;
  subtotal: number;
  cartToken: string;
  lines: CartLineInput[];
};

export type EligibleGift = {
  promotionId: string;
  promotionName: string;
  giftId: string;
  productId: string;
  variantId: string;
  title: string;
};

// Deterministic string hash (djb2), used so the same cart consistently gets
// the same RANDOM pick instead of a different gift on every page load.
function hashString(input: string): number {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return Math.abs(hash);
}

function isConditionMet(
  promotion: { conditionType: string; conditionValue: string },
  input: EvaluateInput,
): boolean {
  if (promotion.conditionType === CONDITION_TYPES.MIN_AMOUNT) {
    const threshold = parseFloat(promotion.conditionValue);
    return input.subtotal >= threshold;
  }
  if (promotion.conditionType === CONDITION_TYPES.SPECIFIC_PRODUCT) {
    return input.lines.some(
      (line) => line.productId === promotion.conditionValue,
    );
  }
  return false;
}

// Decides which gifts should currently be in the cart for a given shop and
// cart state. Pure read — does not mutate rotation state (that only advances
// once an order actually ships, via the orders webhook).
export async function evaluateEligibleGifts(
  input: EvaluateInput,
): Promise<EligibleGift[]> {
  const plan = await getShopPlan(input.shop);
  if (plan === FREE_PLAN) {
    const ordersThisMonth = await getGwpOrderCount(input.shop, 30);
    if (ordersThisMonth >= FREE_PLAN_MONTHLY_ORDER_LIMIT) {
      // Free plan cap hit — stop offering new gifts until the shop upgrades
      // or the rolling 30-day window rolls a completed order off the count.
      return [];
    }
  }

  const promotions = await db.promotion.findMany({
    where: { shop: input.shop, active: true },
    // stock > 0 is enforced here (not just `active`) so a merchant manually
    // re-enabling a gift, or a stale record before the next inventory
    // webhook, can never hand out an out-of-stock item.
    include: { gifts: { where: { active: true, stock: { gt: 0 } } } },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });

  const results: EligibleGift[] = [];

  for (const promotion of promotions) {
    if (promotion.gifts.length === 0) continue;
    if (!isConditionMet(promotion, input)) continue;

    let gift = promotion.gifts[0];
    if (promotion.assignmentMode === "RANDOM") {
      const idx = hashString(input.cartToken + promotion.id) % promotion.gifts.length;
      gift = promotion.gifts[idx];
    } else if (promotion.assignmentMode === "ROTATING") {
      const idx = promotion.rotationIndex % promotion.gifts.length;
      gift = promotion.gifts[idx];
    }

    results.push({
      promotionId: promotion.id,
      promotionName: promotion.name,
      giftId: gift.id,
      productId: gift.productId,
      variantId: gift.variantId,
      title: gift.title,
    });
  }

  return results;
}
