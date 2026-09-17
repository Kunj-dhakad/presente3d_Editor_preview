import type {RowDataPacket} from "mysql2";
import {db} from "./db";
import {randomUUID} from "node:crypto";

// The editor's page size, shared with AI books: a whole page fits on screen.
const PAGE = { width: 350, height: 434 };

export function starterDocument(kind:string){
 const title=kind==="story"?"A story worth telling":kind==="workbook"?"Learn something new":"Your practical guide";
 const text=(content:string,y:number,size:number,color="#282337")=>({id:randomUUID(),data:{type:"text",text:content,x:30,y,width:290,height:Math.round(size*3),fontSize:size,fontFamily:"Georgia",fontWeight:400,color,align:"left",lineHeight:1.4,rotation:0,opacity:1,zIndex:1}});
 return {slides:[
  {id:randomUUID(),...PAGE,background:kind==="workbook"?"#edf3ef":"#f7f2e9",elements:[
   text("AI BOOK CREATOR",34,8,"#8c789b"),
   text(title,104,26),
   text("A new chapter begins here.",210,11),
   text("YOUR NAME",378,8),
  ]},
  {id:randomUUID(),...PAGE,background:"#ffffff",elements:[
   text(kind==="workbook"?"Exercise 1":"Chapter one",38,18),
   text(kind==="workbook"?"What would you like to discover?\n\nWrite your thoughts here.":"Start writing here. Every idea deserves a place on the page.",86,11),
  ]},
 ]};
}

export async function libraryItems(kind:string,search=""){
 const [rows]=await db.execute<RowDataPacket[]>("SELECT id,data FROM library_items WHERE kind=? AND title LIKE ? ORDER BY created_at DESC LIMIT 1200",[kind,"%"+search.slice(0,100)+"%"]);
 return rows.map(row=>({...((typeof row.data==="string"?JSON.parse(row.data):row.data) as Record<string,unknown>),library_id:row.id}));
}
