import {NextResponse} from "next/server";
import {requireUser,apiError} from "@shared/server/api";
const items=[["celebrate","26tOZ42Mg6pbTUPHW"],["hello","xTiIzJSKB4l7xTouE8"],["love","MDJ9IbxxvDUQM"],["success","111ebonMs90YLu"],["idea","3o7TKMt1VVNkHV2PaE"]];
export async function GET(request:Request){try{await requireUser(request);const q=(new URL(request.url).searchParams.get("q")||"").toLowerCase();return NextResponse.json(items.filter(([title])=>title.includes(q)).map(([title,id])=>({id,title,src:"https://media.giphy.com/media/"+id+"/giphy.gif",tags:[title]})));}catch(e){return apiError(e);}}

