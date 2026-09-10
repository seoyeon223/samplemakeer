import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

// Mandatory GDPR/CCPA compliance topic, sent ~48h after uninstall as the
// final purge signal. Erases everything this app stored for the shop.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  await db.gwpOrderLog.deleteMany({ where: { shop } });
  await db.gift.deleteMany({ where: { shop } });
  await db.promotion.deleteMany({ where: { shop } });
  await db.session.deleteMany({ where: { shop } });

  return new Response();
};
