// Fail-closed market-level candidate matching, independent of parent event titles.
// This module NEVER approves a pair or asserts identical settlement.
const clean=s=>String(s??"").toLowerCase().replace(/[^a-z0-9.]+/g," ").replace(/\s+/g," ").trim();
const stop=new Set(["will","the","and","yes","no","market","event","what","which","does","for","this","that","from","with","than","above","below","over","under","before","after","in","on","at","be","to","of","a","an","is"]);
const terms=s=>new Set(clean(s).split(" ").filter(t=>t.length>2&&!stop.has(t)));
const overlap=(a,b)=>{const x=terms(a),y=terms(b);if(!x.size||!y.size)return 0;let n=0;for(const t of x)if(y.has(t))n++;return n/Math.sqrt(x.size*y.size)};
const parse=v=>{if(Array.isArray(v))return v;try{return JSON.parse(v)}catch{return []}};
const numberPattern=/\b(?:above|below|over|under|at least|at most|greater than|less than)\s*\$?([\d,]+(?:\.\d+)?)\s*(k|m|b|%|bps)?\b/i;
const monthPattern=/\b(?:jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{1,2}(?:,?\s*20\d\d)?\b/i;
export function fingerprint(text){
 const s=String(text??"");const n=clean(s);const hit=s.match(numberPattern);
 const units={k:1e3,m:1e6,b:1e9,"%":1,bps:1};
 const threshold=hit?Number(hit[1].replaceAll(",",""))*(units[(hit[2]??"").toLowerCase()]??1):null;
 const direction=/\b(?:above|over|at least|greater than)\b/.test(n)?"above":/\b(?:below|under|at most|less than)\b/.test(n)?"below":null;
 const years=[...new Set(s.match(/\b20\d\d\b/g)??[])].sort();
 const day=s.match(monthPattern)?.[0]??null;
 const assets=["bitcoin","ethereum","solana","gold","silver","oil","nasdaq","s&p","cpi","gdp","unemployment"];
 const asset=assets.find(a=>n.includes(a))??null;
 return {threshold:Number.isFinite(threshold)?threshold:null,direction,years,day:day?clean(day):null,asset};
}
export function contradiction(a,b){
 const x=fingerprint(a),y=fingerprint(b);
 if(x.threshold!==y.threshold)return "DIFFERENT_THRESHOLD";
 if(x.direction!==y.direction)return "DIFFERENT_DIRECTION";
 if(x.asset!==y.asset)return "DIFFERENT_UNDERLYING";
 if(x.day&&y.day&&x.day!==y.day)return "DIFFERENT_EXPLICIT_DATE";
 if(x.years.length&&y.years.length&&x.years.join(",")!==y.years.join(","))return "DIFFERENT_EXPLICIT_YEAR";
 const ax=clean(a),by=clean(b);
 if(/\b(?:nominat(?:ed|ion)|nominee)\b/.test(ax)!==/\b(?:nominat(?:ed|ion)|nominee)\b/.test(by))return "NOMINATION_MISMATCH";
 return null;
}
export function findMarketCandidates(kalshiEvents,polymarketEvents,{limit=100,minimumScore=.56}={}){
 const k=[],p=[];
 for(const event of kalshiEvents??[])for(const market of event.markets??[]){
  const title=[market.title,market.subtitle].filter(Boolean).join(" ");
  if(market.ticker&&title.trim())k.push({event,market,title});
 }
 for(const event of polymarketEvents??[])for(const market of event.markets??[]){
  if(market.id&&market.question&&parse(market.outcomes).length===2)p.push({event,market,title:market.question});
 }
 const index=new Map();
 for(const item of p)for(const t of terms(item.title)){if(!index.has(t))index.set(t,[]);index.get(t).push(item)}
 const result=[],seen=new Set(),counts={kalshiMarkets:k.length,polymarketMarkets:p.length,comparisons:0,rejectedByReason:{},maxPostingsPerToken};
 for(const km of k){
  const possible=new Map();
  const hitCounts=new Map();
  for(const t of terms(km.title)){
   const postings=index.get(t)??[];
   if(postings.length>maxPostingsPerToken)continue;
   for(const pm of postings){const key=String(pm.market.id);const entry=hitCounts.get(key)??{pm,hits:0};entry.hits++;hitCounts.set(key,entry)}
  }
  for(const [key,entry] of hitCounts)if(entry.hits>=2)possible.set(key,entry.pm);
  for(const pm of possible.values()){
   counts.comparisons++;
   const score=overlap(km.title,pm.title);
   if(score<minimumScore)continue;
   const conflict=contradiction(km.title,pm.title);
   if(conflict){counts.rejectedByReason[conflict]=(counts.rejectedByReason[conflict]??0)+1;continue}
   const key=km.market.ticker+"|"+pm.market.id;
   if(seen.has(key))continue;seen.add(key);
   result.push({key,score:Number(score.toFixed(3)),kalshi:km,polymarket:pm,approved:false,reviewStatus:"UNVERIFIED_SETTLEMENT_RULES",source:"MARKET_LEVEL"});
  }
 }
 result.sort((a,b)=>b.score-a.score);
 return {candidates:result.slice(0,Math.max(0,limit)),counts:{...counts,matchedBeforeCap:result.length,truncated:result.length>limit}};
}
