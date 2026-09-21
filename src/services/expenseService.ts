import { db } from "../database/db";
import { Expense } from "../models/Expense";

export async function addExpense(expense: Expense) {
  return db.expenses.add(expense);
}

export async function getExpenses() {
  return db.expenses.reverse().toArray();
}
