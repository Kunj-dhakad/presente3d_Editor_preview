import {NextResponse} from "next/server";
import {requireUser,apiError} from "@shared/server/api";
import {libraryItems} from "@shared/server/library";
export async function GET(request:Request){try{await requireUser(request);return NextResponse.json(await libraryItems("element"));}catch(e){return apiError(e);}}
