import { useRef, useState } from "react";
import { clearExpenses } from "../services/expenseService";
import {
  getFinancialSnapshot,
  parseFinancialBackup,
  restoreFinancialBackup,
} from "../services/financialService";
import type { FinancialSnapshot } from "../models/Financial";
import {
  MigrationBlocked,
  type MigrationIssue,
} from "../lib/financialMigration";
import { downloadJson } from "../lib/backupFiles";
import LegacyCorrections from "./LegacyCorrections";
export default function ExpenseBackup({
  currentCount,
  onRestored,
}: {
  currentCount: number;
  onRestored: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selected, setSelected] = useState<FinancialSnapshot | null>(null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [raw, setRaw] = useState("");
  const [issues, setIssues] = useState<MigrationIssue[]>([]);
  const [legacy, setLegacy] = useState(false);
  async function download() {
    setBusy(true);
    setMessage("");
    try {
      setMessage(await downloadJson(await getFinancialSnapshot()));
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "پشتیبان آماده نشد.");
    } finally {
      setBusy(false);
    }
  }
  async function selectFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    setSelected(null);
    setIssues([]);
    setRaw("");
    setFileName("");
    setMessage("");
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) {
      setMessage("حجم فایل نباید بیش از ۱۰ مگابایت باشد.");
      e.target.value = "";
      return;
    }
    setBusy(true);
    try {
      const text = await file.text();
      setRaw(text);
      setFileName(file.name);
      const envelope = JSON.parse(text);
      setLegacy(envelope.format === "ffos-expenses");
      setSelected(parseFinancialBackup(text));
    } catch (error) {
      if (error instanceof MigrationBlocked) setIssues(error.issues);
      setMessage(
        error instanceof Error ? error.message : "خواندن فایل انجام نشد.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function restore() {
    if (!selected || busy) return;
    if (
      !window.confirm(
        `با بازیابی «${fileName}»، تمام حساب‌ها، تراکنش‌ها و تاریخچهٔ فعلی با فایل جایگزین می‌شوند.${legacy ? " فایل نسخهٔ قبلی فقط هزینه دارد؛ حساب‌های فعلی حفظ نمی‌شوند." : ""} ابتدا پشتیبان فعلی را نگه دارید. ادامه می‌دهید؟`,
      )
    )
      return;
    setBusy(true);
    try {
      await restoreFinancialBackup(selected);
      setSelected(null);
      setRaw("");
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      onRestored();
      setMessage("بازیابی کامل انجام شد.");
    } catch (e) {
      setMessage(
        e instanceof Error
          ? e.message
          : "بازیابی انجام نشد؛ دادهٔ قبلی حفظ شد.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function remove() {
    if (
      busy ||
      !currentCount ||
      !window.confirm(
        "همهٔ هزینه‌های فعال حذف شوند؟ حساب‌ها و درآمدها حفظ می‌شوند؛ هزینه‌ها در بخش حساب‌ها قابل بازگردانی هستند.",
      )
    )
      return;
    setBusy(true);
    try {
      await clearExpenses();
      onRestored();
      setMessage("هزینه‌ها حذف شدند و قابل بازگردانی هستند.");
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "حذف انجام نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="expense-panel">
      <h2>پشتیبان‌گیری و بازیابی</h2>
      <p className="expense-help">
        پشتیبان نسخهٔ ۲ شامل تمام حساب‌ها، تراکنش‌ها، حذف‌شده‌ها، تاریخچه و منبع
        هزینه‌های قبلی است. این فایل را خارج از برنامه نگه دارید. نسخه‌های قبلی
        برنامه نمی‌توانند آن را بازیابی کنند.
      </p>
      <div className="expense-backup-actions">
        <button
          className="expense-button"
          disabled={busy}
          onClick={() => void download()}
        >
          دریافت فایل پشتیبان
        </button>
        <div className="expense-field">
          <input
            className="ffos-hidden-file"
            ref={inputRef}
            id="expense-backup-file"
            type="file"
            accept=".json,application/json"
            onChange={selectFile}
            disabled={busy}
          />
          <label className="ffos-file-picker" htmlFor="expense-backup-file">
            {fileName || "انتخاب فایل از دستگاه"}
          </label>
        </div>
      </div>
      {issues.length > 0 && (
        <LegacyCorrections
          issues={issues}
          onApply={async (resolutions) => {
            setSelected(parseFinancialBackup(raw, resolutions));
            setIssues([]);
            setMessage(
              "اصلاح‌ها بررسی شدند؛ برای جایگزینی داده، بازیابی را تأیید کنید.",
            );
          }}
        />
      )}
      {selected && (
        <div className="expense-restore-preview">
          <p>
            فایل «{fileName}»: {selected.accounts.length} حساب،{" "}
            {selected.transactions.filter((t) => !t.deletedAt).length} تراکنش
            فعال، {selected.transactions.filter((t) => !!t.deletedAt).length}{" "}
            حذف‌شده.
          </p>
          <p>
            تمام داده‌های مالی فعلی جایگزین می‌شوند.
            {legacy &&
              " فایل قدیمی فقط هزینه دارد و حساب‌های فعلی را جایگزین می‌کند."}
          </p>
          <button
            className="expense-button expense-button--primary"
            disabled={busy}
            onClick={() => void restore()}
          >
            بازیابی داده‌ها
          </button>
        </div>
      )}
      <div className="expense-delete-all">
        <h3>حذف هزینه‌ها</h3>
        <p>
          فقط هزینه‌ها از گزارش و موجودی کنار گذاشته می‌شوند و در بخش حساب‌ها
          قابل بازگردانی‌اند.
        </p>
        <button
          className="expense-button expense-button--danger"
          disabled={busy || !currentCount}
          onClick={() => void remove()}
        >
          حذف همهٔ هزینه‌ها
        </button>
      </div>
      {message && (
        <p className="expense-backup-message" role="status">
          {message}
        </p>
      )}
    </section>
  );
}
