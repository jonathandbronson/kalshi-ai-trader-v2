// Read-only discovery of cross-exchange candidates; NOT settlement verification.
import {writeFile} from "node:fs/promises";
import {kalshiDepth,polyDepth} from "./live-adapters.js";
const output=process.env.ARB_CANDIDATE_OUTPUT??"arbitrage-candidates.json";
const limit=Math.max(1,Math.min(5,Number(process.env.ARB_PAGES??3)));
const maxCandidates=Math.max(1,Math.min(30,Number(process.env.ARB_MAX_CANDIDATES??20)));
async function get(url){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),12000);
 try{const r=await fetch(url,{signal:c.signal,headers:{accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status+" "+new URL(url).hostname);return await r.json()}finally{clearTimeout(timer)}
}
function parseArray(v){try{const x=typeof v==="string"?JSON.parse(v):v;return Array.isArray(x)?x:[]}catch{return []}}
function tokens(t){return new Set(String(t??"").toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(x=>x.length>2&&!["will","the","and","yes","not","before","after","does","this","that","with","for","2026","2027","2028","market"].includes(x)))}
function similarity(a,b){const x=tokens(a),y=tokens(b);if(!x.size||!y.size)return 0;const shared=[...x].filter(v=>y.has(v)).length;return shared/Math.sqrt(x.size*y.size)}
function date(v){const n=Date.parse(v??"");return Number.isFinite(n)?new Date(n).toISOString().slice(0,10):null}
const clean=s=>String(s??"").slice(0,240);
async function main(){
 const report={timestamp:new Date().toISOString(),mode:"READ_ONLY_DISCOVERY",autoApproved:0,verifiedPairs:0,notes:["Similarity is only a research lead, NOT settlement equivalence","No orders, paper entries, or approved pairs are generated"],counts:{},candidates:[],errors:[]};
 const kalshi=[],poly=[];let cursor="";
 for(let i=0;i<limit;i++){
  try{const u=new URL("https://external-api.kalshi.com/trade-api/v2/markets");u.searchParams.set("limit","100");u.searchParams.set("status","open");if(cursor)u.searchParams.set("cursor",cursor);const r=await get(u.toString());kalshi.push(...(r.markets??[]));cursor=r.cursor??"";if(!cursor)break}catch(e){report.errors.push("kalshi listing: "+e.message);break}
 }
 for(let i=0;i<limit;i++){
  try{const u=new URL("https://gamma-api.polymarket.com/markets");u.searchParams.set("limit","100");u.searchParams.set("offset",String(i*100));u.searchParams.set("active","true");u.searchParams.set("closed","false");const r=await get(u.toString());if(!Array.isArray(r))throw Error("Invalid response");poly.push(...r);if(r.length<100)break}catch(e){report.errors.push("polymarket listing: "+e.message);break}
 }
 report.counts={kalshiMarkets:kalshi.length,polymarketMarkets:poly.length};
 const ps=poly.filter(m=>{const o=parseArray(m.outcomes),t=parseArray(m.clobTokenIds);return o.length===2&&t.length===2&&o.includes("Yes")&&o.includes("No")&&m.enableOrderBook!==false});
 report.counts.polymarketBinaryMarkets=ps.length;
 const candidates=[];
 for(const k of kalshi){if(!k.ticker||!k.title)continue;for(const p of ps){
  const score=similarity(k.title,p.question);if(score<0.65)continue;
  const kd=date(k.close_time??k.expiration_time),pd=date(p.endDate??p.end_date_iso);
  candidates.push({score:Math.round(score*1000)/1000,kalshi:{ticker:clean(k.ticker),title:clean(k.title),closeDate:kd},polymarket:{id:clean(p.id),title:clean(p.question),endDate:pd},dateDifferenceDays:kd&&pd?Math.abs((Date.parse(kd)-Date.parse(pd))/86400000):null});
 }}
 candidates.sort((a,b)=>b.score-a.score);
 report.counts.titleCandidates=candidates.length;
 for(const item of candidates.slice(0,maxCandidates)){
  const k=item.kalshi,p=item.polymarket;
  const full=ps.find(x=>String(x.id)===p.id),outcomes=parseArray(full?.outcomes),ids=parseArray(full?.clobTokenIds);
  try{
   const [kb,yesBook,noBook]=await Promise.all([
    get("https://external-api.kalshi.com/trade-api/v2/markets/"+encodeURIComponent(k.ticker)+"/orderbook?depth=20"),
    get("https://clob.polymarket.com/book?token_id="+encodeURIComponent(ids[outcomes.indexOf("Yes")])),
    get("https://clob.polymarket.com/book?token_id="+encodeURIComponent(ids[outcomes.indexOf("No")]))
   ]);
   if(String(yesBook.asset_id)!==String(ids[outcomes.indexOf("Yes")])||String(noBook.asset_id)!==String(ids[outcomes.indexOf("No")]))throw Error("CLOB token mismatch");
   const a=kalshiDepth(kb),y=polyDepth(yesBook),n=polyDepth(noBook);
   item.topOfBook={kalshiYesAsk:a.yes[0]?.price??null,kalshiNoAsk:a.no[0]?.price??null,polymarketYesAsk:y[0]?.price??null,polymarketNoAsk:n[0]?.price??null,kalshiYesAskSize:a.yes[0]?.size??0,kalshiNoAskSize:a.no[0]?.size??0,polymarketYesAskSize:y[0]?.size??0,polymarketNoAskSize:n[0]?.size??0};
   const legs=[{direction:"KALSHI_YES_POLY_NO",sum:a.yes[0]?.price+n[0]?.price},{direction:"POLY_YES_KALSHI_NO",sum:y[0]?.price+a.no[0]?.price}];
   item.illustrativeBeforeFees=legs.filter(x=>Number.isFinite(x.sum)).map(x=>({direction:x.direction,combinedAsk:Math.round(x.sum*10000)/10000,grossSpreadPerShare:Math.round((1-x.sum)*10000)/10000}));
  }catch(e){item.bookError=e.message}
  item.reviewStatus="UNVERIFIED_SETTLEMENT_RULES";report.candidates.push(item);
 }
 report.counts.orderbooksChecked=report.candidates.length;
 report.status=report.errors.length?"PARTIAL":"COLLECTED";
 await writeFile(output,JSON.stringify(report,null,2)+"\n");console.log(JSON.stringify({status:report.status,counts:report.counts,errors:report.errors,candidates:report.candidates.slice(0,5)},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
