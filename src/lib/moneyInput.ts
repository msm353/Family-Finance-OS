export function formatMoneyInput(value: string) {
  const normalized = value
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/[,٬]/g, "");
  return /^-?\d*$/.test(normalized)
    ? normalized.replace(/\B(?=(\d{3})+(?!\d))/g, ",")
    : normalized;
}
export function parseMoneyInput(value: string, signed = false) {
  const text = formatMoneyInput(value).replace(/,/g, "");
  const amount = Number(text);
  if (
    !/^-?\d+$/.test(text) ||
    !Number.isSafeInteger(amount) ||
    (!signed && amount <= 0)
  )
    throw new Error("مبلغ باید عدد صحیح معتبر به تومان باشد.");
  return amount;
}
export const localDay = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
