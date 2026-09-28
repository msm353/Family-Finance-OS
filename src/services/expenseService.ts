import { db } from "../database/db";
import { jalaliMonthLength, toGregorian } from "../lib/jalali";
import type { Expense } from "../models/Expense";

function toEnglishDigits(value: string) {
  return value
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)));
}

function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function normalizeExpenseDate(value: string) {
  const normalized = toEnglishDigits(value.trim());

  // Current format: Gregorian YYYY-MM-DD
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
  if (iso) {
    const year = Number(iso[1]);
    const month = Number(iso[2]);
    const day = Number(iso[3]);
    const date = new Date(year, month - 1, day);

    if (
      date.getFullYear() === year &&
      date.getMonth() + 1 === month &&
      date.getDate() === day
    ) {
      return dateKey(date);
    }

    return normalized;
  }

  // Legacy format: Jalali YYYY/M/D, including Persian digits.
  const legacy = /^(\d{4})\/(\d{1,2})\/(\d{1,2})$/.exec(normalized);
  if (!legacy) return normalized;

  const year = Number(legacy[1]);
  const month = Number(legacy[2]);
  const day = Number(legacy[3]);

  try {
    if (
      month < 1 ||
      month > 12 ||
      day < 1 ||
      day > jalaliMonthLength(year, month)
    ) {
      return normalized;
    }

    return dateKey(toGregorian(year, month, day));
  } catch {
    return normalized;
  }
}

export async function addExpense(expense: Expense) {
  try {
    return await db.expenses.add(expense);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function updateExpense(expense: Expense) {
  try {
    return await db.expenses.put(expense);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

export async function getExpenses() {
  const expenses = await db.expenses.orderBy("id").reverse().toArray();

  return expenses.map((expense) => ({
    ...expense,
    date: normalizeExpenseDate(expense.date),
  }));
}

export async function deleteExpense(id: number) {
  return db.expenses.delete(id);
}

export async function clearExpenses() {
  return db.expenses.clear();
}
