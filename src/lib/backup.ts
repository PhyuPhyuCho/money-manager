import { localdb } from "./localdb";

export async function exportBackup() {
  const [expenses, vouchers] = await Promise.all([
    localdb.expenses.toArray(),
    localdb.vouchers.toArray(),
  ]);

  // Blob can't be directly JSON stringified; convert to ArrayBuffer + base64
  const vouchersSerialized = await Promise.all(
    vouchers.map(async (v) => {
      if (!v.fileBlob) return { ...v, fileBlob: undefined, _fileBase64: undefined };
      const buf = await v.fileBlob.arrayBuffer();
      const bytes = new Uint8Array(buf);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const b64 = btoa(binary);
      return { ...v, fileBlob: undefined, _fileBase64: b64 };
    })
  );

  return {
    meta: { app: "money-manager-single", version: "0.1.0", exportedAt: Date.now() },
    expenses,
    vouchers: vouchersSerialized,
  };
}

export async function importBackup(data: any, mode: "merge" | "replace" = "merge") {
  if (!data || !Array.isArray(data.expenses) || !Array.isArray(data.vouchers)) {
    throw new Error("Invalid backup file");
  }

  await localdb.transaction("rw", localdb.expenses, localdb.vouchers, async () => {
    if (mode === "replace") {
      await localdb.expenses.clear();
      await localdb.vouchers.clear();
    }

    for (const e of data.expenses) {
      await localdb.expenses.put(e);
    }

    for (const v of data.vouchers) {
      let fileBlob: Blob | undefined = undefined;
      const b64 = v._fileBase64 as string | undefined;
      if (b64) {
        const binary = atob(b64);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
        fileBlob = new Blob([bytes], { type: v.fileType || "application/octet-stream" });
      }
      const clean = { ...v };
      delete (clean as any)._fileBase64;
      await localdb.vouchers.put({ ...clean, fileBlob });
    }
  });
}
