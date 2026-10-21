// Bounded seven-day historical spread observations. Read-only, no order placement.
export function updateSpreadHistory(previous,latest,{now=new Date().toISOString(),days=7,maxRecords=20000}={}){
 if(!Array.isArray(latest?.observations))throw TypeError("Invalid observation report");
 const cutoff=Date.parse(now)-days*86400000,seen=new Set(),rows=[];
 for(const item of [...(previous?.observations??[]),...latest.observations]){
  const t=Date.parse(item.timestamp??"");
  if(!Number.isFinite(t)||t<cutoff||t>Date.parse(now)+60000)continue;
  const key=[item.timestamp,item.pairId,item.direction,item.status].join("|");
  if(seen.has(key))continue;seen.add(key);rows.push({...item});
 }
 rows.sort((a,b)=>Date.parse(a.timestamp)-Date.parse(b.timestamp));
 const observations=rows.slice(-maxRecords);
 const priced=observations.filter(x=>Number.isFinite(x.modeledRoi));
 const positive=observations.filter(x=>x.status==="POSITIVE_NET_EDGE");
 const byPair={};
 for(const item of observations){
  const id=item.pairId??"UNKNOWN";
  const b=byPair[id]??{samples:0,positive:0,priced:0,bestModeledRoi:null};
  b.samples++;
  if(item.status==="POSITIVE_NET_EDGE")b.positive++;
  if(Number.isFinite(item.modeledRoi)){b.priced++;b.bestModeledRoi=b.bestModeledRoi===null?item.modeledRoi:Math.max(b.bestModeledRoi,item.modeledRoi)}
  byPair[id]=b;
 }
 return {timestamp:now,mode:"READ_ONLY_RESEARCH",windowDays:days,observations,
  summary:{samples:observations.length,priced:priced.length,positive:positive.length,positiveRate:priced.length?positive.length/priced.length:null,byPair},
  notes:["Model estimates are not executable quotes.","Samples are collected at scheduled intervals, not continuously.","Missing liquidity, stale quotes, fees and failed fills may invalidate modeled profits."]};
}
