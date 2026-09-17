import {NextResponse} from "next/server";
import {requireUser,apiError,jsonBody} from "@shared/server/api";
import {generateImage} from "@shared/server/providers";
export const maxDuration=180;
export async function POST(request:Request){try{const user=await requireUser(request);const body=await jsonBody(request,16384);return NextResponse.json(await generateImage(user.id,body.prompt));}catch(e){return apiError(e);}}

