import { localdb } from "./localdb";

export type BackupPayload = {
  version: number;
  exportedAt: number;
  incomes: any[];
  expenses: any[];
  vouchers: any[];
  savings: any[];
};

export async function exportBackup(): Promise<BackupPayload> {
  const [incomes, expenses, vouchers, savings] = await Promise.all([
    localdb.incomes.toArray(),
    localdb.expenses.toArray(),
    localdb.vouchers.toArray(),
    localdb.savings.toArray()
  ]);

  return {
    version: 3,
    exportedAt: Date.now(),
    incomes,
    expenses,
    // note: blobs excluded by default to keep backup small
    vouchers: vouchers.map(v => ({ ...v, fileBlob: undefined })),
    savings
  };
}

export async function importBackup(payload: BackupPayload) {
  if (!payload || typeof payload !== "object") throw new Error("Invalid backup file");
  await localdb.transaction("rw", localdb.incomes, localdb.expenses, localdb.vouchers, localdb.savings, async () => {
    if (payload.incomes?.length) await localdb.incomes.bulkPut(payload.incomes);
    if (payload.expenses?.length) await localdb.expenses.bulkPut(payload.expenses);
    if (payload.vouchers?.length) await localdb.vouchers.bulkPut(payload.vouchers);
    if (payload.savings?.length) await localdb.savings.bulkPut(payload.savings);
  });
}
