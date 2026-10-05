import {getMarkets,normalizeMarket} from "./kalshi.js";

export async function scanOpenMarkets({limit=100,minVolume=0,maxPages=10,target=25,diagnostics=false}={}){
 const pageSize=Math.min(1000,Math.max(100,Number(limit)||100));
 let cursor,pages=0,rawCount=0,withYesAsk=0,withNoAsk=0,withAnyAsk=0,withVolume=0;
 const tradable=[]; const samples=[];
 const minCloseTs=Math.floor(Date.now()/1000);
 do{
  const d=await getMarkets({limit:pageSize,cursor,status:"open",minCloseTs});
  pages++;
  for(const raw of d.markets??[]){
   rawCount++;
   const m=normalizeMarket(raw);
   if(m.yesAsk!=null)withYesAsk++;
   if(m.noAsk!=null)withNoAsk++;
   if(m.yesAsk!=null||m.noAsk!=null)withAnyAsk++;
   if(m.volume>=minVolume)withVolume++;
   if(samples.length<5)samples.push({ticker:m.ticker,status:m.status,yesAsk:m.yesAsk,noAsk:m.noAsk,volume:m.volume,rawQuoteFields:{yes_ask:raw.yes_ask,yes_ask_dollars:raw.yes_ask_dollars,no_ask:raw.no_ask,no_ask_dollars:raw.no_ask_dollars,volume:raw.volume,volume_fp:raw.volume_fp}});
   if((m.yesAsk!=null||m.noAsk!=null)&&m.volume>=minVolume)tradable.push(m);
  }
  cursor=d.cursor||null;
 }while(cursor&&pages<maxPages&&tradable.length<target);
 tradable.sort((a,b)=>b.volume-a.volume);
 return diagnostics?{markets:tradable,diagnostics:{pages,rawCount,withYesAsk,withNoAsk,withAnyAsk,withVolume,minVolume,samples}}:tradable;
}

export function researchQueue(markets,max=25){
 return markets.slice(0,max).map(m=>({ticker:m.ticker,title:m.title,resolutionCriteria:m.rulesPrimary,closeTime:m.closeTime,volume:m.volume,status:"NEEDS_INDEPENDENT_RESEARCH"}));
}
