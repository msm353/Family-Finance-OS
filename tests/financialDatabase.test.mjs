import "fake-indexeddb/auto";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { after, test } from "node:test";
import Dexie from "dexie";
import { FinancialDatabase } from "../src/database/financialDb.ts";
import {
  validateFinancialSnapshot,
  accountBalance,
  safeTotal,
} from "../src/lib/financialContract.ts";
import {
  appendCreation,
  migrateLegacyExpenses,
  MigrationBlocked,
} from "../src/lib/financialMigration.ts";
import {
  getFinancialSnapshot,
  parseFinancialBackup,
  restoreFinancialBackup,
  saveAccount,
  saveFinancialTransaction,
  setTransactionDeleted,
  setAccountArchived,
  mutateFinancial,
} from "../src/services/financialService.ts";
import { formatMoneyInput, parseMoneyInput } from "../src/lib/moneyInput.ts";
import { formatCurrencyAmount } from "../src/lib/financialDisplay.ts";
import { expensesFromSnapshot } from "../src/services/expenseService.ts";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import FinancialWorkspace from "../src/components/FinancialWorkspace.tsx";
import ExpenseForm from "../src/components/ExpenseForm.tsx";

const databases = [];
const fixture = (name) =>
  JSON.parse(
    readFileSync(
      new URL(`./fixtures/financial-v2/${name}`, import.meta.url),
      "utf8",
    ),
  );
async function fresh() {
  const db = new FinancialDatabase(`FFOS-Core-Test-${crypto.randomUUID()}`);
  databases.push(db);
  await db.open();
  return db;
}
async function legacyDatabase(expenses) {
  const name = `FFOS-Legacy-Test-${crypto.randomUUID()}`;
  const db = new Dexie(name);
  db.version(1).stores({ expenses: "++id, storeName, amount, category, date" });
  await db.table("expenses").bulkAdd(expenses);
  db.close();
  return name;
}
after(async () => {
  for (const db of databases) await db.delete();
});

