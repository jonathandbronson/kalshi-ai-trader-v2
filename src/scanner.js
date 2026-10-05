import {getMarkets,normalizeMarket} from "./kalshi.js";
export async function scanOpenMarkets({limit=100,minVolume=0}={}){
 const d=await getMarkets({limit,status:"open"});
 return (d.markets??[]).map(normalizeMarket)
   .filter(m=>m.yesAsk!=null&&m.noAsk!=null&&m.volume>=minVolume)
   .sort((a,b)=>b.volume-a.volume);
}
export function researchQueue(markets,max=25){
 return markets.slice(0,max).map(m=>({ticker:m.ticker,title:m.title,resolutionCriteria:m.rulesPrimary,closeTime:m.closeTime,volume:m.volume,status:"NEEDS_INDEPENDENT_RESEARCH"}));
}
