import { useEffect, useState } from "react";

import ExpenseForm from "../components/ExpenseForm";
import ExpenseList from "../components/ExpenseList";
import ExpenseSummary from "../components/ExpenseSummary";
import ExpenseSearch from "../components/ExpenseSearch";

import { categories } from "../constants/categories";
import { paymentMethods } from "../constants/paymentMethods";

import type { Expense } from "../models/Expense";
import { getExpenses } from "../services/expenseService";

type SortOption =
  | "newest"
  | "oldest"
  | "highest"
  | "lowest";

function hasSortableDate(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date);
}

function compareExpenseDates(
  a: Expense,
  b: Expense
) {
  const aHasDate = hasSortableDate(a.date);
  const bHasDate = hasSortableDate(b.date);

  if (aHasDate && bHasDate) {
    return a.date.localeCompare(b.date);
  }

  if (aHasDate && !bHasDate) {
    return 1;
  }

  if (!aHasDate && bHasDate) {
    return -1;
  }

  return (a.id ?? 0) - (b.id ?? 0);
}

export default function Home() {
  const [expenses, setExpenses] = useState<Expense[]>([]);

  const [editingExpense, setEditingExpense] =
    useState<Expense | undefined>(undefined);

  const [searchText, setSearchText] = useState("");

  const [selectedCategory, setSelectedCategory] =
    useState("همه");

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState("همه");

  const [sortOption, setSortOption] =
    useState<SortOption>("newest");

  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  async function loadExpenses() {
    const data = await getExpenses();
    setExpenses(data);
  }

  useEffect(() => {
    loadExpenses();
  }, []);

  function handleEdit(expense: Expense) {
    setEditingExpense(expense);
  }

  function handleFinishedEditing() {
    setEditingExpense(undefined);
    loadExpenses();
  }

  function handleSearch(value: string) {
    setSearchText(value);
  }

  function clearFilters() {
    setSearchText("");
    setSelectedCategory("همه");
    setSelectedPaymentMethod("همه");
    setFromDate("");
    setToDate("");
    setSortOption("newest");
  }

  const normalizedSearchText = searchText
    .trim()
    .toLowerCase();

  const filteredExpenses = expenses.filter(
    (expense) => {
      const matchesSearch =
        !normalizedSearchText ||
        expense.storeName
          .toLowerCase()
          .includes(normalizedSearchText) ||
        expense.category
          .toLowerCase()
          .includes(normalizedSearchText) ||
        expense.paymentMethod
          .toLowerCase()
          .includes(normalizedSearchText) ||
        (expense.description ?? "")
          .toLowerCase()
          .includes(normalizedSearchText);

      const matchesCategory =
        selectedCategory === "همه" ||
        expense.category === selectedCategory;

      const matchesPaymentMethod =
        selectedPaymentMethod === "همه" ||
        expense.paymentMethod === selectedPaymentMethod;

      const expenseHasDate =
        hasSortableDate(expense.date);

      const matchesFromDate =
        !fromDate ||
        (expenseHasDate &&
          expense.date >= fromDate);

      const matchesToDate =
        !toDate ||
        (expenseHasDate &&
          expense.date <= toDate);

      return (
        matchesSearch &&
        matchesCategory &&
        matchesPaymentMethod &&
        matchesFromDate &&
        matchesToDate
      );
    }
  );

  const sortedExpenses = [...filteredExpenses].sort(
    (a, b) => {
      switch (sortOption) {
        case "oldest":
          return compareExpenseDates(a, b);

        case "highest":
          return b.amount - a.amount;

        case "lowest":
          return a.amount - b.amount;

        case "newest":
        default:
          return compareExpenseDates(b, a);
      }
    }
  );

  return (
    <main
      style={{
        direction: "rtl",
        maxWidth: "700px",
        margin: "40px auto",
        padding: "20px",
        fontFamily: "sans-serif",
      }}
    >
      <h1>💰 Family Finance OS</h1>

      <p
        style={{
          color: "#666",
          marginBottom: "30px",
        }}
      >
        نسخه آزمایشی 0.1.0
      </p>

      <ExpenseSummary expenses={filteredExpenses} />

      <ExpenseSearch onSearch={handleSearch} />

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <div>
          <label
            htmlFor="category-filter"
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "bold",
            }}
          >
            🏷 دسته‌بندی
          </label>

          <select
            id="category-filter"
            value={selectedCategory}
            onChange={(e) =>
              setSelectedCategory(e.target.value)
            }
            style={{
              width: "100%",
              padding: "12px",
              boxSizing: "border-box",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          >
            <option value="همه">
              همه دسته‌بندی‌ها
            </option>

            {categories.map((category) => (
              <option
                key={category}
                value={category}
              >
                {category}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="payment-filter"
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "bold",
            }}
          >
            💳 روش پرداخت
          </label>

          <select
            id="payment-filter"
            value={selectedPaymentMethod}
            onChange={(e) =>
              setSelectedPaymentMethod(e.target.value)
            }
            style={{
              width: "100%",
              padding: "12px",
              boxSizing: "border-box",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          >
            <option value="همه">
              همه روش‌های پرداخت
            </option>

            {paymentMethods.map((method) => (
              <option
                key={method}
                value={method}
              >
                {method}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor="sort-expenses"
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "bold",
            }}
          >
            ↕️ مرتب‌سازی
          </label>

          <select
            id="sort-expenses"
            value={sortOption}
            onChange={(e) =>
              setSortOption(
                e.target.value as SortOption
              )
            }
            style={{
              width: "100%",
              padding: "12px",
              boxSizing: "border-box",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          >
            <option value="newest">
              جدیدترین تاریخ
            </option>

            <option value="oldest">
              قدیمی‌ترین تاریخ
            </option>

            <option value="highest">
              بیشترین مبلغ
            </option>

            <option value="lowest">
              کمترین مبلغ
            </option>
          </select>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "12px",
          marginBottom: "12px",
        }}
      >
        <div>
          <label
            htmlFor="from-date"
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "bold",
            }}
          >
            📅 از تاریخ
          </label>

          <input
            id="from-date"
            type="date"
            value={fromDate}
            onChange={(e) =>
              setFromDate(e.target.value)
            }
            style={{
              width: "100%",
              padding: "12px",
              boxSizing: "border-box",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          />
        </div>

        <div>
          <label
            htmlFor="to-date"
            style={{
              display: "block",
              marginBottom: "6px",
              fontWeight: "bold",
            }}
          >
            📅 تا تاریخ
          </label>

          <input
            id="to-date"
            type="date"
            value={toDate}
            min={fromDate || undefined}
            onChange={(e) =>
              setToDate(e.target.value)
            }
            style={{
              width: "100%",
              padding: "12px",
              boxSizing: "border-box",
              borderRadius: "8px",
              border: "1px solid #ddd",
            }}
          />
        </div>
      </div>

      <button
        type="button"
        onClick={clearFilters}
        style={{
          width: "100%",
          padding: "10px",
          marginBottom: "20px",
          cursor: "pointer",
        }}
      >
        ↩️ پاک کردن فیلترها
      </button>

      <ExpenseForm
        onExpenseAdded={loadExpenses}
        editingExpense={editingExpense}
        onFinishedEditing={handleFinishedEditing}
      />

      <ExpenseList
        expenses={sortedExpenses}
        onExpenseDeleted={loadExpenses}
        onExpenseEdit={handleEdit}
      />

      <hr
        style={{
          margin: "30px 0",
        }}
      />

      <h2>هدف پروژه</h2>

      <p>
        سیستم مدیریت مالی خانوادگی کاملاً آفلاین
      </p>
    </main>
  );
}