test("production v2 validator accepts designed snapshots and rejects semantic defects", () => {
  const manifest = fixture("manifest.json");
  for (const { file } of manifest.validSnapshots)
    validateFinancialSnapshot(fixture(file));
  for (const { file } of manifest.invalidSnapshots)
    assert.throws(() => validateFinancialSnapshot(fixture(file)));
  const bad = fixture("valid-core-v2.json");
  bad.history[0].after.record.name = "forged";
  assert.throws(() => validateFinancialSnapshot(bad), /تاریخچه/);
});
test("real Dexie upgrade preserves legacy source and creates only unassigned expenses once", async () => {
  const original = fixture("legacy-valid-v1.json").expenses;
  const name = await legacyDatabase(original);
  const db = new FinancialDatabase(name);
  databases.push(db);
  await db.open();
  const data = await getFinancialSnapshot(db);
  assert.equal(db.verno, 2);
  assert.equal(data.transactions.length, 3);
  assert.equal(data.accounts.length, 0);
  assert.equal(data.movements.length, 0);
  assert.deepEqual(await db.expenses.toArray(), original);
  assert.deepEqual(data.transactions.map((tx) => tx.date).sort(), [
    "2024-03-20",
    "2024-03-21",
    "2024-03-22",
  ]);
  const persisted = JSON.stringify({
    transactions: data.transactions,
    history: data.history,
    sources: data.legacyExpenses,
  });
  db.close();
  await db.open();
  const reopened = await getFinancialSnapshot(db);
  assert.equal(
    JSON.stringify({
      transactions: reopened.transactions,
      history: reopened.history,
      sources: reopened.legacyExpenses,
    }),
    persisted,
  );
});
test("fractional and unsafe legacy amounts abort upgrade and preserve database version 1", async () => {
  const original = fixture("legacy-blocked-v1.json").expenses;
  const name = await legacyDatabase(original);
  const db = new FinancialDatabase(name);
  databases.push(db);
  await assert.rejects(db.open(), /دادهٔ قدیمی/);
  db.close();
  const old = new Dexie(name);
  old
    .version(1)
    .stores({ expenses: "++id, storeName, amount, category, date" });
  assert.deepEqual(await old.table("expenses").toArray(), original);
  assert.equal(old.verno, 1);
  old.close();
});
test("explicit resolutions migrate atomically and preserve original amounts and approval records", async () => {
  const original = fixture("legacy-blocked-v1.json").expenses;
  const corrections = fixture("explicit-resolutions.json");
  const name = await legacyDatabase(original);
  const db = new FinancialDatabase(name, corrections);
  databases.push(db);
  await db.open();
  const data = await getFinancialSnapshot(db);
  assert.deepEqual(
    data.transactions.map((tx) => tx.amountMinor).sort((a, b) => a - b),
    [2, 100],
  );
  assert.deepEqual(await db.expenses.toArray(), original);
  for (const source of data.legacyExpenses)
    assert.deepEqual(source.resolution, corrections[String(source.expenseId)]);
});
test("write failure during actual upgrade rolls back new tables and preserves legacy version", async () => {
  const original = fixture("legacy-valid-v1.json").expenses;
  const name = await legacyDatabase(original);
  const db = new FinancialDatabase(name);
  databases.push(db);
  let wroteFirst = false;
  db.transactions.hook("creating", function () {
    this.onsuccess = () => {
      if (wroteFirst) throw new Error("upgrade fault");
      wroteFirst = true;
    };
  });
  await assert.rejects(db.open(), /upgrade fault/);
  assert.ok(wroteFirst);
  db.close();
  const old = new Dexie(name);
  old
    .version(1)
    .stores({ expenses: "++id, storeName, amount, category, date" });
  assert.deepEqual(await old.table("expenses").toArray(), original);
  assert.equal(old.verno, 1);
  old.close();
});
test("transfer edit, soft delete and restore preserve balances and exclude transfers from reports", async () => {
  const db = await fresh();
  await restoreFinancialBackup(fixture("valid-core-v2.json"), db);
  let data = await getFinancialSnapshot(db);
  const a = data.accounts.find((row) => row.name === "A");
  const b = data.accounts.find((row) => row.name === "B");
  const transfer = data.transactions.find((tx) => tx.type === "transfer");
  assert.equal(accountBalance(data, a.id, "2024-03-20"), 800000);
  await saveFinancialTransaction(
    {
      id: transfer.id,
      revision: transfer.revision,
      type: "transfer",
      date: transfer.date,
      title: transfer.title,
      amountMinor: 250000,
      accountId: a.id,
      toAccountId: b.id,
    },
    db,
  );
  data = await getFinancialSnapshot(db);
  assert.equal(accountBalance(data, a.id, "2024-03-20"), 850000);
  assert.equal(accountBalance(data, b.id, "2024-03-20"), 250000);
  await setTransactionDeleted(transfer.id, true, 2, db);
  data = await getFinancialSnapshot(db);
  assert.equal(accountBalance(data, a.id, "2024-03-20"), 1100000);
  assert.equal(accountBalance(data, b.id, "2024-03-20"), 0);
  await setTransactionDeleted(transfer.id, false, 3, db);
  data = await getFinancialSnapshot(db);
  assert.equal(accountBalance(data, a.id, "2024-03-20"), 850000);
  assert.equal(data.movements.length, 4);
  assert.equal(
    data.transactions.filter((tx) => tx.type === "expense").length,
    1,
  );
  assert.equal(
    data.history.filter((event) => event.entityId === transfer.id).length,
    4,
  );
});
test("new expenses require accounts; legacy assignment creates one effect and preserves source", async () => {
  const db = await fresh();
  await restoreFinancialBackup(fixture("expected-migrated-v2.json"), db);
  await assert.rejects(
    saveFinancialTransaction(
      {
        type: "expense",
        date: "2024-03-20",
        title: "new",
        amountMinor: 10,
        categoryName: "خوراک",
      },
      db,
    ),
    /حساب/,
  );
  await saveAccount(
    {
      name: "A",
      type: "bank",
      openingBalanceMinor: 1000000,
      openingDate: "2024-03-20",
    },
    db,
  );
  let data = await getFinancialSnapshot(db);
  const tx = data.transactions.find((row) => row.date === "2024-03-20");
  const a = data.accounts[0];
  const input = {
    id: tx.id,
    type: "expense",
    date: tx.date,
    title: tx.title,
    amountMinor: tx.amountMinor,
    categoryName: tx.categoryNameSnapshot,
    accountId: a.id,
    paymentMethod: tx.paymentMethod,
    description: tx.description,
    confirmed: tx.confirmed,
  };
  await saveFinancialTransaction({ ...input, revision: 1 }, db);
  await saveFinancialTransaction({ ...input, revision: 2 }, db);
  data = await getFinancialSnapshot(db);
  assert.equal(data.movements.length, 1);
  assert.equal(accountBalance(data, a.id, "2024-03-20"), 875000);
  assert.equal(
    data.transactions.find((row) => row.id === tx.id).confirmed,
    false,
  );
  assert.deepEqual(
    await db.expenses.toArray(),
    fixture("legacy-valid-v1.json").expenses,
  );
});
test("date boundaries, archived accounts and stale revisions reject entire writes", async () => {
  const db = await fresh();
  await saveAccount(
    {
      name: "A",
      type: "cash",
      openingBalanceMinor: 0,
      openingDate: "2024-03-21",
    },
    db,
  );
  const a = (await getFinancialSnapshot(db)).accounts[0];
  const input = {
    type: "income",
    date: "2024-03-20",
    title: "salary",
    amountMinor: 100,
    accountId: a.id,
  };
  await assert.rejects(saveFinancialTransaction(input, db), /آغازین/);
  await setAccountArchived(a.id, true, a.revision, db);
  await assert.rejects(
    saveFinancialTransaction({ ...input, date: "2024-03-21" }, db),
    /فعال/,
  );
  await assert.rejects(setAccountArchived(a.id, false, 1, db), /پنجره/);
  assert.equal((await getFinancialSnapshot(db)).transactions.length, 0);
});
test("future transactions do not change today's balance and unsafe sums cannot commit", async () => {
  const db = await fresh();
  await saveAccount(
    {
      name: "A",
      type: "bank",
      openingBalanceMinor: Number.MAX_SAFE_INTEGER,
      openingDate: "2024-03-20",
    },
    db,
  );
  const a = (await getFinancialSnapshot(db)).accounts[0];
  await assert.rejects(
    saveFinancialTransaction(
      {
        type: "income",
        date: "2024-03-20",
        title: "overflow",
        amountMinor: 1,
        accountId: a.id,
      },
      db,
    ),
    /محدودهٔ امن/,
  );
  assert.equal((await getFinancialSnapshot(db)).transactions.length, 0);
  assert.throws(() => safeTotal([Number.MAX_SAFE_INTEGER, 1]));
  await saveFinancialTransaction(
    {
      type: "expense",
      date: "2099-01-01",
      title: "future",
      categoryName: "خوراک",
      amountMinor: 100,
      accountId: a.id,
    },
    db,
  );
  const data = await getFinancialSnapshot(db);
  assert.equal(
    accountBalance(data, a.id, "2026-10-05"),
    Number.MAX_SAFE_INTEGER,
  );
  assert.equal(
    accountBalance(data, a.id, "2099-01-01"),
    Number.MAX_SAFE_INTEGER - 100,
  );
});
test("v2 round trip restores stable ids, history, deleted rows and legacy originals", async () => {
  const first = await fresh();
  await restoreFinancialBackup(fixture("deleted-transfer-v2.json"), first);
  const backup = await getFinancialSnapshot(first);
  const second = await fresh();
  await restoreFinancialBackup(
    parseFinancialBackup(JSON.stringify(backup)),
    second,
  );
  const after = await getFinancialSnapshot(second);
  assert.deepEqual({ ...after, exportedAt: backup.exportedAt }, backup);
});
test("invalid v2 files and late storage failures leave every previous table unchanged", async () => {
  const db = await fresh();
  await restoreFinancialBackup(fixture("expected-migrated-v2.json"), db);
  const original = await getFinancialSnapshot(db);
  await assert.rejects(
    restoreFinancialBackup(fixture("invalid-account-reference-v2.json"), db),
  );
  const fail = () => {
    throw new Error("restore table fault");
  };
  db.movements.hook("creating", fail);
  try {
    await assert.rejects(
      restoreFinancialBackup(fixture("valid-core-v2.json"), db),
      /restore table fault/,
    );
  } finally {
    db.movements.hook("creating").unsubscribe(fail);
  }
  const after = await getFinancialSnapshot(db);
  assert.deepEqual({ ...after, exportedAt: original.exportedAt }, original);
  assert.deepEqual(
    await db.expenses.toArray(),
    fixture("legacy-valid-v1.json").expenses,
  );
});
test("v1 restoration replaces accounts and all financial data with unassigned legacy expenses", async () => {
  const db = await fresh();
  await restoreFinancialBackup(fixture("valid-core-v2.json"), db);
  const legacy = fixture("legacy-valid-v1.json");
  await restoreFinancialBackup(
    parseFinancialBackup(JSON.stringify(legacy)),
    db,
  );
  const data = await getFinancialSnapshot(db);
  assert.equal(data.accounts.length, 0);
  assert.equal(data.movements.length, 0);
  assert.equal(data.transactions.length, 3);
  assert.ok(data.transactions.every((tx) => tx.accountId === null));
  assert.throws(
    () => migrateLegacyExpenses(fixture("legacy-blocked-v1.json").expenses),
    MigrationBlocked,
  );
});

