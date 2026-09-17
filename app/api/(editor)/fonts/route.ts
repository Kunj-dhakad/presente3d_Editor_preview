import {NextResponse} from "next/server";
import {requireUser,apiError} from "@shared/server/api";
import {CURATED_FONTS} from "@shared/fonts/fonts";
export async function GET(request:Request){try{await requireUser(request);return NextResponse.json({items:CURATED_FONTS});}catch(e){return apiError(e);}}

