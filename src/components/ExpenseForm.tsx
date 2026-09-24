import { useEffect, useState } from "react";

import {
  addExpense,
  updateExpense,
} from "../services/expenseService";

import { categories } from "../constants/categories";
import { paymentMethods } from "../constants/paymentMethods";

import type { Expense } from "../models/Expense";

type ExpenseFormProps = {
  onExpenseAdded: () => void;
  editingExpense?: Expense;
  onFinishedEditing: () => void;
};

function getTodayDate() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function formatAmountInput(value: string) {
  const digitsOnly = value.replace(
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

function getNumericAmount(value: string) {
  return Number(
    value.replace(/,/g, "")
  );
}

export default function ExpenseForm({
  onExpenseAdded,
  editingExpense,
  onFinishedEditing,
}: ExpenseFormProps) {
  const [storeName, setStoreName] =
    useState("");

  const [amount, setAmount] =
    useState("");

  const [category, setCategory] =
    useState(categories[0]);

  const [
    paymentMethod,
    setPaymentMethod,
  ] = useState(paymentMethods[0]);

  const [
    description,
    setDescription,
  ] = useState("");

  const [date, setDate] =
    useState(getTodayDate());

  useEffect(() => {
    if (editingExpense) {
      setStoreName(
        editingExpense.storeName
      );

      setAmount(
        editingExpense.amount.toLocaleString(
          "en-US"
        )
      );

      setCategory(
        editingExpense.category
      );

      setPaymentMethod(
        editingExpense.paymentMethod
      );

      setDescription(
        editingExpense.description || ""
      );

      if (
        /^\d{4}-\d{2}-\d{2}$/.test(
          editingExpense.date
        )
      ) {
        setDate(
          editingExpense.date
        );
      } else {
        setDate(getTodayDate());
      }
    }
  }, [editingExpense]);

  function clearForm() {
    setStoreName("");
    setAmount("");
    setCategory(categories[0]);

    setPaymentMethod(
      paymentMethods[0]
    );

    setDescription("");
    setDate(getTodayDate());
  }

  function handleAmountChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const formattedValue =
      formatAmountInput(
        e.target.value
      );

    setAmount(formattedValue);
  }

  async function handleSubmit() {
    if (!storeName.trim()) {
      alert(
        "نام فروشگاه را وارد کنید."
      );

      return;
    }

    if (!amount.trim()) {
      alert("مبلغ را وارد کنید.");

      return;
    }

    const numericAmount =
      getNumericAmount(amount);

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

      amount: numericAmount,

      category,

      paymentMethod,

      description:
        description.trim(),

      date,

      createdAt:
        editingExpense?.createdAt ??
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

    alert("✅ هزینه ثبت شد.");

    clearForm();

    onExpenseAdded();
  }

  return (
    <div
      style={{
        marginTop: "20px",
        padding: "20px",
        border:
          "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <h2>
        {editingExpense
          ? "✏️ ویرایش هزینه"
          : "➕ ثبت هزینه جدید"}
      </h2>

      <div
        style={{
          marginBottom: "15px",
        }}
      >
        <label htmlFor="store-name">
          نام فروشگاه
        </label>

        <input
          id="store-name"
          value={storeName}
          onChange={(e) =>
            setStoreName(
              e.target.value
            )
          }
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "5px",
            boxSizing:
              "border-box",
          }}
        />
      </div>

      <div
        style={{
          marginBottom: "15px",
        }}
      >
        <label htmlFor="expense-amount">
          مبلغ (تومان)
        </label>

        <input
          id="expense-amount"
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={
            handleAmountChange
          }
          placeholder="مثلاً 1,250,000"
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "5px",
            boxSizing:
              "border-box",
            direction: "ltr",
            textAlign: "right",
          }}
        />
      </div>

      <div
        style={{
          marginBottom: "15px",
        }}
      >
        <label htmlFor="expense-date">
          📅 تاریخ هزینه
        </label>

        <input
          id="expense-date"
          type="date"
          value={date}
          onChange={(e) =>
            setDate(
              e.target.value
            )
          }
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "5px",
            boxSizing:
              "border-box",
          }}
        />
      </div>

      <div
        style={{
          marginBottom: "15px",
        }}
      >
        <label htmlFor="expense-category">
          دسته‌بندی
        </label>

        <select
          id="expense-category"
          value={category}
          onChange={(e) =>
            setCategory(
              e.target.value
            )
          }
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "5px",
            boxSizing:
              "border-box",
          }}
        >
          {categories.map(
            (item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            )
          )}
        </select>
      </div>

      <div
        style={{
          marginBottom: "15px",
        }}
      >
        <label htmlFor="payment-method">
          روش پرداخت
        </label>

        <select
          id="payment-method"
          value={paymentMethod}
          onChange={(e) =>
            setPaymentMethod(
              e.target.value
            )
          }
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "5px",
            boxSizing:
              "border-box",
          }}
        >
          {paymentMethods.map(
            (item) => (
              <option
                key={item}
                value={item}
              >
                {item}
              </option>
            )
          )}
        </select>
      </div>

      <div
        style={{
          marginBottom: "15px",
        }}
      >
        <label htmlFor="expense-description">
          توضیحات
        </label>

        <textarea
          id="expense-description"
          value={description}
          onChange={(e) =>
            setDescription(
              e.target.value
            )
          }
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "5px",
            boxSizing:
              "border-box",
          }}
        />
      </div>

      <button
        type="button"
        onClick={handleSubmit}
        style={{
          width: "100%",
          padding: "12px",
          cursor: "pointer",
        }}
      >
        {editingExpense
          ? "ذخیره تغییرات"
          : "ثبت هزینه"}
      </button>

      {editingExpense && (
        <button
          type="button"
          onClick={() => {
            clearForm();
            onFinishedEditing();
          }}
          style={{
            width: "100%",
            padding: "12px",
            marginTop: "10px",
            cursor: "pointer",
          }}
        >
          انصراف
        </button>
      )}
    </div>
  );
}
