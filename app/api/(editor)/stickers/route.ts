import {NextResponse} from "next/server";
import {requireUser,apiError} from "@shared/server/api";
export async function GET(request:Request){try{await requireUser(request);const q=(new URL(request.url).searchParams.get("q")||"").toLowerCase();return NextResponse.json(["star","heart","smile","bolt","flower"].filter(s=>s.includes(q)).map(s=>({id:s,title:s,src:"/api/stickers/"+s,tags:[s]})));}catch(e){return apiError(e);}}

