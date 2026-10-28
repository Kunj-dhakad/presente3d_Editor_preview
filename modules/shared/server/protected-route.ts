import {NextRequest,NextResponse} from "next/server";
import {apiError,requireUser,consumeLimit,consumeAi,jsonBody} from "./api";
export function protectedRoute(handler:(request:NextRequest)=>Promise<Response>,scope="ai") {
 return async(request:NextRequest)=>{
  try{
   const user=await requireUser(request);
   await consumeLimit(user.id,scope,scope==="export"?10:30);
   if(scope==="ai")await consumeAi(user.id);
   await jsonBody(request.clone(),scope==="export"?12*1024*1024:256*1024);
   const response=await handler(request);
   if(response.status===500)return NextResponse.json({error:"The service could not complete this request. Please try again."},{status:502});
   return response;
  }catch(e){return apiError(e);}
 };
}
