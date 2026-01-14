import React, { useMemo, useRef, useState } from "react";
import { v4 as uuid } from "uuid";
import { useLiveQuery } from "dexie-react-hooks";
import { localdb, Expense, Voucher } from "@/lib/localdb";
import { exportBackup, importBackup } from "@/lib/backup";

const CATEGORIES = ["Food", "Transport", "Shopping", "Bills", "Health", "Other"];

function todayStr() {
  const d = new Date();
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function downloadJson(filename: string, data: any) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function Home() {
  const [date, setDate] = useState(todayStr());
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [note, setNote] = useState("");

  const [search, setSearch] = useState("");
  const [month, setMonth] = useState(() => todayStr().slice(0, 7));

  const [vDate, setVDate] = useState(todayStr());
  const [shop, setShop] = useState("");
  const [vTotal, setVTotal] = useState<number>(0);
  const [file, setFile] = useState<File | null>(null);

  const restoreInputRef = useRef<HTMLInputElement>(null);

  const expenses = useLiveQuery(async () => {
    return localdb.expenses.where("deleted").notEqual(1 as any).toArray();
  }, []);

  const vouchers = useLiveQuery(async () => {
    return localdb.vouchers.where("deleted").notEqual(1 as any).toArray();
  }, []);

  const filteredExpenses = useMemo(() => {
    if (!expenses) return [];
    const q = search.trim().toLowerCase();
    return expenses
      .filter((e) => !e.deleted)
      .filter((e) => (month ? e.date.startsWith(month) : true))
      .filter((e) => {
        if (!q) return true;
        return (
          e.category.toLowerCase().includes(q) ||
          (e.note || "").toLowerCase().includes(q) ||
          String(e.amount).includes(q) ||
          e.date.includes(q)
        );
      })
      .sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
  }, [expenses, search, month]);

  const dayTotal = useMemo(() => {
    return (expenses || []).filter(e => e.date === date && !e.deleted).reduce((s, e) => s + e.amount, 0);
  }, [expenses, date]);

  const monthTotal = useMemo(() => {
    return (expenses || []).filter(e => e.date.startsWith(month) && !e.deleted).reduce((s, e) => s + e.amount, 0);
  }, [expenses, month]);

  async function addExpense() {
    if (!amount || amount <= 0) return alert("Amount ထည့်ပါ");
    const e: Expense = {
      id: uuid(),
      date,
      amount,
      category,
      note: note.trim() || undefined,
      updatedAt: Date.now(),
    };
    await localdb.expenses.put(e);
    setAmount(0);
    setNote("");
  }

  async function deleteExpense(id: string) {
    const e = await localdb.expenses.get(id);
    if (!e) return;
    await localdb.expenses.put({ ...e, deleted: true, updatedAt: Date.now() });
  }

  async function addVoucher() {
    const fileBlob = file ? new Blob([await file.arrayBuffer()], { type: file.type }) : undefined;

    const v: Voucher = {
      id: uuid(),
      date: vDate,
      shop: shop.trim() || undefined,
      total: vTotal || undefined,
      fileBlob,
      fileName: file?.name,
      fileType: file?.type,
      updatedAt: Date.now(),
    };
    await localdb.vouchers.put(v);
    setShop("");
    setVTotal(0);
    setFile(null);
    alert("Voucher saved ✅");
  }

  async function deleteVoucher(id: string) {
    const v = await localdb.vouchers.get(id);
    if (!v) return;
    await localdb.vouchers.put({ ...v, deleted: true, updatedAt: Date.now() });
  }

  function openVoucher(v: Voucher) {
    if (!v.fileBlob) return;
    const url = URL.createObjectURL(v.fileBlob);
    window.open(url, "_blank", "noopener,noreferrer");
    // don't revoke immediately; allow the new tab to load
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  async function backupNow() {
    const data = await exportBackup();
    downloadJson(`money-manager-backup-${new Date().toISOString().slice(0,10)}.json`, data);
  }

  async function onRestoreFile(file: File, mode: "merge" | "replace") {
    const text = await file.text();
    const data = JSON.parse(text);
    await importBackup(data, mode);
    alert(mode === "replace" ? "Restored (replaced) ✅" : "Restored (merged) ✅");
  }

  return (
    <div style={{ maxWidth: 1040, margin: "0 auto", padding: 16 }}>
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0 }}>Money Manager</h1>
          <div style={{ color: "var(--muted)", marginTop: 4 }}>
            Single user • Offline-first • Data stored in your browser (IndexedDB)
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            onClick={backupNow}
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "white" }}
          >
            Backup JSON
          </button>

          <button
            onClick={() => restoreInputRef.current?.click()}
            style={{ padding: "10px 12px", borderRadius: 12, border: "1px solid var(--border)", background: "white" }}
          >
            Restore JSON
          </button>

          <input
            ref={restoreInputRef}
            type="file"
            accept="application/json"
            style={{ display: "none" }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              const mode = confirm("Replace mode လုပ်မလား? (OK=Replace, Cancel=Merge)") ? "replace" : "merge";
              try {
                await onRestoreFile(f, mode as any);
              } catch (err: any) {
                alert("Restore failed: " + (err?.message || String(err)));
              } finally {
                e.currentTarget.value = "";
              }
            }}
          />
        </div>
      </header>

      <section style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginTop: 16 }}>
        <div style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 16, background: "var(--card)" }}>
          <div style={{ color: "var(--muted)" }}>Selected Day Total</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{dayTotal.toLocaleString()} 円</div>
        </div>
        <div style={{ padding: 12, border: "1px solid var(--border)", borderRadius: 16, background: "var(--card)" }}>
          <div style={{ color: "var(--muted)" }}>Month Total ({month})</div>
          <div style={{ fontSize: 28, fontWeight: 800 }}>{monthTotal.toLocaleString()} 円</div>
        </div>
      </section>

      <section style={{ marginTop: 22, padding: 14, border: "1px solid var(--border)", borderRadius: 16 }}>
        <h2 style={{ margin: 0 }}>Add Expense</h2>
        <div style={{ display: "grid", gridTemplateColumns: "180px 180px 220px 1fr", gap: 8, marginTop: 10 }}>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
            style={{ padding: 10, borderRadius: 12, border: "1px solid var(--border)" }} />
          <input type="number" value={amount} onChange={(e) => setAmount(Number(e.target.value))}
            placeholder="Amount (JPY)"
            style={{ padding: 10, borderRadius: 12, border: "1px solid var(--border)" }} />
          <select value={category} onChange={(e) => setCategory(e.target.value)}
            style={{ padding: 10, borderRadius: 12, border: "1px solid var(--border)", background: "white" }}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Note (optional)"
            style={{ padding: 10, borderRadius: 12, border: "1px solid var(--border)" }} />
        </div>
        <button onClick={addExpense}
          style={{ marginTop: 10, padding: "10px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "white" }}>
          + Add
        </button>
      </section>

      <section style={{ marginTop: 18, padding: 14, border: "1px solid var(--border)", borderRadius: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", gap: 10, flexWrap: "wrap" }}>
          <h2 style={{ margin: 0 }}>Expenses</h2>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <input value={month} onChange={(e) => setMonth(e.target.value)} placeholder="YYYY-MM"
              style={{ padding: 10, borderRadius: 12, border: "1px solid var(--border)", width: 120 }} />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search…"
              style={{ padding: 10, borderRadius: 12, border: "1px solid var(--border)", width: 260 }} />
          </div>
        </div>

        <div style={{ marginTop: 10, border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 120px 160px 1fr 96px", padding: 10, background: "var(--card)", fontWeight: 700 }}>
            <div>Date</div><div>Amount</div><div>Category</div><div>Note</div><div></div>
          </div>

          {filteredExpenses.slice(0, 300).map((e) => (
            <div key={e.id} style={{ display: "grid", gridTemplateColumns: "120px 120px 160px 1fr 96px", padding: 10, borderTop: "1px solid var(--border)" }}>
              <div>{e.date}</div>
              <div>{e.amount.toLocaleString()}円</div>
              <div>{e.category}</div>
              <div style={{ color: "var(--muted)" }}>{e.note || ""}</div>
              <button onClick={() => deleteExpense(e.id)}
                style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid var(--border)", background: "white" }}>
                Delete
              </button>
            </div>
          ))}

          {filteredExpenses.length === 0 && (
            <div style={{ padding: 14, color: "var(--muted)" }}>No data yet.</div>
          )}
        </div>
      </section>

      <section style={{ marginTop: 18, padding: 14, border: "1px solid var(--border)", borderRadius: 16 }}>
        <h2 style={{ margin: 0 }}>Voucher / Receipt</h2>
        <div style={{ display: "grid", gridTemplateColumns: "180px 1fr 180px 1fr", gap: 8, marginTop: 10 }}>
          <input type="date" value={vDate} onChange={(e) => setVDate(e.target.value)}
            style={{ padding: 10, borderRadius: 12, border: "1px solid var(--border)" }} />
          <input value={shop} onChange={(e) => setShop(e.target.value)} placeholder="Shop (optional)"
            style={{ padding: 10, borderRadius: 12, border: "1px solid var(--border)" }} />
          <input type="number" value={vTotal} onChange={(e) => setVTotal(Number(e.target.value))} placeholder="Total (optional)"
            style={{ padding: 10, borderRadius: 12, border: "1px solid var(--border)" }} />
          <input type="file" accept="image/*,.pdf" onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ padding: 10, borderRadius: 12, border: "1px solid var(--border)", background: "white" }} />
        </div>

        <button onClick={addVoucher}
          style={{ marginTop: 10, padding: "10px 14px", borderRadius: 12, border: "1px solid var(--border)", background: "white" }}>
          + Save Voucher
        </button>

        <div style={{ marginTop: 12, border: "1px solid var(--border)", borderRadius: 14, overflow: "hidden" }}>
          <div style={{ display: "grid", gridTemplateColumns: "120px 1fr 120px 1fr 96px", padding: 10, background: "var(--card)", fontWeight: 700 }}>
            <div>Date</div><div>Shop</div><div>Total</div><div>File</div><div></div>
          </div>

          {(vouchers || []).filter(v => !v.deleted).sort((a,b)=> b.date.localeCompare(a.date) || b.updatedAt-a.updatedAt).slice(0, 200).map((v) => (
            <div key={v.id} style={{ display: "grid", gridTemplateColumns: "120px 1fr 120px 1fr 96px", padding: 10, borderTop: "1px solid var(--border)" }}>
              <div>{v.date}</div>
              <div>{v.shop || ""}</div>
              <div>{v.total ? `${v.total.toLocaleString()}円` : ""}</div>
              <div>
                {v.fileBlob ? (
                  <button onClick={() => openVoucher(v)}
                    style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid var(--border)", background: "white" }}>
                    Open
                  </button>
                ) : (
                  <span style={{ color: "var(--muted)" }}>—</span>
                )}
                {v.fileName ? <span style={{ marginLeft: 8, color: "var(--muted)" }}>{v.fileName}</span> : null}
              </div>
              <button onClick={() => deleteVoucher(v.id)}
                style={{ padding: "8px 10px", borderRadius: 12, border: "1px solid var(--border)", background: "white" }}>
                Delete
              </button>
            </div>
          ))}

          {(vouchers || []).filter(v => !v.deleted).length === 0 && (
            <div style={{ padding: 14, color: "var(--muted)" }}>No vouchers yet.</div>
          )}
        </div>

        <div style={{ marginTop: 10, color: "var(--muted)", fontSize: 13 }}>
          *Voucher file ကို IndexedDB ထဲ Blob အနေနဲ့သိမ်းထားတာပါ။ Browser storage clear လုပ်ရင်ပျက်နိုင်လို့ Backup JSON ကို တစ်ခါတစ်လေ ဆွဲထားပါ။
        </div>
      </section>
    </div>
  );
}
