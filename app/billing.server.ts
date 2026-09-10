// Single plan name, used both to declare the plan in shopify.server.ts and to
// require/request it in loaders. Keeping it here avoids a circular import
// between shopify.server.ts and the routes that need to reference the name.
export const MONTHLY_PLAN = "GWP Sample Automation Monthly";
