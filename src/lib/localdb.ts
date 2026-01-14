
import Dexie, { Table } from "dexie";

export type Income = {
  id: string;
  date: string;
  amount: number;
  source: string;
  note?: string;
  updatedAt: number;
  deleted?: boolean;
};

export type Expense = {
  id: string;
  date: string;
  amount: number;
  category: string;
  type: "other" | "shopping";
  place?: string;
  note?: string;
  voucherId?: string;
  updatedAt: number;
  deleted?: boolean;
};

export type Voucher = {
  id: string;
  date: string;
  shop?: string;
  total?: number;
  fileBlob?: Blob;
  fileName?: string;
  fileType?: string;
  updatedAt: number;
  deleted?: boolean;
};

export type Saving = {
  id: string;
  date: string;
  amount: number;
  place?: string;
  method?: string;
  note?: string;
  updatedAt: number;
  deleted?: boolean;
};

class LocalDB extends Dexie {
  incomes!: Table<Income, string>;
  expenses!: Table<Expense, string>;
  vouchers!: Table<Voucher, string>;
  savings!: Table<Saving, string>;

  constructor() {
    super("money_manager_db");
    this.version(2).stores({
      incomes: "id, date, source, updatedAt, deleted",
      expenses: "id, date, category, type, updatedAt, deleted",
      vouchers: "id, date, updatedAt, deleted",
      savings: "id, date, method, updatedAt, deleted"
    });
  }
}

export const localdb = new LocalDB();
