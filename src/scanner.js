import {getMarkets} from './kalshi.js';
import {researchMetadata} from './contamination.js';
import {screenMarket} from './selection.js';
import {loadForecastHistory,unresolvedDrivers} from './store.js';

export async function scanOpenMarkets({limit=100,minVolume=100,maxPages=10,target=25,diagnostics=false,seriesTicker}={}) {
  const byEvent=new Map();
  const events=new Set((await loadForecastHistory()).map(f=>f.eventId));
  const drivers=new Set(await unresolvedDrivers());
  let pages=0,rawCount=0,rejected=0;
  const providerErrors=[];
  // Known official-source series precede general discovery; no price-based routing.
  const selections=seriesTicker?[seriesTicker]:['KXCPI','KXFED','KXHIGHNY',undefined];
  for(const series of selections) {
    let cursor,seriesPages=0;
    try {
      do {
        const d=await getMarkets({limit,cursor,seriesTicker:series,status:'open',minCloseTs:Math.floor(Date.now()/1000)});
        pages++;seriesPages++;
        if(!Array.isArray(d.markets))throw new Error('Malformed market list');
        for(const raw of d.markets) {
          rawCount++;
          try {
            const m=researchMetadata(raw),screen=screenMarket(m),volume=Number(raw.volume_fp??raw.volume??0);
            if(!screen.eligible||!Number.isFinite(volume)||volume<Math.max(100,minVolume)||events.has(screen.eventId)||drivers.has(screen.driverId)) {rejected++;continue;}
            const old=byEvent.get(screen.eventId);
            // Liquidity can select between related contracts; quotes cannot.
            if(!old||volume>old.volume)byEvent.set(screen.eventId,{...m,volume,screen});
          } catch {rejected++;}
        }
        cursor=d.cursor||null;
      } while(cursor&&seriesPages<maxPages&&byEvent.size<target);
    } catch {providerErrors.push({series:series??'GENERAL',error:'Market discovery unavailable or malformed'});}
    if(byEvent.size>=target)break;
  }
  if(!pages&&providerErrors.length)throw new Error('Market discovery unavailable');
  const selected=new Set();
  const out=[...byEvent.values()].sort((a,b)=>b.volume/(1+b.screen.horizonDays/30)-a.volume/(1+a.screen.horizonDays/30)).filter(m=>{
    if(selected.has(m.screen.driverId))return false;
    selected.add(m.screen.driverId);return true;
  });
  return diagnostics?{markets:out,diagnostics:{pages,rawCount,rejected,providerErrors}}:out;
}
export function researchQueue(markets,max=25) {
  return markets.slice(0,Math.min(50,max)).map(m=>({...m,status:'NEEDS_INDEPENDENT_RESEARCH'}));
}
