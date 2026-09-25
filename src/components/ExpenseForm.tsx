import { useState } from "react";
import { CalendarDays, Check, CreditCard, Info, Wallet } from "lucide-react";
import { Calendar } from "./ui/calendar";
import { addExpense, updateExpense } from "../services/expenseService";
import { categories } from "../constants/categories";
import { paymentMethods } from "../constants/paymentMethods";
import { formatJalaliNumeric } from "../lib/jalali";
import type { Expense } from "../models/Expense";

type Props = { editingExpense?: Expense; onSaved: () => void; onCancel: () => void };
const persian = "۰۱۲۳۴۵۶۷۸۹";
const arabic = "٠١٢٣٤٥٦٧٨٩";
function normalizeDigits(value: string) {
  return value.replace(/[۰-۹]/g, (digit) => String(persian.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(arabic.indexOf(digit)));
}
function formatAmount(value: string) {
  const digits = normalizeDigits(value).replace(/\D/g, "");
  return digits ? Number(digits).toLocaleString("en-US") : "";
}
function dateKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
function dateValue(value?: string) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return new Date();
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}
export default function ExpenseForm({ editingExpense, onSaved, onCancel }: Props) {
  const [amount, setAmount] = useState(editingExpense ? formatAmount(String(editingExpense.amount)) : "");
  const [storeName, setStoreName] = useState(editingExpense?.storeName ?? "");
  const [category, setCategory] = useState(editingExpense?.category ?? categories[0]);
  const [date, setDate] = useState(dateValue(editingExpense?.date));
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(editingExpense?.paymentMethod ?? paymentMethods[0]);
  const [description, setDescription] = useState(editingExpense?.description ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving) return;
    const numericAmount = Number(amount.replace(/,/g, ""));
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) { setError("مبلغ معتبر وارد کنید."); return; }
    if (!storeName.trim()) { setError("نام فروشگاه یا محل هزینه را وارد کنید."); return; }
    setError(""); setSaving(true);
    const expense: Expense = {
      ...(editingExpense?.id === undefined ? {} : { id: editingExpense.id }),
      storeName: storeName.trim(), amount: numericAmount, category, paymentMethod,
      description: description.trim(), date: dateKey(date),
      createdAt: editingExpense?.createdAt ?? new Date().toISOString(), confirmed: true,
    };
    try {
      if (editingExpense) await updateExpense(expense);
      else await addExpense(expense);
      onSaved();
    } catch {
      setError("ذخیره هزینه انجام نشد. دوباره تلاش کنید.");
    } finally {
      setSaving(false);
    }
  }
  const featured = ["🍔 خوراک", "🛒 خرید", "🏠 خانه", "🚗 حمل‌ونقل", "💊 درمان", "📦 سایر"];
  const commonPayments = paymentMethods.slice(0, 2);
  return <form className="ffos-form" onSubmit={save} noValidate>
    <section className="ffos-form-section"><label className="ffos-form-label" htmlFor="expense-amount">مبلغ</label>
      <div className="ffos-amount-wrap"><input id="expense-amount" className="ffos-amount-input" type="text" inputMode="numeric" autoComplete="off" placeholder="۰" dir="ltr" value={amount} onChange={(event) => setAmount(formatAmount(event.target.value))} /><span>تومان</span></div></section>
    <section className="ffos-form-section"><label className="ffos-form-label" htmlFor="store-name">فروشگاه یا محل هزینه</label>
      <input id="store-name" value={storeName} onChange={(event) => setStoreName(event.target.value)} placeholder="مثلاً سوپرمارکت محله" autoComplete="off" /></section>
    <section className="ffos-form-section"><span className="ffos-form-label" id="category-label">دسته‌بندی</span>
      <div className="ffos-choice-grid" role="group" aria-labelledby="category-label">{featured.map((item) => <button type="button" key={item} className={`ffos-choice ${category === item ? "is-selected" : ""}`} aria-pressed={category === item} onClick={() => setCategory(item)}>{item}{category === item && <Check size={16} />}</button>)}</div>
      <label className="ffos-secondary-label" htmlFor="expense-category">همه دسته‌ها</label><select id="expense-category" value={category} onChange={(event) => setCategory(event.target.value)}>{categories.map((item) => <option key={item} value={item}>{item}</option>)}</select></section>
    <section className="ffos-form-section"><span className="ffos-form-label">تاریخ</span>
      <button className="ffos-date-trigger" type="button" aria-expanded={calendarOpen} onClick={() => setCalendarOpen((open) => !open)}><CalendarDays size={20} /><span>{formatJalaliNumeric(date)}</span></button>
      {calendarOpen && <div className="ffos-calendar"><Calendar value={date} onChange={(selected) => { setDate(selected); setCalendarOpen(false); }} /></div>}</section>
    <section className="ffos-form-section"><span className="ffos-form-label" id="payment-label">روش پرداخت</span>
      <div className="ffos-payment-row" role="group" aria-labelledby="payment-label">{commonPayments.map((item, index) => <button type="button" key={item} aria-pressed={paymentMethod === item} className={`ffos-choice ${paymentMethod === item ? "is-selected" : ""}`} onClick={() => setPaymentMethod(item)}>{index === 0 ? <CreditCard size={19} /> : <Wallet size={19} />}{item.replace(/^\S+\s/, "")}</button>)}</div>
      <label className="ffos-secondary-label" htmlFor="payment-method">روش‌های دیگر</label><select id="payment-method" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}>{paymentMethods.map((item) => <option key={item} value={item}>{item}</option>)}</select></section>
    <section className="ffos-form-section"><label className="ffos-form-label" htmlFor="expense-description">توضیحات <span className="ffos-optional">(اختیاری)</span></label><textarea id="expense-description" value={description} onChange={(event) => setDescription(event.target.value)} placeholder="برای یادآوری جزئیات این هزینه..." /></section>
    <p className="ffos-storage-note"><Info size={18} /> داده‌ها روی همین دستگاه ذخیره می‌شوند.</p>
    {error && <p className="ffos-error" role="alert">{error}</p>}
    <div className="ffos-form-actions"><button className="ffos-primary" type="submit" disabled={saving}>{saving ? "در حال ذخیره..." : editingExpense ? "ذخیره تغییرات" : "ذخیره هزینه"}</button><button className="ffos-secondary" type="button" onClick={onCancel}>انصراف</button></div>
  </form>;
}
