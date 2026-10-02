import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { after, beforeEach, test } from "node:test";
import { db } from "../src/database/db.ts";
import {
  createExpenseBackup,
  parseExpenseBackup,
  restoreExpenseBackup,
} from "../src/services/backupService.ts";

// IndexedDB is entirely in memory in this Node process. No browser storage is used.
const exportedAt = "2026-10-02T12:00:00.000Z";
const expense = {
  id: 7,
  storeName: "فروشگاه آزمایشی",
  amount: 125000,
  category: "خوراک",
  paymentMethod: "کارت",
  date: "۱۴۰۳/۱/۱",
  createdAt: "2024-03-20T10:00:00.000Z",
  confirmed: false,
};

function backupFor(expenses) {
  return parseExpenseBackup(JSON.stringify({
    format: "ffos-expenses",
    version: 1,
    exportedAt,
    expenses,
  }));
}

beforeEach(async () => {
  await db.expenses.clear();
});

after(async () => {
  await db.delete();
});

test("database backup round trip preserves records and does not rewrite legacy source dates", async () => {
  const original = [
    expense,
    { ...expense, id: 8, date: "١٤٠٣/٠١/٠٢", description: "توضیح آزمایشی" },
    { ...expense, id: 9, date: "2024-03-22", confirmed: true },
  ];
  await db.expenses.bulkAdd(original);
  const exported = await createExpenseBackup();
  assert.deepEqual(await db.expenses.toArray(), original);
  assert.deepEqual(exported.expenses.map((row) => row.date), [
    "2024-03-20", "2024-03-21", "2024-03-22",
  ]);

  // Restoration must replace existing data, not merge or leave stale records.
  await db.expenses.put({ ...expense, id: 100, date: "2024-04-01" });
  await restoreExpenseBackup(parseExpenseBackup(JSON.stringify(exported)));
  assert.deepEqual(await db.expenses.toArray(), exported.expenses);
  assert.equal(await db.expenses.get(100), undefined);
  assert.deepEqual((await createExpenseBackup()).expenses, exported.expenses);
});

test("restoration into an empty database preserves ids and future inserts do not collide", async () => {
  const backup = backupFor([expense, { ...expense, id: 20 }]);
  await restoreExpenseBackup(backup);
  assert.deepEqual(await db.expenses.toArray(), backup.expenses);
  const { id: omittedId, ...newExpense } = expense;
  assert.equal(omittedId, 7);
  const newId = await db.expenses.add(newExpense);
  assert.ok(newId > 20);
  assert.equal(await db.expenses.count(), 3);
});

test("an empty valid backup replaces the complete database", async () => {
  await db.expenses.add(expense);
  await restoreExpenseBackup(backupFor([]));
  assert.deepEqual(await db.expenses.toArray(), []);
  assert.deepEqual((await createExpenseBackup()).expenses, []);
});

test("a native IndexedDB write failure after clear rolls back all replacement records", async () => {
  const original = [expense, { ...expense, id: 8, description: "دادهٔ قبلی" }];
  await db.expenses.bulkAdd(original);
  const replacement = backupFor([{ ...expense, id: 101 }, { ...expense, id: 102 }]);
  // A non-cloneable value causes IndexedDB itself to reject a write. This models
  // a storage failure; bypassing the parser here is deliberate fault injection.
  replacement.expenses[1].description = () => "cannot be structured-cloned";

  await assert.rejects(restoreExpenseBackup(replacement));
  assert.deepEqual(await db.expenses.toArray(), original);
  assert.equal(await db.expenses.get(101), undefined);
  assert.equal(await db.expenses.get(102), undefined);
});

test("an asynchronous failure after the first insert rolls back clear and the successful insert", async () => {
  const original = [expense, { ...expense, id: 8 }];
  await db.expenses.bulkAdd(original);
  const replacement = backupFor([{ ...expense, id: 101 }, { ...expense, id: 102 }]);
  let firstInsertSucceeded = false;
  // Dexie hooks inject a failure on a real completed IndexedDB write, without
  // replacing transaction, clear or bulkPut with mocks.
  function failAfterInsert(key) {
    this.onsuccess = () => {
      if (key === 101) firstInsertSucceeded = true;
      if (key === 102) throw new Error("injected failure after insert");
    };
  }
  db.expenses.hook("creating", failAfterInsert);
  try {
    await assert.rejects(restoreExpenseBackup(replacement), /injected failure after insert/);
    assert.equal(firstInsertSucceeded, true);
    assert.deepEqual(await db.expenses.toArray(), original);
    assert.equal(await db.expenses.get(101), undefined);
    assert.equal(await db.expenses.get(102), undefined);
  } finally {
    db.expenses.hook("creating").unsubscribe(failAfterInsert);
  }
});

test("invalid files are rejected before the database replacement path runs", async () => {
  await db.expenses.add(expense);
  const original = await db.expenses.toArray();
  const valid = backupFor([expense]);
  const invalidFiles = [
    "{broken",
    JSON.stringify({ ...valid, version: 99 }),
    JSON.stringify({ ...valid, expenses: [expense, expense] }),
    JSON.stringify({ ...valid, expenses: [{ ...expense, date: "2024-02-30" }] }),
  ];
  for (const contents of invalidFiles) {
    await assert.rejects(async () => {
      await restoreExpenseBackup(parseExpenseBackup(contents));
    });
    assert.deepEqual(await db.expenses.toArray(), original);
  }
});
