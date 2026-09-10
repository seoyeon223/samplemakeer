import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import db from "../db.server";

type CustomersRedactPayload = {
  orders_to_redact?: number[];
};

// Mandatory GDPR/CCPA compliance topic. This app doesn't store customer PII,
// but GwpOrderLog rows reference order IDs, which are still part of a
// customer's data trail — so we erase the log rows for any redacted orders.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic, payload } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);

  const data = payload as CustomersRedactPayload;
  const orderIds = (data.orders_to_redact || []).map(String);

  if (orderIds.length > 0) {
    await db.gwpOrderLog.deleteMany({
      where: { shop, orderId: { in: orderIds } },
    });
  }

  return new Response();
};
