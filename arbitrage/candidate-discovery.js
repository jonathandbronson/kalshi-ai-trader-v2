// Read-only discovery of cross-exchange candidates; NOT settlement verification.
import {writeFile} from "node:fs/promises";
import {kalshiDepth,polyDepth} from "./live-adapters.js";
const output=process.env.ARB_CANDIDATE_OUTPUT??"arbitrage-candidates.json";
const limit=Math.max(1,Math.min(20,Number(process.env.ARB_PAGES??12)));
const maxCandidates=Math.max(1,Math.min(30,Number(process.env.ARB_MAX_CANDIDATES??20)));
const MAX_POOL=Number(process.env.ARB_MAX_POOL??600);
async function get(url){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),12000);
 try{const r=await fetch(url,{signal:c.signal,headers:{accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status+" "+new URL(url).hostname);return await r.json()}finally{clearTimeout(timer)}
}
function parseArray(v){try{const x=typeof v==="string"?JSON.parse(v):v;return Array.isArray(x)?x:[]}catch{return []}}
function tokens(t){return new Set(String(t??"").toLowerCase().replace(/[^a-z0-9 ]/g," ").split(/\s+/).filter(x=>x.length>2&&!["will","the","and","yes","not","before","after","does","this","that","with","for","2026","2027","2028","market"].includes(x)))}
function similarity(a,b){const x=tokens(a),y=tokens(b);if(!x.size||!y.size)return 0;const shared=[...x].filter(v=>y.has(v)).length;return shared/Math.sqrt(x.size*y.size)}
const GENERIC=new Set(["both","teams","team","score","scored","goals","goal","over","under","win","wins","winner","game","match","league","football","basketball","soccer","points","total","first","second","half","full","time","more","less","than","each","either","draw","against","october","november","december","january","february","march","april","may","june","july","august","september","2026","2027","2028","yes","no","the","will","versus","after","before","2025","2024"]);
function distinctive(s){return [...tokens(s)].filter(t=>!GENERIC.has(t)&&!/^\\d+$/.test(t));}
function eventGate(k,p){
 const kr=String(k.rules_primary??"").toLowerCase(),kt=String(k.title??"").toLowerCase(),pt=String(p.question??"").toLowerCase(),pd=String(p.description??"").toLowerCase();
 // Virtual sports and real-world sports are never the same underlying event.
 if(/\\besports?\\b|\\bebasketball\\b|\\besoccer\\b|valhalla league|valhalla cup|\\(wemby\\)|\\(haze\\)|\\(lenny\\)/i.test(kr+" "+kt))return false;
 // Championship and single-game outcome contracts are not interchangeable.
 const season=/\\bchampion(ship)?\\b|\\bfinals\\b|\\bplayoffs\\b|\\btitle\\b|\\bnomination\\b/i;
 if(season.test(pt)!==season.test(kt))return false;
 if(season.test(pt)&&/\\bgame\\b|\\bmatch\\b|\\bwins\\b/i.test(kt+" "+kr)&&!season.test(kt))return false;
 // Require a shared, explicit calendar day where both contracts specify one.
 const kdate=(kr+" "+kt).match(/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\s+\\d{1,2},?\\s+20\\d\\d/i);
 const pdate=(pt+" "+pd).match(/(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\\s+\\d{1,2},?\\s+20\\d\\d/i);
 if(kdate&&pdate&&Date.parse(kdate[0])!==Date.parse(pdate[0]))return false;
 return true;
}
function contextGate(k,p){
 const kt=distinctive([k.title,k.subtitle,k.rules_primary].filter(Boolean).join(" "));
 const pt=new Set(distinctive([p.question,p.groupItemTitle].filter(Boolean).join(" ")));
 const common=kt.filter(t=>pt.has(t));
 // Reject generic market labels whose teams, people or entities do not overlap.
 return common.length>=2;
}
function matchingScore(k,p){
 const kalshiTexts=[k.title,k.subtitle,[k.title,k.subtitle].filter(Boolean).join(" "),k.event_title].filter(Boolean);
 const polyTexts=[p.question,p.groupItemTitle,[p.question,p.groupItemTitle].filter(Boolean).join(" ")].filter(Boolean);
 let best=0;
 for(const a of kalshiTexts)for(const b of polyTexts){
   const shared=[...tokens(a)].filter(x=>tokens(b).has(x));
   // A single shared word, including an athlete or city name, is insufficient evidence.
   if(shared.length<2)continue;
   best=Math.max(best,similarity(a,b));
 }
 return best;
}
function isSingleOutcome(k){
 const title=String(k.title??"");
 const ticker=String(k.ticker??"");
 return !/^KXMVE/i.test(ticker) && !/^KXE(?:SOCCER|BASKETBALL)/i.test(ticker) && !/^(?:yes|no) .*,\s*(?:yes|no) /i.test(title) && title.length<200;
}
function numeric(v){const n=Number(v);return Number.isFinite(n)?n:0}
function date(v){const n=Date.parse(v??"");return Number.isFinite(n)?new Date(n).toISOString().slice(0,10):null}
const clean=s=>String(s??"").slice(0,240);
async function main(){
 const report={timestamp:new Date().toISOString(),mode:"READ_ONLY_DISCOVERY",autoApproved:0,verifiedPairs:0,notes:["Similarity is only a research lead, NOT settlement equivalence","No orders, paper entries, or approved pairs are generated"],counts:{},candidates:[],errors:[]};
 const kalshi=[],poly=[];let cursor="";let kalshiRaw=0;
 for(let i=0;i<limit;i++){
  try{const u=new URL("https://external-api.kalshi.com/trade-api/v2/markets");u.searchParams.set("limit","100");u.searchParams.set("status","open");u.searchParams.set("mve_filter","exclude");if(cursor)u.searchParams.set("cursor",cursor);const r=await get(u.toString());kalshiRaw+=(r.markets??[]).length;kalshi.push(...(r.markets??[]).filter(isSingleOutcome));cursor=r.cursor??"";if(!cursor||kalshi.length>=MAX_POOL)break}catch(e){report.errors.push("kalshi listing: "+e.message);break}
 }
 for(let i=0;i<limit;i++){
  try{const u=new URL("https://gamma-api.polymarket.com/markets");u.searchParams.set("limit","100");u.searchParams.set("offset",String(i*100));u.searchParams.set("active","true");u.searchParams.set("closed","false");u.searchParams.set("order","volume24hr");u.searchParams.set("ascending","false");const r=await get(u.toString());if(!Array.isArray(r))throw Error("Invalid response");poly.push(...r);if(r.length<100)break}catch(e){report.errors.push("polymarket listing: "+e.message);break}
 }
 report.counts={kalshiRawMarkets:kalshiRaw,kalshiSingleOutcomeMarkets:kalshi.length,kalshiMarkets:kalshi.length,polymarketMarkets:poly.length};
 const ps=poly.filter(m=>{const o=parseArray(m.outcomes),t=parseArray(m.clobTokenIds);return o.length===2&&t.length===2&&o.includes("Yes")&&o.includes("No")&&m.enableOrderBook!==false});
 report.counts.polymarketBinaryMarkets=ps.length;
 report.samples={kalshi:kalshi.slice(0,4).map(m=>({title:clean(m.title),subtitle:clean(m.subtitle),ticker:clean(m.ticker)})),polymarket:ps.slice(0,4).map(m=>({title:clean(m.question),id:clean(m.id)}))};
 const candidates=[];
 for(const k of kalshi){if(!k.ticker||!k.title)continue;for(const p of ps){
  if(!eventGate(k,p)||!contextGate(k,p))continue;
  const score=matchingScore(k,p);if(score<0.48)continue;
  const kd=date(k.close_time??k.expiration_time),pd=date(p.endDate??p.end_date_iso);
  candidates.push({score:Math.round(score*1000)/1000,kalshi:{ticker:clean(k.ticker),title:clean(k.title),subtitle:clean(k.subtitle),rulesPrimary:clean(k.rules_primary),rulesSecondary:clean(k.rules_secondary),closeDate:kd},polymarket:{id:clean(p.id),title:clean(p.question),description:clean(p.description),resolutionSource:clean(p.resolutionSource),endDate:pd},dateDifferenceDays:kd&&pd?Math.abs((Date.parse(kd)-Date.parse(pd))/86400000):null});
 }}
 candidates.sort((a,b)=>b.score-a.score);
 report.counts.titleCandidates=candidates.length;
 report.counts.kalshiPagesRequested=limit;
 report.counts.polymarketPagesRequested=limit;
 report.matching={threshold:0.48,minimumSharedTokens:2,minimumDistinctiveContextTokens:2,eventTypeGate:true,dateGate:true,kalshiExcludedMultiLeg:true,kalshiApiMveFilter:"exclude",polymarketOrder:"volume24hr descending",warning:"Text similarity is not proof of settlement equivalence; all results require manual rules review."};
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
