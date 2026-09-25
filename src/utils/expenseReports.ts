import { JALALI_MONTHS, toJalali } from "../lib/jalali";
import type { Expense } from "../models/Expense";

export type ReportItem = {
  label: string;
  amount: number;
  count: number;
};

export type MonthlyReport = ReportItem & {
  monthKey: number;
};

function parseExpenseDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return date;
}

export function getMonthlyReport(expenses: Expense[]): MonthlyReport[] {
  const totals = new Map<number, { amount: number; count: number }>();

  for (const expense of expenses) {
    const date = parseExpenseDate(expense.date);
    if (!date) continue;

    let jalali;
    try {
      jalali = toJalali(date);
    } catch {
      continue;
    }

    const key = jalali.jy * 12 + jalali.jm - 1;
    const current = totals.get(key) ?? { amount: 0, count: 0 };
    current.amount += expense.amount;
    current.count += 1;
    totals.set(key, current);
  }

  if (totals.size === 0) return [];

  const current = toJalali(new Date());
  const latestMonth = current.jy * 12 + current.jm - 1;
  return Array.from({ length: 6 }, (_, offset) => {
    const monthKey = latestMonth - 5 + offset;
    const year = Math.floor(monthKey / 12);
    const month = monthKey % 12;
    const total = totals.get(monthKey) ?? { amount: 0, count: 0 };
    return {
      monthKey,
      label: `${JALALI_MONTHS[month]} ${year}`,
      amount: total.amount,
      count: total.count,
    };
  });
}

export function getPaymentReport(expenses: Expense[]): ReportItem[] {
  const totals = new Map<string, ReportItem>();
  for (const expense of expenses) {
    const current = totals.get(expense.paymentMethod) ?? {
      label: expense.paymentMethod,
      amount: 0,
      count: 0,
    };
    current.amount += expense.amount;
    current.count += 1;
    totals.set(expense.paymentMethod, current);
  }
  return [...totals.values()].sort((a, b) => b.amount - a.amount || a.label.localeCompare(b.label, "fa"));
}
