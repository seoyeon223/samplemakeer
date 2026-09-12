// Plan names must exactly match the plans configured in Partner Dashboard
// under Shopify Managed Pricing — pricing itself is no longer defined here.
export const FREE_PLAN = "Free";
export const PRO_PLAN = "Pro";

// Free plan cap on GWP-applied (paid) orders per calendar month. Enforced in
// gwp-engine.server.ts; once hit, the storefront stops offering gifts until
// the shop upgrades or the month rolls over.
export const FREE_PLAN_MONTHLY_ORDER_LIMIT = 20;
