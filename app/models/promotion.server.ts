import db from "../db.server";

export const CONDITION_TYPES = {
  MIN_AMOUNT: "MIN_AMOUNT",
  SPECIFIC_PRODUCT: "SPECIFIC_PRODUCT",
} as const;

export const ASSIGNMENT_MODES = {
  SINGLE: "SINGLE",
  RANDOM: "RANDOM",
  ROTATING: "ROTATING",
} as const;

export function listPromotions(shop: string) {
  return db.promotion.findMany({
    where: { shop },
    include: { gifts: true },
    orderBy: [{ priority: "desc" }, { createdAt: "desc" }],
  });
}

export function getPromotion(shop: string, id: string) {
  return db.promotion.findFirst({
    where: { shop, id },
    include: { gifts: true },
  });
}

export function createPromotion(
  shop: string,
  data: {
    name: string;
    conditionType: string;
    conditionValue: string;
    assignmentMode: string;
    priority?: number;
    active?: boolean;
  },
) {
  return db.promotion.create({
    data: {
      shop,
      name: data.name,
      conditionType: data.conditionType,
      conditionValue: data.conditionValue,
      assignmentMode: data.assignmentMode,
      priority: data.priority ?? 0,
      active: data.active ?? true,
    },
  });
}

export function updatePromotion(
  shop: string,
  id: string,
  data: Partial<{
    name: string;
    conditionType: string;
    conditionValue: string;
    assignmentMode: string;
    priority: number;
    active: boolean;
  }>,
) {
  return db.promotion.updateMany({
    where: { shop, id },
    data,
  });
}

export function deletePromotion(shop: string, id: string) {
  return db.promotion.deleteMany({ where: { shop, id } });
}

// Advance the rotation pointer once a ROTATING promotion's gift has actually
// shipped in a paid order, so the next customer is offered the next gift.
export async function advanceRotation(shop: string, promotionId: string) {
  const promotion = await db.promotion.findFirst({
    where: { shop, id: promotionId },
    include: { gifts: { where: { active: true, stock: { gt: 0 } } } },
  });
  if (!promotion || promotion.gifts.length === 0) return;
  const next = (promotion.rotationIndex + 1) % promotion.gifts.length;
  await db.promotion.update({
    where: { id: promotionId },
    data: { rotationIndex: next },
  });
}

// GWP applied-order ratio over the trailing `days` days, used on the dashboard.
export async function getGwpOrderCount(shop: string, days: number) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  const rows = await db.gwpOrderLog.findMany({
    where: { shop, createdAt: { gte: since } },
    select: { orderId: true },
    distinct: ["orderId"],
  });
  return rows.length;
}
