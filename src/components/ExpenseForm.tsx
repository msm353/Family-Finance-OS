export default function ExpenseForm() {
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
        <label
          style={{
            display: "block",
            marginBottom: "5px",
          }}
        >
          نام فروشگاه
        </label>

        <input
          type="text"
          placeholder="مثلاً رفاه"
          style={{
            width: "100%",
            padding: "10px",
            boxSizing: "border-box",
          }}
        />
      </div>

      <div style={{ marginBottom: "15px" }}>
        <label
          style={{
            display: "block",
            marginBottom: "5px",
          }}
        >
          مبلغ (تومان)
        </label>

        <input
          type="number"
          placeholder="350000"
          style={{
            width: "100%",
            padding: "10px",
            boxSizing: "border-box",
          }}
        />
      </div>

      <button
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
