import { useEffect, useState } from "react";
import type { Expense } from "../models/Expense";
import { getExpenses } from "../services/expenseService";

export default function ExpenseList() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  useEffect(() => {
    loadExpenses();
  }, []);

  async function loadExpenses() {
    const data = await getExpenses();
    setExpenses(data);
  }

  if (expenses.length === 0) {
    return (
      <div style={{ marginTop: "30px" }}>
        <h2>هزینه‌ها</h2>
        <p>هنوز هیچ هزینه‌ای ثبت نشده است.</p>
      </div>
    );
  }

  return (
    <div style={{ marginTop: "30px" }}>
      <h2>هزینه‌های ثبت‌شده</h2>

      {expenses.map((expense) => (
        <div
          key={expense.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "10px",
          }}
        >
          <div>
            <strong>🏪 فروشگاه:</strong> {expense.storeName}
          </div>

          <div>
            <strong>💰 مبلغ:</strong>{" "}
            {expense.amount.toLocaleString("fa-IR")} تومان
          </div>

          <div>
            <strong>📅 تاریخ:</strong> {expense.date}
          </div>

          <div>
            <strong>💳 پرداخت:</strong> {expense.paymentMethod}
          </div>
        </div>
      ))}
    </div>
  );
}
