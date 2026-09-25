import { db } from "../database/db";
import type { Expense } from "../models/Expense";

const BACKUP_FORMAT = "ffos-expenses";
const BACKUP_VERSION = 1;

export interface ExpenseBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  expenses: Expense[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isValidDate(value: unknown): value is string {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return parsed.getFullYear() === year && parsed.getMonth() === month - 1 && parsed.getDate() === day;
}

function parseExpense(value: unknown): Expense {
  if (!isRecord(value) ||
      !Number.isSafeInteger(value.id) || (value.id as number) < 1 ||
      typeof value.storeName !== "string" || !value.storeName.trim() ||
      typeof value.amount !== "number" || !Number.isFinite(value.amount) || value.amount <= 0 ||
      typeof value.category !== "string" || !value.category.trim() ||
      typeof value.paymentMethod !== "string" || !value.paymentMethod.trim() ||
      (value.description !== undefined && typeof value.description !== "string") ||
      !isValidDate(value.date) ||
      typeof value.createdAt !== "string" || Number.isNaN(Date.parse(value.createdAt)) ||
      typeof value.confirmed !== "boolean") {
    throw new Error("فایل پشتیبان شامل هزینهٔ نامعتبر است.");
  }

  return {
    id: value.id as number,
    storeName: value.storeName,
    amount: value.amount,
    category: value.category,
    paymentMethod: value.paymentMethod,
    ...(value.description === undefined ? {} : { description: value.description as string }),
    date: value.date,
    createdAt: value.createdAt,
    confirmed: value.confirmed,
  };
}

export function parseExpenseBackup(text: string): ExpenseBackup {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("فایل انتخاب‌شده JSON معتبر نیست.");
  }

  if (!isRecord(data) || data.format !== BACKUP_FORMAT || data.version !== BACKUP_VERSION ||
      typeof data.exportedAt !== "string" || Number.isNaN(Date.parse(data.exportedAt)) ||
      !Array.isArray(data.expenses)) {
    throw new Error("این فایل پشتیبان FFOS با نسخهٔ پشتیبانی‌شده سازگار نیست.");
  }

  const expenses = data.expenses.map(parseExpense);
  const ids = new Set(expenses.map((expense) => expense.id));
  if (ids.size !== expenses.length) {
    throw new Error("فایل پشتیبان شناسه‌های تکراری دارد.");
  }

  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: data.exportedAt, expenses };
}

export async function createExpenseBackup(): Promise<ExpenseBackup> {
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    exportedAt: new Date().toISOString(),
    expenses: await db.expenses.toArray(),
  };
}

export async function restoreExpenseBackup(backup: ExpenseBackup): Promise<void> {
  await db.transaction("rw", db.expenses, async () => {
    await db.expenses.clear();
    await db.expenses.bulkPut(backup.expenses);
  });
}
