import {NextResponse} from "next/server";
import {requireUser,apiError,ApiError,consumeLimit} from "@shared/server/api";
export async function GET(request:Request){
 try{const user=await requireUser(request);await consumeLimit(user.id,"stock",90);if(!process.env.PEXELS_API_KEY)throw new ApiError(503,"Stock search is not configured.");
 const input=new URL(request.url).searchParams;const video=input.get("kind")==="videos";const query=new URLSearchParams({query:(input.get("query")||"nature").slice(0,150),page:String(Math.max(1,Math.min(100,Number(input.get("page"))||1))),per_page:String(Math.max(1,Math.min(40,Number(input.get("per_page"))||20)))});
 for(const key of ["orientation","color"])if(input.get(key))query.set(key,input.get(key)!.slice(0,25));
 const response=await fetch(`https://api.pexels.com/${video?"videos/search":"v1/search"}?${query}`,{headers:{Authorization:process.env.PEXELS_API_KEY},signal:AbortSignal.timeout(20000)});
 if(!response.ok)throw new ApiError(502,"Stock search is temporarily unavailable.");
 return NextResponse.json(await response.json());
 }catch(e){return apiError(e);}
}

