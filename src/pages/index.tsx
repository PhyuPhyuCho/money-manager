
'use client';
import {useState} from 'react';
import {useLiveQuery} from 'dexie-react-hooks';
import {localdb} from '@/lib/localdb';
import {BarChart,Bar,XAxis,YAxis} from 'recharts';

export default function Home(){
  const [mode,setMode]=useState<'month'|'year'|'all'>('month');
  const rows=useLiveQuery(()=>localdb.rows.toArray(),[]);
  const total=(rows||[]).reduce((s,r)=>s+r.amount,0);

  const chartData=[
    {name:'Income',value:120000},
    {name:'Expense',value:70000},
    {name:'Savings',value:30000}
  ];

  return (
    <main style={{padding:16}}>
      <h1>Money Manager</h1>
      <div className="nav">
        <button onClick={()=>setMode('month')}>Monthly</button>
        <button onClick={()=>setMode('year')}>Yearly</button>
        <button onClick={()=>setMode('all')}>All</button>
      </div>

      <div className="card">
        <h3>{mode.toUpperCase()} SUMMARY</h3>
        <p>Total: ¥{total}</p>
      </div>

      <div className="card">
        <BarChart width={300} height={200} data={chartData}>
          <XAxis dataKey="name"/>
          <YAxis/>
          <Bar dataKey="value" fill="#f4a3b4"/>
        </BarChart>
      </div>
    </main>
  );
}
