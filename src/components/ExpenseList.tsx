import type { Expense } from "../models/Expense";
import { deleteExpense } from "../services/expenseService";

type ExpenseListProps = {
  expenses: Expense[];
  onExpenseDeleted: () => void;
};

export default function ExpenseList({
  expenses,
  onExpenseDeleted,
}: ExpenseListProps) {
  async function handleDelete(id: number) {
    const ok = window.confirm(
      "آیا از حذف این هزینه مطمئن هستید؟"
    );

    if (!ok) return;

    await deleteExpense(id);

    onExpenseDeleted();

    alert("✅ هزینه حذف شد.");
  }

  if (expenses.length === 0) {
    return (
      <div style={{ marginTop: "30px" }}>
        <h2>هزینه‌های ثبت‌شده</h2>
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

          <button
            onClick={() => {
              if (expense.id !== undefined) {
                handleDelete(expense.id);
              }
            }}
            style={{
              marginTop: "12px",
              padding: "8px 12px",
              cursor: "pointer",
            }}
          >
            🗑 حذف
          </button>
        </div>
      ))}
    </div>
  );
}
