import type { Expense } from "../models/Expense";

type ExpenseSummaryProps = {
  expenses: Expense[];
};

export default function ExpenseSummary({
  expenses,
}: ExpenseSummaryProps) {
  const totalAmount = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  return (
    <div
      style={{
        marginTop: "20px",
        padding: "15px",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <h2>📊 خلاصه مالی</h2>

      <p>
        تعداد هزینه‌ها:{" "}
        <strong>{expenses.length}</strong>
      </p>

      <p>
        مجموع هزینه‌ها:{" "}
        <strong>
          {totalAmount.toLocaleString("fa-IR")} تومان
        </strong>
      </p>
    </div>
  );
}
