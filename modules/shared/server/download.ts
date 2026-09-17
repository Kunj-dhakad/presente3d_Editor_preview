import https from "node:https";
import dns from "node:dns";
import { BlockList, isIP } from "node:net";
import { ApiError } from "./api";
const blocked = new BlockList();
for (const [address,prefix] of [["0.0.0.0",8],["10.0.0.0",8],["100.64.0.0",10],["127.0.0.0",8],["169.254.0.0",16],["172.16.0.0",12],["192.168.0.0",16],["192.0.0.0",24],["198.18.0.0",15],["224.0.0.0",4],["240.0.0.0",4]] as const) blocked.addSubnet(address,prefix,"ipv4");
export function isPublicAddress(address:string) {
  if(isIP(address)===4)return !blocked.check(address,"ipv4");
  // Only global unicast IPv6; reject mapped IPv4, documentation and transition ranges.
  return isIP(address)===6 && /^[23][0-9a-f]{3}:/i.test(address) && !/^2001:(db8|0|10|20):/i.test(address) && !/^2002:/i.test(address);
}
export async function downloadRemote(input:string,maxBytes=20*1024*1024,redirects=0):Promise<{bytes:Buffer;contentType:string}> {
  const url=new URL(input);
  if(url.protocol!=="https:"||url.username||url.password||(url.port&&url.port!=="443")||redirects>3)throw new ApiError(400,"Use a public HTTPS media URL.");
  if(isIP(url.hostname.replace(/^\[|\]$/g,""))&&!isPublicAddress(url.hostname.replace(/^\[|\]$/g,"")))throw new ApiError(400,"Private network URLs are not allowed.");
  return new Promise((resolve,reject)=>{
    const req=https.get(url,{timeout:20000,lookup:(hostname,options,callback)=>{
      dns.lookup(hostname,{all:true},(error,addresses)=>{
        if(error)return callback(error,"",4);
        if(!addresses.length||addresses.some(a=>!isPublicAddress(a.address)))return callback(new Error("Private network URL blocked."),"",4);
        if(typeof options==="object"&&options.all)callback(null,addresses as never);
        else callback(null,addresses[0].address,addresses[0].family);
      });
    }},res=>{
      if(res.statusCode&&res.statusCode>=300&&res.statusCode<400&&res.headers.location){res.resume();downloadRemote(new URL(res.headers.location,url).href,maxBytes,redirects+1).then(resolve,reject);return;}
      if(res.statusCode!==200){res.resume();reject(new ApiError(502,"The media source could not be downloaded."));return;}
      if(Number(res.headers["content-length"])>maxBytes){res.destroy();reject(new ApiError(413,"Remote file is too large."));return;}
      const chunks:Buffer[]=[];let total=0;
      res.on("data",(chunk:Buffer)=>{total+=chunk.length;if(total>maxBytes){res.destroy(new ApiError(413,"Remote file is too large."));}else chunks.push(chunk);});
      res.on("end",()=>resolve({bytes:Buffer.concat(chunks),contentType:String(res.headers["content-type"]||"application/octet-stream").split(";")[0]}));
      res.on("error",reject);
    });
    req.on("timeout",()=>req.destroy(new Error("Media download timed out.")));req.on("error",reject);
  });
}

