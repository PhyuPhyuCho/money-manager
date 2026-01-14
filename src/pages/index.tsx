
'use client';
import { v4 as uuid } from "uuid";
import { useState } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { localdb, Income, Expense, Saving } from "@/lib/localdb";

export default function Home() {
  const [month] = useState(new Date().toISOString().slice(0,7));

  const incomes = useLiveQuery(() => localdb.incomes.toArray(), []);
  const expenses = useLiveQuery(() => localdb.expenses.toArray(), []);
  const savings = useLiveQuery(() => localdb.savings.toArray(), []);

  const incomeTotal = (incomes||[]).filter(i=>i.date.startsWith(month)&&!i.deleted)
    .reduce((s,i)=>s+i.amount,0);
  const expenseTotal = (expenses||[]).filter(e=>e.date.startsWith(month)&&!e.deleted)
    .reduce((s,e)=>s+e.amount,0);
  const savingTotal = (savings||[]).filter(sv=>sv.date.startsWith(month)&&!sv.deleted)
    .reduce((s,sv)=>s+sv.amount,0);

  const balance = incomeTotal - expenseTotal - savingTotal;

  async function addIncome() {
    await localdb.incomes.add({
      id: uuid(),
      date: new Date().toISOString().slice(0,10),
      amount: 100000,
      source: "Salary",
      updatedAt: Date.now()
    } as Income);
  }

  async function addExpense() {
    await localdb.expenses.add({
      id: uuid(),
      date: new Date().toISOString().slice(0,10),
      amount: 20000,
      category: "Food",
      type: "other",
      updatedAt: Date.now()
    } as Expense);
  }

  async function addSaving() {
    await localdb.savings.add({
      id: uuid(),
      date: new Date().toISOString().slice(0,10),
      amount: 30000,
      place: "Bank",
      updatedAt: Date.now()
    } as Saving);
  }

  return (
    <main style={{padding:16}}>
      <h1>Money Manager</h1>
      <section>
        <h3>{month} Summary</h3>
        <p>Income: ¥{incomeTotal}</p>
        <p>Expenses: ¥{expenseTotal}</p>
        <p>Savings: ¥{savingTotal}</p>
        <p><b>Balance: ¥{balance}</b></p>
      </section>

      <section>
        <button onClick={addIncome}>+ Add Income (sample)</button>
        <button onClick={addExpense}>+ Add Expense (sample)</button>
        <button onClick={addSaving}>+ Add Saving (sample)</button>
      </section>
    </main>
  );
}
