import { db } from "../database/db";
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
  return db.expenses.orderBy("id").reverse().toArray();
}

export async function deleteExpense(id: number) {
  return db.expenses.delete(id);
}

export async function clearExpenses() {
  return db.expenses.clear();
}
