import { jalaliMonthLength, toGregorian, toJalali } from "./jalali.ts";

function toEnglishDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Returns a valid Gregorian day key, or null for an unsupported/invalid date. */
export function normalizeExpenseDate(value: string): string | null {
  const normalized = toEnglishDigits(value.trim());
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const date = new Date(year, month - 1, day);
    if (
      date.getFullYear() !== year ||
      date.getMonth() + 1 !== month ||
      date.getDate() !== day
    )
      return null;
    try {
      toJalali(date);
      return dateKey(date);
    } catch {
      return null;
    }
  }

  const legacy = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized);
  if (!legacy) return null;

  const year = Number(legacy[1]);
  const month = Number(legacy[2]);
  const day = Number(legacy[3]);
  try {
    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > jalaliMonthLength(year, month)
    )
      return null;
    return dateKey(toGregorian(year, month, day));
  } catch {
    return null;
  }
}
