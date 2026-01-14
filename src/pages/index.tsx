'use client';
import { useMemo, useState } from "react";
import { v4 as uuid } from "uuid";
import { useLiveQuery } from "dexie-react-hooks";
import { PieChart, Pie, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { localdb, Expense } from "@/lib/localdb";
import { shiftMonth, shiftYear, ym, y } from "@/lib/period";
import { exportBackup, importBackup } from "@/lib/backup";

type Mode = "month" | "year" | "all";
function sum(arr: {amount:number}[]){ return arr.reduce((s,x)=>s+(Number(x.amount)||0),0); }

export default function Home() {
  const [mode, setMode] = useState<Mode>("month");
  const [month, setMonth] = useState<string>(ym(new Date()));
  const [year, setYear] = useState<string>(y(new Date()));
  const [budget, setBudget] = useState<number>(120000);

  const incomes = useLiveQuery(() => localdb.incomes.toArray(), []);
  const expenses = useLiveQuery(() => localdb.expenses.toArray(), []);
  const savings = useLiveQuery(() => localdb.savings.toArray(), []);

  const filtered = useMemo(() => {
    const inList = (incomes || []).filter(r => !r.deleted);
    const exList = (expenses || []).filter(r => !r.deleted);
    const svList = (savings || []).filter(r => !r.deleted);

    if (mode === "month") {
      return {
        incomes: inList.filter(r => r.date.startsWith(month)),
        expenses: exList.filter(r => r.date.startsWith(month)),
        savings: svList.filter(r => r.date.startsWith(month)),
      };
    }
    if (mode === "year") {
      return {
        incomes: inList.filter(r => r.date.startsWith(year)),
        expenses: exList.filter(r => r.date.startsWith(year)),
        savings: svList.filter(r => r.date.startsWith(year)),
      };
    }
    return { incomes: inList, expenses: exList, savings: svList };
  }, [mode, month, year, incomes, expenses, savings]);

  const incomeTotal = sum(filtered.incomes as any);
  const expenseTotal = sum(filtered.expenses as any);
  const savingTotal = sum(filtered.savings as any);
  const remaining = incomeTotal - expenseTotal - savingTotal;

  const spentForBudget = expenseTotal + savingTotal;
  const budgetLeft = budget - spentForBudget;
  const budgetPct = budget > 0 ? Math.min(100, Math.max(0, (spentForBudget / budget) * 100)) : 0;

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    (filtered.expenses as any[]).forEach((e: Expense) => {
      const k = e.type === "shopping" ? `Shopping • ${e.category}` : e.category;
      map.set(k, (map.get(k) || 0) + (Number(e.amount) || 0));
    });
    return Array.from(map.entries()).map(([name, value]) => ({ name, value }))
      .sort((a,b)=>b.value-a.value)
      .slice(0, 8);
  }, [filtered.expenses]);

  const today = new Date().toISOString().slice(0, 10);

  const [incomeAmount, setIncomeAmount] = useState<number>(0);
  const [incomeSource, setIncomeSource] = useState<string>("Salary");

  const [expAmount, setExpAmount] = useState<number>(0);
  const [expType, setExpType] = useState<"other" | "shopping">("other");
  const [expCategory, setExpCategory] = useState<string>("Food");
  const [expPlace, setExpPlace] = useState<string>("");
  const [expNote, setExpNote] = useState<string>("");
  const [voucherFile, setVoucherFile] = useState<File | null>(null);

  const [svAmount, setSvAmount] = useState<number>(0);
  const [svPlace, setSvPlace] = useState<string>("");
  const [svMethod, setSvMethod] = useState<string>("Cash");

  async function addIncome() {
    if (!incomeAmount || incomeAmount <= 0) return;
    await localdb.incomes.add({
      id: uuid(),
      date: today,
      amount: Number(incomeAmount),
      source: incomeSource || "Income",
      updatedAt: Date.now(),
    });
    setIncomeAmount(0);
  }

  async function addSaving() {
    if (!svAmount || svAmount <= 0) return;
    await localdb.savings.add({
      id: uuid(),
      date: today,
      amount: Number(svAmount),
      place: svPlace || "",
      method: svMethod || "",
      updatedAt: Date.now(),
    });
    setSvAmount(0);
  }

  async function addExpense() {
    if (!expAmount || expAmount <= 0) return;

    let voucherId: string | undefined = undefined;

    if (expType === "shopping" && voucherFile) {
      const id = uuid();
      await localdb.vouchers.add({
        id,
        date: today,
        shop: expPlace || "",
        total: Number(expAmount),
        fileBlob: voucherFile,
        fileName: voucherFile.name,
        fileType: voucherFile.type,
        updatedAt: Date.now(),
      });
      voucherId = id;
    }

    await localdb.expenses.add({
      id: uuid(),
      date: today,
      amount: Number(expAmount),
      category: expCategory || "Other",
      type: expType,
      place: expPlace || "",
      note: expNote || "",
      voucherId,
      updatedAt: Date.now(),
    });

    setExpAmount(0);
    setExpNote("");
    setVoucherFile(null);
  }

  async function downloadBackup() {
    const payload = await exportBackup();
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `money-manager-backup-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  }

  async function restoreBackup(file: File) {
    const text = await file.text();
    const payload = JSON.parse(text);
    await importBackup(payload);
    alert("Restore complete ✅");
  }

  const title = mode === "month" ? month : mode === "year" ? year : "All";

  return (
    <div className="container">
      <div className="header">
        <div className="h1">Money Manager</div>
        <div className="muted">{title}</div>
      </div>

      <div className="pillRow">
        <button className={"pill " + (mode==="month" ? "pillActive":"")} onClick={() => setMode("month")}>Monthly</button>
        <button className={"pill " + (mode==="year" ? "pillActive":"")} onClick={() => setMode("year")}>Yearly</button>
        <button className={"pill " + (mode==="all" ? "pillActive":"")} onClick={() => setMode("all")}>All</button>
      </div>

      {mode !== "all" && (
        <div className="card">
          <div className="row">
            <button className="btn2" onClick={() => mode==="month" ? setMonth(shiftMonth(month, -1)) : setYear(shiftYear(year, -1))}>◀ Prev</button>
            <div style={{fontWeight:700}}>{title}</div>
            <button className="btn2" onClick={() => mode==="month" ? setMonth(shiftMonth(month, 1)) : setYear(shiftYear(year, 1))}>Next ▶</button>
          </div>
          <div style={{marginTop:10}}>
            <div className="muted">Monthly budget</div>
            <div className="row" style={{marginTop:6}}>
              <input className="input" type="number" inputMode="numeric" value={budget} onChange={(e)=>setBudget(Number(e.target.value||0))} />
              <div style={{minWidth:90, textAlign:"right"}}>¥{budgetLeft}</div>
            </div>
            <div className="bar" style={{marginTop:8}}><div style={{width:`${budgetPct}%`}} /></div>
            <div className="muted" style={{marginTop:6}}>
              {budgetLeft >= 0 ? `Left: ¥${budgetLeft}` : `Over budget: ¥${Math.abs(budgetLeft)}`}
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="row">
          <div>
            <div className="muted">Income</div>
            <div className="big">¥{incomeTotal}</div>
          </div>
          <div>
            <div className="muted">Expenses</div>
            <div className="big">¥{expenseTotal}</div>
          </div>
        </div>
        <div className="row" style={{marginTop:10}}>
          <div>
            <div className="muted">Savings</div>
            <div className="big">¥{savingTotal}</div>
          </div>
          <div style={{textAlign:"right"}}>
            <div className="muted">Remaining</div>
            <div className="big">¥{remaining}</div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="row" style={{marginBottom:8}}>
          <div style={{fontWeight:700}}>Category breakdown</div>
          <div className="muted">(top 8)</div>
        </div>
        <div style={{width:"100%", height:220}}>
          <ResponsiveContainer>
            <PieChart>
              <Pie dataKey="value" data={byCategory} innerRadius={50} outerRadius={80} paddingAngle={2}>
                {byCategory.map((_, i) => <Cell key={i} fill={["#f4a3b4","#f7b8c5","#ffd1dc","#f9c2d1","#f3a8bf","#f8cad5","#f6b2c5","#ffdbe3"][i%8]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="muted">
          {byCategory.map((c) => (
            <div key={c.name} className="row"><span>{c.name}</span><span>¥{c.value}</span></div>
          ))}
        </div>
      </div>

      <div className="card">
        <div style={{fontWeight:700, marginBottom:6}}>Add Income</div>
        <label>Amount</label>
        <input className="input" type="number" inputMode="numeric" value={incomeAmount || ""} onChange={(e)=>setIncomeAmount(Number(e.target.value||0))} placeholder="¥" />
        <label>Source</label>
        <input className="input" value={incomeSource} onChange={(e)=>setIncomeSource(e.target.value)} placeholder="Salary / Bonus ..." />
        <div style={{marginTop:10}}><button className="btn" onClick={addIncome}>Save Income</button></div>
      </div>

      <div className="card">
        <div style={{fontWeight:700, marginBottom:6}}>Add Expense</div>

        <label>Type</label>
        <div className="grid2">
          <button className={"btn2"} onClick={()=>setExpType("other")} style={{borderColor: expType==="other" ? "rgba(244,163,180,0.9)" : "var(--border)"}}>Other</button>
          <button className={"btn2"} onClick={()=>setExpType("shopping")} style={{borderColor: expType==="shopping" ? "rgba(244,163,180,0.9)" : "var(--border)"}}>Shopping + Voucher</button>
        </div>

        <label>Amount</label>
        <input className="input" type="number" inputMode="numeric" value={expAmount || ""} onChange={(e)=>setExpAmount(Number(e.target.value||0))} placeholder="¥" />

        <label>Category</label>
        <input className="input" value={expCategory} onChange={(e)=>setExpCategory(e.target.value)} placeholder="Food / Rent / Phone ..." />

        <label>Place</label>
        <input className="input" value={expPlace} onChange={(e)=>setExpPlace(e.target.value)} placeholder="Where? (shop / station / hospital)" />

        <label>Note</label>
        <input className="input" value={expNote} onChange={(e)=>setExpNote(e.target.value)} placeholder="Optional" />

        {expType === "shopping" && (
          <>
            <label>Voucher (image / PDF)</label>
            <input className="input" type="file" accept="image/*,application/pdf" onChange={(e)=>setVoucherFile(e.target.files?.[0] || null)} />
            <div className="muted" style={{marginTop:6}}>
              {voucherFile ? `Selected: ${voucherFile.name}` : "Upload receipt (optional)"}
            </div>
          </>
        )}

        <div style={{marginTop:10}}><button className="btn" onClick={addExpense}>Save Expense</button></div>
      </div>

      <div className="card">
        <div style={{fontWeight:700, marginBottom:6}}>Add Saving</div>
        <label>Amount</label>
        <input className="input" type="number" inputMode="numeric" value={svAmount || ""} onChange={(e)=>setSvAmount(Number(e.target.value||0))} placeholder="¥" />
        <label>Place</label>
        <input className="input" value={svPlace} onChange={(e)=>setSvPlace(e.target.value)} placeholder="Bank / Cash box ..." />
        <label>Method</label>
        <input className="input" value={svMethod} onChange={(e)=>setSvMethod(e.target.value)} placeholder="Cash / Bank / Gold ..." />
        <div style={{marginTop:10}}><button className="btn" onClick={addSaving}>Save Saving</button></div>
      </div>

      <div className="card">
        <div className="row" style={{gap:10}}>
          <button className="btn2" onClick={downloadBackup}>Backup JSON</button>
          <label style={{margin:0}}>
            <input type="file" accept="application/json" style={{display:"none"}} onChange={(e)=>{
              const f = e.target.files?.[0];
              if (f) restoreBackup(f);
            }} />
            <span className="btn2" style={{display:"inline-block"}}>Restore JSON</span>
          </label>
        </div>
        <div className="muted" style={{marginTop:8}}>
          Vouchers are stored locally in your browser. Backup file excludes blobs by default.
        </div>
      </div>
    </div>
  );
}
