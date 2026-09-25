import type { Expense } from "../models/Expense";
import { getMonthlyReport, getPaymentReport, type ReportItem } from "../utils/expenseReports";

type Props = {
  expenses: Expense[];
};

function formatAmount(amount: number) {
  return `${amount.toLocaleString("fa-IR")} تومان`;
}

function ReportBars({ items, maxAmount }: { items: ReportItem[]; maxAmount: number }) {
  return (
    <div className="expense-report-bars">
      {items.map((item) => (
        <div className="expense-report-row" key={item.label}>
          <div className="expense-report-row-heading">
            <strong>{item.label}</strong>
            <span>{formatAmount(item.amount)}</span>
          </div>
          <div className="expense-report-track" role="img" aria-label={`${item.label}: ${formatAmount(item.amount)}، ${item.count.toLocaleString("fa-IR")} هزینه`}>
            <div className="expense-report-fill" style={{ width: `${maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0}%` }} />
          </div>
          <small>{item.count.toLocaleString("fa-IR")} هزینه</small>
        </div>
      ))}
    </div>
  );
}

export default function ExpenseReports({ expenses }: Props) {
  const monthly = getMonthlyReport(expenses);
  const payments = getPaymentReport(expenses);
  const monthlyMax = Math.max(0, ...monthly.map((item) => item.amount));
  const paymentMax = Math.max(0, ...payments.map((item) => item.amount));

  return (
    <section className="expense-panel" aria-labelledby="expense-reports-title">
      <h2 id="expense-reports-title">گزارش‌های مالی</h2>
      <p className="expense-help">این گزارش‌ها بر اساس هزینه‌های فیلترشدهٔ فعلی محاسبه می‌شوند.</p>
      {expenses.length === 0 ? (
        <p className="expense-report-empty">هزینه‌ای برای نمایش گزارش وجود ندارد.</p>
      ) : (
        <div className="expense-report-sections">
          <div>
            <h3>روند هزینه در شش ماه شمسی</h3>
            <p className="expense-report-caption">شش ماه منتهی به تاریخ آخرین هزینهٔ فیلترشده</p>
            <ReportBars items={monthly} maxAmount={monthlyMax} />
          </div>
          <div>
            <h3>هزینه بر اساس روش پرداخت</h3>
            <ReportBars items={payments} maxAmount={paymentMax} />
          </div>
        </div>
      )}
    </section>
  );
}
