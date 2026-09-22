import { useState } from "react";

type ExpenseSearchProps = {
  onSearch: (value: string) => void;
};

export default function ExpenseSearch({
  onSearch,
}: ExpenseSearchProps) {
  const [value, setValue] = useState("");

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const text = e.target.value;

    setValue(text);
    onSearch(text);
  }

  return (
    <div
      style={{
        marginTop: "20px",
        marginBottom: "20px",
      }}
    >
      <input
        type="text"
        value={value}
        onChange={handleChange}
        placeholder="🔍 جستجو در هزینه‌ها..."
        style={{
          width: "100%",
          padding: "12px",
          boxSizing: "border-box",
          borderRadius: "8px",
          border: "1px solid #ddd",
        }}
      />
    </div>
  );
}
