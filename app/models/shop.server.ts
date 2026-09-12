import db from "../db.server";
import { PRO_PLAN, FREE_PLAN } from "../billing";

// Upserts the shop's current plan, derived from billing.check()'s
// appSubscriptions. Called on every admin page load (see app.tsx) — cheap,
// and keeps the storefront proxy's plan lookup a local DB read instead of a
// Billing API call on every cart evaluation.
export async function syncShopPlan(shop: string, appSubscriptions: { name: string }[]) {
  const plan = appSubscriptions.some((sub) => sub.name === PRO_PLAN) ? PRO_PLAN : FREE_PLAN;
  await db.shop.upsert({
    where: { shop },
    create: { shop, plan },
    update: { plan },
  });
  return plan;
}

export async function getShopPlan(shop: string): Promise<string> {
  const record = await db.shop.findUnique({ where: { shop } });
  return record?.plan ?? FREE_PLAN;
}
