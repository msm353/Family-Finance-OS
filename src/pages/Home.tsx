import ExpenseForm from "../components/ExpenseForm";

export default function Home() {
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

      <ExpenseForm />

      <hr
        style={{
          margin: "30px 0",
        }}
      />

      <h2>هدف پروژه</h2>

      <p>سیستم مدیریت مالی خانوادگی کاملاً آفلاین</p>

      <ul>
        <li>✅ ثبت هزینه</li>
        <li>🔄 گزارش‌ها (در حال توسعه)</li>
        <li>🔄 بودجه‌بندی (در حال توسعه)</li>
        <li>🔄 OCR فاکتور (نسخه‌های بعدی)</li>
      </ul>
    </main>
  );
}
