import type { Expense } from "../models/Expense";
import type { FinancialSnapshot } from "../models/Financial";
import { TOMAN } from "../models/Financial";
import {
  clearFinancialExpenses,
  getFinancialSnapshot,
  saveFinancialTransaction,
  setTransactionDeleted,
} from "./financialService";
export function expensesFromSnapshot(data: FinancialSnapshot): Expense[] {
  return data.transactions.flatMap((tx) =>
    tx.type === "expense" && !tx.deletedAt && tx.currencyId === TOMAN
      ? [
          {
            id: tx.id,
            storeName: tx.title,
            amount: tx.amountMinor,
            category: tx.categoryNameSnapshot ?? "",
            paymentMethod: tx.paymentMethod ?? "",
            description: tx.description ?? "",
            date: tx.date,
            createdAt: tx.createdAt,
            confirmed: tx.confirmed,
            accountId: tx.accountId,
            revision: tx.revision,
            sourceLegacyKey: tx.sourceLegacyKey,
          },
        ]
      : [],
  );
}
export async function getExpenses() {
  return expensesFromSnapshot(await getFinancialSnapshot());
}
export function addExpense(expense: Expense) {
  return save(expense);
}
export function updateExpense(expense: Expense) {
  return save(expense);
}
function save(e: Expense) {
  return saveFinancialTransaction({
    id: e.id === undefined ? undefined : String(e.id),
    revision: e.revision,
    type: "expense",
    date: e.date,
    title: e.storeName,
    amountMinor: e.amount,
    accountId: e.accountId,
    categoryName: e.category,
    paymentMethod: e.paymentMethod,
    description: e.description,
    confirmed: e.confirmed,
  });
}
export function deleteExpense(id: number | string, revision: number) {
  return setTransactionDeleted(String(id), true, revision);
}
export const clearExpenses = clearFinancialExpenses;