test("late metadata failure rolls the complete upgrade back to the untouched v1 source", async () => {
  const original = fixture("legacy-valid-v1.json").expenses;
  const name = await legacyDatabase(original);
  const db = new FinancialDatabase(name);
  databases.push(db);
  db.meta.hook("creating", () => {
    throw new Error("metadata fault");
  });
  await assert.rejects(db.open(), /metadata fault/);
  db.close();
  const old = new Dexie(name);
  old
    .version(1)
    .stores({ expenses: "++id, storeName, amount, category, date" });
  assert.deepEqual(await old.table("expenses").toArray(), original);
  assert.equal(old.verno, 1);
  old.close();
});
test("source changes after correction preview abort the upgrade before any financial insert", async () => {
  const original = fixture("legacy-blocked-v1.json").expenses;
  const changed = structuredClone(original);
  changed[0].amount = 3.5;
  const name = await legacyDatabase(changed);
  const db = new FinancialDatabase(
    name,
    fixture("explicit-resolutions.json"),
    original,
  );
  databases.push(db);
  await assert.rejects(db.open(), /پس از بررسی تغییر/);
  db.close();
  const old = new Dexie(name);
  old
    .version(1)
    .stores({ expenses: "++id, storeName, amount, category, date" });
  assert.deepEqual(await old.table("expenses").toArray(), changed);
  assert.equal(old.verno, 1);
  old.close();
});
test("late history failure rolls back an edit including both transfer movements", async () => {
  const db = await fresh();
  await restoreFinancialBackup(fixture("valid-core-v2.json"), db);
  const before = await getFinancialSnapshot(db);
  const tx = before.transactions.find((t) => t.type === "transfer");
  const fault = () => {
    throw new Error("history fault");
  };
  db.history.hook("creating", fault);
  try {
    await assert.rejects(
      saveFinancialTransaction(
        {
          id: tx.id,
          revision: tx.revision,
          type: "transfer",
          date: tx.date,
          title: tx.title,
          amountMinor: 123,
          accountId: tx.fromAccountId,
          toAccountId: tx.toAccountId,
        },
        db,
      ),
      /history fault/,
    );
  } finally {
    db.history.hook("creating").unsubscribe(fault);
  }
  const after = await getFinancialSnapshot(db);
  assert.deepEqual({ ...after, exportedAt: before.exportedAt }, before);
});
test("concurrent edits accept only one expected revision and preserve a single financial effect", async () => {
  const db = await fresh();
  await restoreFinancialBackup(fixture("valid-core-v2.json"), db);
  const data = await getFinancialSnapshot(db);
  const tx = data.transactions.find((t) => t.type === "income");
  const edit = (amount) =>
    saveFinancialTransaction(
      {
        id: tx.id,
        revision: tx.revision,
        type: "income",
        date: tx.date,
        title: tx.title,
        accountId: tx.accountId,
        amountMinor: amount,
      },
      db,
    );
  const results = await Promise.allSettled([edit(123), edit(456)]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  const after = await getFinancialSnapshot(db);
  assert.equal(after.transactions.find((t) => t.id === tx.id).revision, 2);
  assert.equal(
    after.movements.filter((m) => m.transactionId === tx.id).length,
    1,
  );
});
test("protected legacy source conflicts stop reads and normal writes cannot mutate originals", async () => {
  const db = await fresh();
  await restoreFinancialBackup(fixture("expected-migrated-v2.json"), db);
  await assert.rejects(
    mutateFinancial((data) => {
      data.legacyExpenses[0].original.amount = 99;
    }, db),
    /منبع قدیمی/,
  );
  const original = (await db.expenses.toArray())[0];
  assert.equal(await db.expenses.update(original.id, { amount: 99 }), 1);
  await assert.rejects(getFinancialSnapshot(db), /منبع حفاظتی/);
});
test("unknown versions, foreign-currency transfers and forged history actions reject complete backups", () => {
  const unknown = fixture("empty-v2.json");
  unknown.version = 3;
  assert.throws(() => parseFinancialBackup(JSON.stringify(unknown)));
  const fx = fixture("valid-core-v2.json");
  fx.transactions.find((t) => t.type === "transfer").toCurrencyId = "USD";
  assert.throws(() => validateFinancialSnapshot(fx), /چندارزی/);
  const history = fixture("edited-transfer-v2.json");
  history.history.find((e) => e.revision === 2).action = "delete";
  assert.throws(() => validateFinancialSnapshot(history), /حذف/);
});
test("money fields preserve integer precision and reject fractions instead of stripping their separator", () => {
  assert.equal(parseMoneyInput(formatMoneyInput("۱۲۳۴۵۶")), 123456);
  assert.equal(
    parseMoneyInput(formatMoneyInput("٩٠٠٧١٩٩٢٥٤٧٤٠٩٩١")),
    Number.MAX_SAFE_INTEGER,
  );
  assert.throws(() => parseMoneyInput(formatMoneyInput("9007199254740992")));
  assert.throws(() => parseMoneyInput(formatMoneyInput("۱.۵")));
  assert.equal(parseMoneyInput("-۱۰۰", true), -100);
  assert.throws(() => parseMoneyInput("-۱۰۰"));
});
test("balances before opening day are zero and edits involving archived source accounts reject", async () => {
  const db = await fresh();
  await restoreFinancialBackup(fixture("valid-core-v2.json"), db);
  const data = await getFinancialSnapshot(db);
  const tx = data.transactions.find((t) => t.type === "expense");
  const a = data.accounts.find((a) => a.id === tx.accountId);
  assert.equal(accountBalance(data, a.id, "2024-01-01"), 0);
  await setAccountArchived(a.id, true, a.revision, db);
  await assert.rejects(
    saveFinancialTransaction(
      {
        id: tx.id,
        revision: tx.revision,
        type: "expense",
        date: tx.date,
        title: tx.title,
        categoryName: tx.categoryNameSnapshot,
        amountMinor: tx.amountMinor,
        accountId: data.accounts.find((b) => b.id !== a.id).id,
      },
      db,
    ),
    /حساب مرتبط/,
  );
});
test(
  "an uncooperative old connection blocks upgrade without changing data, then upgrade resumes",
  { timeout: 5000 },
  async () => {
    const original = fixture("legacy-valid-v1.json").expenses;
    const name = await legacyDatabase(original);
    const blocker = await new Promise((resolve, reject) => {
      const request = indexedDB.open(name, 10);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    blocker.onversionchange = () => {};
    const db = new FinancialDatabase(name);
    databases.push(db);
    const blocked = new Promise((resolve) => db.on("blocked", resolve));
    const opening = db.open();
    try {
      await blocked;
      assert.equal(blocker.version, 10);
      const rows = await new Promise((resolve, reject) => {
        const request = blocker
          .transaction("expenses")
          .objectStore("expenses")
          .getAll();
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
      assert.deepEqual(rows, original);
    } finally {
      blocker.close();
    }
    await opening;
    assert.equal(db.verno, 2);
    assert.equal((await getFinancialSnapshot(db)).transactions.length, 3);
  },
);
test("changing opening date validates current transactions without rewriting historical dates", async () => {
  const db = await fresh();
  await saveAccount(
    {
      name: "A",
      type: "bank",
      openingBalanceMinor: 1000,
      openingDate: "2024-03-20",
    },
    db,
  );
  let data = await getFinancialSnapshot(db);
  const account = data.accounts[0];
  const id = await saveFinancialTransaction(
    {
      type: "income",
      title: "حقوق",
      accountId: account.id,
      date: "2024-03-20",
      amountMinor: 100,
    },
    db,
  );
  data = await getFinancialSnapshot(db);
  const tx = data.transactions.find((t) => t.id === id);
  await saveFinancialTransaction(
    {
      id,
      revision: tx.revision,
      type: "income",
      title: tx.title,
      accountId: account.id,
      date: "2024-03-21",
      amountMinor: 100,
    },
    db,
  );
  await saveAccount({ ...account, openingDate: "2024-03-21" }, db);
  data = await getFinancialSnapshot(db);
  assert.equal(accountBalance(data, account.id, "2024-03-21"), 1100);
  assert.equal(
    data.history.find((e) => e.entityId === id && e.revision === 1).after.record
      .date,
    "2024-03-20",
  );
});

test("expense projection excludes income, transfers and deleted expenses while retaining legacy flags", () => {
  const data = fixture("valid-core-v2.json");
  assert.equal(expensesFromSnapshot(data).length, 1);
  data.transactions.find((t) => t.type === "expense").deletedAt =
    "2026-10-05T00:00:00.000Z";
  assert.equal(expensesFromSnapshot(data).length, 0);
  const legacy = expensesFromSnapshot(fixture("expected-migrated-v2.json"));
  assert.equal(legacy.length, 3);
  assert.equal(legacy[0].confirmed, false);
  assert.equal(legacy[0].accountId, null);
  assert.equal(typeof legacy[0].id, "string");
});
test("account workspace and existing expense form render the connected controls and expected balances", () => {
  const data = fixture("valid-core-v2.json");
  const html = renderToStaticMarkup(
    createElement(FinancialWorkspace, {
      data,
      onChanged: async () => {},
      onExpenseEdit: () => {},
    }),
  );
  for (const text of [
    "۸۰۰٬۰۰۰",
    "۳۰۰٬۰۰۰",
    "ثبت درآمد",
    "انتقال بین حساب‌ها",
    "تاریخچه",
    "نمایش حذف‌شده‌ها",
  ])
    assert.ok(html.includes(text), text);
  const expense = expensesFromSnapshot(fixture("expected-migrated-v2.json"))[0];
  const form = renderToStaticMarkup(
    createElement(ExpenseForm, {
      accounts: data.accounts,
      editingExpense: expense,
      onSaved: () => {},
      onCancel: () => {},
    }),
  );
  assert.ok(form.includes("حساب پرداخت"));
  assert.ok(
    form.includes('value="" selected=""'),
    "legacy editing does not silently assign the first account",
  );
  assert.ok(form.includes("هزینهٔ قدیمی بدون حساب"));
  assert.ok(form.includes("۱۲۵") || form.includes("125,000"));
});
test("currency display separates units and preserves exact fractional digits at safe integer limits", () => {
  const data = fixture("empty-v2.json");
  data.currencies.push({ id: "USD", name: "دلار", minorUnitDigits: 2 });
  assert.equal(
    formatCurrencyAmount(data, "USD", Number.MAX_SAFE_INTEGER),
    "۹۰٬۰۷۱٬۹۹۲٬۵۴۷٬۴۰۹٫۹۱ دلار",
  );
  assert.equal(formatCurrencyAmount(data, "USD", -1), "−۰٫۰۱ دلار");
  assert.equal(formatCurrencyAmount(data, "ffos:toman", 100), "۱۰۰ تومان");
});

test("editing imported income retains its optional category and payment method", async () => {
  const db = await fresh();
  const data = fixture("valid-core-v2.json");
  const income = data.transactions.find((tx) => tx.type === "income");
  const category = {
    id: crypto.randomUUID(),
    name: "حقوق",
    kind: "income",
    archivedAt: null,
    createdAt: income.createdAt,
    updatedAt: income.createdAt,
    revision: 1,
  };
  data.categories.push(category);
  appendCreation(data, "category", category);
  income.categoryId = category.id;
  income.categoryNameSnapshot = category.name;
  income.paymentMethod = "کارت";
  const initial = data.history.find((e) => e.entityId === income.id);
  initial.after.record = structuredClone(income);
  await restoreFinancialBackup(data, db);
  await saveFinancialTransaction(
    {
      id: income.id,
      revision: income.revision,
      type: "income",
      date: income.date,
      title: income.title,
      amountMinor: 123,
      accountId: income.accountId,
    },
    db,
  );
  const edited = (await getFinancialSnapshot(db)).transactions.find(
    (tx) => tx.id === income.id,
  );
  assert.equal(edited.categoryId, category.id);
  assert.equal(edited.categoryNameSnapshot, "حقوق");
  assert.equal(edited.paymentMethod, "کارت");
});
test("dates outside the supported calendar stop legacy migration and v2 parsing explicitly", () => {
  const legacy = fixture("legacy-valid-v1.json").expenses;
  legacy[0].date = "9999-01-01";
  assert.throws(() => migrateLegacyExpenses(legacy), MigrationBlocked);
  const data = fixture("valid-core-v2.json");
  data.transactions[0].date = "9999-01-01";
  assert.throws(() => validateFinancialSnapshot(data), /تاریخ/);
});
