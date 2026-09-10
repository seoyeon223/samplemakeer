import db from "../db.server";

export function addGift(
  shop: string,
  promotionId: string,
  data: {
    productId: string;
    variantId: string;
    inventoryItemId: string;
    title: string;
    imageUrl?: string | null;
    stock: number;
  },
) {
  return db.gift.create({
    data: {
      shop,
      promotionId,
      productId: data.productId,
      variantId: data.variantId,
      inventoryItemId: data.inventoryItemId,
      title: data.title,
      imageUrl: data.imageUrl ?? null,
      stock: data.stock,
      active: data.stock > 0,
    },
  });
}

export function removeGift(shop: string, giftId: string) {
  return db.gift.deleteMany({ where: { shop, id: giftId } });
}

export function setGiftActive(shop: string, giftId: string, active: boolean) {
  return db.gift.updateMany({ where: { shop, id: giftId }, data: { active } });
}

// Called from the inventory_levels/update webhook to keep our local stock
// counter (used for fast eligibility checks from the storefront proxy) in
// sync with real Shopify inventory, and to auto pause/resume gifts.
export async function syncGiftStockByInventoryItem(
  shop: string,
  inventoryItemId: string,
  available: number,
) {
  const gifts = await db.gift.findMany({
    where: { shop, inventoryItemId },
  });
  await Promise.all(
    gifts.map((gift) =>
      db.gift.update({
        where: { id: gift.id },
        data: {
          stock: available,
          active: available > 0,
        },
      }),
    ),
  );
  return gifts.length;
}
