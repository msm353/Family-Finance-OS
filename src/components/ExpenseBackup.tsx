import { useRef, useState } from "react";
import { Capacitor } from "@capacitor/core";
import { Directory, Encoding, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { clearExpenses } from "../services/expenseService";
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
      if (Capacitor.isNativePlatform()) {
        const path = `ffos-backup-${backup.exportedAt.replace(/[:.]/g, "-")}.json`;
        const file = await Filesystem.writeFile({
          path,
          data: JSON.stringify(backup, null, 2),
          directory: Directory.Cache,
          encoding: Encoding.UTF8,
        });
        await Share.share({
          title: "فایل پشتیبان FFOS",
          url: file.uri,
          dialogTitle: "ذخیره یا اشتراک فایل پشتیبان",
        });
        setMessage("فایل پشتیبان آماده شد. ذخیره‌شدن آن را در برنامهٔ انتخابی بررسی کنید.");
        return;
      }
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

  async function deleteAllData() {
    if (busy || currentCount === 0) return;
    const confirmed = window.confirm(
      `همهٔ ${currentCount} هزینهٔ ذخیره‌شده روی این دستگاه برای همیشه پاک می‌شوند. اگر می‌خواهید بعداً آن‌ها را برگردانید، ابتدا فایل پشتیبان JSON بگیرید. ادامه می‌دهید؟`
    );
    if (!confirmed) return;

    setBusy(true);
    setMessage("");
    try {
      await clearExpenses();
      setSelectedBackup(null);
      setFileName("");
      if (inputRef.current) inputRef.current.value = "";
      onRestored();
      setMessage("همهٔ هزینه‌ها از این دستگاه پاک شدند. اکنون می‌توانید داده‌های جدید وارد کنید.");
    } catch {
      setMessage("پاک‌کردن داده‌ها انجام نشد. دوباره تلاش کنید.");
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
      <div className="expense-delete-all">
        <h3>پاک‌کردن همهٔ داده‌ها</h3>
        <p>این کار همهٔ هزینه‌های ذخیره‌شده در این برنامه روی همین دستگاه را حذف می‌کند. برای نگه‌داشتن نسخه‌ای از آن‌ها، ابتدا فایل پشتیبان JSON بگیرید.</p>
        <button className="expense-button expense-button--danger" type="button" onClick={deleteAllData} disabled={busy || currentCount === 0}>پاک‌کردن همهٔ هزینه‌ها</button>
      </div>
      {message && <p className="expense-backup-message" role="status">{message}</p>}
    </section>
  );
}
