type ExpenseSearchProps = {
  value: string;
  onSearch: (value: string) => void;
};

export default function ExpenseSearch({
  value,
  onSearch,
}: ExpenseSearchProps) {
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    onSearch(e.target.value);
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
