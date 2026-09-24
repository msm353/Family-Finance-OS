import type { Expense } from "../models/Expense";
import { deleteExpense } from "../services/expenseService";

type ExpenseListProps = {
  expenses: Expense[];
  onExpenseDeleted: () => void;
  onExpenseEdit: (expense: Expense) => void;
};

function formatExpenseDate(date: string) {
  const match = date.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) {
    return date;
  }

  const [, year, month, day] = match;

  const parsedDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsedDate);
}

export default function ExpenseList({
  expenses,
  onExpenseDeleted,
  onExpenseEdit,
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
      <div
        style={{
          marginTop: "30px",
          padding: "20px",
          border: "1px solid #ddd",
          borderRadius: "8px",
          textAlign: "center",
        }}
      >
        <h2>هزینه‌های ثبت‌شده</h2>

        <p>
          هیچ هزینه‌ای برای نمایش وجود ندارد.
        </p>
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
            borderRadius: "10px",
            padding: "16px",
            marginBottom: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "10px",
              alignItems: "center",
              marginBottom: "12px",
            }}
          >
            <strong
              style={{
                fontSize: "18px",
              }}
            >
              🏪 {expense.storeName}
            </strong>

            <strong>
              {expense.amount.toLocaleString("fa-IR")}{" "}
              تومان
            </strong>
          </div>

          <div style={{ marginBottom: "6px" }}>
            <strong>🏷 دسته‌بندی:</strong>{" "}
            {expense.category}
          </div>

          <div style={{ marginBottom: "6px" }}>
            <strong>💳 روش پرداخت:</strong>{" "}
            {expense.paymentMethod}
          </div>

          <div style={{ marginBottom: "6px" }}>
            <strong>📅 تاریخ:</strong>{" "}
            {formatExpenseDate(expense.date)}
          </div>

          {expense.description?.trim() && (
            <div
              style={{
                marginTop: "10px",
                padding: "10px",
                borderRadius: "6px",
                background: "#f5f5f5",
              }}
            >
              <strong>📝 توضیحات:</strong>{" "}
              {expense.description}
            </div>
          )}

          <div
            style={{
              display: "flex",
              gap: "10px",
              marginTop: "14px",
            }}
          >
            <button
              type="button"
              onClick={() =>
                onExpenseEdit(expense)
              }
              style={{
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              ✏️ ویرایش
            </button>

            <button
              type="button"
              onClick={() => {
                if (expense.id !== undefined) {
                  handleDelete(expense.id);
                }
              }}
              style={{
                padding: "8px 14px",
                cursor: "pointer",
              }}
            >
              🗑 حذف
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
