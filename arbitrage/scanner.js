import {kalshiMarkets,polymarketMarkets,polymarketOrderbook,bestAsk,kalshiTopOfBook} from "./adapters.js";
import {suggestMatches,validateApprovedPair} from "./matcher.js";
import {quotePair} from "./engine.js";
export async function discover({limit=100}={}){
 const [k,p]=await Promise.allSettled([kalshiMarkets({limit}),polymarketMarkets({limit})]);
 return {kalshi:k.status==="fulfilled"?k.value:[],polymarket:p.status==="fulfilled"?p.value:[],errors:[k,p].filter(x=>x.status==="rejected").map(x=>String(x.reason))};
}
export async function scanOnce({approvedPairs=[],limit=100,quantity=1,feeUsd=0,fetchBooks=true}={}){
 const markets=await discover({limit});
 const suggestions=suggestMatches(markets.kalshi,markets.polymarket);
 const opportunities=[],errors=[...markets.errors];
 for(const pair of approvedPairs){
  const k=markets.kalshi.find(x=>x.id===pair.kalshiTicker),p=markets.polymarket.find(x=>String(x.id)===String(pair.polymarketId));
  if(!k||!p||!validateApprovedPair(pair,k,p)){errors.push("Unverified or unavailable pair: "+pair.kalshiTicker+"/"+pair.polymarketId);continue}
  if(!fetchBooks)continue;
  try{
   const yesIndex=p.outcomes.indexOf("Yes"),noIndex=p.outcomes.indexOf("No");
   const [kb,py,pn]=await Promise.all([kalshiTopOfBook(k.id),polymarketOrderbook(p.clobTokenIds[yesIndex]),polymarketOrderbook(p.clobTokenIds[noIndex])]);
   const polyYes=bestAsk(py),polyNo=bestAsk(pn);
   for(const candidate of [{direction:"KALSHI_YES_POLY_NO",a:kb.yes,b:polyNo},{direction:"POLY_YES_KALSHI_NO",a:polyYes,b:kb.no}]){
    if(!candidate.a||!candidate.b)continue;
    const result=quotePair({yesAsk:candidate.a.price,noAsk:candidate.b.price,quantity,feeUsd,yesDepth:candidate.a.size,noDepth:candidate.b.size,sameSettlement:true});
    opportunities.push({kalshiTicker:k.id,polymarketId:p.id,direction:candidate.direction,...result});
   }
  }catch(e){errors.push(k.id+": "+e.message)}
 }
 return {timestamp:new Date().toISOString(),readOnly:true,marketCounts:{kalshi:markets.kalshi.length,polymarket:markets.polymarket.length},suggestions,opportunities:opportunities.sort((a,b)=>(b.netProfitUsd??-Infinity)-(a.netProfitUsd??-Infinity)),errors};
}
