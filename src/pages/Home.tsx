import "../expense-ui.css";
import { useEffect, useState } from "react";

import ExpenseForm from "../components/ExpenseForm";
import ExpenseBackup from "../components/ExpenseBackup";
import ExpenseList from "../components/ExpenseList";
import ExpenseReports from "../components/ExpenseReports";
import PwaStatus from "../components/PwaStatus";
import ExpenseSearch from "../components/ExpenseSearch";
import ExpenseSummary from "../components/ExpenseSummary";

import {
  DateRangePicker,
  type DateRange,
} from "../components/ui/date-range-picker";

import { categories } from "../constants/categories";
import { paymentMethods } from "../constants/paymentMethods";

import type { Expense } from "../models/Expense";

import { getExpenses } from "../services/expenseService";

import { exportExpensesToCsv } from "../utils/exportExpensesToCsv";

type SortOption =
  | "newest"
  | "oldest"
  | "highest"
  | "lowest";

const EMPTY_DATE_RANGE: DateRange = {
  from: null,
  to: null,
};

function hasSortableDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function formatLocalDate(date: Date) {
  const year = date.getFullYear();

  const month = String(
    date.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    date.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function startOfDay(date: Date) {
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
}

function compareExpenseDates(
  a: Expense,
  b: Expense
) {
  const aHasDate =
    hasSortableDate(a.date);

  const bHasDate =
    hasSortableDate(b.date);

  if (
    aHasDate &&
    bHasDate
  ) {
    return a.date.localeCompare(
      b.date
    );
  }

  if (
    aHasDate &&
    !bHasDate
  ) {
    return 1;
  }

  if (
    !aHasDate &&
    bHasDate
  ) {
    return -1;
  }

  return (
    (a.id ?? 0) -
    (b.id ?? 0)
  );
}

export default function Home() {
  const [
    expenses,
    setExpenses,
  ] = useState<Expense[]>([]);

  const [
    editingExpense,
    setEditingExpense,
  ] = useState<
    Expense | undefined
  >(undefined);

  const [restoreGeneration, setRestoreGeneration] = useState(0);

  const [
    searchText,
    setSearchText,
  ] = useState("");

  const [
    selectedCategory,
    setSelectedCategory,
  ] = useState("همه");

  const [
    selectedPaymentMethod,
    setSelectedPaymentMethod,
  ] = useState("همه");

  const [
    sortOption,
    setSortOption,
  ] =
    useState<SortOption>(
      "newest"
    );

  const [
    dateRange,
    setDateRange,
  ] =
    useState<DateRange>(
      EMPTY_DATE_RANGE
    );

  async function loadExpenses() {
    const data =
      await getExpenses();

    setExpenses(data);
  }

  useEffect(() => {
    let active = true;
    getExpenses().then((data) => {
      if (active) setExpenses(data);
    }).catch((error) => {
      console.error("بارگذاری هزینه‌ها انجام نشد.", error);
    });
    return () => { active = false; };
  }, []);

  function handleEdit(
    expense: Expense
  ) {
    setEditingExpense(
      expense
    );
  }

  function handleFinishedEditing() {
    setEditingExpense(
      undefined
    );

    loadExpenses();
  }

  function handleRestored() {
    setEditingExpense(undefined);
    setRestoreGeneration((current) => current + 1);
    clearFilters();
    loadExpenses();
  }

  function handleSearch(
    value: string
  ) {
    setSearchText(value);
  }

  function filterToday() {
    const today =
      startOfDay(
        new Date()
      );

    setDateRange({
      from: today,
      to: today,
    });
  }

  function setQuickDateRange(
    days: number
  ) {
    const today =
      startOfDay(
        new Date()
      );

    const start =
      new Date(today);

    start.setDate(
      start.getDate() -
        (days - 1)
    );

    setDateRange({
      from: start,
      to: today,
    });
  }

  function clearFilters() {
    setSearchText("");

    setSelectedCategory(
      "همه"
    );

    setSelectedPaymentMethod(
      "همه"
    );

    setSortOption(
      "newest"
    );

    setDateRange({
      from: null,
      to: null,
    });
  }

  const fromDate =
    dateRange.from
      ? formatLocalDate(
          dateRange.from
        )
      : "";

  const toDate =
    dateRange.to
      ? formatLocalDate(
          dateRange.to
        )
      : "";

  const normalizedSearchText =
    searchText
      .trim()
      .toLowerCase();

  const filteredExpenses =
    expenses.filter(
      (expense) => {
        const matchesSearch =
          !normalizedSearchText ||
          expense.storeName
            .toLowerCase()
            .includes(
              normalizedSearchText
            ) ||
          expense.category
            .toLowerCase()
            .includes(
              normalizedSearchText
            ) ||
          expense.paymentMethod
            .toLowerCase()
            .includes(
              normalizedSearchText
            ) ||
          (
            expense.description ??
            ""
          )
            .toLowerCase()
            .includes(
              normalizedSearchText
            );

        const matchesCategory =
          selectedCategory ===
            "همه" ||
          expense.category ===
            selectedCategory;

        const matchesPaymentMethod =
          selectedPaymentMethod ===
            "همه" ||
          expense.paymentMethod ===
            selectedPaymentMethod;

        const expenseHasDate =
          hasSortableDate(
            expense.date
          );

        const matchesFromDate =
          !fromDate ||
          (
            expenseHasDate &&
            expense.date >=
              fromDate
          );

        const matchesToDate =
          !toDate ||
          (
            expenseHasDate &&
            expense.date <=
              toDate
          );

        return (
          matchesSearch &&
          matchesCategory &&
          matchesPaymentMethod &&
          matchesFromDate &&
          matchesToDate
        );
      }
    );

  const sortedExpenses = [
    ...filteredExpenses,
  ].sort(
    (a, b) => {
      switch (
        sortOption
      ) {
        case "oldest":
          return compareExpenseDates(
            a,
            b
          );

        case "highest":
          return (
            b.amount -
            a.amount
          );

        case "lowest":
          return (
            a.amount -
            b.amount
          );

        case "newest":
        default:
          return compareExpenseDates(
            b,
            a
          );
      }
    }
  );

  return (
    <main className="expense-app" dir="rtl">
      <h1>💰 Family Finance OS</h1>
      <p className="expense-subtitle">نسخه آزمایشی 0.1.0-beta</p>
      <PwaStatus />

      <ExpenseSummary expenses={filteredExpenses} />
      <section className="expense-panel" aria-labelledby="expense-filter-title">
        <h2 id="expense-filter-title">فیلتر و جستجو</h2>
        <ExpenseSearch value={searchText} onSearch={handleSearch} />
        <div className="expense-filter-grid">
          <div className="expense-field">
            <label htmlFor="category-filter">🗂️ دسته‌بندی</label>
            <select id="category-filter" value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}>
              <option value="همه">همه دسته‌بندی‌ها</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </div>
          <div className="expense-field">
            <label htmlFor="payment-filter">💳 روش پرداخت</label>
            <select id="payment-filter" value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}>
              <option value="همه">همه روش‌های پرداخت</option>
              {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
            </select>
          </div>
          <div className="expense-field">
            <label htmlFor="sort-expenses">↕️ مرتب‌سازی</label>
            <select id="sort-expenses" value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}>
              <option value="newest">جدیدترین تاریخ</option>
              <option value="oldest">قدیمی‌ترین تاریخ</option>
              <option value="highest">بیشترین مبلغ</option>
              <option value="lowest">کمترین مبلغ</option>
            </select>
          </div>
        </div>
        <div className="expense-field expense-range">
          <label>📅 بازه تاریخ</label>
          <DateRangePicker value={dateRange} onChange={setDateRange} months={2}
            placeholder="انتخاب بازه تاریخ" />
        </div>
        <div className="expense-presets">
          <button className="expense-button" type="button" onClick={filterToday}>امروز</button>
          <button className="expense-button" type="button" onClick={() => setQuickDateRange(7)}>۷ روز اخیر</button>
          <button className="expense-button" type="button" onClick={() => setQuickDateRange(30)}>۳۰ روز اخیر</button>
        </div>
        <div className="expense-filter-actions">
          <button className="expense-button" type="button" onClick={clearFilters}>↩️ پاک کردن فیلترها</button>
          <button className="expense-button" type="button" onClick={() => exportExpensesToCsv(sortedExpenses)}>📤 خروجی CSV</button>
        </div>
      </section>

      <ExpenseReports expenses={filteredExpenses} />
      <ExpenseForm key={`${restoreGeneration}-${editingExpense?.id ?? "new"}`} onExpenseAdded={loadExpenses} editingExpense={editingExpense}
        onFinishedEditing={handleFinishedEditing} />
      <ExpenseList expenses={sortedExpenses} onExpenseDeleted={loadExpenses} onExpenseEdit={handleEdit} />
      <ExpenseBackup currentCount={expenses.length} onRestored={handleRestored} />
      <hr />
      <h2>هدف پروژه</h2>
      <p>سیستم مدیریت مالی خانوادگی کاملاً آفلاین</p>
    </main>
  );
}
