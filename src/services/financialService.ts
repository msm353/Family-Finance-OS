import Dexie from "dexie";
import {
  financialDb,
  financialTables,
  readSnapshot,
  storeSnapshot,
  type FinancialDatabase,
} from "../database/financialDb";
import type {
  Account,
  EntityType,
  FinancialRecord,
  FinancialSnapshot,
  FinancialTransaction,
  HistoryEvent,
  LegacyResolution,
  RecordSnapshot,
} from "../models/Financial";
import { TOMAN } from "../models/Financial";
import {
  canonical,
  movementsFor,
  validateFinancialSnapshot,
} from "../lib/financialContract";
import {
  appendCreation,
  migrateLegacyExpenses,
} from "../lib/financialMigration";
import type { Expense } from "../models/Expense";

const tables = [...financialTables, "meta", "expenses"];
export async function getFinancialSnapshot(database = financialDb) {
  return database.transaction("r", tables, async () =>
    validateFinancialSnapshot(await readSnapshot(database)),
  );
}
export async function mutateFinancial(
  mutator: (data: FinancialSnapshot) => void,
  database = financialDb,
) {
  return database.transaction("rw", tables, async () => {
    const before = await readSnapshot(database);
    validateFinancialSnapshot(before);
    const next = structuredClone(before);
    mutator(next);
    if (
      canonical(next.legacyExpenses) !== canonical(before.legacyExpenses) ||
      canonical(next.currencies) !== canonical(before.currencies) ||
      next.datasetId !== before.datasetId ||
      canonical(next.migration) !== canonical(before.migration)
    )
      throw new Error(
        "منبع قدیمی و هویت داده فقط در بازیابی کامل قابل جایگزینی‌اند.",
      );
    validateFinancialSnapshot(next);
    for (const table of financialTables) {
      const key = (row: object) =>
        "sourceKey" in row
          ? String(row.sourceKey)
          : String((row as { id: string }).id);
      const previous = new Map(
        before[table].map((row) => [key(row), canonical(row)]),
      );
      const currentKeys = new Set(next[table].map(key));
      const removed = [...previous.keys()].filter((id) => !currentKeys.has(id));
      if (removed.length) await database.table(table).bulkDelete(removed);
      const changed = next[table].filter(
        (row) => previous.get(key(row)) !== canonical(row),
      );
      if (changed.length) await database.table(table).bulkPut(changed);
    }
    return next;
  });
}
const timeAfter = (previous?: string) =>
  new Date(
    Math.max(Date.now(), previous ? Date.parse(previous) + 1 : 0),
  ).toISOString();
function event(
  data: FinancialSnapshot,
  type: EntityType,
  before: RecordSnapshot,
  record: FinancialRecord,
  action: HistoryEvent["action"],
) {
  data.history.push({
    id: crypto.randomUUID(),
    entityType: type,
    entityId: record.id,
    revision: record.revision,
    action,
    occurredAt: record.updatedAt,
    before: structuredClone(before),
    after: {
      record: structuredClone(record),
      movements:
        type === "transaction"
          ? structuredClone(
              data.movements.filter((row) => row.transactionId === record.id),
            )
          : [],
    },
  });
}
function requireRevision(actual: number, expected: number) {
  if (actual !== expected)
    throw new Error(
      "این رکورد در پنجرهٔ دیگری تغییر کرده است؛ صفحه را تازه کنید.",
    );
}

