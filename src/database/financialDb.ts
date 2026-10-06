import Dexie, { type Table, type Transaction } from "dexie";
import type { Expense } from "../models/Expense";
import type {
  Account,
  Category,
  Counterparty,
  Currency,
  FinancialSnapshot,
  FinancialState,
  FinancialTransaction,
  HistoryEvent,
  LegacyExpense,
  LegacyResolution,
  Movement,
} from "../models/Financial";
import {
  emptyFinancialSnapshot,
  migrateLegacyExpenses,
} from "../lib/financialMigration";
import { validateFinancialSnapshot } from "../lib/financialContract";
import { canonical } from "../lib/financialContract";

export const financialTables = [
  "currencies",
  "accounts",
  "categories",
  "counterparties",
  "transactions",
  "movements",
  "history",
  "legacyExpenses",
] as const;
export class FinancialDatabase extends Dexie {
  expenses!: Table<Expense, number>;
  currencies!: Table<Currency, string>;
  accounts!: Table<Account, string>;
  categories!: Table<Category, string>;
  counterparties!: Table<Counterparty, string>;
  transactions!: Table<FinancialTransaction, string>;
  movements!: Table<Movement, string>;
  history!: Table<HistoryEvent, string>;
  legacyExpenses!: Table<LegacyExpense, string>;
  meta!: Table<FinancialState, string>;
  constructor(
    name = "FFOSDatabase",
    resolutions: Record<string, LegacyResolution> = {},
    expectedOriginals?: Expense[],
  ) {
    super(name);
    this.version(1).stores({
      expenses: "++id, storeName, amount, category, date",
    });
    this.version(2)
      .stores({
        expenses: "++id, storeName, amount, category, date",
        currencies: "id",
        accounts: "id, currencyId, type",
        categories: "id, kind, name",
        counterparties: "id, name",
        transactions:
          "id, type, date, accountId, fromAccountId, toAccountId, categoryId, counterpartyId, &sourceLegacyKey",
        movements: "id, transactionId, accountId, &[transactionId+accountId]",
        history:
          "id, [entityType+entityId], &[entityType+entityId+revision], occurredAt",
        legacyExpenses: "sourceKey, &[datasetId+expenseId]",
        meta: "key",
      })
      .upgrade(async (transaction: Transaction) => {
        const original = await transaction.table("expenses").toArray();
        if (
          expectedOriginals &&
          canonical(original) !== canonical(expectedOriginals)
        )
          throw new Error(
            "دادهٔ قبلی پس از بررسی تغییر کرده است؛ دوباره پشتیبان و اصلاح‌ها را بررسی کنید.",
          );
        const data = migrateLegacyExpenses(original, resolutions);
        await storeSnapshot(this, data, false);
      });
    this.on("populate", async () => {
      await storeSnapshot(this, emptyFinancialSnapshot(), false);
    });
    this.on("versionchange", () => {
      this.close();
    });
    this.on("blocked", () => {
      if (typeof window !== "undefined")
        window.dispatchEvent(new Event("ffos-upgrade-blocked"));
    });
  }
}
export async function readSnapshot(
  database: FinancialDatabase,
): Promise<FinancialSnapshot> {
  const state = await database.meta.get("financial-state");
  if (!state) throw new Error("وضعیت پایگاه مالی کامل نیست.");
  if (state.schemaVersion !== 2 || (state.migrationVersion === null) !== (state.migrationCompletedAt === null)) throw new Error("نسخه یا وضعیت مهاجرت پایگاه مالی ناسازگار است.");
  const data = emptyFinancialSnapshot(state.datasetId);
  data.migration = state.migrationVersion
    ? {
        version: state.migrationVersion,
        completedAt: state.migrationCompletedAt!,
      }
    : null;
  for (const table of financialTables)
    Object.assign(data, { [table]: await database.table(table).toArray() });
  const original = (await database.expenses.toArray()).sort(
    (a, b) => Number(a.id) - Number(b.id),
  );
  const archived = data.legacyExpenses
    .map((row) => row.original)
    .sort((a, b) => Number(a.id) - Number(b.id));
  if (canonical(original) !== canonical(archived))
    throw new Error(
      "منبع حفاظتی هزینه‌های قدیمی تغییر کرده است؛ بازیابی یا بررسی لازم است.",
    );
  return data;
}
// Caller must own an IndexedDB transaction spanning all financial tables.
export async function storeSnapshot(
  database: FinancialDatabase,
  data: FinancialSnapshot,
  replace = true,
) {
  validateFinancialSnapshot(data);
  if (replace)
    for (const table of [...financialTables, "expenses", "meta"])
      await database.table(table).clear();
  for (const table of financialTables)
    await database.table(table).bulkAdd(data[table]);
  if (replace)
    await database.expenses.bulkAdd(
      data.legacyExpenses.map((source) => source.original),
    );
  await database.meta.put({
    key: "financial-state",
    datasetId: data.datasetId,
    schemaVersion: 2,
    migrationVersion: data.migration?.version ?? null,
    migrationCompletedAt: data.migration?.completedAt ?? null,
  });
}
export let financialDb = new FinancialDatabase();
export function retryMigration(
  resolutions: Record<string, LegacyResolution>,
  expectedOriginals: Expense[],
) {
  financialDb.close();
  financialDb = new FinancialDatabase(
    "FFOSDatabase",
    resolutions,
    expectedOriginals,
  );
  return financialDb.open();
}
