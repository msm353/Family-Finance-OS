import Dexie, { Table } from "dexie";
import { Expense } from "../models/Expense";

class FFOSDatabase extends Dexie {
  expenses!: Table<Expense>;

  constructor() {
    super("FFOSDatabase");

    this.version(1).stores({
      expenses:
        "++id, storeName, amount, category, date",
    });
  }
}

export const db = new FFOSDatabase();