export async function saveAccount(
  input: {
    id?: string;
    revision?: number;
    name: string;
    type: Account["type"];
    openingBalanceMinor: number;
    openingDate: string;
  },
  database = financialDb,
) {
  return mutateFinancial((data) => {
    if (!input.name.trim()) throw new Error("نام حساب لازم است.");
    const old = input.id
      ? data.accounts.find((row) => row.id === input.id)
      : null;
    if (input.id && !old) throw new Error("حساب موجود نیست.");
    if (old) requireRevision(old.revision, input.revision!);
    const now = timeAfter(old?.updatedAt);
    const record: Account = {
      id: old?.id ?? crypto.randomUUID(),
      name: input.name.trim(),
      type: input.type,
      currencyId: old?.currencyId ?? TOMAN,
      openingBalanceMinor: input.openingBalanceMinor,
      openingDate: input.openingDate,
      archivedAt: old?.archivedAt ?? null,
      createdAt: old?.createdAt ?? now,
      updatedAt: now,
      revision: (old?.revision ?? 0) + 1,
    };
    if (old?.archivedAt !== null && old)
      throw new Error("ابتدا حساب را فعال کنید.");
    if (old) {
      data.accounts[data.accounts.indexOf(old)] = record;
      event(
        data,
        "account",
        { record: old, movements: [] },
        record,
        old.openingBalanceMinor !== record.openingBalanceMinor ||
          old.openingDate !== record.openingDate
          ? "opening-change"
          : "update",
      );
    } else {
      data.accounts.push(record);
      appendCreation(data, "account", record);
    }
  }, database);
}
export async function setAccountArchived(
  id: string,
  archived: boolean,
  revision: number,
  database = financialDb,
) {
  return mutateFinancial((data) => {
    const account = data.accounts.find((row) => row.id === id);
    if (!account) throw new Error("حساب موجود نیست.");
    requireRevision(account.revision, revision);
    if ((account.archivedAt !== null) === archived) return;
    const before = structuredClone(account);
    account.updatedAt = timeAfter(account.updatedAt);
    account.revision++;
    account.archivedAt = archived ? account.updatedAt : null;
    event(
      data,
      "account",
      { record: before, movements: [] },
      account,
      archived ? "archive" : "unarchive",
    );
  }, database);
}
export type TransactionDraft = {
  id?: string;
  revision?: number;
  type: "expense" | "income" | "transfer";
  date: string;
  title: string;
  amountMinor: number;
  accountId?: string | null;
  toAccountId?: string;
  categoryName?: string;
  paymentMethod?: string | null;
  description?: string | null;
  confirmed?: boolean;
};
export async function saveFinancialTransaction(
  input: TransactionDraft,
  database = financialDb,
) {
  let resultId = "";
  await mutateFinancial((data) => {
    const old = input.id
      ? data.transactions.find((row) => row.id === input.id)
      : null;
    if (input.id && !old) throw new Error("تراکنش موجود نیست.");
    if (old) {
      requireRevision(old.revision, input.revision!);
      if (old.deletedAt) throw new Error("ابتدا تراکنش را بازگردانید.");
      if (old.type !== input.type)
        throw new Error("نوع تراکنش قابل تغییر نیست.");
    }
    if (
      old &&
      data.movements.some(
        (m) =>
          m.transactionId === old.id &&
          data.accounts.find((a) => a.id === m.accountId)?.archivedAt,
      )
    )
      throw new Error("برای ویرایش تراکنش ابتدا حساب مرتبط را فعال کنید.");
    const id = old?.id ?? crypto.randomUUID();
    resultId = id;
    const now = timeAfter(old?.updatedAt);
    const stamp = { createdAt: now, updatedAt: now, revision: 1 };
    const accountId = input.accountId || null;
    const from = accountId
      ? data.accounts.find((row) => row.id === accountId)
      : null;
    if (accountId && (!from || from.archivedAt))
      throw new Error("حساب فعال انتخاب کنید.");
    if (!accountId && !(old?.sourceLegacyKey && input.type === "expense"))
      throw new Error("ابتدا حساب بسازید و آن را انتخاب کنید.");
    let categoryId: string | null = null;
    let categoryNameSnapshot: string | null = null;
    if (input.type === "expense") {
      if (!input.categoryName?.trim()) throw new Error("دستهٔ هزینه لازم است.");
      let category = data.categories.find(
        (row) =>
          row.name === input.categoryName &&
          (row.kind === "expense" || row.kind === "both"),
      );
      if (!category) {
        category = {
          id: crypto.randomUUID(),
          name: input.categoryName,
          kind: "expense",
          archivedAt: null,
          ...stamp,
        };
        data.categories.push(category);
        appendCreation(data, "category", category);
      }
      if (category.archivedAt) throw new Error("دستهٔ فعال انتخاب کنید.");
      categoryId = category.id;
      categoryNameSnapshot = category.name;
    }
    let counterpartyId: string | null = null;
    let counterpartyNameSnapshot: string | null = null;
    if (input.type !== "transfer") {
      if (!input.title.trim()) throw new Error("عنوان تراکنش لازم است.");
      let party = data.counterparties.find((row) => row.name === input.title);
      if (!party) {
        party = {
          id: crypto.randomUUID(),
          name: input.title,
          archivedAt: null,
          ...stamp,
        };
        data.counterparties.push(party);
        appendCreation(data, "counterparty", party);
      }
      if (party.archivedAt) throw new Error("طرف تراکنش فعال نیست.");
      counterpartyId = party.id;
      counterpartyNameSnapshot = party.name;
    }
    const common = {
      id,
      date: input.date,
      title: input.title,
      categoryId,
      categoryNameSnapshot,
      counterpartyId,
      counterpartyNameSnapshot,
      paymentMethod:
        input.type === "transfer" ? null : input.paymentMethod || null,
      description: input.description ?? null,
      confirmed: input.confirmed ?? old?.confirmed ?? true,
      sourceLegacyKey: old?.sourceLegacyKey ?? null,
      deletedAt: null,
      createdAt: old?.createdAt ?? now,
      updatedAt: now,
      revision: (old?.revision ?? 0) + 1,
    };
    let tx: FinancialTransaction;
    if (input.type === "transfer") {
      const to = data.accounts.find((row) => row.id === input.toAccountId);
      if (!to || to.archivedAt || !from)
        throw new Error("دو حساب فعال برای انتقال انتخاب کنید.");
      tx = {
        ...common,
        type: "transfer",
        fromAccountId: from.id,
        toAccountId: to.id,
        fromCurrencyId: from.currencyId,
        toCurrencyId: to.currencyId,
        fromAmountMinor: input.amountMinor,
        toAmountMinor: input.amountMinor,
        exchangeRate: null,
      };
    } else
      tx = {
        ...common,
        type: input.type,
        currencyId: from?.currencyId ?? TOMAN,
        amountMinor: input.amountMinor,
        accountId,
      };
    if (
      old?.sourceLegacyKey &&
      tx.type !== "transfer" &&
      tx.currencyId !== TOMAN
    )
      throw new Error("هزینهٔ قدیمی تومان است؛ حساب تومانی انتخاب کنید.");
    const previousMovements = data.movements.filter(
      (row) => row.transactionId === id,
    );
    const before = old
      ? {
          record: structuredClone(old),
          movements: structuredClone(previousMovements),
        }
      : null;
    data.movements = data.movements
      .filter((row) => row.transactionId !== id)
      .concat(movementsFor(tx, previousMovements));
    if (old) data.transactions[data.transactions.indexOf(old)] = tx;
    else data.transactions.push(tx);
    if (before) event(data, "transaction", before, tx, "update");
    else
      data.history.push({
        id: crypto.randomUUID(),
        entityType: "transaction",
        entityId: id,
        revision: 1,
        action: "create",
        occurredAt: now,
        before: null,
        after: {
          record: structuredClone(tx),
          movements: structuredClone(
            data.movements.filter((row) => row.transactionId === id),
          ),
        },
      });
  }, database);
  return resultId;
}
export async function setTransactionDeleted(
  id: string,
  deleted: boolean,
  revision: number,
  database = financialDb,
) {
  return mutateFinancial((data) => {
    const tx = data.transactions.find((row) => row.id === id);
    if (!tx) throw new Error("تراکنش موجود نیست.");
    requireRevision(tx.revision, revision);
    changeDeleted(data, tx, deleted);
  }, database);
}
function changeDeleted(
  data: FinancialSnapshot,
  tx: FinancialTransaction,
  deleted: boolean,
) {
  if ((tx.deletedAt !== null) === deleted) return;
  const before = {
    record: structuredClone(tx),
    movements: structuredClone(
      data.movements.filter((row) => row.transactionId === tx.id),
    ),
  };
  tx.updatedAt = timeAfter(tx.updatedAt);
  tx.revision++;
  tx.deletedAt = deleted ? tx.updatedAt : null;
  event(data, "transaction", before, tx, deleted ? "delete" : "restore");
}
export async function clearFinancialExpenses(database = financialDb) {
  return mutateFinancial((data) => {
    for (const tx of data.transactions)
      if (tx.type === "expense") changeDeleted(data, tx, true);
  }, database);
}
export function parseFinancialBackup(
  text: string,
  resolutions: Record<string, LegacyResolution> = {},
): FinancialSnapshot {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error("فایل انتخاب‌شده JSON معتبر نیست.");
  }
  if (
    data &&
    typeof data === "object" &&
    "format" in data &&
    "version" in data &&
    data.format === "ffos-expenses" &&
    data.version === 1
  ) {
    if (
      !("expenses" in data) ||
      !Array.isArray(data.expenses) ||
      !("exportedAt" in data) ||
      typeof data.exportedAt !== "string" ||
      Number.isNaN(Date.parse(data.exportedAt))
    )
      throw new Error("ساختار فایل پشتیبان نسخهٔ ۱ نامعتبر است.");
    return migrateLegacyExpenses(data.expenses, resolutions);
  }
  return validateFinancialSnapshot(data);
}
export async function restoreFinancialBackup(
  data: FinancialSnapshot,
  database = financialDb,
) {
  const copy = structuredClone(validateFinancialSnapshot(data));
  await database.transaction("rw", tables, async () => {
    await storeSnapshot(database, copy);
  });
}
export async function legacyRecoveryBackup(): Promise<{
  format: "ffos-expenses";
  version: 1;
  exportedAt: string;
  expenses: Expense[];
}> {
  const legacy = new Dexie("FFOSDatabase");
  legacy
    .version(1)
    .stores({ expenses: "++id, storeName, amount, category, date" });
  try {
    return {
      format: "ffos-expenses",
      version: 1,
      exportedAt: new Date().toISOString(),
      expenses: await legacy.table("expenses").toArray(),
    };
  } finally {
    legacy.close();
  }
}
export type { FinancialDatabase };
