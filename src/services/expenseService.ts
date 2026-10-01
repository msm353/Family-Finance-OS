import { db } from "../database/db";
import { normalizeExpenseDate } from "../lib/expenseDate";
import type { Expense } from "../models/Expense";

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
    date: normalizeExpenseDate(expense.date) ?? expense.date,
  }));
}

export async function deleteExpense(id: number) {
  return db.expenses.delete(id);
}

export async function clearExpenses() {
  return db.expenses.clear();
}
