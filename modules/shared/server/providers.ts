import OpenAI from "openai";
import {randomUUID} from "node:crypto";
import type {RowDataPacket} from "mysql2";
import {db} from "./db";
import {ApiError} from "./api";
import {consumeAi,consumeVideo} from "./limits";
import {saveAsset} from "./assets";
const client=()=>{if(!process.env.OPENAI_API_KEY)throw new ApiError(503,"AI generation is not configured.");return new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:120000,maxRetries:1});};
export async function generateImage(userId:string,prompt:unknown){
 if(typeof prompt!=="string"||!prompt.trim()||prompt.length>4000)throw new ApiError(400,"Enter a prompt of up to 4,000 characters.");
 await consumeAi(userId);
 const response=await client().images.generate({model:"gpt-image-1",prompt,size:"1024x1024",n:1});
 const encoded=response.data?.[0]?.b64_json;if(!encoded)throw new ApiError(502,"No image was generated.");
 return saveAsset(userId,Buffer.from(encoded,"base64"),"ai-images",prompt.slice(0,80)+".png","image/png","png");
}
export async function createVideo(userId:string,prompt:unknown){
 if(typeof prompt!=="string"||!prompt.trim()||prompt.length>1000)throw new ApiError(400,"Enter a video prompt of up to 1,000 characters.");
 await consumeVideo(userId);
 const video=await client().videos.create({model:"sora-2",prompt,seconds:"4",size:"1280x720"});
 const id=randomUUID();await db.execute("INSERT INTO ai_jobs (id,user_id,provider_id,prompt) VALUES (?,?,?,?)",[id,userId,video.id,prompt]);
 return {video_id:id,last_insert_id:id,status:"pending"};
}
export async function pollVideo(userId:string,id:string){
 const [rows]=await db.execute<RowDataPacket[]>("SELECT * FROM ai_jobs WHERE id=? AND user_id=?",[id,userId]);
 if(!rows.length)throw new ApiError(404,"Video job not found.");
 const job=rows[0];
 if(job.asset_id)return {status:"completed",video_url:`/api/assets/${job.asset_id}/file`};
 const video=await client().videos.retrieve(job.provider_id);
 if(video.status==="completed"){
  // A database lock ensures two concurrent polls do not download and store twice.
  const conn=await db.getConnection();
  try{await conn.beginTransaction();const [locked]=await conn.execute<RowDataPacket[]>("SELECT asset_id FROM ai_jobs WHERE id=? AND user_id=? FOR UPDATE",[id,userId]);
   if(locked[0].asset_id){await conn.commit();return {status:"completed",video_url:`/api/assets/${locked[0].asset_id}/file`};}
   const response=await client().videos.downloadContent(job.provider_id);const bytes=Buffer.from(await response.arrayBuffer());
   if(bytes.length>100*1024*1024)throw new ApiError(413,"Generated video is too large.");
   const asset=await saveAsset(userId,bytes,"ai-videos","AI video.mp4","video/mp4","mp4");
   await conn.execute("UPDATE ai_jobs SET status='completed',asset_id=? WHERE id=?",[asset.id,id]);await conn.commit();return {status:"completed",video_url:asset.url};
  }catch(e){await conn.rollback();throw e;}finally{conn.release();}
 }
 const status=video.status==="failed"?"failed":"processing";
 await db.execute("UPDATE ai_jobs SET status=? WHERE id=? AND user_id=?",[status,id,userId]);return {status};
}

