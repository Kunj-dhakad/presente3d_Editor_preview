import type {RowDataPacket} from "mysql2";
import sharp from "sharp";
import {db} from "./db";
import {ApiError} from "./api";
import {downloadRemote} from "./download";
import {saveAsset} from "./assets";
import type {SlideType} from "@editor/store/editorStore";
export async function storeBookMedia(userId:string,document:{slides:SlideType[]}){
 const cache=new Map<string,string>();let downloads=0;
 async function source(url:string){
  if(cache.has(url))return cache.get(url)!;
  const local=url.match(/^\/api\/assets\/([a-zA-Z0-9-]+)\/file$/);
  if(local){const [rows]=await db.execute<RowDataPacket[]>("SELECT id FROM assets WHERE id=? AND user_id=?",[local[1],userId]);if(!rows.length)throw new ApiError(400,"A media file does not belong to this account.");return url;}
  if(url==="/video-placeholder.svg"||url.startsWith("/api/library/"))return url;
  if(!url.startsWith("https://")&&!url.startsWith("data:image/"))return url;
  if(++downloads>100)throw new ApiError(400,"Import up to 100 new media files per save.");
  let bytes:Buffer;let contentType:string;
  if(url.startsWith("data:")){const match=url.match(/^data:(image\/(?:png|jpeg|gif|webp));base64,([\s\S]*)$/);if(!match)throw new ApiError(400,"Invalid image data.");bytes=Buffer.from(match[2],"base64");contentType=match[1];}
  else ({bytes,contentType}=await downloadRemote(url,100*1024*1024));
  let kind="images";let extension="webp";
  if(contentType.startsWith("image/")){if(bytes.length>15*1024*1024)throw new ApiError(413,"An image exceeds 15 MB.");if(contentType==="image/gif"){extension="gif";}else{bytes=Buffer.from(await sharp(bytes,{limitInputPixels:40_000_000}).webp({quality:90}).toBuffer());contentType="image/webp";}}
  else if(contentType==="video/mp4"||contentType==="video/webm"){kind="videos";extension=contentType==="video/mp4"?"mp4":"webm";}
  else throw new ApiError(400,"Only images and video files can be imported as media.");
  const asset=await saveAsset(userId,bytes,kind,"Imported media."+extension,contentType,extension);cache.set(url,asset.url);return asset.url;
 }
 async function walk(value:unknown,key=""):Promise<unknown>{
  if(typeof value==="string"){
   if(["src","imageUrl","image_url","thumbnail","thumbnail_url","poster"].includes(key)&&value)return source(value);
   if(key==="background"){const found=value.match(/url\(["']?([^"')]+)["']?\)/);if(found)return value.replace(found[1],await source(found[1]));}
   return value;
  }
  if(Array.isArray(value)){const results=[];for(const item of value)results.push(await walk(item,key));return results;}
  if(value&&typeof value==="object"){const result:Record<string,unknown>={};for(const[k,v]of Object.entries(value))result[k]=await walk(v,k);return result;}
  return value;
 }
 return await walk(document) as {slides:SlideType[]};
}

