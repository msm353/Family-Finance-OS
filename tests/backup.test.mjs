import assert from "node:assert/strict";
import test from "node:test";
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
