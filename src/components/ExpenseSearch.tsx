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
    <div className="expense-search">
      <label htmlFor="expense-search">جستجو در هزینه‌ها</label>
      <input id="expense-search" type="search" value={value} onChange={handleChange}
        placeholder="نام فروشگاه، دسته‌بندی یا توضیحات" />
    </div>
  );
}
