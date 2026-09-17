import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {GetObjectCommand} from "@aws-sdk/client-s3";
import type {RowDataPacket} from "mysql2";
import {randomUUID} from "node:crypto";
import {db} from "./db";
import {ApiError} from "./api";
import {s3,bucket} from "./storage";
import {downloadRemote} from "./download";
import {saveAsset} from "./assets";
export async function backgroundRemoval(userId:string,body:{imageSrc?:string;fetchUrl?:string}){
 if(!process.env.MODELSLAB_API_KEY)throw new ApiError(503,"Background removal is not configured.");
 let endpoint="https://modelslab.com/api/v6/image_editing/removebg_mask";
 let payload:Record<string,unknown>={key:process.env.MODELSLAB_API_KEY};
 let jobId:string|undefined;
 if(body.fetchUrl){
  const match=body.fetchUrl.match(/^\/api\/background-jobs\/([a-zA-Z0-9-]+)$/);if(!match)throw new ApiError(400,"Invalid background removal job.");
  const [rows]=await db.execute<RowDataPacket[]>("SELECT provider_id FROM ai_jobs WHERE id=? AND user_id=?",[match[1],userId]);if(!rows.length)throw new ApiError(404,"Job not found.");
  endpoint=rows[0].provider_id;jobId=match[1];
  const target=new URL(endpoint);if(target.origin!=="https://modelslab.com"||!target.pathname.startsWith("/api/"))throw new ApiError(400,"Invalid provider endpoint.");
 }else{
  let image=body.imageSrc||"";
  const match=image.match(/^\/api\/assets\/([a-zA-Z0-9-]+)\/file$/);
  if(match){const [rows]=await db.execute<RowDataPacket[]>("SELECT object_key FROM assets WHERE id=? AND user_id=?",[match[1],userId]);if(!rows.length)throw new ApiError(404,"Image not found.");image=await getSignedUrl(s3,new GetObjectCommand({Bucket:bucket,Key:rows[0].object_key}),{expiresIn:300});}
  else{const parsed=new URL(image);if(parsed.protocol!=="https:")throw new ApiError(400,"Use an uploaded image or an HTTPS image.");}
  payload={...payload,image,model_id:"background-remover-1",only_mask:false,base64:"no"};
 }
 const response=await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload),redirect:"error",signal:AbortSignal.timeout(60000)});
 if(!response.ok)throw new ApiError(502,"Background removal is temporarily unavailable.");
 const result=await response.json();
 if(result.status==="success"&&result.output?.[0]){const downloaded=await downloadRemote(result.output[0]);const asset=await saveAsset(userId,downloaded.bytes,"images","background-removed.png",downloaded.contentType,"png");if(jobId)await db.execute("DELETE FROM ai_jobs WHERE id=? AND user_id=?",[jobId,userId]);return {status:"success",output:[asset.url]};}
 if(result.status==="processing"&&result.fetch_result){const target=new URL(result.fetch_result);if(target.origin!=="https://modelslab.com"||!target.pathname.startsWith("/api/"))throw new ApiError(502,"Invalid provider job.");const id=jobId||randomUUID();if(!jobId)await db.execute("INSERT INTO ai_jobs (id,user_id,provider_id,prompt) VALUES (?,?,?,'background-removal')",[id,userId,target.href]);return {status:"processing",fetch_result:"/api/background-jobs/"+id};}
 if(result.status==="processing"&&jobId)return {status:"processing",fetch_result:"/api/background-jobs/"+jobId};
 throw new ApiError(502,"Background removal did not return an image.");
}

