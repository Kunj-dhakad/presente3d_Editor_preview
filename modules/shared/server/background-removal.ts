import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {GetObjectCommand} from "@aws-sdk/client-s3";
import {ApiError} from "./api";
import {s3,bucket} from "./storage";
import {downloadRemote} from "./download";
import {saveAsset,keyFromFileUrl} from "./assets";

/** Only ModelsLab's own API is ever polled, so a job URL from the client cannot point anywhere else. */
function providerUrl(value:string){
 let target:URL;
 try{target=new URL(value);}catch{throw new ApiError(400,"Invalid background removal job.");}
 if(target.origin!=="https://modelslab.com"||!target.pathname.startsWith("/api/"))throw new ApiError(400,"Invalid background removal job.");
 return target.href;
}

/**
 * Starts or polls a background removal. There is no job table: while the
 * provider is still working, the client gets its polling URL back and sends it
 * again as `fetchUrl`.
 */
export async function backgroundRemoval(userId:string,body:{imageSrc?:string;fetchUrl?:string}){
 if(!process.env.MODELSLAB_API_KEY)throw new ApiError(503,"Background removal is not configured.");
 let endpoint="https://modelslab.com/api/v6/image_editing/removebg_mask";
 let payload:Record<string,unknown>={key:process.env.MODELSLAB_API_KEY};
 if(body.fetchUrl){
  endpoint=providerUrl(body.fetchUrl);
 }else{
  let image=body.imageSrc||"";
  const key=keyFromFileUrl(image);
  if(key)image=await getSignedUrl(s3,new GetObjectCommand({Bucket:bucket,Key:key}),{expiresIn:300});
  else{let parsed:URL;try{parsed=new URL(image);}catch{throw new ApiError(400,"Use an uploaded image or an HTTPS image.");}if(parsed.protocol!=="https:")throw new ApiError(400,"Use an uploaded image or an HTTPS image.");}
  payload={...payload,image,model_id:"background-remover-1",only_mask:false,base64:"no"};
 }
 const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),redirect:"error",signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw new ApiError(502,"Background removal is temporarily unavailable.");
 const result=await response.json();
 if(result.status==="success"&&result.output?.[0]){const downloaded=await downloadRemote(result.output[0]);const asset=await saveAsset(userId,downloaded.bytes,"images","background-removed.png",downloaded.contentType,"png");return {status:"success",output:[asset.url]};}
 if(result.status==="processing"&&result.fetch_result)return {status:"processing",fetch_result:providerUrl(result.fetch_result)};
 if(result.status==="processing"&&body.fetchUrl)return {status:"processing",fetch_result:endpoint};
 throw new ApiError(502,"Background removal did not return an image.");
}
