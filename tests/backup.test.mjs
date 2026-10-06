import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { normalizeExpenseDate } from "../src/lib/expenseDate.ts";
import { makeExpenseBackup, parseExpenseBackup } from "../src/lib/expenseBackupFormat.ts";

const exportedAt = "2026-09-28T10:00:00.000Z";
const oldExpense = {
  id: 7,
  storeName: "فروشگاه",
  amount: 125000,
  category: "خوراک",
  paymentMethod: "کارت",
  date: "۱۴۰۳/۱/۱",
  createdAt: "2024-03-20T10:00:00.000Z",
  confirmed: true,
};

test("legacy Jalali dates normalize to a valid Gregorian day", () => {
  assert.equal(normalizeExpenseDate("۱۴۰۳/۱/۱"), "2024-03-20");
  assert.equal(normalizeExpenseDate("١٤٠٣/٠١/٠١"), "2024-03-20");
  assert.equal(normalizeExpenseDate("۲۰۲۴-۰۳-۲۰"), "2024-03-20");
  assert.equal(normalizeExpenseDate("۱۴۰۲/۱۲/۳۰"), null);
  assert.equal(normalizeExpenseDate("2024-02-30"), null);
});

test("a version 1 backup with a legacy date can be restored and exported again", () => {
  const oldBackup = JSON.stringify({
    format: "ffos-expenses",
    version: 1,
    exportedAt,
    expenses: [oldExpense],
  });
  const parsed = parseExpenseBackup(oldBackup);
  assert.equal(parsed.expenses[0].date, "2024-03-20");

  const exported = makeExpenseBackup([oldExpense], exportedAt);
  assert.equal(exported.expenses[0].date, "2024-03-20");
  assert.equal(oldExpense.date, "۱۴۰۳/۱/۱");
  assert.deepEqual(parseExpenseBackup(JSON.stringify(exported)), exported);
});

test("invalid dates and duplicate identifiers reject the whole backup", () => {
  assert.throws(() => makeExpenseBackup([{ ...oldExpense, date: "۱۴۰۲/۱۲/۳۰" }], exportedAt));
  assert.throws(() => makeExpenseBackup([oldExpense, { ...oldExpense }], exportedAt));
});

test("legacy version 1 amounts remain unchanged, including values incompatible with future integer storage", () => {
  const source = readFileSync(new URL("./fixtures/backup-browser/legacy-amounts-v1.json", import.meta.url), "utf8");
  const parsed = parseExpenseBackup(source);
  assert.deepEqual(parsed.expenses.map(({ amount }) => amount), [1.5, 9007199254740992]);
  assert.equal(parsed.expenses[0].confirmed, false);
  assert.equal(Object.hasOwn(parsed.expenses[0], "description"), false);
  assert.equal(parsed.expenses[1].description, "مبلغ خارج از محدودهٔ صحیح امن؛ فقط آزمون");
  const exported = makeExpenseBackup(parsed.expenses, exportedAt);
  assert.deepEqual(parseExpenseBackup(JSON.stringify(exported)).expenses, parsed.expenses);
  // This characterizes v1 compatibility; migration to integer amounts still
  // requires an explicit policy and must never round these values silently.
});

test("nonpositive and nonfinite amounts reject the whole version 1 backup", () => {
  for (const amount of [0, -1, NaN, Infinity, -Infinity]) {
    assert.throws(() => makeExpenseBackup([oldExpense, { ...oldExpense, id: 8, amount }], exportedAt), /هزینهٔ نامعتبر/);
  }
});

test("browser rejection fixtures cannot be parsed as valid backups", () => {
  for (const [name, message] of [
    ["unknown-version.json", /نسخهٔ پشتیبانی‌شده/],
    ["invalid-date.json", /هزینهٔ نامعتبر/],
    ["duplicate-ids.json", /شناسه‌های تکراری/],
  ]) {
    const contents = readFileSync(new URL(`./fixtures/backup-browser/${name}`, import.meta.url), "utf8");
    assert.throws(() => parseExpenseBackup(contents), message);
  }
});
