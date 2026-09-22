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

export default function ExpenseForm({
  onExpenseAdded,
  editingExpense,
  onFinishedEditing,
}: ExpenseFormProps) {
  const [storeName, setStoreName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [paymentMethod, setPaymentMethod] =
    useState(paymentMethods[0]);
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (editingExpense) {
      setStoreName(editingExpense.storeName);
      setAmount(String(editingExpense.amount));
      setCategory(editingExpense.category);
      setPaymentMethod(editingExpense.paymentMethod);
      setDescription(editingExpense.description || "");
    }
  }, [editingExpense]);

  function clearForm() {
    setStoreName("");
    setAmount("");
    setCategory(categories[0]);
    setPaymentMethod(paymentMethods[0]);
    setDescription("");
  }

  async function handleSubmit() {
    if (!storeName.trim()) {
      alert("نام فروشگاه را وارد کنید.");
      return;
    }

    if (!amount.trim()) {
      alert("مبلغ را وارد کنید.");
      return;
    }

    const expenseData = {
      storeName,
      amount: Number(amount),
      category,
      paymentMethod,
      description,
      date:
        editingExpense?.date ??
        new Date().toLocaleDateString("fa-IR"),
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

      alert("✅ هزینه ویرایش شد.");

      clearForm();
      onFinishedEditing();

      return;
    }

    await addExpense(expenseData);

    alert("✅ هزینه ثبت شد.");

    clearForm();
    onExpenseAdded();
  }

  return (
    <div
      style={{
        marginTop: "20px",
        padding: "20px",
        border: "1px solid #ddd",
        borderRadius: "8px",
      }}
    >
      <h2>
        {editingExpense
          ? "✏️ ویرایش هزینه"
          : "➕ ثبت هزینه جدید"}
      </h2>

      <div style={{ marginBottom: "15px" }}>
        <label>نام فروشگاه</label>

        <input
          value={storeName}
          onChange={(e) =>
            setStoreName(e.target.value)
          }
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "5px",
          }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>مبلغ</label>

        <input
          type="number"
          value={amount}
          onChange={(e) =>
            setAmount(e.target.value)
          }
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "5px",
          }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>دسته‌بندی</label>

        <select
          value={category}
          onChange={(e) =>
            setCategory(e.target.value)
          }
          style={{
            width: "100%",
            padding: "10px",
          }}
        >
          {categories.map((item) => (
            <option key={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>روش پرداخت</label>

        <select
          value={paymentMethod}
          onChange={(e) =>
            setPaymentMethod(e.target.value)
          }
          style={{
            width: "100%",
            padding: "10px",
          }}
        >
          {paymentMethods.map((item) => (
            <option key={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>توضیحات</label>

        <textarea
          value={description}
          onChange={(e) =>
            setDescription(e.target.value)
          }
          style={{
            width: "100%",
            padding: "10px",
          }}
        />
      </div>

      <button
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
