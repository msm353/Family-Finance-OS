import type { Expense } from "./Expense";

export type Currency = { id: string; name: string; minorUnitDigits: number };
export type Stamped = {
  createdAt: string;
  updatedAt: string;
  revision: number;
};
export type Account = Stamped & {
  id: string;
  name: string;
  type: "bank" | "cash" | "wallet";
  currencyId: string;
  openingBalanceMinor: number;
  openingDate: string;
  archivedAt: string | null;
};
export type Category = Stamped & {
  id: string;
  name: string;
  kind: "expense" | "income" | "both";
  archivedAt: string | null;
};
export type Counterparty = Stamped & {
  id: string;
  name: string;
  archivedAt: string | null;
};
type TransactionBase = Stamped & {
  id: string;
  date: string;
  title: string;
  categoryId: string | null;
  categoryNameSnapshot: string | null;
  counterpartyId: string | null;
  counterpartyNameSnapshot: string | null;
  paymentMethod: string | null;
  description: string | null;
  confirmed: boolean;
  sourceLegacyKey: string | null;
  deletedAt: string | null;
};
export type SingleTransaction = TransactionBase & {
  type: "expense" | "income" | "adjustment";
  currencyId: string;
  amountMinor: number;
  accountId: string | null;
};
export type TransferTransaction = TransactionBase & {
  type: "transfer";
  fromAccountId: string;
  toAccountId: string;
  fromCurrencyId: string;
  toCurrencyId: string;
  fromAmountMinor: number;
  toAmountMinor: number;
  exchangeRate: { numerator: number; denominator: number } | null;
};
export type FinancialTransaction = SingleTransaction | TransferTransaction;
export type Movement = {
  id: string;
  transactionId: string;
  accountId: string;
  currencyId: string;
  deltaMinor: number;
};
export type EntityType =
  "account" | "transaction" | "category" | "counterparty";
export type FinancialRecord =
  Account | Category | Counterparty | FinancialTransaction;
export type RecordSnapshot = { record: FinancialRecord; movements: Movement[] };
export type HistoryEvent = {
  id: string;
  entityType: EntityType;
  entityId: string;
  revision: number;
  action:
    | "create"
    | "migrate"
    | "update"
    | "delete"
    | "restore"
    | "archive"
    | "unarchive"
    | "opening-change";
  occurredAt: string;
  before: RecordSnapshot | null;
  after: RecordSnapshot;
};
export type LegacyResolution = {
  amountMinor?: number;
  date?: string;
  reason: string;
  approvedAt: string;
};
export type LegacyExpense = {
  sourceKey: string;
  datasetId: string;
  expenseId: number;
  original: Expense;
  resolution: LegacyResolution | null;
};
export type FinancialSnapshot = {
  format: "ffos-financial";
  version: 2;
  schemaVersion: 2;
  exportedAt: string;
  datasetId: string;
  migration: {
    version: "expenses-v1-to-financial-v2";
    completedAt: string;
  } | null;
  currencies: Currency[];
  accounts: Account[];
  categories: Category[];
  counterparties: Counterparty[];
  transactions: FinancialTransaction[];
  movements: Movement[];
  history: HistoryEvent[];
  legacyExpenses: LegacyExpense[];
};
export type FinancialState = {
  key: "financial-state";
  datasetId: string;
  schemaVersion: 2;
  migrationVersion: "expenses-v1-to-financial-v2" | null;
  migrationCompletedAt: string | null;
};
export const TOMAN = "ffos:toman";
