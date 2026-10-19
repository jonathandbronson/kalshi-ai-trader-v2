import {getMarkets,getOrderbook,normalizeMarket} from "../src/kalshi.js";
const POLY_BASE="https://gamma-api.polymarket.com";
async function json(url,{fetcher=fetch,timeoutMs=12000}={}){
 const c=new AbortController(),timer=setTimeout(()=>c.abort(),timeoutMs);
 try {const r=await fetcher(url,{signal:c.signal,headers:{accept:"application/json"}});if(!r.ok)throw new Error("HTTP "+r.status+" from "+new URL(url).hostname);return await r.json()}finally{clearTimeout(timer)}
}
export async function kalshiMarkets({limit=100}={}){
 const response=await getMarkets({limit});
 return (response.markets??[]).map(raw=>({...normalizeMarket(raw),venue:"kalshi",id:raw.ticker,raw}));
}
export async function polymarketMarkets({limit=100,offset=0,fetcher=fetch}={}){
 const q=new URLSearchParams({limit:String(Math.min(Math.max(limit,1),500)),offset:String(Math.max(0,offset)),active:"true",closed:"false"});
 const data=await json(POLY_BASE+"/markets?"+q,{fetcher});
 return data.map(m=>({venue:"polymarket",id:String(m.id),title:m.question??"",description:m.description??"",conditionId:m.conditionId,clobTokenIds:parseArray(m.clobTokenIds),outcomes:parseArray(m.outcomes),endDate:m.endDate,raw:m}));
}
export function parseArray(x){if(Array.isArray(x))return x;if(typeof x==="string"){try{const a=JSON.parse(x);return Array.isArray(a)?a:[]}catch{return []}}return []}
export async function polymarketOrderbook(tokenId,{fetcher=fetch}={}){
 if(!/^\d+$/.test(String(tokenId)))throw new Error("Invalid token id");
 return json("https://clob.polymarket.com/book?token_id="+encodeURIComponent(tokenId),{fetcher});
}
export function bestAsk(book){
 const asks=(book?.asks??[]).map(x=>({price:Number(x.price),size:Number(x.size)})).filter(x=>Number.isFinite(x.price)&&x.price>=0&&x.price<=1&&Number.isFinite(x.size)&&x.size>0).sort((a,b)=>a.price-b.price);
 return asks[0]??null;
}
// Kalshi order books expose bids; YES ask is implied by highest NO bid and vice versa.
export function kalshiTopAsks(book){
 const raw=book.orderbook??book;
 const bids=(arr)=>{const parsed=(arr??[]).map(v=>Array.isArray(v)?{price:Number(v[0]),size:Number(v[1])}:{price:Number(v.price_dollars??v.price),size:Number(v.count_fp??v.count??v.size)}).filter(v=>Number.isFinite(v.price)&&Number.isFinite(v.size)&&v.size>0);return parsed.sort((a,b)=>b.price-a.price)[0]??null};
 const yes=bids(raw.yes_dollars??raw.yes),no=bids(raw.no_dollars??raw.no);
 const normalize=(v)=>v?{price:1-(v.price>1?v.price/100:v.price),size:v.size}:null;
 return {yes:normalize(no),no:normalize(yes)};
}
export async function kalshiTopOfBook(ticker){return kalshiTopAsks(await getOrderbook(ticker,10))}
