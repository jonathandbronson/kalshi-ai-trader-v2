// Live public-data diagnostic. Does NOT trade or attest cross-exchange equivalence.
import {writeFile} from "node:fs/promises";
import {kalshiDepth,polyDepth} from "./live-adapters.js";
const out=process.env.ARB_PROBE_OUTPUT??"arbitrage-probe.json";
async function get(url){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),15000);
 try{const r=await fetch(url,{signal:controller.signal,headers:{accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status+" "+url);return await r.json()}finally{clearTimeout(timer)}
}
const text=x=>String(x??"").slice(0,200);
async function main(){
 const report={timestamp:new Date().toISOString(),mode:"READ_ONLY",verifiedPairs:0,opportunities:[],checks:{},samples:{},errors:[]};
 try{
  const k=await get("https://external-api.kalshi.com/trade-api/v2/markets?limit=100&status=open");
  if(!Array.isArray(k.markets))throw Error("Kalshi markets array missing");
  report.checks.kalshiMarkets=true;report.samples.kalshiMarketCount=k.markets.length;
  const m=k.markets.find(x=>x.ticker);
  if(m){const book=await get("https://external-api.kalshi.com/trade-api/v2/markets/"+encodeURIComponent(m.ticker)+"/orderbook?depth=10");
   const depth=kalshiDepth(book);report.checks.kalshiOrderbook=true;
   report.samples.kalshi={ticker:text(m.ticker),title:text(m.title),yesLevels:depth.yes.length,noLevels:depth.no.length,yesBestAsk:depth.yes[0]?.price??null,noBestAsk:depth.no[0]?.price??null,format:book.orderbook_fp?"orderbook_fp":book.orderbook?"orderbook":"unknown"};
  }
 }catch(e){report.checks.kalshiMarkets=false;report.errors.push("Kalshi: "+e.message)}
 try{
  const p=await get("https://gamma-api.polymarket.com/markets?limit=100&active=true&closed=false");
  if(!Array.isArray(p))throw Error("Polymarket markets array missing");
  report.checks.polymarketMarkets=true;report.samples.polymarketMarketCount=p.length;
  const parse=x=>Array.isArray(x)?x:JSON.parse(x);
  const m=p.find(x=>{try{const a=parse(x.clobTokenIds),o=parse(x.outcomes);return a.length===2&&o.includes("Yes")&&o.includes("No")&&x.enableOrderBook!==false}catch{return false}});
  if(m){
   const tokens=parse(m.clobTokenIds),outcomes=parse(m.outcomes);
   const token=String(tokens[outcomes.indexOf("Yes")]);
   const b=await get("https://clob.polymarket.com/book?token_id="+encodeURIComponent(token));
   if(String(b.asset_id)!==token)throw Error("CLOB asset_id mismatch");
   const depth=polyDepth(b);report.checks.polymarketOrderbook=true;
   report.samples.polymarket={marketId:text(m.id),title:text(m.question),yesAskLevels:depth.length,yesBestAsk:depth[0]?.price??null,clobTokenValidated:true};
  }else report.errors.push("Polymarket: no binary book-enabled market in first 100");
 }catch(e){report.checks.polymarketMarkets=false;report.errors.push("Polymarket: "+e.message)}
 report.status=report.errors.length?"PARTIAL_OR_FAILED":"PUBLIC_ENDPOINTS_RESPONDED";
 await writeFile(out,JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify(report,null,2));
 if(!report.checks.kalshiOrderbook||!report.checks.polymarketOrderbook)process.exitCode=1;
}
main().catch(e=>{console.error(e);process.exitCode=1});
