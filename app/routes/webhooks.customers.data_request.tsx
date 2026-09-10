import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

// Mandatory GDPR/CCPA compliance topic. This app never stores customer PII
// (name, email, address, phone) — only order line item / variant data for
// gift-with-purchase logic — so there is nothing beyond this acknowledgement
// to provide back to the merchant for a data access request.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { shop, topic } = await authenticate.webhook(request);
  console.log(`Received ${topic} webhook for ${shop}`);
  return new Response();
};
