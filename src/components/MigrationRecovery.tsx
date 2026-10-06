import { useState } from "react";
import { legacyRecoveryBackup } from "../services/financialService";
import {
  MigrationBlocked,
  migrateLegacyExpenses,
  type MigrationIssue,
} from "../lib/financialMigration";
import { retryMigration } from "../database/financialDb";
import { downloadJson } from "../lib/backupFiles";
import LegacyCorrections from "./LegacyCorrections";
import type { Expense } from "../models/Expense";
export default function MigrationRecovery({
  error,
  onRecovered,
}: {
  error: string;
  onRecovered: () => Promise<void>;
}) {
  const [issues, setIssues] = useState<MigrationIssue[]>([]);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [originals, setOriginals] = useState<Expense[]>([]);
  async function exportOriginal() {
    setBusy(true);
    try {
      const backup = await legacyRecoveryBackup();
      setOriginals(backup.expenses);
      setMessage(await downloadJson(backup));
      try {
        migrateLegacyExpenses(backup.expenses);
      } catch (e) {
        if (e instanceof MigrationBlocked) setIssues(e.issues);
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "پشتیبان آماده نشد.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <main className="ffos-app" dir="rtl">
      <div className="ffos-shell">
        <h1>بارگذاری داده‌ها متوقف شد</h1>
        <p className="ffos-error">{error}</p>
        <p>
          ابتدا از دادهٔ قبلی پشتیبان بگیرید. بدون تأیید شما مبلغ یا تاریخ تغییر
          نمی‌کند.
        </p>
        <button
          className="ffos-primary"
          disabled={busy}
          onClick={() => void exportOriginal()}
        >
          دریافت پشتیبان اصلی و بررسی
        </button>
        <button
          className="ffos-secondary"
          disabled={busy}
          onClick={() => void onRecovered()}
        >
          تلاش دوباره
        </button>
        {message && <p role="status">{message}</p>}
        {issues.length > 0 && (
          <LegacyCorrections
            issues={issues}
            onApply={async (values) => {
              await retryMigration(values, originals);
              await onRecovered();
            }}
          />
        )}
      </div>
    </main>
  );
}
