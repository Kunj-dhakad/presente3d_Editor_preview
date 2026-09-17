import type {RowDataPacket} from "mysql2";
import {db} from "@shared/server/db";
import {apiError,ApiError} from "@shared/server/api";
import {sharedBook} from "@shared/server/shares";
import {getObject} from "@shared/server/storage";
export async function GET(request:Request,context:{params:Promise<{token:string;id:string}>}){
 try{const{token,id}=await context.params;const book=await sharedBook(token);
 if(!JSON.stringify(book.document).includes("/api/assets/"+id+"/file"))throw new ApiError(404,"File is not part of this book.");
 const[rows]=await db.execute<RowDataPacket[]>("SELECT * FROM assets WHERE id=? AND user_id=?",[id,book.user_id]);if(!rows.length)throw new ApiError(404,"File not found.");
 const range=request.headers.get("range")||undefined;if(range&&!/^bytes=\d*-\d*$/.test(range))throw new ApiError(416,"Invalid range.");
 const object=await getObject(rows[0].object_key,range);const headers=new Headers({"Content-Type":rows[0].content_type,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff","Accept-Ranges":"bytes"});
 if(object.ContentLength!==undefined)headers.set("Content-Length",String(object.ContentLength));if(object.ContentRange)headers.set("Content-Range",object.ContentRange);
 return new Response(object.Body!.transformToWebStream() as ReadableStream,{status:range?206:200,headers});
 }catch(e){return apiError(e);}
}

