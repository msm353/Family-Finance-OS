import { useState } from "react";

import { addExpense } from "../services/expenseService";
import { categories } from "../constants/categories";
import { paymentMethods } from "../constants/paymentMethods";

type ExpenseFormProps = {
  onExpenseAdded: () => void;
};

export default function ExpenseForm({
  onExpenseAdded,
}: ExpenseFormProps) {
  const [storeName, setStoreName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState(categories[0]);
  const [paymentMethod, setPaymentMethod] = useState(
    paymentMethods[0]
  );
  const [description, setDescription] = useState("");

  async function handleSubmit() {
    if (!storeName.trim()) {
      alert("نام فروشگاه را وارد کنید.");
      return;
    }

    if (!amount.trim()) {
      alert("مبلغ را وارد کنید.");
      return;
    }

    const ok = window.confirm(
      `ثبت هزینه؟

فروشگاه: ${storeName}

مبلغ: ${Number(amount).toLocaleString("fa-IR")} تومان`
    );

    if (!ok) return;

    await addExpense({
      storeName,
      amount: Number(amount),
      category,
      paymentMethod,
      description,
      date: new Date().toLocaleDateString("fa-IR"),
      createdAt: new Date().toISOString(),
      confirmed: true,
    });

    onExpenseAdded();

    alert("✅ هزینه ثبت شد.");

    setStoreName("");
    setAmount("");
    setCategory(categories[0]);
    setPaymentMethod(paymentMethods[0]);
    setDescription("");
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
      <div style={{ marginBottom: "15px" }}>
        <label>نام فروشگاه</label>

        <input
          type="text"
          value={storeName}
          onChange={(e) => setStoreName(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "5px",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>مبلغ (تومان)</label>

        <input
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "5px",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>دسته‌بندی</label>

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "5px",
          }}
        >
          {categories.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>روش پرداخت</label>

        <select
          value={paymentMethod}
          onChange={(e) => setPaymentMethod(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "5px",
          }}
        >
          {paymentMethods.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label>توضیحات</label>

        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          rows={3}
          style={{
            width: "100%",
            padding: "10px",
            marginTop: "5px",
            boxSizing: "border-box",
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
        ثبت هزینه
      </button>
    </div>
  );
}
