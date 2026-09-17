import {createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {apiError,consumeLimit} from "@shared/server/api";
import {sharedBook,sharedDocument} from "@shared/server/shares";

// Anyone can open a reader link, so lookups are rate limited per IP — that keeps
// short link codes from being guessed at speed.
const visitor=(request:Request)=>createHash("sha256").update((request.headers.get("x-forwarded-for")||"").split(",")[0].trim()||request.headers.get("x-real-ip")||"unknown").digest("hex").slice(0,40);

export async function GET(request:Request,context:{params:Promise<{token:string}>}){
 try{
  await consumeLimit(visitor(request),"reader",120,60);
  const{token}=await context.params;
  const book=await sharedBook(token);
  return NextResponse.json(sharedDocument(book.document,token),{headers:{"Cache-Control":"no-store"}});
 }catch(e){return apiError(e);}
}
