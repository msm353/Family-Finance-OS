import { useState } from "react";
import { ChartNoAxesColumn, CreditCard, PieChart } from "lucide-react";
import type { Expense } from "../models/Expense";
import { getMonthlyReport, getPaymentReport } from "../utils/expenseReports";
import { toJalali } from "../lib/jalali";

type Props = { expenses: Expense[] };
type Period = "six" | "current" | "previous";
function categoryTotals(expenses: Expense[]) {
  const totals = new Map<string, { amount: number; count: number }>();
  for (const expense of expenses) {
    const entry = totals.get(expense.category) ?? { amount: 0, count: 0 };
    entry.amount += expense.amount; entry.count += 1; totals.set(expense.category, entry);
  }
  return [...totals].map(([label, value]) => ({ label, ...value })).sort((a, b) => b.amount - a.amount);
}
function expenseMonth(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  const jalali = toJalali(date);
  return jalali.jy * 12 + jalali.jm - 1;
}
export default function ExpenseReports({ expenses }: Props) {
  const [period, setPeriod] = useState<Period>("six");
  const currentMonth = (() => { const j = toJalali(new Date()); return j.jy * 12 + j.jm - 1; })();
  const selected = expenses.filter((item) => {
    const key = expenseMonth(item.date);
    return key !== null && (period === "six" ? key <= currentMonth && key > currentMonth - 6 : period === "current" ? key === currentMonth : key === currentMonth - 1);
  });
  const monthly = getMonthlyReport(expenses).filter((item) => item.monthKey <= currentMonth && item.monthKey > currentMonth - 6);
  const categories = categoryTotals(selected);
  const payments = getPaymentReport(selected);
  const maxMonth = Math.max(1, ...monthly.map((item) => item.amount));
  const total = selected.reduce((sum, item) => sum + item.amount, 0);
  const average = selected.length ? Math.round(total / selected.length) : 0;
  const highest = selected.length ? Math.max(...selected.map((item) => item.amount)) : 0;
  return <div className="ffos-reports">
    <div className="ffos-period-tabs" role="group" aria-label="بازه گزارش">
      {([["six", "۶ ماه اخیر"], ["current", "این ماه"], ["previous", "ماه گذشته"]] as const).map(([value, label]) =>
        <button type="button" key={value} className={period === value ? "is-active" : ""} aria-pressed={period === value} onClick={() => setPeriod(value)}>{label}</button>)}
    </div>
    <div className="ffos-report-summary"><div><span>مجموع هزینه‌ها در بازه انتخابی</span><strong>{total.toLocaleString("fa-IR")} <small>تومان</small></strong></div><div><span>تعداد هزینه‌ها</span><strong>{selected.length.toLocaleString("fa-IR")}</strong></div>
      <div><span>میانگین هر هزینه</span><strong>{average.toLocaleString("fa-IR")} <small>تومان</small></strong></div><div><span>بیشترین هزینه</span><strong>{highest.toLocaleString("fa-IR")} <small>تومان</small></strong></div></div>
    <section className="ffos-card ffos-report-card"><div className="ffos-report-heading"><span className="ffos-report-icon"><ChartNoAxesColumn size={21} /></span><div><h2>روند هزینه‌ها</h2><p>شش ماه اخیر به تقویم شمسی</p></div></div>
      {!monthly.some((item) => item.amount > 0) ? <p className="ffos-empty">برای نمایش روند، هزینه‌ای در شش ماه اخیر ثبت کنید.</p>
        : <div className="ffos-report-chart" role="img" aria-label="نمودار هزینه در شش ماه اخیر">{monthly.map((item) => <div className="ffos-report-column" key={item.monthKey} title={`${item.label}: ${item.amount.toLocaleString("fa-IR")} تومان`}><strong>{item.amount > 0 ? (item.amount / 1_000_000).toLocaleString("fa-IR", { maximumFractionDigits: 1 }) : "۰"}</strong><div className="ffos-report-column-track"><span style={{ height: `${Math.max(item.amount ? 10 : 2, item.amount / maxMonth * 100)}%` }} /></div><small>{item.label.split(" ")[0]}</small></div>)}</div>}
      {monthly.some((item) => item.amount > 0) && <p className="ffos-chart-note">عدد بالای هر ستون: میلیون تومان</p>}
    </section>
    <section className="ffos-card ffos-report-card"><div className="ffos-report-heading"><span className="ffos-report-icon"><PieChart size={21} /></span><div><h2>بر اساس دسته‌بندی</h2><p>سهم هر دسته از هزینه‌های بازه انتخابی</p></div></div>
      {categories.length === 0 ? <p className="ffos-empty">در این بازه هزینه‌ای ثبت نشده است.</p> : <div className="ffos-breakdown">{categories.map((item) => <div className="ffos-breakdown-row" key={item.label}><div><strong>{item.label}</strong><span>{item.amount.toLocaleString("fa-IR")} تومان</span></div><div className="ffos-progress"><span style={{ width: `${total > 0 ? item.amount / total * 100 : 0}%` }} /></div><small>{total > 0 ? Math.round(item.amount / total * 100).toLocaleString("fa-IR") : "۰"}٪ · {item.count.toLocaleString("fa-IR")} هزینه</small></div>)}</div>}
    </section>
    <section className="ffos-card ffos-report-card"><div className="ffos-report-heading"><span className="ffos-report-icon"><CreditCard size={21} /></span><div><h2>بر اساس روش پرداخت</h2><p>مجموع هزینه‌های هر روش پرداخت</p></div></div>
      {payments.length === 0 ? <p className="ffos-empty">در این بازه هزینه‌ای ثبت نشده است.</p> : <div className="ffos-payment-report">{payments.map((item) => <div key={item.label}><span>{item.label}</span><strong>{item.amount.toLocaleString("fa-IR")} تومان</strong></div>)}</div>}
    </section>
  </div>;
}
