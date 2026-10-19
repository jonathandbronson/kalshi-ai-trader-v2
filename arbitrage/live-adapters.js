// Public read-only orderbook data. Never infer contract equivalence from price or title.
export function kalshiDepth(response){
 const b=response.orderbook_fp??response.orderbook??response;
 const parse=(a,legacy=false)=>(a??[]).map(([p,s])=>({price:Number(p)/(legacy?100:1),size:Number(s)})).filter(x=>Number.isFinite(x.price)&&x.price>=0&&x.price<=1&&Number.isFinite(x.size)&&x.size>0);
 const complement=a=>a.map(x=>({price:Math.round((1-x.price)*1e6)/1e6,size:x.size})).sort((a,b)=>a.price-b.price);
 return {yes:complement(parse(b.no_dollars??b.no,!b.no_dollars)),no:complement(parse(b.yes_dollars??b.yes,!b.yes_dollars))};
}
export function polyDepth(b){return (b.asks??[]).map(x=>({price:Number(x.price),size:Number(x.size)})).filter(x=>Number.isFinite(x.price)&&x.price>=0&&x.price<=1&&Number.isFinite(x.size)&&x.size>0).sort((a,b)=>a.price-b.price)}
async function json(url,fetcher){const c=new AbortController(),t=setTimeout(()=>c.abort(),12000);try{const r=await fetcher(url,{signal:c.signal,headers:{accept:"application/json"}});if(!r.ok)throw Error("HTTP "+r.status+" from "+new URL(url).hostname);return await r.json()}finally{clearTimeout(t)}}
export async function fetchPairDepth(pair,fetcher=fetch){
 if(!pair.approved||!pair.settlementReviewed||!pair.yesMeansSameOutcome)throw Error("PAIR_NOT_APPROVED");
 if(!/^[A-Za-z0-9_-]+$/.test(pair.kalshiTicker)||!/^\d+$/.test(String(pair.polyYesTokenId))||!/^\d+$/.test(String(pair.polyNoTokenId)))throw Error("INVALID_IDS");
 // Require Polymarket's authoritative Gamma outcome-to-token mapping on each cycle.
 if(!/^\d+$/.test(String(pair.polymarketId??"")))throw Error("POLYMARKET_ID_REQUIRED");
 const k="https://external-api.kalshi.com/trade-api/v2/markets/"+encodeURIComponent(pair.kalshiTicker)+"/orderbook?depth=100";
 const p=id=>"https://clob.polymarket.com/book?token_id="+encodeURIComponent(id);
 const gamma="https://gamma-api.polymarket.com/markets/"+encodeURIComponent(pair.polymarketId);
 const start=Date.now();
 const [kb,py,pn,metadata]=await Promise.all([json(k,fetcher),json(p(pair.polyYesTokenId),fetcher),json(p(pair.polyNoTokenId),fetcher),json(gamma,fetcher)]);
 const parse=x=>Array.isArray(x)?x:JSON.parse(x);
 const outcomes=parse(metadata.outcomes),tokens=parse(metadata.clobTokenIds);
 if(metadata.closed===true||metadata.active===false||outcomes.length!==2||tokens.length!==2||outcomes.indexOf("Yes")<0||outcomes.indexOf("No")<0||String(tokens[outcomes.indexOf("Yes")])!==String(pair.polyYesTokenId)||String(tokens[outcomes.indexOf("No")])!==String(pair.polyNoTokenId))throw Error("POLYMARKET_METADATA_MISMATCH");
 if(String(py.asset_id??"")!==String(pair.polyYesTokenId)||String(pn.asset_id??"")!==String(pair.polyNoTokenId))throw Error("POLYMARKET_BOOK_TOKEN_MISMATCH");
 if(metadata.conditionId&&py.market&&metadata.conditionId.toLowerCase()!==String(py.market).toLowerCase())throw Error("POLYMARKET_CONDITION_MISMATCH");
 if(metadata.conditionId&&pn.market&&metadata.conditionId.toLowerCase()!==String(pn.market).toLowerCase())throw Error("POLYMARKET_CONDITION_MISMATCH");
 return {kalshi:kalshiDepth(kb),polyYes:polyDepth(py),polyNo:polyDepth(pn),fetchDurationMs:Date.now()-start};
}
