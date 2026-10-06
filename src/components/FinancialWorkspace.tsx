import { useState } from "react";
import type {
  Account,
  FinancialSnapshot,
  FinancialTransaction,
  FinancialRecord,
} from "../models/Financial";
import { formatCurrencyAmount } from "../lib/financialDisplay";
import { accountBalance } from "../lib/financialContract";
import { formatMoneyInput, localDay, parseMoneyInput } from "../lib/moneyInput";
import { formatJalaliNumeric } from "../lib/jalali";
import { Calendar } from "./ui/calendar";
import {
  saveAccount,
  saveFinancialTransaction,
  setAccountArchived,
  setTransactionDeleted,
  type TransactionDraft,
} from "../services/financialService";
type Props = {
  data: FinancialSnapshot;
  onChanged: () => Promise<void>;
  onExpenseEdit: (transaction: FinancialTransaction) => void;
};
const money = (amount: number) => amount.toLocaleString("fa-IR");
const label = {
  expense: "هزینه",
  income: "درآمد",
  transfer: "انتقال",
  adjustment: "اصلاح مانده",
};
export default function FinancialWorkspace({
  data,
  onChanged,
  onExpenseEdit,
}: Props) {
  const [form, setForm] = useState<"account" | "income" | "transfer" | null>(
    null,
  );
  const [editingAccount, setEditingAccount] = useState<Account>();
  const [editingTransaction, setEditingTransaction] =
    useState<FinancialTransaction>();
  const [deleted, setDeleted] = useState(false);
  const [historyId, setHistoryId] = useState<string>();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const today = localDay();
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError("");
    try {
      await action();
      await onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "عملیات انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  function start(next: "account" | "income" | "transfer") {
    setEditingAccount(undefined);
    setEditingTransaction(undefined);
    setForm(next);
  }
  if (form === "account")
    return (
      <AccountForm
        key={editingAccount?.id ?? "new"}
        account={editingAccount}
        onCancel={() => setForm(null)}
        onSaved={async () => {
          await onChanged();
          setForm(null);
        }}
      />
    );
  if (form === "income" || form === "transfer")
    return (
      <TransactionForm
        key={editingTransaction?.id ?? form}
        type={form}
        data={data}
        transaction={editingTransaction}
        onCancel={() => setForm(null)}
        onSaved={async () => {
          await onChanged();
          setForm(null);
        }}
      />
    );
  return (
    <>
      <div className="ffos-form-actions">
        <button className="ffos-primary" onClick={() => start("account")}>
          حساب جدید
        </button>
        <button className="ffos-secondary" onClick={() => start("income")}>
          ثبت درآمد
        </button>
        <button className="ffos-secondary" onClick={() => start("transfer")}>
          انتقال بین حساب‌ها
        </button>
      </div>
      <p className="ffos-muted">
        ماندهٔ آغازین، موجودی در ابتدای تاریخ انتخابی است. تراکنش‌های همان روز و
        بعد از آن به موجودی اضافه یا از آن کم می‌شوند. انتقال، هزینه یا درآمد
        محسوب نمی‌شود. ثبت و ویرایش مالی در این نسخه به تومان است؛ دادهٔ ارزهای
        دیگر فقط نمایش داده می‌شود.
      </p>
      <section className="ffos-section">
        <h2>حساب‌ها · موجودی تا امروز</h2>
        {!data.accounts.length && (
          <p className="ffos-empty">
            حساب بانکی، نقدی یا کیف پول خود را با ماندهٔ آغازین بسازید.
          </p>
        )}
        {data.accounts.map((account) => (
          <article className="ffos-card ffos-financial-row" key={account.id}>
            <h3>
              {account.name}
              {account.archivedAt && " · بایگانی"}
            </h3>
            <p>
              {account.openingDate > today
                ? "تاریخ آغاز حساب هنوز نرسیده است"
                : formatCurrencyAmount(
                    data,
                    account.currencyId,
                    accountBalance(data, account.id, today),
                  )}
            </p>
            <p className="ffos-muted">
              ماندهٔ آغازین:{" "}
              {formatCurrencyAmount(
                data,
                account.currencyId,
                account.openingBalanceMinor,
              )}{" "}
              · {formatDay(account.openingDate)}
            </p>
            <div className="ffos-form-actions">
              <button
                className="ffos-secondary"
                disabled={
                  busy ||
                  !!account.archivedAt ||
                  account.currencyId !== "ffos:toman"
                }
                onClick={() => {
                  setEditingAccount(account);
                  setForm("account");
                }}
              >
                ویرایش
              </button>
              <button
                className="ffos-secondary"
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    setAccountArchived(
                      account.id,
                      !account.archivedAt,
                      account.revision,
                    ),
                  )
                }
              >
                {account.archivedAt ? "فعال‌سازی" : "بایگانی"}
              </button>
              <button
                className="ffos-text-button"
                onClick={() =>
                  setHistoryId(
                    historyId === account.id ? undefined : account.id,
                  )
                }
              >
                تاریخچه
              </button>
            </div>
            {historyId === account.id && (
              <History data={data} id={account.id} />
            )}
          </article>
        ))}
      </section>
      <section className="ffos-section">
        <div className="ffos-section-title">
          <h2>همهٔ تراکنش‌ها</h2>
          <label>
            <input
              type="checkbox"
              checked={deleted}
              onChange={(e) => setDeleted(e.target.checked)}
            />{" "}
            نمایش حذف‌شده‌ها
          </label>
        </div>
        {data.transactions
          .filter((tx) => deleted || !tx.deletedAt)
          .sort(
            (a, b) =>
              b.date.localeCompare(a.date) ||
              b.createdAt.localeCompare(a.createdAt),
          )
          .map((tx) => (
            <article className="ffos-card ffos-financial-row" key={tx.id}>
              <h3>
                {label[tx.type]} · {tx.title || "بین حساب‌ها"}
                {tx.deletedAt && " · حذف‌شده"}
              </h3>
              <p>
                {formatCurrencyAmount(
                  data,
                  tx.type === "transfer" ? tx.fromCurrencyId : tx.currencyId,
                  tx.type === "transfer" ? tx.fromAmountMinor : tx.amountMinor,
                )}{" "}
                · {formatDay(tx.date)}
              </p>
              <p className="ffos-muted">
                {tx.type === "transfer"
                  ? `${accountName(data, tx.fromAccountId)} ← ${accountName(data, tx.toAccountId)}`
                  : accountName(data, tx.accountId)}
              </p>
              {tx.description && <p>{tx.description}</p>}
              <div className="ffos-form-actions">
                {!tx.deletedAt &&
                  tx.type !== "adjustment" &&
                  (tx.type === "transfer"
                    ? tx.fromCurrencyId
                    : tx.currencyId) === "ffos:toman" && (
                    <button
                      className="ffos-secondary"
                      disabled={busy}
                      onClick={() => {
                        if (tx.type === "expense") onExpenseEdit(tx);
                        else {
                          setEditingTransaction(tx);
                          setForm(tx.type as "income" | "transfer");
                        }
                      }}
                    >
                      ویرایش
                    </button>
                  )}
                <button
                  className="ffos-secondary"
                  disabled={busy}
                  onClick={() => {
                    if (
                      window.confirm(
                        tx.deletedAt
                          ? "این تراکنش بازگردانده شود؟"
                          : "تراکنش حذف شود؟ از موجودی و گزارش کنار گذاشته می‌شود و قابل بازگردانی است.",
                      )
                    )
                      void run(() =>
                        setTransactionDeleted(
                          tx.id,
                          !tx.deletedAt,
                          tx.revision,
                        ),
                      );
                  }}
                >
                  {tx.deletedAt ? "بازگردانی" : "حذف"}
                </button>
                <button
                  className="ffos-text-button"
                  onClick={() =>
                    setHistoryId(historyId === tx.id ? undefined : tx.id)
                  }
                >
                  تاریخچه
                </button>
              </div>
              {historyId === tx.id && <History data={data} id={tx.id} />}
            </article>
          ))}
        {!data.transactions.length && (
          <p className="ffos-empty">هنوز تراکنشی ندارید.</p>
        )}
      </section>
      {error && (
        <p className="ffos-error" role="alert">
          {error}
        </p>
      )}
    </>
  );
}
function accountName(data: FinancialSnapshot, id: string | null) {
  return id
    ? (data.accounts.find((a) => a.id === id)?.name ?? "حساب ناموجود")
    : "هزینهٔ قدیمی بدون حساب";
}
function formatDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return formatJalaliNumeric(new Date(y, m - 1, d));
}
function describeRecord(data: FinancialSnapshot, record: FinancialRecord) {
  if ("openingBalanceMinor" in record)
    return `${record.name} · ماندهٔ آغازین ${money(record.openingBalanceMinor)} · ${formatDay(record.openingDate)}`;
  if ("date" in record)
    return `${label[record.type]} · ${record.title} · ${money(record.type === "transfer" ? record.fromAmountMinor : record.amountMinor)} · ${formatDay(record.date)} · ${record.type === "transfer" ? `${accountName(data, record.fromAccountId)} ← ${accountName(data, record.toAccountId)}` : accountName(data, record.accountId)}${record.description ? ` · ${record.description}` : ""}`;
  return record.name;
}
function History({ data, id }: { data: FinancialSnapshot; id: string }) {
  const names = {
    create: "ایجاد",
    migrate: "انتقال از نسخهٔ قبلی",
    update: "ویرایش",
    delete: "حذف",
    restore: "بازگردانی",
    archive: "بایگانی",
    unarchive: "فعال‌سازی",
    "opening-change": "تغییر ماندهٔ آغازین",
  };
  return (
    <ol>
      {data.history
        .filter((e) => e.entityId === id)
        .sort((a, b) => b.revision - a.revision)
        .map((e) => (
          <li key={e.id}>
            {names[e.action]} · {new Date(e.occurredAt).toLocaleString("fa-IR")}
            <details>
              <summary>جزئیات تغییر</summary>
              {e.before && <p>قبل: {describeRecord(data, e.before.record)}</p>}
              <p>بعد: {describeRecord(data, e.after.record)}</p>
            </details>
          </li>
        ))}
    </ol>
  );
}
function DateField({
  value,
  onChange,
}: {
  value: Date;
  onChange: (value: Date) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <section className="ffos-form-section">
      <span className="ffos-form-label">تاریخ</span>
      <button
        className="ffos-date-trigger"
        type="button"
        onClick={() => setOpen(!open)}
      >
        {formatJalaliNumeric(value)}
      </button>
      {open && (
        <Calendar
          value={value}
          onChange={(date) => {
            onChange(date);
            setOpen(false);
          }}
        />
      )}
    </section>
  );
}
function dateValue(day?: string) {
  if (!day) return new Date();
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d);
}
function AccountForm({
  account,
  onSaved,
  onCancel,
}: {
  account?: Account;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const [name, setName] = useState(account?.name ?? "");
  const [type, setType] = useState<Account["type"]>(account?.type ?? "bank");
  const [amount, setAmount] = useState(
    formatMoneyInput(String(account?.openingBalanceMinor ?? 0)),
  );
  const [date, setDate] = useState(dateValue(account?.openingDate));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    try {
      const openingBalanceMinor = parseMoneyInput(amount, true);
      if (
        account &&
        (openingBalanceMinor !== account.openingBalanceMinor ||
          localDay(date) !== account.openingDate) &&
        !window.confirm(
          "تغییر مانده یا تاریخ آغازین، موجودی حساب را دوباره محاسبه می‌کند. تأیید می‌کنید؟",
        )
      )
        return;
      setBusy(true);
      await saveAccount({
        id: account?.id,
        revision: account?.revision,
        name,
        type,
        openingBalanceMinor,
        openingDate: localDay(date),
      });
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="ffos-form" onSubmit={save}>
      <h2>{account ? "ویرایش حساب" : "حساب جدید"}</h2>
      <label>
        نام حساب
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
      </label>
      <label>
        نوع حساب
        <select
          value={type}
          onChange={(e) => setType(e.target.value as Account["type"])}
        >
          <option value="bank">بانکی</option>
          <option value="cash">نقدی</option>
          <option value="wallet">کیف پول</option>
        </select>
      </label>
      <label>
        ماندهٔ آغازین (
        {account?.currencyId && account.currencyId !== "ffos:toman"
          ? account.currencyId
          : "تومان"}
        )
        <input
          value={amount}
          onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
          inputMode="text"
          dir="ltr"
        />
      </label>
      <p className="ffos-muted">
        عدد منفی برای بدهی مجاز است. موجودی را در ابتدای تاریخ زیر وارد کنید؛
        هزینه‌های قبلی بدون حساب باقی می‌مانند.
      </p>
      <DateField value={date} onChange={setDate} />
      {error && (
        <p className="ffos-error" role="alert">
          {error}
        </p>
      )}
      <div className="ffos-form-actions">
        <button className="ffos-primary" disabled={busy}>
          ذخیره حساب
        </button>
        <button className="ffos-secondary" type="button" onClick={onCancel}>
          انصراف
        </button>
      </div>
    </form>
  );
}
function TransactionForm({
  type,
  data,
  transaction: tx,
  onSaved,
  onCancel,
}: {
  type: "income" | "transfer";
  data: FinancialSnapshot;
  transaction?: FinancialTransaction;
  onSaved: () => Promise<void>;
  onCancel: () => void;
}) {
  const active = data.accounts.filter(
    (a) => !a.archivedAt && a.currencyId === "ffos:toman",
  );
  const [accountId, setAccountId] = useState(
    tx
      ? tx.type === "transfer"
        ? tx.fromAccountId
        : (tx.accountId ?? "")
      : (active[0]?.id ?? ""),
  );
  const [toAccountId, setToAccountId] = useState(
    tx?.type === "transfer" ? tx.toAccountId : (active[1]?.id ?? ""),
  );
  const [amount, setAmount] = useState(
    tx
      ? formatMoneyInput(
          String(tx.type === "transfer" ? tx.fromAmountMinor : tx.amountMinor),
        )
      : "",
  );
  const [title, setTitle] = useState(tx?.title ?? "");
  const [description, setDescription] = useState(tx?.description ?? "");
  const [date, setDate] = useState(dateValue(tx?.date));
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    try {
      const draft: TransactionDraft = {
        id: tx?.id,
        revision: tx?.revision,
        type,
        date: localDay(date),
        title:
          type === "transfer" ? title || "انتقال بین حساب‌ها" : title.trim(),
        amountMinor: parseMoneyInput(amount),
        accountId,
        toAccountId,
        description: description.trim(),
        confirmed: tx?.confirmed,
      };
      setBusy(true);
      await saveFinancialTransaction(draft);
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "ذخیره انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  const select = (id: string, set: (value: string) => void, label: string) => (
    <label>
      {label}
      <select value={id} onChange={(e) => set(e.target.value)}>
        <option value="">انتخاب حساب</option>
        {active.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
    </label>
  );
  return (
    <form className="ffos-form" onSubmit={save}>
      <h2>
        {tx ? "ویرایش" : "ثبت"} {label[type]}
      </h2>
      {select(
        accountId,
        setAccountId,
        type === "transfer" ? "حساب مبدأ" : "حساب دریافت",
      )}
      {type === "transfer" && select(toAccountId, setToAccountId, "حساب مقصد")}
      <label>
        مبلغ (
        {data.currencies.find(
          (c) =>
            c.id === data.accounts.find((a) => a.id === accountId)?.currencyId,
        )?.name ?? "تومان"}
        )
        <input
          inputMode="numeric"
          dir="ltr"
          value={amount}
          onChange={(e) => setAmount(formatMoneyInput(e.target.value))}
        />
      </label>
      <label>
        {type === "income" ? "عنوان یا منبع درآمد" : "عنوان (اختیاری)"}
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required={type === "income"}
        />
      </label>
      <DateField value={date} onChange={setDate} />
      <label>
        توضیحات
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </label>
      {active.length < (type === "transfer" ? 2 : 1) && (
        <p>ابتدا {type === "transfer" ? "دو حساب" : "یک حساب"} فعال بسازید.</p>
      )}
      {error && (
        <p className="ffos-error" role="alert">
          {error}
        </p>
      )}
      <div className="ffos-form-actions">
        <button className="ffos-primary" disabled={busy}>
          ذخیره {label[type]}
        </button>
        <button className="ffos-secondary" type="button" onClick={onCancel}>
          انصراف
        </button>
      </div>
    </form>
  );
}
