// The SDK-compatible subset used by the editor. Credentials stay on the server.
import type {PhotosWithTotalResults,Videos} from "pexels";
import { apiFetch } from "@shared/apiFetch";
async function search(kind:string,params:Record<string,unknown>){
 const query=new URLSearchParams({kind});for(const [key,value] of Object.entries(params))if(value!==undefined)query.set(key,String(value));
 const res=await apiFetch("/api/stock?"+query);const data=await res.json();if(!res.ok)throw new Error(data.error||"Stock search failed.");return data;
}
export function createClient(_unused?:string){return {photos:{search:(params:Record<string,unknown>)=>search("photos",params) as Promise<PhotosWithTotalResults>,curated:(params:Record<string,unknown>)=>search("photos",{query:"nature",...params}) as Promise<PhotosWithTotalResults>},videos:{search:(params:Record<string,unknown>)=>search("videos",params) as Promise<Videos>}};}

