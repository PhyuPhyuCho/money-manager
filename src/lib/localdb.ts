
import Dexie, { Table } from "dexie";
export type Row={id:string;date:string;amount:number;type:string;updatedAt:number};
class DB extends Dexie{
  rows!:Table<Row,string>;
  constructor(){
    super("money_manager_db");
    this.version(3).stores({rows:"id,date,type,updatedAt"});
  }
}
export const localdb=new DB();
