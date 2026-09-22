import { useEffect, useState } from "react";

import ExpenseForm from "../components/ExpenseForm";
import ExpenseList from "../components/ExpenseList";
import ExpenseSummary from "../components/ExpenseSummary";

import type { Expense } from "../models/Expense";
import { getExpenses } from "../services/expenseService";

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [editingExpense, setEditingExpense] = useState<
    Expense | undefined
  >(undefined);

  async function loadExpenses() {
    const data = await getExpenses();
    setExpenses(data);
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  function handleEdit(expense: Expense) {
    setEditingExpense(expense);
  }

  function handleFinishedEditing() {
    setEditingExpense(undefined);
    loadExpenses();
  }

  return (
    <main
      style={{
        direction: "rtl",
        maxWidth: "700px",
        margin: "40px auto",
        padding: "20px",
        fontFamily: "sans-serif",
      }}
    >
      <h1>💰 Family Finance OS</h1>

      <p
        style={{
          color: "#666",
          marginBottom: "30px",
        }}
      >
        نسخه آزمایشی 0.1.0
      </p>

      <ExpenseSummary expenses={expenses} />

      <ExpenseForm
        onExpenseAdded={loadExpenses}
        editingExpense={editingExpense}
        onFinishedEditing={handleFinishedEditing}
      />

      <ExpenseList
        expenses={expenses}
        onExpenseDeleted={loadExpenses}
        onExpenseEdit={handleEdit}
      />

      <hr
        style={{
          margin: "30px 0",
        }}
      />

      <h2>هدف پروژه</h2>

      <p>سیستم مدیریت مالی خانوادگی کاملاً آفلاین</p>
    </main>
  );
}
