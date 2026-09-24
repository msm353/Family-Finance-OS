import type { Expense } from "../models/Expense";

type ExpenseSummaryProps = {
  expenses: Expense[];
};

type CategorySummary = {
  category: string;
  amount: number;
  count: number;
};

export default function ExpenseSummary({
  expenses,
}: ExpenseSummaryProps) {
  const totalAmount = expenses.reduce(
    (sum, expense) => sum + expense.amount,
    0
  );

  const averageAmount =
    expenses.length > 0
      ? totalAmount / expenses.length
      : 0;

  const highestExpense =
    expenses.length > 0
      ? Math.max(
          ...expenses.map(
            (expense) => expense.amount
          )
        )
      : 0;

  const categoryMap = new Map<
    string,
    CategorySummary
  >();

  for (const expense of expenses) {
    const current = categoryMap.get(
      expense.category
    );

    if (current) {
      current.amount += expense.amount;
      current.count += 1;
    } else {
      categoryMap.set(expense.category, {
        category: expense.category,
        amount: expense.amount,
        count: 1,
      });
    }
  }

  const categorySummary = Array.from(
    categoryMap.values()
  ).sort((a, b) => b.amount - a.amount);

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

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(150px, 1fr))",
          gap: "12px",
          marginBottom:
            categorySummary.length > 0
              ? "20px"
              : "0",
        }}
      >
        <div
          style={{
            padding: "12px",
            border: "1px solid #eee",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              color: "#666",
              marginBottom: "6px",
            }}
          >
            تعداد هزینه‌ها
          </div>

          <strong
            style={{
              fontSize: "20px",
            }}
          >
            {expenses.length.toLocaleString(
              "fa-IR"
            )}
          </strong>
        </div>

        <div
          style={{
            padding: "12px",
            border: "1px solid #eee",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              color: "#666",
              marginBottom: "6px",
            }}
          >
            مجموع هزینه‌ها
          </div>

          <strong
            style={{
              fontSize: "20px",
            }}
          >
            {totalAmount.toLocaleString(
              "fa-IR"
            )}{" "}
            تومان
          </strong>
        </div>

        <div
          style={{
            padding: "12px",
            border: "1px solid #eee",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              color: "#666",
              marginBottom: "6px",
            }}
          >
            میانگین هر هزینه
          </div>

          <strong
            style={{
              fontSize: "20px",
            }}
          >
            {Math.round(
              averageAmount
            ).toLocaleString("fa-IR")}{" "}
            تومان
          </strong>
        </div>

        <div
          style={{
            padding: "12px",
            border: "1px solid #eee",
            borderRadius: "8px",
          }}
        >
          <div
            style={{
              color: "#666",
              marginBottom: "6px",
            }}
          >
            بیشترین هزینه
          </div>

          <strong
            style={{
              fontSize: "20px",
            }}
          >
            {highestExpense.toLocaleString(
              "fa-IR"
            )}{" "}
            تومان
          </strong>
        </div>
      </div>

      {categorySummary.length > 0 && (
        <div>
          <h3>🏷 هزینه بر اساس دسته‌بندی</h3>

          {categorySummary.map((item) => {
            const percentage =
              totalAmount > 0
                ? (item.amount / totalAmount) *
                  100
                : 0;

            return (
              <div
                key={item.category}
                style={{
                  padding: "12px 0",
                  borderBottom:
                    "1px solid #eee",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: "12px",
                    marginBottom: "6px",
                  }}
                >
                  <strong>
                    {item.category}
                  </strong>

                  <span>
                    {item.amount.toLocaleString(
                      "fa-IR"
                    )}{" "}
                    تومان
                  </span>
                </div>

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: "12px",
                    color: "#666",
                    fontSize: "14px",
                  }}
                >
                  <span>
                    {item.count.toLocaleString(
                      "fa-IR"
                    )}{" "}
                    تراکنش
                  </span>

                  <span>
                    {percentage.toLocaleString(
                      "fa-IR",
                      {
                        maximumFractionDigits: 1,
                      }
                    )}
                    ٪
                  </span>
                </div>

                <div
                  style={{
                    height: "6px",
                    marginTop: "8px",
                    background: "#eee",
                    borderRadius: "999px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${percentage}%`,
                      height: "100%",
                      background:
                        "currentColor",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
