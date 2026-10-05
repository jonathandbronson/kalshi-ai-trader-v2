import {createHash} from "node:crypto";
import {assertIndependent} from "./contamination.js";
import {hostname} from "./sourceQuality.js";
import {publicDocument,plainText,attributes,elementBody} from "./publicDocuments.js";
import {BLS_CPI_FEED,readFeed,blsFeedReport} from "./publicFeeds.js";
const roots=["reuters.com","apnews.com","bbc.com","bbc.co.uk","npr.org","bls.gov","bea.gov","federalreserve.gov","weather.gov","noaa.gov","census.gov","fec.gov","congress.gov","supremecourt.gov","nasa.gov","sec.gov","whitehouse.gov","cdc.gov","fda.gov"];
export function allowedArticle(url){try{const u=new URL(url);return u.protocol==="https:"&&!u.username&&!u.password&&(!u.port||u.port==="443")&&roots.some(h=>u.hostname===h||u.hostname.endsWith("."+h));}catch{return false;}}
export async function readArticle(lead){if(!allowedArticle(lead.url))throw new Error("Unsupported research source");assertIndependent(lead);
 let document;
 try{document=await publicDocument(lead.url);}
 catch(e){
  const u=new URL(lead.url);
  if(e.status!==403||u.hostname!=="www.bls.gov"||!/^\/news\.release\/(?:cpi(?:\.nr0)?\.htm|archives\/cpi_\d{8}\.htm)$/.test(u.pathname))throw e;
  const entries=await readFeed(BLS_CPI_FEED),entry=u.pathname.includes("/archives/")?entries.find(x=>x.url===lead.url):entries[0];
  if(!entry)throw new Error("Blocked BLS release has no matching public feed entry");
  return blsFeedReport(entry);
 }
 if(!/html/i.test(document.type))throw new Error("Unsupported article format");
 const html=document.text;
 const officialFed=hostname(lead.url)==="federalreserve.gov";
 const content=(officialFed?elementBody(html,(_,a)=>a.id==="article"):null)
  ??elementBody(html,tag=>tag==="article")??elementBody(html,tag=>tag==="main");
 if(!content)throw new Error("Article body unavailable");
 const claim=plainText(content);
 assertIndependent(claim);if(claim.length<200)throw new Error("Insufficient article content");
 const metaDate=[...html.matchAll(/<meta\b[^>]*>/gi)].map(m=>attributes(m[0])).find(a=>/^(article:published_time|datePublished|date|DC.date)$/i.test(a.property??a.name??""))?.content
  ??html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1]??html.match(/<time[^>]*datetime=["']([^"']+)["']/i)?.[1]
  ??(officialFed?plainText(elementBody(html,(_,a)=>(a.class??"").split(/\s+/).includes("article__time"))??"")||undefined:undefined);
 const rawDate=metaDate??lead.publishedAt;const publishedAt=/^\d{8}T\d{6}Z$/.test(rawDate??"")?rawDate.replace(/(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z/,"$1-$2-$3T$4:$5:$6Z"):rawDate;
 if(!Number.isFinite(Date.parse(publishedAt)))throw new Error("Article publication date unavailable");
 const {feedBody,...metadata}=lead;
 return {...metadata,claim:claim.slice(0,12000),headlineOnly:false,publishedAt,retrievedAt:new Date().toISOString(),contentHash:createHash("sha256").update(claim).digest("hex"),source:hostname(lead.url),sourceType:hostname(lead.url).endsWith(".gov")?"PRIMARY":"REPORTING",provenance:{format:"PUBLIC_HTML_BODY",canonicalUrl:lead.url,publicationField:metaDate?"document":"dated_feed_entry"}};
}
