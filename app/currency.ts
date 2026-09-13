// Small symbol map for the currencies Shopify stores most commonly use.
// Falls back to the ISO code itself (e.g. "CHF ") for anything not listed,
// which is always correct even if less pretty than a dedicated symbol.
const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  CAD: "CA$",
  AUD: "A$",
  NZD: "NZ$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  KRW: "₩",
  CNY: "¥",
  INR: "₹",
  BRL: "R$",
  MXN: "MX$",
  SGD: "S$",
  HKD: "HK$",
  CHF: "CHF ",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
};

export function getCurrencySymbol(currencyCode?: string | null): string {
  if (!currencyCode) return "$";
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] ?? `${currencyCode.toUpperCase()} `;
}
