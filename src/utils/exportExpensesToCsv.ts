import type { Expense } from "../models/Expense";

function escapeCsvValue(
  value: string | number
) {
  const text = String(value).replace(
    /"/g,
    '""'
  );

  return `"${text}"`;
}

function formatExpenseDateToPersian(
  date: string
) {
  const match = date.match(
    /^(\d{4})-(\d{2})-(\d{2})$/
  );

  if (!match) {
    return date;
  }

  const [, year, month, day] = match;

  const parsedDate = new Date(
    Number(year),
    Number(month) - 1,
    Number(day)
  );

  return new Intl.DateTimeFormat(
    "fa-IR-u-ca-persian",
    {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }
  ).format(parsedDate);
}

function createFileName() {
  const now = new Date();

  const year = now.getFullYear();

  const month = String(
    now.getMonth() + 1
  ).padStart(2, "0");

  const day = String(
    now.getDate()
  ).padStart(2, "0");

  return `ffos-expenses-${year}-${month}-${day}.csv`;
}

export function exportExpensesToCsv(
  expenses: Expense[]
) {
  if (expenses.length === 0) {
    alert(
      "هیچ هزینه‌ای برای خروجی گرفتن وجود ندارد."
    );

    return;
  }

  const headers = [
    "شناسه",
    "فروشگاه",
    "مبلغ (تومان)",
    "دسته‌بندی",
    "روش پرداخت",
    "توضیحات",
    "تاریخ شمسی",
  ];

  const rows = expenses.map(
    (expense) => [
      expense.id ?? "",
      expense.storeName,
      expense.amount,
      expense.category,
      expense.paymentMethod,
      expense.description ?? "",
      formatExpenseDateToPersian(
        expense.date
      ),
    ]
  );

  const csvContent = [
    headers,
    ...rows,
  ]
    .map((row) =>
      row
        .map((value) =>
          escapeCsvValue(value)
        )
        .join(",")
    )
    .join("\r\n");

  const blob = new Blob(
    ["\uFEFF", csvContent],
    {
      type: "text/csv;charset=utf-8;",
    }
  );

  const url =
    URL.createObjectURL(blob);

  const link =
    document.createElement("a");

  link.href = url;
  link.download = createFileName();

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
