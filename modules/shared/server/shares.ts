import {randomBytes} from "node:crypto";
import type {RowDataPacket} from "mysql2";
import {db} from "./db";
import {ApiError} from "./api";
import {readDocument} from "./books";
import {isShareToken, newShortId, readerPath, SHARE_TOKEN_LENGTH} from "@shared/bookUrl";

/** Old links use a 48-character hex token; new ones a short code. Both work. */
export async function sharedBook(token:string){
 const column=isShareToken(token)?"short_token":/^[a-f0-9]{48}$/.test(token)?"token":null;
 if(!column)throw new ApiError(404,"This book is not shared.");
 const[rows]=await db.execute<RowDataPacket[]>(`SELECT b.* FROM book_shares s JOIN books b ON b.id=s.book_id WHERE s.${column}=? AND b.deleted_at IS NULL`,[token]);
 if(!rows.length)throw new ApiError(404,"This book is not shared.");
 return {id:String(rows[0].id),user_id:String(rows[0].user_id),title:String(rows[0].title),leadForm:Boolean(rows[0].lead_form),document:await readDocument(rows[0].document_key)};
}

/** A shared book's id and settings without loading its document (for reader tracking). */
export async function sharedBookInfo(token:string){
 const column=isShareToken(token)?"short_token":/^[a-f0-9]{48}$/.test(token)?"token":null;
 if(!column)throw new ApiError(404,"This book is not shared.");
 const[rows]=await db.execute<RowDataPacket[]>(`SELECT b.id,b.lead_form,b.page_count FROM book_shares s JOIN books b ON b.id=s.book_id WHERE s.${column}=? AND b.deleted_at IS NULL`,[token]);
 if(!rows.length)throw new ApiError(404,"This book is not shared.");
 return {id:String(rows[0].id),leadForm:Boolean(rows[0].lead_form),pages:Number(rows[0].page_count)};
}

/** Publishes a book (or returns its existing link) as /read/<code>/<title>. */
export async function publishBook(bookId:string,title:string){
 // First publication is remembered, so a book made private later is not a draft.
 await db.execute("UPDATE books SET published_at=UTC_TIMESTAMP(3) WHERE id=? AND published_at IS NULL",[bookId]);
 for(let attempt=0;attempt<6;attempt++){
  // Re-read each time: a second tab may have published the book in between.
  const[existing]=await db.execute<RowDataPacket[]>("SELECT short_token FROM book_shares WHERE book_id=?",[bookId]);
  if(existing.length&&existing[0].short_token)return {token:String(existing[0].short_token),path:readerPath(String(existing[0].short_token),title)};
  const code=newShortId(randomBytes,SHARE_TOKEN_LENGTH);
  try{
   if(existing.length)await db.execute("UPDATE book_shares SET short_token=? WHERE book_id=? AND short_token IS NULL",[code,bookId]);
   else await db.execute("INSERT INTO book_shares (token,short_token,book_id) VALUES (?,?,?)",[randomBytes(24).toString("hex"),code,bookId]);
  }catch(e){if((e as {code?:string}).code!=="ER_DUP_ENTRY")throw e;}
 }
 const[final]=await db.execute<RowDataPacket[]>("SELECT short_token FROM book_shares WHERE book_id=?",[bookId]);
 if(final.length&&final[0].short_token)return {token:String(final[0].short_token),path:readerPath(String(final[0].short_token),title)};
 throw new ApiError(503,"Could not create the link. Please try again.");
}

/** The book's current public link, or null while it is private. */
export async function bookShare(bookId:string,title:string){
 const[rows]=await db.execute<RowDataPacket[]>("SELECT short_token,created_at FROM book_shares WHERE book_id=?",[bookId]);
 if(!rows.length||!rows[0].short_token)return null;
 return {path:readerPath(String(rows[0].short_token),title),publishedAt:new Date(rows[0].created_at).toISOString()};
}

export function sharedDocument(document:unknown,token:string):unknown{
 if(typeof document==="string")return document.replace(/\/api\/assets\/([a-zA-Z0-9-]+)\/file/g,`/api/read/${token}/assets/$1`);
 if(Array.isArray(document))return document.map(v=>sharedDocument(v,token));
 if(document&&typeof document==="object")return Object.fromEntries(Object.entries(document).map(([k,v])=>[k,k==="submitUrl"?`/api/read/${token}/responses`:sharedDocument(v,token)]));
 return document;
}
