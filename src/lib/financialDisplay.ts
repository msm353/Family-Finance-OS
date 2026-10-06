import type { FinancialSnapshot } from "../models/Financial";
export function formatCurrencyAmount(
  data: FinancialSnapshot,
  currencyId: string,
  amount: number,
) {
  const currency = data.currencies.find((row) => row.id === currencyId)!;
  const negative = amount < 0;
  const digits = String(Math.abs(amount)).padStart(
    currency.minorUnitDigits + 1,
    "0",
  );
  const whole = currency.minorUnitDigits
    ? digits.slice(0, -currency.minorUnitDigits)
    : digits;
  const fraction = currency.minorUnitDigits
    ? "٫" +
      digits
        .slice(-currency.minorUnitDigits)
        .replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[Number(d)])
    : "";
  return `${negative ? "−" : ""}${BigInt(whole).toLocaleString("fa-IR")}${fraction} ${currency.name}`;
}
