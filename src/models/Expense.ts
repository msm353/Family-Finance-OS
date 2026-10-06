export interface Expense {
  id?: number | string;
  accountId?: string | null;
  revision?: number;
  sourceLegacyKey?: string | null;

  storeName: string;

  amount: number;

  category: string;

  paymentMethod: string;

  description?: string;

  date: string;

  createdAt: string;

  confirmed: boolean;
}
