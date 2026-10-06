import type { Expense } from "../models/Expense";
import type {
  FinancialRecord,
  FinancialSnapshot,
  EntityType,
  LegacyResolution,
  SingleTransaction,
} from "../models/Financial";
import { TOMAN } from "../models/Financial";
import { parseExpenseBackup } from "./expenseBackupFormat";
import { normalizeExpenseDate } from "./expenseDate";
import { validateFinancialSnapshot } from "./financialContract";

export type MigrationIssue = {
  expenseId: number;
  amount: number;
  date: string;
  message: string;
};
export class MigrationBlocked extends Error {
  issues: MigrationIssue[];
  constructor(issues: MigrationIssue[]) {
    super("دادهٔ قدیمی نیاز به بررسی دارد؛ هیچ داده‌ای منتقل یا حذف نشد.");
    this.name = "MigrationBlocked";
    this.issues = issues;
  }
}
export function emptyFinancialSnapshot(
  datasetId: string = crypto.randomUUID(),
  now = new Date().toISOString(),
): FinancialSnapshot {
  return {
    format: "ffos-financial",
    version: 2,
    schemaVersion: 2,
    exportedAt: now,
    datasetId,
    migration: null,
    currencies: [{ id: TOMAN, name: "تومان", minorUnitDigits: 0 }],
    accounts: [],
    categories: [],
    counterparties: [],
    transactions: [],
    movements: [],
    history: [],
    legacyExpenses: [],
  };
}
export function appendCreation(
  data: FinancialSnapshot,
  type: EntityType,
  record: FinancialRecord,
  action: "create" | "migrate" = "create",
) {
  data.history.push({
    id: crypto.randomUUID(),
    entityType: type,
    entityId: record.id,
    revision: record.revision,
    action,
    occurredAt: record.updatedAt,
    before: null,
    after: { record: structuredClone(record), movements: [] },
  });
}
export function migrateLegacyExpenses(
  originals: Expense[],
  resolutions: Record<string, LegacyResolution> = {},
  datasetId: string = crypto.randomUUID(),
  now = new Date().toISOString(),
): FinancialSnapshot {
  const issues: MigrationIssue[] = [];
  const adjusted = originals.map((original) => {
    const resolution = resolutions[String(original.id)];
    const amount = resolution?.amountMinor ?? original.amount;
    const date = resolution?.date ?? normalizeExpenseDate(original.date);
    const problems = [];
    if (!Number.isSafeInteger(amount) || amount <= 0)
      problems.push("مبلغ صحیح و امن تومان لازم است");
    if (!date || normalizeExpenseDate(date) !== date)
      problems.push("تاریخ معتبر لازم است");
    if (
      resolution &&
      (!resolution.reason.trim() ||
        Number.isNaN(Date.parse(resolution.approvedAt)))
    )
      problems.push("دلیل و زمان تأیید اصلاح لازم است");
    if (problems.length)
      issues.push({
        expenseId: Number(original.id),
        amount: original.amount,
        date: original.date,
        message: problems.join("؛ "),
      });
    return { ...original, amount, date: date ?? original.date };
  });
  if (issues.length) throw new MigrationBlocked(issues);
  // Reuse the existing v1 field/identifier validator after explicit resolutions.
  const parsed = parseExpenseBackup(
    JSON.stringify({
      format: "ffos-expenses",
      version: 1,
      exportedAt: now,
      expenses: adjusted,
    }),
  );
  const data = emptyFinancialSnapshot(datasetId, now);
  data.migration = { version: "expenses-v1-to-financial-v2", completedAt: now };
  const stamp = { createdAt: now, updatedAt: now, revision: 1 };
  for (let index = 0; index < parsed.expenses.length; index++) {
    const expense = parsed.expenses[index];
    const original = originals[index];
    let category = data.categories.find((row) => row.name === expense.category);
    if (!category) {
      category = {
        id: crypto.randomUUID(),
        name: expense.category,
        kind: "expense",
        archivedAt: null,
        ...stamp,
      };
      data.categories.push(category);
      appendCreation(data, "category", category);
    }
    let party = data.counterparties.find(
      (row) => row.name === expense.storeName,
    );
    if (!party) {
      party = {
        id: crypto.randomUUID(),
        name: expense.storeName,
        archivedAt: null,
        ...stamp,
      };
      data.counterparties.push(party);
      appendCreation(data, "counterparty", party);
    }
    const sourceKey = `legacy:${datasetId}:${expense.id}`;
    data.legacyExpenses.push({
      sourceKey,
      datasetId,
      expenseId: Number(expense.id),
      original: structuredClone(original),
      resolution: resolutions[String(expense.id)] ?? null,
    });
    const createdAt = new Date(expense.createdAt).toISOString();
    const transaction: SingleTransaction = {
      id: sourceKey,
      type: "expense",
      date: expense.date,
      title: expense.storeName,
      categoryId: category.id,
      categoryNameSnapshot: category.name,
      counterpartyId: party.id,
      counterpartyNameSnapshot: party.name,
      paymentMethod: expense.paymentMethod,
      description: expense.description ?? null,
      confirmed: expense.confirmed,
      sourceLegacyKey: sourceKey,
      deletedAt: null,
      currencyId: TOMAN,
      amountMinor: expense.amount,
      accountId: null,
      createdAt,
      updatedAt: now < createdAt ? createdAt : now,
      revision: 1,
    };
    data.transactions.push(transaction);
    appendCreation(data, "transaction", transaction, "migrate");
  }
  return validateFinancialSnapshot(data);
}
