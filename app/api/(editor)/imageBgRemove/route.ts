import {NextResponse} from "next/server";
import {requireUser,consumeLimit,apiError,jsonBody} from "@shared/server/api";
import {backgroundRemoval} from "@shared/server/background-removal";
export async function POST(request:Request){try{const user=await requireUser(request);await consumeLimit(user.id,"background",10);return NextResponse.json(await backgroundRemoval(user.id,await jsonBody(request,16384)));}catch(e){return apiError(e);}}

