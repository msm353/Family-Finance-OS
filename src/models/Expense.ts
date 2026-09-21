export interface Expense {
  id?: number;

  storeName: string;

  amount: number;

  category: string;

  paymentMethod: string;

  description?: string;

  date: string;

  createdAt: string;

  confirmed: boolean;
}
