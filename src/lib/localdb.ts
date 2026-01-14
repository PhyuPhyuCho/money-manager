import Dexie, { Table } from "dexie";

export type Expense = {
  id: string;
  date: string;          // YYYY-MM-DD
  amount: number;        // JPY
  category: string;
  note?: string;
  voucherId?: string;
  updatedAt: number;
  deleted?: boolean;
};

export type Voucher = {
  id: string;
  date: string;          // YYYY-MM-DD
  shop?: string;
  total?: number;
  // Store file inside IndexedDB as Blob so it survives refresh/offline
  fileBlob?: Blob;
  fileName?: string;
  fileType?: string;
  updatedAt: number;
  deleted?: boolean;
};

class LocalDB extends Dexie {
  expenses!: Table<Expense, string>;
  vouchers!: Table<Voucher, string>;

  constructor() {
    super("money_manager_db");
    this.version(1).stores({
      expenses: "id, date, category, updatedAt, deleted",
      vouchers: "id, date, updatedAt, deleted",
    });
  }
}

export const localdb = new LocalDB();
