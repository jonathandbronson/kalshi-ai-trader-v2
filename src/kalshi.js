const BASE_URL=process.env.KALSHI_API_BASE_URL??"https://external-api.kalshi.com/trade-api/v2";
async function request(path){
 const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
 try{const response=await fetch(`${BASE_URL}${path}`,{signal:controller.signal,headers:{accept:"application/json","user-agent":"kalshi-ai-trader-v2/1.0"}});
 if(!response.ok)throw new Error(`Kalshi API ${response.status}: ${(await response.text()).slice(0,500)}`);return response.json();}
 finally{clearTimeout(timer)}
}
export async function getMarkets({limit=100,cursor,status="open",seriesTicker,minCloseTs}={}){
 const q=new URLSearchParams({limit:String(Math.min(200,Math.max(1,limit)))});
 if(cursor)q.set("cursor",cursor);if(status)q.set("status",status);if(seriesTicker)q.set("series_ticker",seriesTicker);if(minCloseTs)q.set("min_close_ts",String(minCloseTs));
 return request(`/markets?${q}`);
}
export async function getMarket(ticker){if(!ticker)throw new Error("ticker required");return request(`/markets/${encodeURIComponent(ticker)}`)}
export async function getOrderbook(ticker,depth=10){if(!ticker)throw new Error("ticker required");return request(`/markets/${encodeURIComponent(ticker)}/orderbook?depth=${Math.max(1,Math.min(100,depth))}`)}
export function centsToProbability(cents){return cents==null?null:Number(cents)/100}
export function dollarsToProbability(dollars){if(dollars==null||dollars==="")return null;const n=Number(dollars);return Number.isFinite(n)?n:null}
const quote=(raw,dollars,cents)=>dollarsToProbability(raw[dollars])??centsToProbability(raw[cents]);
const numeric=(raw,fp,legacy)=>{const n=Number(raw[fp]??raw[legacy]??0);return Number.isFinite(n)?n:0};
export function normalizeMarket(raw){
 return {ticker:raw.ticker,title:raw.title,subtitle:raw.subtitle,status:raw.status,closeTime:raw.close_time,
 yesBid:quote(raw,"yes_bid_dollars","yes_bid"),yesAsk:quote(raw,"yes_ask_dollars","yes_ask"),
 noBid:quote(raw,"no_bid_dollars","no_bid"),noAsk:quote(raw,"no_ask_dollars","no_ask"),
 volume:numeric(raw,"volume_fp","volume"),openInterest:numeric(raw,"open_interest_fp","open_interest"),
 rulesPrimary:raw.rules_primary??"",rulesSecondary:raw.rules_secondary??""};
}
