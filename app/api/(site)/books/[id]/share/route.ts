import {NextResponse} from "next/server";
import {db} from "@shared/server/db";
import {ownedBook} from "@shared/server/books";
import {publishBook} from "@shared/server/shares";
import {requireUser,apiError} from "@shared/server/api";
type Context={params:Promise<{id:string}>};

/** Publishes the book and returns its reader link: /read/<code>/<title>. */
export async function POST(request:Request,context:Context){
 try{
  const user=await requireUser(request);const{id}=await context.params;
  const book=await ownedBook(id,user.id);
  return NextResponse.json(await publishBook(String(book.id),String(book.title)));
 }catch(e){return apiError(e);}
}

export async function DELETE(request:Request,context:Context){
 try{
  const user=await requireUser(request);const{id}=await context.params;
  const bookId=String((await ownedBook(id,user.id)).id);
  await db.execute("DELETE FROM book_shares WHERE book_id=?",[bookId]);
  return NextResponse.json({success:true});
 }catch(e){return apiError(e);}
}
