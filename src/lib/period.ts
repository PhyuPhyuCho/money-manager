export function ym(d: Date){ return d.toISOString().slice(0,7); }
export function y(d: Date){ return d.toISOString().slice(0,4); }

export function shiftMonth(ymStr: string, delta: number){
  const [yy,mm]=ymStr.split("-").map(Number);
  const dt=new Date(yy, mm-1+delta, 1);
  return dt.toISOString().slice(0,7);
}
export function shiftYear(yStr: string, delta: number){
  const yy=Number(yStr);
  return String(yy+delta);
}
