(function () {
  "use strict";

  var EVALUATE_URL = "/apps/gwp/evaluate";
  var FREE_ATTR = "_gwp_free";
  var PROMOTION_ATTR = "_gwp_promotion_id";
  var POLL_INTERVAL_MS = 5000;
  var CART_ENDPOINT_PATTERN = /\/cart\/(add|change|update|clear)(\.js)?/;

  var syncing = false;
  var lastSignature = "";

  function fetchCart() {
    return fetch("/cart.js", { headers: { Accept: "application/json" } }).then(
      function (res) {
        return res.json();
      },
    );
  }

  function toProductGid(productId) {
    return "gid://shopify/Product/" + productId;
  }

  function toVariantGid(variantId) {
    return "gid://shopify/ProductVariant/" + variantId;
  }

  function isGiftLine(item) {
    return !!(item.properties && item.properties[FREE_ATTR] === "true");
  }

  function giftLinePromotionId(item) {
    return item.properties && item.properties[PROMOTION_ATTR];
  }

  // Subtotal used for eligibility must exclude gift lines themselves,
  // otherwise adding a free gift could (dis)qualify the cart for more gifts.
  function eligibilitySubtotalCents(cart) {
    return cart.items.reduce(function (sum, item) {
      if (isGiftLine(item)) return sum;
      return sum + item.price * item.quantity;
    }, 0);
  }

  function evaluate(cart) {
    var lines = cart.items
      .filter(function (item) {
        return !isGiftLine(item);
      })
      .map(function (item) {
        return {
          productId: toProductGid(item.product_id),
          variantId: toVariantGid(item.variant_id),
          quantity: item.quantity,
        };
      });

    return fetch(EVALUATE_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subtotal: eligibilitySubtotalCents(cart) / 100,
        cartToken: cart.token,
        lines: lines,
      }),
    })
      .then(function (res) {
        return res.json();
      })
      .then(function (data) {
        return data.gifts || [];
      })
      .catch(function () {
        return [];
      });
  }

  function reconcile(cart, eligibleGifts) {
    var toAdd = [];
    var toRemove = [];

    var currentByPromotion = {};
    cart.items.forEach(function (item) {
      if (!isGiftLine(item)) return;
      currentByPromotion[giftLinePromotionId(item)] = item;
    });

    var eligibleByPromotion = {};
    eligibleGifts.forEach(function (gift) {
      eligibleByPromotion[gift.promotionId] = gift;
    });

    eligibleGifts.forEach(function (gift) {
      var current = currentByPromotion[gift.promotionId];
      var variantIdNum = gift.variantId.split("/").pop();
      if (!current) {
        toAdd.push(gift);
      } else if (String(current.variant_id) !== String(variantIdNum)) {
        toRemove.push(current);
        toAdd.push(gift);
      }
    });

    Object.keys(currentByPromotion).forEach(function (promotionId) {
      if (!eligibleByPromotion[promotionId]) {
        toRemove.push(currentByPromotion[promotionId]);
      }
    });

    if (toAdd.length === 0 && toRemove.length === 0) {
      return Promise.resolve(false);
    }

    var removals = toRemove.map(function (item) {
      return fetch("/cart/change.js", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.key, quantity: 0 }),
      });
    });

    return Promise.all(removals).then(function () {
      var additions = toAdd.map(function (gift) {
        var variantIdNum = gift.variantId.split("/").pop();
        var properties = {};
        properties[FREE_ATTR] = "true";
        properties[PROMOTION_ATTR] = gift.promotionId;
        return fetch("/cart/add.js", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            items: [
              {
                id: Number(variantIdNum),
                quantity: 1,
                properties: properties,
              },
            ],
          }),
        });
      });
      return Promise.all(additions).then(function () {
        return true;
      });
    });
  }

  function sync() {
    if (syncing) return;
    syncing = true;
    fetchCart()
      .then(function (cart) {
        var signature = JSON.stringify(
          cart.items.map(function (i) {
            return [i.variant_id, i.quantity];
          }),
        );
        if (signature === lastSignature) {
          syncing = false;
          return;
        }
        lastSignature = signature;
        evaluate(cart)
          .then(function (gifts) {
            return reconcile(cart, gifts);
          })
          .then(function (changed) {
            syncing = false;
            if (changed) {
              lastSignature = "";
              document.dispatchEvent(new CustomEvent("gwp:cart-updated"));
            }
          })
          .catch(function () {
            syncing = false;
          });
      })
      .catch(function () {
        syncing = false;
      });
  }

  var originalFetch = window.fetch;
  window.fetch = function () {
    var url = arguments[0] instanceof Request ? arguments[0].url : arguments[0];
    var isCartCall = typeof url === "string" && CART_ENDPOINT_PATTERN.test(url);
    var result = originalFetch.apply(this, arguments);
    if (isCartCall) {
      result.then(function () {
        setTimeout(sync, 100);
      });
    }
    return result;
  };

  document.addEventListener("DOMContentLoaded", sync);
  setInterval(sync, POLL_INTERVAL_MS);
})();
