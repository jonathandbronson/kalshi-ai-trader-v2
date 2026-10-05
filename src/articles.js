import {createHash} from "node:crypto";
import {assertIndependent} from "./contamination.js";
import {hostname} from "./sourceQuality.js";
const roots=["reuters.com","apnews.com","bbc.com","bbc.co.uk","npr.org","bls.gov","bea.gov","federalreserve.gov","weather.gov","noaa.gov","census.gov","fec.gov","congress.gov","supremecourt.gov","nasa.gov","sec.gov","whitehouse.gov","cdc.gov","fda.gov"];
export function allowedArticle(url){try{const u=new URL(url);return u.protocol==="https:"&&!u.username&&!u.password&&(!u.port||u.port==="443")&&roots.some(h=>u.hostname===h||u.hostname.endsWith("."+h));}catch{return false;}}
export async function readArticle(lead){if(!allowedArticle(lead.url))throw new Error("Unsupported research source");assertIndependent(lead);
 const r=await fetch(lead.url,{signal:AbortSignal.timeout(12000),redirect:"error",headers:{accept:"text/html"}});if(!r.ok)throw new Error("Article unavailable");
 if(!(r.headers.get("content-type")??"").includes("text/html"))throw new Error("Unsupported article format");
 const reader=r.body.getReader();let size=0,parts=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>500000)throw new Error("Article too large");parts.push(value);}}finally{await reader.cancel();}
 const html=Buffer.concat(parts).toString("utf8");
 const content=(html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i)?.[1]??html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i)?.[1]);if(!content)throw new Error("Article body unavailable");
 const claim=content.replace(/<(script|style|nav|footer|header)\b[^>]*>[\s\S]*?<\/\1>/gi," ").replace(/<[^>]*>/g," ").replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&amp;/g,"&").replace(/&quot;/g,'"').replace(/&#39;/g,"'").replace(/&[^; ]+;/g," ").replace(/\s+/g," ").trim();
 assertIndependent(claim);if(claim.length<200)throw new Error("Insufficient article content");
 const metaDate=html.match(/<meta[^>]*(?:property|name)=["'](?:article:published_time|datePublished|date)["'][^>]*content=["']([^"']+)["']/i)?.[1]??html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1]??html.match(/<time[^>]*datetime=["']([^"']+)["']/i)?.[1];
 const rawDate=metaDate??lead.publishedAt;const publishedAt=/^\d{8}T\d{6}Z$/.test(rawDate??"")?rawDate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,"$1-$2-$3T$4:$5:$6Z"):rawDate;
 return {...lead,claim:claim.slice(0,12000),headlineOnly:false,publishedAt,retrievedAt:new Date().toISOString(),contentHash:createHash("sha256").update(claim).digest("hex"),source:hostname(lead.url),sourceType:hostname(lead.url).endsWith(".gov")?"PRIMARY":"REPORTING"};
}
