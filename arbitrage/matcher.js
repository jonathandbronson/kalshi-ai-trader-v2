// Suggestions are never auto-approved: event title similarity cannot prove equal settlement.
export function normalizeTitle(s){return String(s??"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim()}
export function similarity(a,b){
 const x=new Set(normalizeTitle(a).split(" ").filter(Boolean)),y=new Set(normalizeTitle(b).split(" ").filter(Boolean));
 if(!x.size||!y.size)return 0;
 let intersection=0;for(const w of x)if(y.has(w))intersection++;
 return intersection/(x.size+y.size-intersection);
}
export function suggestMatches(kalshi,poly,{threshold=.55,limit=30}={}){
 const out=[];for(const k of kalshi)for(const p of poly){const score=similarity(k.title,p.title);if(score>=threshold)out.push({kalshiTicker:k.id,polymarketId:p.id,kalshiTitle:k.title,polymarketTitle:p.title,score,verified:false})}
 return out.sort((a,b)=>b.score-a.score).slice(0,limit);
}
export function validateApprovedPair(pair,k,p){
 if(pair?.approved!==true||pair?.settlementReviewed!==true||pair?.yesMeansSameOutcome!==true)return false;
 if(pair.kalshiTicker!==k.id||String(pair.polymarketId)!==String(p.id))return false;
 if(p.outcomes.length!==2||!p.outcomes.includes("Yes")||!p.outcomes.includes("No"))return false;
 return true;
}
