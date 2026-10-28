import OpenAI from "openai";
import {ApiError,consumeAi} from "./api";
import {saveAsset} from "./assets";
const client=()=>{if(!process.env.OPENAI_API_KEY)throw new ApiError(503,"AI generation is not configured.");return new OpenAI({apiKey:process.env.OPENAI_API_KEY,timeout:120000,maxRetries:1});};
export async function generateImage(userId:string,prompt:unknown){
 if(typeof prompt!=="string"||!prompt.trim()||prompt.length>4000)throw new ApiError(400,"Enter a prompt of up to 4,000 characters.");
 await consumeAi(userId);
 const response=await client().images.generate({model:"gpt-image-1",prompt,size:"1024x1024",n:1});
 const encoded=response.data?.[0]?.b64_json;if(!encoded)throw new ApiError(502,"No image was generated.");
 return saveAsset(userId,Buffer.from(encoded,"base64"),"ai-images",prompt.slice(0,80)+".png","image/png","png");
}
