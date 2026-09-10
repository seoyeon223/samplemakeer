import type { AdminApiContext } from "@shopify/shopify-app-remix/server";

const FUNCTION_TITLE = "GWP Free Gift Discount";
const DISCOUNT_TITLE = "GWP 무료 증정품 (자동 생성, 삭제하지 마세요)";

// Ensures the shop has exactly one automatic discount wired to the
// gwp-free-gift-discount Function, so merchants don't have to configure a
// discount by hand for gift lines to ring up free. Safe to call on every
// login — it no-ops once the discount already exists.
export async function ensureFreeGiftDiscount(admin: AdminApiContext) {
  try {
    const existing = await admin.graphql(
      `#graphql
      query ExistingGwpDiscount {
        discountNodes(first: 50, query: "method:automatic") {
          nodes {
            id
            discount {
              __typename
              ... on DiscountAutomaticApp {
                title
              }
            }
          }
        }
      }`,
    );
    const existingJson = await existing.json();
    const alreadyExists = (existingJson.data?.discountNodes?.nodes || []).some(
      (node: any) => node.discount?.title === DISCOUNT_TITLE,
    );
    if (alreadyExists) return;

    const functionsResponse = await admin.graphql(
      `#graphql
      query GwpFunctions {
        shopifyFunctions(first: 25) {
          nodes {
            id
            apiType
            title
          }
        }
      }`,
    );
    const functionsJson = await functionsResponse.json();
    const fn = (functionsJson.data?.shopifyFunctions?.nodes || []).find(
      (node: any) => node.title === FUNCTION_TITLE,
    );
    if (!fn) {
      // The extension hasn't been deployed to this app yet (e.g. first local
      // `shopify app dev` before `shopify app deploy`). Nothing to wire up.
      return;
    }

    await admin.graphql(
      `#graphql
      mutation CreateGwpDiscount($discount: DiscountAutomaticAppInput!) {
        discountAutomaticAppCreate(automaticAppDiscount: $discount) {
          userErrors { field message }
        }
      }`,
      {
        variables: {
          discount: {
            title: DISCOUNT_TITLE,
            functionId: fn.id,
            startsAt: new Date().toISOString(),
            discountClasses: ["PRODUCT"],
            combinesWith: {
              orderDiscounts: true,
              productDiscounts: true,
              shippingDiscounts: true,
            },
          },
        },
      },
    );
  } catch (error) {
    console.error("Failed to ensure GWP free gift discount", error);
  }
}
