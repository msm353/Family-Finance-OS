import { useState } from "react";
import { CalendarDays, Pencil, Trash2 } from "lucide-react";
import type { Expense } from "../models/Expense";
import { deleteExpense } from "../services/expenseService";

type Props = { expenses: Expense[]; compact?: boolean; onExpenseDeleted: () => void; onExpenseEdit: (expense: Expense) => void };
function formatDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("fa-IR-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(year, month - 1, day));
}
export default function ExpenseList({ expenses, compact = false, onExpenseDeleted, onExpenseEdit }: Props) {
  const [error, setError] = useState("");
  async function remove(id: number) {
    if (!window.confirm("آیا از حذف این هزینه مطمئن هستید؟")) return;
    try { await deleteExpense(id); setError(""); onExpenseDeleted(); }
    catch { setError("حذف هزینه انجام نشد. دوباره تلاش کنید."); }
  }
  if (expenses.length === 0) return <div className="ffos-empty-card"><span aria-hidden="true">✦</span><h3>هنوز هزینه‌ای برای نمایش نیست</h3><p>هزینه‌ای ثبت کنید یا فیلترها را تغییر دهید.</p></div>;
  return <div className={`ffos-expense-list ${compact ? "is-compact" : ""}`}>
    {error && <p className="ffos-error" role="alert">{error}</p>}
    {expenses.map((expense) => <article className="ffos-expense-row" key={expense.id}>
      <div className="ffos-expense-icon" aria-hidden="true">{expense.category.split(" ")[0]}</div>
      <div className="ffos-expense-main"><strong>{expense.storeName}</strong><span>{expense.category.replace(/^\S+\s/, "")} · {expense.paymentMethod.replace(/^\S+\s/, "")}</span>
        {!compact && expense.description?.trim() && <p className="ffos-expense-description">{expense.description}</p>}</div>
      <div className="ffos-expense-meta"><strong>{expense.amount.toLocaleString("fa-IR")} <small>تومان</small></strong><span><CalendarDays size={13} /> {formatDate(expense.date)}</span></div>
      {!compact && <div className="ffos-expense-actions"><button type="button" onClick={() => onExpenseEdit(expense)} aria-label={`ویرایش ${expense.storeName}`}><Pencil size={16} /> ویرایش</button>
        <button type="button" className="is-danger" onClick={() => { if (expense.id !== undefined) void remove(expense.id); }} aria-label={`حذف ${expense.storeName}`}><Trash2 size={16} /> حذف</button></div>}
    </article>)}
  </div>;
}
