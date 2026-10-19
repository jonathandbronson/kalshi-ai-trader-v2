// Public read-only exchange data. Kalshi orderbook_fp prices are decimal dollar strings.
export function kalshiDepth(response){
 const b=response.orderbook_fp??response.orderbook??response;
 const parse=(a,legacy=false)=>(a??[]).map(([p,s])=>({price:Number(p)/(legacy?100:1),size:Number(s)})).filter(x=>Number.isFinite(x.price)&&x.price>=0&&x.price<=1&&Number.isFinite(x.size)&&x.size>0);
 const complement=a=>a.map(x=>({price:Math.round((1-x.price)*1e6)/1e6,size:x.size})).sort((a,b)=>a.price-b.price);
 return {yes:complement(parse(b.no_dollars??b.no,!b.no_dollars)),no:complement(parse(b.yes_dollars??b.yes,!b.yes_dollars))};
}
export function polyDepth(b){return (b.asks??[]).map(x=>({price:Number(x.price),size:Number(x.size)})).filter(x=>Number.isFinite(x.price)&&x.price>=0&&x.price<=1&&Number.isFinite(x.size)&&x.size>0).sort((a,b)=>a.price-b.price)}
async function json(url,fetcher){const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);try{const r=await fetcher(url,{signal:c.signal,headers:{accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status);return await r.json()}finally{clearTimeout(t)}}
export async function fetchPairDepth(pair,fetcher=fetch){
 if(!pair.approved||!pair.settlementReviewed||!pair.yesMeansSameOutcome)throw Error("PAIR_NOT_APPROVED");
 if(!/^[A-Za-z0-9_-]+$/.test(pair.kalshiTicker)||!/^\d+$/.test(String(pair.polyYesTokenId))||!/^\d+$/.test(String(pair.polyNoTokenId)))throw Error("INVALID_IDS");
 const k="https://external-api.kalshi.com/trade-api/v2/markets/"+encodeURIComponent(pair.kalshiTicker)+"/orderbook?depth=100";
 const p=id=>"https://clob.polymarket.com/book?token_id="+encodeURIComponent(id);
 const start=Date.now(),[kb,py,pn]=await Promise.all([json(k,fetcher),json(p(pair.polyYesTokenId),fetcher),json(p(pair.polyNoTokenId),fetcher)]);
 return {kalshi:kalshiDepth(kb),polyYes:polyDepth(py),polyNo:polyDepth(pn),fetchDurationMs:Date.now()-start};
}
