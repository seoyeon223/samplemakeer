import type { ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { evaluateEligibleGifts } from "../models/gwp-engine.server";

// Called from the storefront (via the /apps/gwp app proxy) on every cart
// change to decide which free-gift lines should currently be in the cart.
export const action = async ({ request }: ActionFunctionArgs) => {
  const { session } = await authenticate.public.appProxy(request);

  if (!session) {
    return new Response(JSON.stringify({ gifts: [] }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  let body: {
    subtotal?: number;
    cartToken?: string;
    lines?: Array<{ productId: string; variantId: string; quantity: number }>;
  } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }

  const gifts = await evaluateEligibleGifts({
    shop: session.shop,
    subtotal: Number(body.subtotal) || 0,
    cartToken: String(body.cartToken || ""),
    lines: Array.isArray(body.lines) ? body.lines : [],
  });

  return new Response(JSON.stringify({ gifts }), {
    headers: { "Content-Type": "application/json" },
  });
};
