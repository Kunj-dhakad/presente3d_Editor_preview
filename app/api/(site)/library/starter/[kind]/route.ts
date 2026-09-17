import {NextResponse} from "next/server";
import {requireUser,apiError,ApiError} from "@shared/server/api";
import {starterDocument} from "@shared/server/library";
export async function GET(request:Request,context:{params:Promise<{kind:string}>}){try{await requireUser(request);const {kind}=await context.params;if(!["guide","story","workbook"].includes(kind))throw new ApiError(404,"Template not found.");return NextResponse.json(starterDocument(kind));}catch(e){return apiError(e);}}

