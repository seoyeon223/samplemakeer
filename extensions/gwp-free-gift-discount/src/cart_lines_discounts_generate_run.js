import { DiscountClass, ProductDiscountSelectionStrategy } from "../generated/api";

/**
 * @typedef {import("../generated/api").CartInput} RunInput
 * @typedef {import("../generated/api").CartLinesDiscountsGenerateRunResult} CartLinesDiscountsGenerateRunResult
 */

/**
 * Every cart line the GWP app added via the storefront widget carries the
 * hidden `_gwp_free` line item property. This function finds those lines and
 * discounts each of them by 100%, regardless of how many gift lines are in
 * the cart at once.
 *
 * @param {RunInput} input
 * @returns {CartLinesDiscountsGenerateRunResult}
 */
export function cartLinesDiscountsGenerateRun(input) {
  const hasProductDiscountClass = input.discount.discountClasses.includes(
    DiscountClass.Product,
  );
  if (!hasProductDiscountClass) {
    return { operations: [] };
  }

  const giftLines = input.cart.lines.filter(
    (line) => line.attribute?.value === "true",
  );
  if (giftLines.length === 0) {
    return { operations: [] };
  }

  return {
    operations: [
      {
        productDiscountsAdd: {
          candidates: giftLines.map((line) => ({
            message: "GWP 무료 증정품",
            targets: [{ cartLine: { id: line.id } }],
            value: { percentage: { value: 100 } },
          })),
          selectionStrategy: ProductDiscountSelectionStrategy.All,
        },
      },
    ],
  };
}
