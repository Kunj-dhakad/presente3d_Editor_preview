import {NextResponse} from "next/server";
import type {RowDataPacket} from "mysql2";
import {db} from "@shared/server/db";
import {requireUser,apiError,ApiError,consumeLimit} from "@shared/server/api";
import {uploadAsset,listAssets} from "@shared/server/assets";
import {generateImage,createVideo,pollVideo} from "@shared/server/providers";
import {libraryItems} from "@shared/server/library";
import {ownedBook,saveBook} from "@shared/server/books";
import {bookTitle} from "@shared/server/document";
export const runtime="nodejs";
export const maxDuration=180;
export async function POST(request:Request,context:{params:Promise<{action:string}>}){
 try{
  const user=await requireUser(request);await consumeLimit(user.id,"editor",120);
  const {action}=await context.params;
  if(Number(request.headers.get("content-length"))>105*1024*1024)throw new ApiError(413,"Upload is too large.");
  const form=await request.formData();const field=(key:string)=>String(form.get(key)||"");
  if(action==="sl_editor_listing")return NextResponse.json({result:await listAssets(user.id,["images"])});
  if(action==="sl_editor_video_listing")return NextResponse.json({result:await listAssets(user.id,["videos"])});
  if(["sl_editor_image_upload","sl_editor_crop_image","sl_editor_video_upload"].includes(action)){
   const video=action==="sl_editor_video_upload";return NextResponse.json(await uploadAsset(user.id,form.get(video?"video":action==="sl_editor_crop_image"?"image_url":"image"),video?"video":"image"));
  }
  if(["uploadImageDelete","uploadVideoDelete","aiGenerateImageDelete","ai-generate-video-delete"].includes(action)){
   const id=field("image_id")||field("video_id")||field("id");
   const [rows]=await db.execute<RowDataPacket[]>("SELECT id FROM assets WHERE id=? AND user_id=?",[id,user.id]);
   const [jobs]=await db.execute<RowDataPacket[]>("SELECT asset_id FROM ai_jobs WHERE id=? AND user_id=?",[id,user.id]);
   if(!rows.length&&!jobs.length)throw new ApiError(404,"Asset not found.");
   await db.execute("UPDATE assets SET deleted_at=UTC_TIMESTAMP(3) WHERE id=? AND user_id=?",[jobs[0]?.asset_id||id,user.id]);
   if(jobs.length)await db.execute("DELETE FROM ai_jobs WHERE id=? AND user_id=?",[id,user.id]);
   return NextResponse.json({status:1});
  }
  if(action==="sl_editor_Ai_generate_image")return NextResponse.json(await generateImage(user.id,field("prompt")));
  if(action==="sl_editor_Ai_generate_image_list")return NextResponse.json({result:await listAssets(user.id,["ai-images"])});
  if(action==="sl_editor_ai_video_generate")return NextResponse.json(await createVideo(user.id,field("keyword")));
  if(action==="sl_editor_get_ai_video_generate")return NextResponse.json(await pollVideo(user.id,field("video_id")));
  if(action==="sl_editor_get_ai_video_generate_list"){
   const [jobs]=await db.execute<RowDataPacket[]>("SELECT id,status,asset_id FROM ai_jobs WHERE user_id=? AND prompt <> 'background-removal' ORDER BY created_at DESC LIMIT 100",[user.id]);
   return NextResponse.json({result:jobs.map(j=>({...j,url:j.asset_id?`/api/assets/${j.asset_id}/file`:"",image_url:j.asset_id?`/api/assets/${j.asset_id}/file`:"",thumbnail_url:"/video-placeholder.svg"}))});
  }
  if(action==="sl_editor_template_listing")return NextResponse.json({result:await libraryItems("template",field("search_temp"))});
  if(["sl_editor_json_auto_save_upload","sl_editor_json_ppt_upload","sl_editor_video_title_update"].includes(action)){
   const id=field("id");const bookId=String((await ownedBook(id,user.id)).id);
   if(action==="sl_editor_video_title_update"){await db.execute("UPDATE books SET title=? WHERE id=? AND user_id=?",[bookTitle(field("title")),bookId,user.id]);return NextResponse.json({status:1});}
   const result=await saveBook(id,user.id,JSON.parse(field("json")),Number(field("version")));
   return NextResponse.json({status:1,...result});
  }
  throw new ApiError(404,"Editor action not found.");
 }catch(e){return apiError(e);}
}

