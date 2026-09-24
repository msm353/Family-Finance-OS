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

      return (
        matchesSearch &&
        matchesCategory &&
        matchesPaymentMethod
      );
    }
  );

  const sortedExpenses = [...filteredExpenses].sort(
    (a, b) => {
      switch (sortOption) {
        case "oldest":
          return (a.id ?? 0) - (b.id ?? 0);

        case "highest":
          return b.amount - a.amount;

        case "lowest":
          return a.amount - b.amount;

        case "newest":
        default:
          return (b.id ?? 0) - (a.id ?? 0);
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
          marginBottom: "20px",
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
              جدیدترین
            </option>

            <option value="oldest">
              قدیمی‌ترین
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
