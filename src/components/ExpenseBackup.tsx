import { useRef, useState } from "react";
import {
  createExpenseBackup,
  parseExpenseBackup,
  restoreExpenseBackup,
  type ExpenseBackup as ExpenseBackupFile,
} from "../services/backupService";

type Props = {
  currentCount: number;
  onRestored: () => void;
};

export default function ExpenseBackup({ currentCount, onRestored }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedBackup, setSelectedBackup] = useState<ExpenseBackupFile | null>(null);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function downloadBackup() {
    setBusy(true);
    setMessage("");
    try {
      const backup = await createExpenseBackup();
      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `ffos-backup-${backup.exportedAt.slice(0, 10)}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setMessage(`پشتیبان شامل ${backup.expenses.length} هزینه آمادهٔ دانلود شد.`);
    } catch {
      setMessage("ساخت فایل پشتیبان انجام نشد. دوباره تلاش کنید.");
    } finally {
      setBusy(false);
    }
  }

  async function selectFile(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    setSelectedBackup(null);
    setFileName("");
    setMessage("");
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setMessage("حجم فایل پشتیبان نباید بیش از ۱۰ مگابایت باشد.");
      event.target.value = "";
      return;
    }

    try {
      const backup = parseExpenseBackup(await file.text());
      setSelectedBackup(backup);
      setFileName(file.name);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "خواندن فایل پشتیبان انجام نشد.");
      event.target.value = "";
    }
  }

  async function restoreBackup() {
    if (!selectedBackup || busy) return;
    const confirmed = window.confirm(
      `با بازیابی «${fileName}»، همهٔ ${currentCount} هزینهٔ فعلی حذف و ${selectedBackup.expenses.length} هزینهٔ فایل جایگزین می‌شوند. ادامه می‌دهید؟`
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage("");
    try {
      await restoreExpenseBackup(selectedBackup);
      setSelectedBackup(null);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      onRestored();
      setMessage("بازیابی با موفقیت انجام شد.");
    } catch {
      setMessage("بازیابی انجام نشد؛ داده‌های قبلی حفظ شدند.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="expense-panel" aria-labelledby="expense-backup-title">
      <h2 id="expense-backup-title">پشتیبان‌گیری و بازیابی</h2>
      <p className="expense-help">فایل پشتیبان شامل همهٔ هزینه‌هاست و برای بازیابی در همین برنامه استفاده می‌شود. آن را در جای امن نگه دارید.</p>
      <div className="expense-backup-actions">
        <button className="expense-button" type="button" onClick={downloadBackup} disabled={busy}>دریافت فایل پشتیبان</button>
        <div className="expense-field">
          <label htmlFor="expense-backup-file">انتخاب فایل پشتیبان JSON</label>
          <input ref={inputRef} id="expense-backup-file" type="file" accept=".json,application/json" onChange={selectFile} disabled={busy} />
        </div>
      </div>
      {selectedBackup && (
        <div className="expense-restore-preview">
          <p>فایل «{fileName}» شامل {selectedBackup.expenses.length} هزینه است. اکنون {currentCount} هزینه در برنامه دارید.</p>
          <p>بازیابی همهٔ هزینه‌های فعلی را جایگزین می‌کند.</p>
          <button className="expense-button expense-button--primary" type="button" onClick={restoreBackup} disabled={busy}>بازیابی داده‌ها</button>
        </div>
      )}
      {message && <p className="expense-backup-message" role="status">{message}</p>}
    </section>
  );
}
