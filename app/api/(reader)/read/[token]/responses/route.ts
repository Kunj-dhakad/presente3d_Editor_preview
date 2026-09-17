import {randomUUID,createHash} from "node:crypto";
import {NextResponse} from "next/server";
import {db} from "@shared/server/db";
import {apiError,jsonBody,consumeLimit,checkOrigin,ApiError} from "@shared/server/api";
import {sharedBook} from "@shared/server/shares";import {checkLead} from "@shared/server/engagement";
export async function POST(request:Request,context:{params:Promise<{token:string}>}){try{checkOrigin(request);const{token}=await context.params;const book=await sharedBook(token);await consumeLimit(createHash("sha256").update(token).digest("hex"),"responses",60);const body=await jsonBody(request,16384);if(!["quiz","question","contact-form","lead"].includes(body.kind)||!body.answers||typeof body.answers!=="object")throw new ApiError(400,"Invalid response.");if(body.kind==="lead"){if(!book.leadForm)throw new ApiError(403,"This book does not collect leads.");body.title="Lead form";body.answers=checkLead(body.answers);}await db.execute("INSERT INTO book_responses (id,book_id,data) VALUES (?,?,?)",[randomUUID(),book.id,JSON.stringify(body)]);return NextResponse.json({success:true});}catch(e){return apiError(e);}}

