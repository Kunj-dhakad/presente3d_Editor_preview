import sharp from "sharp";
import {requireUser,jsonBody,ApiError} from "./api";
import {validateDocument} from "./document";
import {getObject} from "./storage";
import {keyFromFileUrl} from "./assets";
import {downloadRemote} from "./download";
/** Reads an export request and inlines every image as a PNG data URL, so the exporter never fetches anything itself. */
export async function exportInput(request:Request){
 const user=await requireUser(request);const document=validateDocument(await jsonBody(request));
 if(document.slides.length>100)throw new ApiError(400,"Export up to 100 slides at a time.");
 let total=0;const cache=new Map<string,string>();
 async function media(src:string):Promise<string>{
  if(cache.has(src))return cache.get(src)!;
  let bytes:Buffer;let contentType:string;
  const key=keyFromFileUrl(src);
  if(key){const object=await getObject(key);bytes=Buffer.from(await object.Body!.transformToByteArray());contentType=object.ContentType||"application/octet-stream";}
  else if(src.startsWith("data:image/")){const match=src.match(/^data:(image\/[^;]+);base64,([\s\S]*)$/);if(!match)throw new ApiError(400,"Invalid embedded image.");contentType=match[1];bytes=Buffer.from(match[2],"base64");}
  else if(src.startsWith("https://")){({bytes,contentType}=await downloadRemote(src));}
  else throw new ApiError(400,"Unsupported image source.");
  if(!contentType.startsWith("image/"))return "";
  total+=bytes.length;if(total>80*1024*1024)throw new ApiError(413,"Presentation media is too large for one export.");
  bytes=Buffer.from(await sharp(bytes,{limitInputPixels:40_000_000}).png().toBuffer());const result="data:image/png;base64,"+bytes.toString("base64");cache.set(src,result);return result;
 }
 async function walk(value:unknown,key=""):Promise<unknown>{
  if(typeof value==="string"){
   if(["src","imageUrl","image_url","poster","thumbnail"].includes(key)&&/^(https:\/\/|https?:\/\/[^/]+\/api\/files\/|\/api\/files\/|data:image\/)/.test(value))return media(value);
   if(key==="background"){const found=value.match(/url\(["']?([^"')]+)["']?\)/);if(found)return value.replace(found[1],await media(found[1]));}
   return value;
  }
  if(Array.isArray(value)){const result=[];for(const item of value)result.push(await walk(item,key));return result;}
  if(value&&typeof value==="object"){const result:Record<string,unknown>={};for(const [k,v]of Object.entries(value))result[k]=await walk(v,k);return result;}
  return value;
 }
 return {user,document:await walk(document) as typeof document};
}
