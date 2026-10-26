// Standalone research-only Discovery V2 runner. It never modifies V1 reports,
// pair approvals, or the verified-pair registry.
import {readFile,writeFile} from "node:fs/promises";
import {normalizeMarkets,mergeSnapshot,discoverIndexedPairs,rankResearchCandidates} from "./discovery-v2.js";
const read=async(path,fallback)=>{try{return JSON.parse(await readFile(path,"utf8"))}catch(e){if(e.code==="ENOENT")return fallback;throw e}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function get(url){
 for(let i=0;i<3;i++){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
  try{
   const r=await fetch(url,{signal:ctrl.signal,headers:{accept:"application/json"}});
   if((r.status===429||r.status>=500)&&i<2){await sleep(500*2**i);continue}
   if(!r.ok)throw Error("HTTP "+r.status+" "+new URL(url).hostname);
   return await r.json();
  }finally{clearTimeout(timer)}
 }
 throw Error("Retries exhausted");
}
async function collect(){
 const pages=Math.max(1,Math.min(20,Number(process.env.ARB_V2_PAGES??8)));
 const k=[],p=[],errors=[];let cursor="",kComplete=false,pComplete=false;
 for(let i=0;i<pages;i++){
  try{
   const u=new URL("https://external-api.kalshi.com/trade-api/v2/events");
   u.searchParams.set("limit","100");u.searchParams.set("status","open");u.searchParams.set("with_nested_markets","true");
   if(cursor)u.searchParams.set("cursor",cursor);
   const data=await get(u);k.push(...(data.events??[]));cursor=data.cursor??"";
   if(!cursor){kComplete=true;break}
   await sleep(200);
  }catch(e){errors.push("kalshi: "+e.message);break}
 }
 for(let i=0;i<pages;i++){
  try{
   const u=new URL("https://gamma-api.polymarket.com/events");
   u.searchParams.set("limit","100");u.searchParams.set("offset",String(i*100));
   u.searchParams.set("active","true");u.searchParams.set("closed","false");
   u.searchParams.set("order","volume24hr");u.searchParams.set("ascending","false");
   const data=await get(u);if(!Array.isArray(data))throw Error("Invalid Polymarket response");
   p.push(...data);if(data.length<100){pComplete=true;break}
   await sleep(200);
  }catch(e){errors.push("polymarket: "+e.message);break}
 }
 return {kalshi:k,polymarket:p,errors,complete:kComplete&&pComplete};
}
const output=process.env.ARB_V2_OUTPUT??"arbitrage-discovery-v2.json";
const snapshotPath=process.env.ARB_V2_SNAPSHOT??"arbitrage-v2-market-snapshot.json";
const previous=await read(snapshotPath,{schemaVersion:2,markets:{}});
const collected=await collect();
const current=[...normalizeMarkets(collected.kalshi,"kalshi"),...normalizeMarkets(collected.polymarket,"polymarket")];
// The fetched pages are a partial view; preserve previous markets rather than deleting them.
// Stale entries are excluded from active matching until freshly observed.
const snapshot=mergeSnapshot(previous,current,{complete:collected.complete});
const activeIds=new Set(current.map(m=>m.id));
const active=Object.values(snapshot.markets).filter(m=>activeIds.has(m.id));
const cache=await read(process.env.ARB_V2_EMBEDDINGS??"arbitrage-embedding-cache.json",{vectors:{}});
const discovered=discoverIndexedPairs(active,{limit:Math.max(1,Math.min(5000,Number(process.env.ARB_V2_LIMIT??1000))),vectors:cache.vectors??{}});
const ranked=rankResearchCandidates(discovered.candidates);
const baseline=await read(process.env.ARB_V1_ARCHIVE??"reports/latest-discovery-archive.json",{candidates:[]});
const prior=new Set((baseline.candidates??[]).map(x=>String(x.kalshiTicker)+"|"+String(x.polymarketId)));
const overlap=ranked.filter(x=>prior.has(x.kalshiTicker+"|"+x.polymarketId)).length;
const report={timestamp:new Date().toISOString(),engine:"DISCOVERY_V2_SHADOW",status:collected.errors.length?"PARTIAL":"COLLECTED",
 researchOnly:true,autoApproved:0,verifiedPairs:0,liveOrders:0,
 collection:{kalshiEvents:collected.kalshi.length,polymarketEvents:collected.polymarket.length,errors:collected.errors,complete:collected.complete},
 snapshot:snapshot.stats,discovery:discovered.stats,
 comparison:{baselineCandidates:(baseline.candidates??[]).length,overlap,newVsBaseline:ranked.length-overlap,
 caveat:"Different collection coverage can affect counts; candidate totals do not measure verified settlement equivalence."},
 candidates:ranked,notes:["Unverified candidates are not executable arbitrage.","Price and liquidity ranking requires separate verified-pair order-book observation.","No auto-approval, trading, or external order placement."]};
await writeFile(snapshotPath,JSON.stringify(snapshot)+"\n");
await writeFile(output,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({status:report.status,collection:report.collection,snapshot:report.snapshot,discovery:report.discovery,comparison:report.comparison}));
