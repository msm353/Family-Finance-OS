import { useState } from "react";

import { Calendar } from "./ui/calendar";

import {
  addExpense,
  updateExpense,
} from "../services/expenseService";

import { categories } from "../constants/categories";
import { paymentMethods } from "../constants/paymentMethods";

import { formatJalaliNumeric } from "../lib/jalali";

import type { Expense } from "../models/Expense";

type ExpenseFormProps = {
  onExpenseAdded: () => void;
  editingExpense?: Expense;
  onFinishedEditing: () => void;
};

function formatDateForStorage(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getTodayDate() {
  return formatDateForStorage(
    new Date()
  );
}

function parseStoredDate(value: string) {
  const match = value.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) {
    return new Date();
  }

  const [, year, month, day] =
    match;

  return new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );
}

function normalizeDigits(
  value: string
) {
  const persianDigits =
    "۰۱۲۳۴۵۶۷۸۹";

  const arabicDigits =
    "٠١٢٣٤٥٦٧٨٩";

  return value
    .replace(
      /[۰-۹]/g,
      (digit) =>
        String(
          persianDigits.indexOf(
            digit
          )
        )
    )
    .replace(
      /[٠-٩]/g,
      (digit) =>
        String(
          arabicDigits.indexOf(
            digit
          )
        )
    );
}

function formatAmountInput(
  value: string
) {
  const normalized =
    normalizeDigits(value);

  const digitsOnly =
    normalized.replace(
      /\D/g,
      ""
    );

  if (!digitsOnly) {
    return "";
  }

  return Number(
    digitsOnly
  ).toLocaleString("en-US");
}

function getNumericAmount(
  value: string
) {
  const normalized =
    normalizeDigits(value);

  return Number(
    normalized.replace(
      /,/g,
      ""
    )
  );
}

export default function ExpenseForm({
  onExpenseAdded,
  editingExpense,
  onFinishedEditing,
}: ExpenseFormProps) {
  const [storeName, setStoreName] =
    useState(editingExpense?.storeName ?? "");

  const [amount, setAmount] =
    useState(editingExpense ? editingExpense.amount.toLocaleString("en-US") : "");

  const [category, setCategory] =
    useState(editingExpense?.category ?? categories[0]);

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState(
    editingExpense?.paymentMethod ?? paymentMethods[0]
  );

  const [
    description,
    setDescription,
  ] = useState(editingExpense?.description ?? "");

  const [date, setDate] =
    useState(editingExpense && /^\d{4}-\d{2}-\d{2}$/.test(editingExpense.date)
      ? editingExpense.date
      : getTodayDate());

  const [
    isCalendarOpen,
    setIsCalendarOpen,
  ] = useState(false);

  function clearForm() {
    setStoreName("");
    setAmount("");

    setCategory(
      categories[0]
    );

    setPaymentMethod(
      paymentMethods[0]
    );

    setDescription("");

    setDate(
      getTodayDate()
    );

    setIsCalendarOpen(false);
  }

  function handleAmountChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const formattedValue =
      formatAmountInput(
        e.target.value
      );

    setAmount(
      formattedValue
    );
  }

  function handleDateChange(
    selectedDate: Date
  ) {
    setDate(
      formatDateForStorage(
        selectedDate
      )
    );

    setIsCalendarOpen(false);
  }

  async function handleSubmit() {
    if (!storeName.trim()) {
      alert(
        "نام فروشگاه را وارد کنید."
      );

      return;
    }

    if (!amount.trim()) {
      alert(
        "مبلغ را وارد کنید."
      );

      return;
    }

    const numericAmount =
      getNumericAmount(
        amount
      );

    if (
      !Number.isFinite(
        numericAmount
      ) ||
      numericAmount <= 0
    ) {
      alert(
        "مبلغ معتبر وارد کنید."
      );

      return;
    }

    if (!date) {
      alert(
        "تاریخ را انتخاب کنید."
      );

      return;
    }

    const expenseData = {
      storeName:
        storeName.trim(),

      amount:
        numericAmount,

      category,

      paymentMethod,

      description:
        description.trim(),

      date,

      createdAt:
        editingExpense
          ?.createdAt ??
        new Date().toISOString(),

      confirmed: true,
    };

    if (editingExpense) {
      await updateExpense({
        ...expenseData,
        id: editingExpense.id,
      });

      alert(
        "✅ هزینه ویرایش شد."
      );

      clearForm();

      onFinishedEditing();

      return;
    }

    await addExpense(
      expenseData
    );

    alert(
      "✅ هزینه ثبت شد."
    );

    clearForm();

    onExpenseAdded();
  }

  const selectedDate = parseStoredDate(date);

  return (
    <section className="expense-panel" aria-labelledby="expense-form-title">
      <h2 id="expense-form-title">{editingExpense ? "✏️ ویرایش هزینه" : "➕ ثبت هزینه جدید"}</h2>
      <div className="expense-fields">
        <div className="expense-field">
          <label htmlFor="store-name">نام فروشگاه</label>
          <input id="store-name" value={storeName} onChange={(e) => setStoreName(e.target.value)} />
        </div>
        <div className="expense-field">
          <label htmlFor="expense-amount">مبلغ (تومان)</label>
          <input id="expense-amount" type="text" inputMode="numeric" autoComplete="off"
            value={amount} onChange={handleAmountChange} placeholder="مثلاً 1,250,000"
            dir="ltr" style={{ textAlign: "right" }} />
        </div>
        <div className="expense-field">
          <label id="expense-date-label" htmlFor="expense-date">📅 تاریخ هزینه</label>
          <button id="expense-date" className="expense-date-trigger" type="button"
            aria-labelledby="expense-date-label expense-date" aria-expanded={isCalendarOpen}
            onClick={() => setIsCalendarOpen((current) => !current)}>
            {formatJalaliNumeric(selectedDate)}
          </button>
          {isCalendarOpen && <div className="expense-date-calendar">
            <Calendar value={selectedDate} onChange={handleDateChange} />
          </div>}
        </div>
        <div className="expense-field">
          <label htmlFor="expense-category">دسته‌بندی</label>
          <select id="expense-category" value={category} onChange={(e) => setCategory(e.target.value)}>
            {categories.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="expense-field">
          <label htmlFor="payment-method">روش پرداخت</label>
          <select id="payment-method" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)}>
            {paymentMethods.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
        </div>
        <div className="expense-field expense-field--wide">
          <label htmlFor="expense-description">توضیحات</label>
          <textarea id="expense-description" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </div>
      <div className="expense-form-actions">
        <button className="expense-button expense-button--primary" type="button" onClick={handleSubmit}>
          {editingExpense ? "ذخیره تغییرات" : "ثبت هزینه"}
        </button>
        {editingExpense && <button className="expense-button" type="button" onClick={() => {
          clearForm(); onFinishedEditing();
        }}>انصراف</button>}
      </div>
    </section>
  );
}
