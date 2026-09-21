import { useState } from "react";
import { addExpense } from "../services/expenseService";

export default function ExpenseForm() {
  const [storeName, setStoreName] = useState("");
  const [amount, setAmount] = useState("");

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
      `آیا این هزینه ثبت شود؟

فروشگاه: ${storeName}

مبلغ: ${Number(amount).toLocaleString("fa-IR")} تومان`
    );

    if (!ok) return;

    await addExpense({
      storeName,
      amount: Number(amount),
      category: "سایر",
      paymentMethod: "کارت",
      description: "",
      date: new Date().toLocaleDateString("fa-IR"),
      createdAt: new Date().toISOString(),
      confirmed: true,
    });

    alert("✅ هزینه با موفقیت ذخیره شد.");

    setStoreName("");
    setAmount("");
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
          placeholder="مثلاً رفاه"
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
          placeholder="350000"
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
