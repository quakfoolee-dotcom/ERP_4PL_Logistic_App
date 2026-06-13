import type { CurrencyCode, Money } from "./models";

export function money(amountCents: number, currency: CurrencyCode = "CAD"): Money {
  return { amountCents, currency };
}

export function formatMoney(value: Money): string {
  return `${value.currency} $${(value.amountCents / 100).toLocaleString("en-CA", {
    maximumFractionDigits: value.amountCents % 100 === 0 ? 0 : 2,
  })}`;
}

export function addMoney(values: Money[], currency: CurrencyCode = "CAD"): Money {
  return money(values.reduce((total, value) => total + value.amountCents, 0), currency);
}
