import { useState } from "react";
import type { MigrationIssue } from "../lib/financialMigration";
import type { LegacyResolution } from "../models/Financial";
import { formatMoneyInput, parseMoneyInput } from "../lib/moneyInput";
import { normalizeExpenseDate } from "../lib/expenseDate";
export default function LegacyCorrections({
  issues,
  onApply,
}: {
  issues: MigrationIssue[];
  onApply: (values: Record<string, LegacyResolution>) => Promise<void>;
}) {
  const [values, setValues] = useState<
    Record<string, { amount: string; date: string; reason: string }>
  >({});
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  function change(
    id: number,
    key: "amount" | "date" | "reason",
    value: string,
  ) {
    setValues((prev) => ({
      ...prev,
      [id]: {
        ...(prev[id] ?? { amount: "", date: "", reason: "" }),
        [key]: value,
      },
    }));
  }
  async function apply() {
    try {
      const resolutions: Record<string, LegacyResolution> = {};
      for (const issue of issues) {
        const value = values[issue.expenseId];
        if (!value?.reason.trim())
          throw new Error("برای هر اصلاح دلیل وارد کنید.");
        const resolution: LegacyResolution = {
          reason: value.reason.trim(),
          approvedAt: new Date().toISOString(),
        };
        if (value.amount)
          resolution.amountMinor = parseMoneyInput(value.amount);
        if (value.date) {
          if (normalizeExpenseDate(value.date) !== value.date)
            throw new Error("تاریخ را به صورت YYYY-MM-DD میلادی وارد کنید.");
          resolution.date = value.date;
        }
        if (!value.amount && !value.date)
          throw new Error("مبلغ یا تاریخ اصلاح‌شده را وارد کنید.");
        resolutions[String(issue.expenseId)] = resolution;
      }
      if (
        !window.confirm(
          "اصلاح‌های واردشده را تأیید می‌کنید؟ مقدار اصلی همراه با دلیل اصلاح در پشتیبان حفظ خواهد شد.",
        )
      )
        return;
      setBusy(true);
      setError("");
      await onApply(resolutions);
    } catch (error) {
      setError(error instanceof Error ? error.message : "اصلاح انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="ffos-card">
      <h2>بررسی دادهٔ قدیمی</h2>
      <p>
        هیچ مبلغی خودکار گرد یا حذف نمی‌شود. مقادیر صحیح را از منبع خود وارد
        کنید.
      </p>
      {issues.map((issue) => (
        <div className="ffos-form-section" key={issue.expenseId}>
          <p>
            هزینهٔ {issue.expenseId}: مبلغ {String(issue.amount)}؛ تاریخ{" "}
            {issue.date}
          </p>
          <p>{issue.message}</p>
          <label>
            مبلغ صحیح تومان
            <input
              value={values[issue.expenseId]?.amount ?? ""}
              onChange={(e) =>
                change(
                  issue.expenseId,
                  "amount",
                  formatMoneyInput(e.target.value),
                )
              }
              dir="ltr"
              inputMode="numeric"
            />
          </label>
          <label>
            تاریخ اصلاح‌شده (میلادی؛ فقط در صورت نیاز)
            <input
              placeholder="YYYY-MM-DD"
              value={values[issue.expenseId]?.date ?? ""}
              onChange={(e) => change(issue.expenseId, "date", e.target.value)}
              dir="ltr"
            />
          </label>
          <label>
            دلیل اصلاح
            <input
              value={values[issue.expenseId]?.reason ?? ""}
              onChange={(e) =>
                change(issue.expenseId, "reason", e.target.value)
              }
            />
          </label>
        </div>
      ))}
      <button
        className="ffos-primary"
        disabled={busy}
        onClick={() => void apply()}
      >
        تأیید اصلاح‌های مشخص‌شده
      </button>
      {error && (
        <p className="ffos-error" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
