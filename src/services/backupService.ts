import { db } from "../database/db";
import {
  makeExpenseBackup,
  parseExpenseBackup,
  type ExpenseBackup,
} from "../lib/expenseBackupFormat";

export { parseExpenseBackup, type ExpenseBackup };

export async function createExpenseBackup(): Promise<ExpenseBackup> {
  return makeExpenseBackup(await db.expenses.toArray(), new Date().toISOString());
}

export async function restoreExpenseBackup(backup: ExpenseBackup): Promise<void> {
  await db.transaction("rw", db.expenses, async () => {
    await db.expenses.clear();
    await db.expenses.bulkPut(backup.expenses);
  });
}
