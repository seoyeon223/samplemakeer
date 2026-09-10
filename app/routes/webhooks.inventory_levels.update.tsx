import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { syncGiftStockByInventoryItem } from "../models/gift.server";

type InventoryLevelPayload = {
  inventory_item_id: number;
};

// Shopify's own inventory already decrements automatically when a gift is
// purchased. This webhook mirrors the real, shop-wide available quantity
// (summed across locations) into Gift.stock so the storefront proxy's
// eligibility checks stay fast and gifts auto-pause when they sell out.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload, admin } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const data = payload as InventoryLevelPayload;
  const inventoryItemGid = `gid://shopify/InventoryItem/${data.inventory_item_id}`;

  if (!admin) {
    return new Response();
  }

  const response = await admin.graphql(
    `#graphql
    query InventoryItemAvailable($id: ID!) {
      inventoryItem(id: $id) {
        inventoryLevels(first: 50) {
          edges {
            node {
              quantities(names: ["available"]) {
                name
                quantity
              }
            }
          }
        }
      }
    }`,
    { variables: { id: inventoryItemGid } },
  );
  const json = await response.json();
  const edges = json.data?.inventoryItem?.inventoryLevels?.edges || [];
  const totalAvailable = edges.reduce((sum: number, edge: any) => {
    const available = edge.node.quantities.find((q: any) => q.name === "available");
    return sum + (available?.quantity ?? 0);
  }, 0);

  await syncGiftStockByInventoryItem(shop, inventoryItemGid, totalAvailable);

  return new Response();
};
