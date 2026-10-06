import Ajv from "ajv";
import schema from "../../docs/contracts/financial-backup-v2.schema.json";
import { normalizeExpenseDate } from "./expenseDate";
import type {
  FinancialSnapshot,
  FinancialTransaction,
  Movement,
  RecordSnapshot,
} from "../models/Financial";

const structural = new Ajv({ allErrors: false, strict: false }).compile(schema);
function fail(message: string): never {
  throw new Error(message);
}
export function safeTotal(values: number[]): number {
  const sum = values.reduce((value, item) => {
    if (!Number.isSafeInteger(item))
      fail("مبلغ باید عدد صحیح در محدودهٔ امن باشد.");
    return value + BigInt(item);
  }, 0n);
  if (
    sum < BigInt(Number.MIN_SAFE_INTEGER) ||
    sum > BigInt(Number.MAX_SAFE_INTEGER)
  )
    fail("جمع مبلغ‌ها خارج از محدودهٔ امن است.");
  return Number(sum);
}
export function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, item]) => `${JSON.stringify(key)}:${canonical(item)}`)
      .join(",")}}`;
  return JSON.stringify(value);
}
const snapshotKey = (value: RecordSnapshot) =>
  canonical({
    record: value.record,
    movements: [...value.movements].sort((a, b) => a.id.localeCompare(b.id)),
  });
export function movementsFor(
  tx: FinancialTransaction,
  previous: Movement[] = [],
): Movement[] {
  const parts: [string, string, number][] =
    tx.type === "transfer"
      ? [
          [tx.fromAccountId, tx.fromCurrencyId, -tx.fromAmountMinor],
          [tx.toAccountId, tx.toCurrencyId, tx.toAmountMinor],
        ]
      : tx.accountId === null
        ? []
        : [
            [
              tx.accountId,
              tx.currencyId,
              tx.type === "expense" ? -tx.amountMinor : tx.amountMinor,
            ],
          ];
  return parts.map(([accountId, currencyId, deltaMinor]) => ({
    id:
      previous.find((row) => row.accountId === accountId)?.id ??
      crypto.randomUUID(),
    transactionId: tx.id,
    accountId,
    currencyId,
    deltaMinor,
  }));
}
export function validateFinancialSnapshot(value: unknown): FinancialSnapshot {
  if (!structural(value))
    fail("ساختار فایل مالی نسخهٔ ۲ معتبر نیست؛ هیچ داده‌ای جایگزین نشد.");
  const data = value as FinancialSnapshot;
  const instant = (text: string) => {
    if (Number.isNaN(Date.parse(text)) || new Date(text).toISOString() !== text)
      fail("زمان ثبت نامعتبر است.");
  };
  const day = (text: string) => {
    if (normalizeExpenseDate(text) !== text) fail("تاریخ مالی نامعتبر است.");
  };
  instant(data.exportedAt);
  if (data.migration) instant(data.migration.completedAt);
  const unique = <T>(rows: T[], key: (row: T) => string) => {
    const map = new Map(rows.map((row) => [key(row), row]));
    if (map.size !== rows.length)
      fail("شناسه یا پیوند تکراری در فایل وجود دارد.");
    return map;
  };
  const currencies = unique(data.currencies, (row) => row.id);
  const accounts = unique(data.accounts, (row) => row.id);
  const categories = unique(data.categories, (row) => row.id);
  const parties = unique(data.counterparties, (row) => row.id);
  const transactions = unique(data.transactions, (row) => row.id);
  unique(data.movements, (row) => row.id);
  unique(data.movements, (row) =>
    canonical([row.transactionId, row.accountId]),
  );
  unique(data.history, (row) => row.id);
  unique(data.history, (row) =>
    canonical([row.entityType, row.entityId, row.revision]),
  );
  const legacy = unique(data.legacyExpenses, (row) => row.sourceKey);
  unique(data.legacyExpenses, (row) =>
    canonical([row.datasetId, row.expenseId]),
  );
  if (legacy.size && !data.migration)
    fail("اطلاعات مهاجرت دادهٔ قدیمی موجود نیست.");
  if (!currencies.has("ffos:toman")) fail("تعریف واحد تومان موجود نیست.");
  for (const record of [
    ...data.accounts,
    ...data.categories,
    ...data.counterparties,
    ...data.transactions,
  ]) {
    instant(record.createdAt);
    instant(record.updatedAt);
    if (record.updatedAt < record.createdAt)
      fail("ترتیب زمان ایجاد و ویرایش نامعتبر است.");
  }
  for (const record of [
    ...data.accounts,
    ...data.categories,
    ...data.counterparties,
  ])
    if (record.archivedAt !== null) instant(record.archivedAt);
  for (const account of data.accounts) {
    if (!currencies.has(account.currencyId)) fail("ارز حساب موجود نیست.");
    day(account.openingDate);
  }

  function checkTransaction(
    tx: FinancialTransaction,
    movements: Movement[],
    enforceOpeningDate = true,
  ) {
    day(tx.date);
    if (tx.deletedAt !== null) instant(tx.deletedAt);
    if (
      (tx.categoryId === null) !== (tx.categoryNameSnapshot === null) ||
      (tx.counterpartyId === null) !== (tx.counterpartyNameSnapshot === null)
    )
      fail("نام تاریخی و پیوند موجودیت ناسازگارند.");
    if (tx.categoryId !== null) {
      const category = categories.get(tx.categoryId);
      if (!category || (category.kind !== "both" && category.kind !== tx.type))
        fail("دستهٔ تراکنش نامعتبر است.");
    }
    if (tx.counterpartyId !== null && !parties.has(tx.counterpartyId))
      fail("طرف تراکنش موجود نیست.");
    if (tx.type === "transfer") {
      if (tx.fromAccountId === tx.toAccountId)
        fail("مبدأ و مقصد انتقال باید متفاوت باشند.");
      if (tx.fromCurrencyId !== tx.toCurrencyId || tx.exchangeRate !== null)
        fail("انتقال چندارزی در این نسخه فعال نیست.");
      if (tx.fromAmountMinor !== tx.toAmountMinor)
        fail("دو مبلغ انتقال هم‌ارز باید برابر باشند.");
      if (
        tx.categoryId !== null ||
        tx.counterpartyId !== null ||
        tx.paymentMethod !== null ||
        tx.sourceLegacyKey !== null
      )
        fail("اطلاعات اضافه برای انتقال نامعتبر است.");
    } else {
      if (!currencies.has(tx.currencyId)) fail("ارز تراکنش موجود نیست.");
      if (tx.type === "expense" && tx.categoryId === null)
        fail("دستهٔ هزینه لازم است.");
      if (
        tx.accountId === null &&
        (tx.type !== "expense" || tx.sourceLegacyKey === null)
      )
        fail("حساب تراکنش لازم است.");
      if (
        tx.type === "adjustment" &&
        (tx.categoryId !== null || tx.sourceLegacyKey !== null)
      )
        fail("اصلاح مانده دسته یا منبع قدیمی ندارد.");
    }
    const expected = movementsFor(tx, movements);
    if (
      canonical(
        [...movements].sort((a, b) => a.accountId.localeCompare(b.accountId)),
      ) !==
      canonical(
        [...expected].sort((a, b) => a.accountId.localeCompare(b.accountId)),
      )
    )
      fail("اثرهای تراکنش با مبلغ یا حساب آن سازگار نیستند.");
    for (const movement of movements) {
      const account = accounts.get(movement.accountId);
      if (!account || account.currencyId !== movement.currencyId)
        fail("حساب یا ارز اثر تراکنش موجود نیست.");
      if (enforceOpeningDate && tx.date < account.openingDate)
        fail("تاریخ تراکنش قبل از تاریخ ماندهٔ آغازین حساب است.");
    }
  }
  const sourceLinks = new Set<string>();
  for (const tx of data.transactions) {
    checkTransaction(
      tx,
      data.movements.filter((row) => row.transactionId === tx.id),
    );
    if (tx.sourceLegacyKey !== null) {
      if (
        tx.type !== "expense" ||
        !legacy.has(tx.sourceLegacyKey) ||
        tx.id !== tx.sourceLegacyKey ||
        sourceLinks.has(tx.sourceLegacyKey)
      )
        fail("پیوند منبع هزینهٔ قدیمی نامعتبر است.");
      sourceLinks.add(tx.sourceLegacyKey);
    }
  }
  if (sourceLinks.size !== legacy.size)
    fail("منبع قدیمی بدون تراکنش وجود دارد.");
  for (const movement of data.movements)
    if (!transactions.has(movement.transactionId))
      fail("اثر بدون تراکنش وجود دارد.");

  const entityTables = {
    account: accounts,
    category: categories,
    counterparty: parties,
    transaction: transactions,
  };
  for (const event of data.history) {
    instant(event.occurredAt);
    if (!entityTables[event.entityType].has(event.entityId))
      fail("تاریخچه به موجودیت ناموجود اشاره دارد.");
    for (const part of [event.before, event.after])
      if (part) {
        if (part.record.id !== event.entityId)
          fail("شناسهٔ snapshot تاریخچه نادرست است.");
        instant(part.record.createdAt);
        instant(part.record.updatedAt);
        if (event.entityType === "transaction") {
          if (
            !("type" in part.record) ||
            !["expense", "income", "transfer", "adjustment"].includes(
              part.record.type,
            )
          )
            fail("نوع snapshot تاریخچه نامعتبر است.");
          checkTransaction(
            part.record as FinancialTransaction,
            part.movements,
            false,
          );
        } else {
          if (part.movements.length)
            fail("اثر مالی برای تاریخچهٔ غیرتراکنش مجاز نیست.");
          if (event.entityType === "account") {
            if (
              !("currencyId" in part.record) ||
              !currencies.has(part.record.currencyId)
            )
              fail("snapshot حساب نامعتبر است.");
            day((part.record as (typeof data.accounts)[number]).openingDate);
          } else if (
            event.entityType === "category" &&
            !("kind" in part.record)
          )
            fail("snapshot دسته نامعتبر است.");
          else if (
            event.entityType === "counterparty" &&
            ("kind" in part.record || "type" in part.record)
          )
            fail("snapshot طرف نامعتبر است.");
        }
      }
  }
  for (const [entityType, records] of Object.entries(entityTables))
    for (const record of records.values()) {
      const events = data.history
        .filter(
          (event) =>
            event.entityType === entityType && event.entityId === record.id,
        )
        .sort((a, b) => a.revision - b.revision);
      if (
        events.length !== record.revision ||
        events[0]?.before !== null ||
        !["create", "migrate"].includes(events[0]?.action)
      )
        fail("تاریخچهٔ کامل موجودیت موجود نیست.");
      for (let index = 0; index < events.length; index++) {
        const event = events[index];
        if (
          event.revision !== index + 1 ||
          event.after.record.revision !== event.revision ||
          event.occurredAt !== event.after.record.updatedAt
        )
          fail("revision یا زمان تاریخچه ناسازگار است.");
        if (
          index &&
          (!event.before ||
            snapshotKey(event.before) !==
              snapshotKey(events[index - 1].after) ||
            event.occurredAt < events[index - 1].occurredAt)
        )
          fail("زنجیرهٔ تاریخچه شکسته است.");
        const afterRecord = event.after.record;
        if (afterRecord.updatedAt < afterRecord.createdAt)
          fail("زمان snapshot تاریخچه ناسازگار است.");
        if (!index) {
          if (
            ("deletedAt" in afterRecord && afterRecord.deletedAt !== null) ||
            ("archivedAt" in afterRecord && afterRecord.archivedAt !== null)
          )
            fail("رکورد اولیه باید فعال باشد.");
          if (
            event.action === "migrate" &&
            (entityType !== "transaction" ||
              !("sourceLegacyKey" in afterRecord) ||
              !afterRecord.sourceLegacyKey)
          )
            fail("عمل مهاجرت فقط برای هزینهٔ قدیمی مجاز است.");
        } else {
          const beforeRecord = event.before!.record;
          if (
            afterRecord.createdAt !== beforeRecord.createdAt ||
            event.action === "create" ||
            event.action === "migrate"
          )
            fail("هویت یا عمل تاریخچه نامعتبر است.");
          if (entityType === "transaction") {
            const beforeTx = beforeRecord as FinancialTransaction,
              afterTx = afterRecord as FinancialTransaction;
            if (
              beforeTx.type !== afterTx.type ||
              beforeTx.sourceLegacyKey !== afterTx.sourceLegacyKey
            )
              fail("نوع و منبع تراکنش تغییرپذیر نیستند.");
            if (!["update", "delete", "restore"].includes(event.action))
              fail("عمل تاریخچهٔ تراکنش نامعتبر است.");
            if (
              event.action === "update" &&
              (beforeTx.deletedAt !== null || afterTx.deletedAt !== null)
            )
              fail("تراکنش حذف‌شده قابل ویرایش نیست.");
            if (event.action === "delete" || event.action === "restore") {
              const deleting = event.action === "delete";
              if (
                (beforeTx.deletedAt === null) !== deleting ||
                afterTx.deletedAt !== (deleting ? event.occurredAt : null)
              )
                fail("وضعیت حذف با تاریخچه سازگار نیست.");
              const financialFields = (tx: FinancialTransaction) => {
                const {
                  revision: _revision,
                  updatedAt: _updatedAt,
                  deletedAt: _deletedAt,
                  ...fields
                } = tx;
                void _revision;
                void _updatedAt;
                void _deletedAt;
                return fields;
              };
              if (
                canonical(financialFields(beforeTx)) !==
                  canonical(financialFields(afterTx)) ||
                canonical(event.before!.movements) !==
                  canonical(event.after.movements)
              )
                fail("حذف یا بازگردانی نباید مبلغ و اثرها را تغییر دهد.");
            }
          } else {
            if (
              !["update", "opening-change", "archive", "unarchive"].includes(
                event.action,
              )
            )
              fail("عمل تاریخچهٔ موجودیت نامعتبر است.");
            if (
              entityType === "account" &&
              (beforeRecord as (typeof data.accounts)[number]).currencyId !==
                (afterRecord as (typeof data.accounts)[number]).currencyId
            )
              fail("ارز حساب در تاریخچه تغییر کرده است.");
            if (event.action === "opening-change" && entityType !== "account")
              fail("تغییر مانده فقط برای حساب مجاز است.");
            if (event.action === "archive" || event.action === "unarchive") {
              if (
                !("archivedAt" in beforeRecord) ||
                !("archivedAt" in afterRecord) ||
                (beforeRecord.archivedAt === null) !==
                  (event.action === "archive") ||
                afterRecord.archivedAt !==
                  (event.action === "archive" ? event.occurredAt : null)
              )
                fail("وضعیت بایگانی با تاریخچه سازگار نیست.");
            }
          }
        }
      }
      const after = {
        record,
        movements:
          entityType === "transaction"
            ? data.movements.filter((row) => row.transactionId === record.id)
            : [],
      };
      if (snapshotKey(events.at(-1)!.after) !== snapshotKey(after))
        fail("آخرین تاریخچه با موجودیت جاری برابر نیست.");
    }
  for (const source of data.legacyExpenses) {
    if (
      source.datasetId !== data.datasetId ||
      source.original.id !== source.expenseId ||
      source.sourceKey !== `legacy:${data.datasetId}:${source.expenseId}`
    )
      fail("هویت منبع قدیمی ناسازگار است.");
    if (source.resolution) instant(source.resolution.approvedAt);
    const first = data.history.find(
      (event) =>
        event.entityType === "transaction" &&
        event.entityId === source.sourceKey &&
        event.revision === 1,
    );
    const tx = first?.after.record as FinancialTransaction;
    if (
      !first ||
      !tx ||
      tx.type !== "expense" ||
      first.action !== "migrate" ||
      tx.accountId !== null ||
      first.after.movements.length
    )
      fail("هزینهٔ قدیمی باید بدون حساب مهاجرت شده باشد.");
    if (
      tx.amountMinor !==
        (source.resolution?.amountMinor ?? source.original.amount) ||
      tx.date !==
        (source.resolution?.date ??
          normalizeExpenseDate(source.original.date)) ||
      tx.title !== source.original.storeName ||
      tx.categoryNameSnapshot !== source.original.category ||
      tx.paymentMethod !== source.original.paymentMethod ||
      tx.description !== (source.original.description ?? null) ||
      tx.confirmed !== source.original.confirmed ||
      tx.createdAt !== new Date(source.original.createdAt).toISOString()
    )
      fail("مقدار اصلی هزینهٔ قدیمی در مهاجرت حفظ نشده است.");
  }
  for (const currency of data.currencies)
    for (const type of ["expense", "income"] as const)
      safeTotal(
        data.transactions
          .filter(
            (tx) =>
              tx.type === type &&
              tx.currencyId === currency.id &&
              tx.deletedAt === null,
          )
          .map(
            (tx) =>
              (
                tx as (typeof data.transactions)[number] & {
                  amountMinor: number;
                }
              ).amountMinor,
          ),
      );
  for (const account of data.accounts) {
    const days = new Map<string, number[]>();
    for (const movement of data.movements.filter(
      (row) => row.accountId === account.id,
    )) {
      const tx = transactions.get(movement.transactionId)!;
      if (tx.deletedAt === null)
        days.set(tx.date, [...(days.get(tx.date) ?? []), movement.deltaMinor]);
    }
    let balance = account.openingBalanceMinor;
    for (const date of [...days.keys()].sort())
      balance = safeTotal([balance, ...days.get(date)!]);
  }
  return data;
}
export function accountBalance(
  data: FinancialSnapshot,
  accountId: string,
  asOf: string,
): number {
  const account = data.accounts.find((row) => row.id === accountId);
  if (!account) fail("حساب موجود نیست.");
  if (asOf < account.openingDate) return 0;
  const ids = new Set(
    data.transactions
      .filter((tx) => tx.deletedAt === null && tx.date <= asOf)
      .map((tx) => tx.id),
  );
  return safeTotal([
    account.openingBalanceMinor,
    ...data.movements
      .filter(
        (row) => row.accountId === accountId && ids.has(row.transactionId),
      )
      .map((row) => row.deltaMinor),
  ]);
}
