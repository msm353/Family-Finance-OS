import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

// These checks guard the proposed design examples, not an implemented v2
// reader, migration or database transaction. Execution cases remain pending.
const directory = new URL("./fixtures/financial-v2/", import.meta.url);
const read = (name) => JSON.parse(readFileSync(new URL(name, directory), "utf8"));
const manifest = read("manifest.json");
const ordered = (rows) => [...rows].sort((a, b) => a.id.localeCompare(b.id));

function checkSnapshotFixture(data) {
  const maps = {};
  for (const table of ["currencies", "accounts", "categories", "counterparties", "transactions", "movements", "history"]) {
    maps[table] = new Map(data[table].map((record) => [record.id, record]));
    assert.equal(maps[table].size, data[table].length, `duplicate id in ${table}`);
  }
  for (const movement of data.movements) {
    if (!maps.accounts.has(movement.accountId)) throw new Error("MISSING_ACCOUNT");
    assert.ok(maps.transactions.has(movement.transactionId));
    assert.equal(movement.currencyId, maps.accounts.get(movement.accountId).currencyId);
    assert.ok(Number.isSafeInteger(movement.deltaMinor) && movement.deltaMinor !== 0);
  }
  const legacy = new Map(data.legacyExpenses.map((row) => [row.sourceKey, row]));
  assert.equal(legacy.size, data.legacyExpenses.length);
  const linked = new Set();
  for (const tx of data.transactions) {
    const expected = tx.type === "transfer"
      ? [[tx.fromAccountId, tx.fromCurrencyId, -tx.fromAmountMinor], [tx.toAccountId, tx.toCurrencyId, tx.toAmountMinor]]
      : tx.accountId === null ? [] : [[tx.accountId, tx.currencyId, tx.type === "expense" ? -tx.amountMinor : tx.amountMinor]];
    const tupleOrder = (rows) => [...rows].sort((a, b) => a[0].localeCompare(b[0]));
    const actual = data.movements.filter((m) => m.transactionId === tx.id).map((m) => [m.accountId, m.currencyId, m.deltaMinor]);
    if (JSON.stringify(tupleOrder(actual)) !== JSON.stringify(tupleOrder(expected))) throw new Error("MOVEMENT_MISMATCH");
    for (const [accountId, currencyId] of expected) {
      assert.equal(maps.accounts.get(accountId).currencyId, currencyId);
      assert.ok(tx.date >= maps.accounts.get(accountId).openingDate);
    }
    if (tx.categoryId !== null) assert.ok(maps.categories.has(tx.categoryId));
    if (tx.counterpartyId !== null) assert.ok(maps.counterparties.has(tx.counterpartyId));
    if (tx.sourceLegacyKey !== null) {
      assert.ok(!linked.has(tx.sourceLegacyKey));
      linked.add(tx.sourceLegacyKey);
      const source = legacy.get(tx.sourceLegacyKey);
      assert.ok(source);
      assert.equal(source.datasetId, data.datasetId);
      assert.equal(source.expenseId, source.original.id);
      assert.equal(source.sourceKey, `legacy:${data.datasetId}:${source.expenseId}`);
      assert.equal(tx.id, source.sourceKey);
      assert.equal(tx.amountMinor, source.resolution?.amountMinor ?? source.original.amount);
      assert.equal(tx.confirmed, source.original.confirmed);
      assert.equal(tx.description, source.original.description ?? null);
      assert.equal(tx.paymentMethod, source.original.paymentMethod);
      assert.equal(tx.categoryNameSnapshot, source.original.category);
      assert.equal(tx.title, source.original.storeName);
    }
  }
  assert.equal(linked.size, legacy.size);

  for (const [entityType, table] of [["account", "accounts"], ["category", "categories"], ["counterparty", "counterparties"], ["transaction", "transactions"]]) {
    for (const record of data[table]) {
      const events = data.history.filter((event) => event.entityType === entityType && event.entityId === record.id).sort((a, b) => a.revision - b.revision);
      assert.equal(events.length, record.revision);
      assert.equal(events[0].before, null);
      for (let index = 0; index < events.length; index += 1) {
        assert.equal(events[index].revision, index + 1);
        if (index > 0) {
          assert.deepEqual(events[index].before, events[index - 1].after);
          assert.ok(events[index].occurredAt >= events[index - 1].occurredAt);
        }
      }
      const terminal = events.at(-1).after;
      assert.deepEqual(terminal.record, record);
      const movements = entityType === "transaction" ? data.movements.filter((m) => m.transactionId === record.id) : [];
      assert.deepEqual(ordered(terminal.movements), ordered(movements));
    }
  }
  for (const event of data.history) {
    const table = { account: "accounts", category: "categories", counterparty: "counterparties", transaction: "transactions" }[event.entityType];
    assert.ok(maps[table].has(event.entityId));
  }

  const balances = {};
  for (const account of data.accounts) {
    let amount = BigInt(account.openingBalanceMinor);
    for (const movement of data.movements.filter((m) => m.accountId === account.id)) {
      if (maps.transactions.get(movement.transactionId).deletedAt === null) amount += BigInt(movement.deltaMinor);
    }
    assert.ok(amount >= BigInt(Number.MIN_SAFE_INTEGER) && amount <= BigInt(Number.MAX_SAFE_INTEGER));
    balances[account.name] = Number(amount);
  }
  const total = (type) => Number(data.transactions.filter((tx) => tx.type === type && tx.deletedAt === null).reduce((sum, tx) => sum + BigInt(tx.amountMinor), 0n));
  return { balances, expense: total("expense"), income: total("income") };
}

for (const example of manifest.validSnapshots) {
  test(`proposed v2 fixture is internally consistent: ${example.file}`, () => {
    const result = checkSnapshotFixture(read(example.file));
    assert.deepEqual(result.balances, example.expectedBalancesByName);
    assert.equal(result.expense, example.expectedExpenseMinor);
    assert.equal(result.income, example.expectedIncomeMinor);
  });
}

for (const example of manifest.invalidSnapshots) {
  test(`proposed v2 negative fixture has its intended defect: ${example.file}`, () => {
    assert.throws(() => checkSnapshotFixture(read(example.file)), { message: example.expectedError });
  });
}

test("migration examples preserve raw records and show explicit correction rather than automatic rounding", () => {
  const input = read("legacy-valid-v1.json");
  const expected = read("expected-migrated-v2.json");
  assert.deepEqual(expected.legacyExpenses.map((source) => source.original), input.expenses);
  assert.deepEqual(expected.transactions.map((tx) => tx.date), ["2024-03-20", "2024-03-21", "2024-03-22"]);
  assert.equal(expected.accounts.length, 0);
  assert.equal(expected.movements.length, 0);
  const blocked = read("legacy-blocked-v1.json");
  assert.ok(!Number.isInteger(blocked.expenses[0].amount));
  assert.ok(!Number.isSafeInteger(blocked.expenses[1].amount));
  const resolved = read("expected-resolved-v2.json");
  assert.deepEqual(resolved.legacyExpenses.map((source) => source.original), blocked.expenses);
  const corrections = read("explicit-resolutions.json");
  for (const source of resolved.legacyExpenses) {
    assert.deepEqual(source.resolution, corrections[String(source.expenseId)]);
    assert.ok(source.resolution.reason && source.resolution.approvedAt);
  }
});

test("the contract manifest does not claim any actual v2 execution has passed", () => {
  assert.equal(manifest.executionStatus, "not-implemented");
  for (const scenario of manifest.migrationCases) assert.equal(scenario.executionStatus, "not-implemented");
});
