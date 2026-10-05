import {transact} from "./store.js";
import {fetchMetadata} from "./contamination.js";
function validQuote(n){if(!Number.isFinite(n)||n<0||n>1)throw new Error("Malformed Kalshi price");return n;}
const BASE_URL=process.env.KALSHI_API_BASE_URL??"https://external-api.kalshi.com/trade-api/v2";
async function request(path,stage){
 const id=crypto.randomUUID();await transact(s=>{s.costs.push({id,provider:"kalshi",stage,status:"REQUESTED",estimatedCost:0,attempts:1,at:new Date().toISOString()});});
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const response=await fetch(`${BASE_URL}${path}`,{signal:controller.signal,headers:{accept:"application/json","user-agent":"kalshi-ai-trader-v2/1.0"}});
 if(!response.ok)throw new Error(`Kalshi API ${response.status}`);const data=await response.json();await transact(s=>{s.costs.find(c=>c.id===id).status="COMPLETED";});return data;}
 catch(e){await transact(s=>{s.costs.find(c=>c.id===id).status="FAILED";});throw e;}
 finally{clearTimeout(timer)}
}
export async function getMarkets({limit=100,cursor,status="open",seriesTicker,minCloseTs,mveFilter="exclude"}={}){
 const q=new URLSearchParams({limit:String(Math.min(200,Math.max(1,limit)))});
 if(mveFilter)q.set("mve_filter",mveFilter);if(cursor)q.set("cursor",cursor);if(status)q.set("status",status);if(seriesTicker)q.set("series_ticker",seriesTicker);if(minCloseTs)q.set("min_close_ts",String(minCloseTs));
 return request(`/markets?${q}`,"CANDIDATE_DISCOVERY");
}
export async function getMarket(ticker,{stage="MARKET_METADATA_OR_STATUS"}={}){if(!ticker)throw new Error("ticker required");return request(`/markets/${encodeURIComponent(ticker)}`,stage)}
export async function getOrderbook(ticker,depth=10){if(!ticker)throw new Error("ticker required");return request(`/markets/${encodeURIComponent(ticker)}/orderbook?depth=${Math.max(1,Math.min(100,depth))}`,"POST_LOCK_ORDERBOOK")}
export function centsToProbability(cents){return cents==null?null:validQuote(Number(cents)/100)}
export function dollarsToProbability(dollars){if(dollars==null||dollars==="")return null;const n=Number(dollars);return validQuote(n)}
const quote=(raw,dollars,cents)=>dollarsToProbability(raw[dollars])??centsToProbability(raw[cents]);
const numeric=(raw,fp,legacy)=>{const n=Number(raw[fp]??raw[legacy]??0);return Number.isFinite(n)?n:0};
export function normalizeMarket(raw){
 return {ticker:raw.ticker,title:raw.title,subtitle:raw.subtitle,status:raw.status,closeTime:raw.close_time,
 yesBid:quote(raw,"yes_bid_dollars","yes_bid"),yesAsk:quote(raw,"yes_ask_dollars","yes_ask"),
 noBid:quote(raw,"no_bid_dollars","no_bid"),noAsk:quote(raw,"no_ask_dollars","no_ask"),
 volume:numeric(raw,"volume_fp","volume"),openInterest:numeric(raw,"open_interest_fp","open_interest"),
 rulesPrimary:raw.rules_primary??"",rulesSecondary:raw.rules_secondary??""};
}

export function executableBook(data){
 const fp=data.orderbook_fp,legacy=data.orderbook;
 if(!fp&&!legacy)throw new Error('Malformed Kalshi order book');
 const levels=(values,scale)=>{
  if(!Array.isArray(values))throw new Error('Malformed order book levels');
  return values.map(row=>{if(!Array.isArray(row)||row.length!==2)throw new Error('Malformed book level');const price=Number(row[0])/scale,quantity=Number(row[1]);validQuote(price);if(!Number.isFinite(quantity)||quantity<0)throw new Error('Malformed book quantity');return {price,quantity};}).filter(r=>r.quantity>=1&&r.price>0&&r.price<1).sort((a,b)=>b.price-a.price);
 };
 const yes=levels(fp?.yes_dollars??legacy?.yes??[],fp?1:100),no=levels(fp?.no_dollars??legacy?.no??[],fp?1:100);
 return {yesBid:yes[0]?.price??null,noBid:no[0]?.price??null,yesAsk:no.length?Number((1-no[0].price).toFixed(4)):null,noAsk:yes.length?Number((1-yes[0].price).toFixed(4)):null,yesAvailable:Math.floor(no[0]?.quantity??0),noAvailable:Math.floor(yes[0]?.quantity??0)};
}

export async function getResearchMarket(ticker){return fetchMetadata(getMarket,ticker);}
