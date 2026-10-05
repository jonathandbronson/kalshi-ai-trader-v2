import {getMarkets,normalizeMarket} from "./kalshi.js";

export async function scanOpenMarkets({limit=100,minVolume=0,maxPages=10,target=25}={}){
 const pageSize=Math.min(1000,Math.max(100,Number(limit)||100));
 let cursor, pages=0;
 const tradable=[];
 const minCloseTs=Math.floor(Date.now()/1000);
 do{
  const d=await getMarkets({limit:pageSize,cursor,status:"open",minCloseTs});
  pages++;
  for(const raw of d.markets??[]){
   const m=normalizeMarket(raw);
   const hasExecutableQuote=m.yesAsk!=null||m.noAsk!=null;
   if(hasExecutableQuote&&m.volume>=minVolume)tradable.push(m);
  }
  cursor=d.cursor||null;
 }while(cursor&&pages<maxPages&&tradable.length<target);
 return tradable.sort((a,b)=>b.volume-a.volume);
}

export function researchQueue(markets,max=25){
 return markets.slice(0,max).map(m=>({ticker:m.ticker,title:m.title,resolutionCriteria:m.rulesPrimary,closeTime:m.closeTime,volume:m.volume,status:"NEEDS_INDEPENDENT_RESEARCH"}));
}
