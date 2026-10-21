// Append-only-in-window candidate research archive, separate from settlement approval.
export function accumulateCandidates(previous,latest,{now=new Date().toISOString(),days=30,maxPairs=5000}={}){
 if(!Array.isArray(latest?.candidates))throw TypeError("Expected discovery candidates");
 const stamp=Date.parse(now),cutoff=stamp-days*86400000;
 const map=new Map();
 for(const old of previous?.pairs??[]){
  if(!old?.id||!Number.isFinite(Date.parse(old.lastSeen))||Date.parse(old.lastSeen)<cutoff)continue;
  map.set(old.id,{...old,approved:false,executable:false});
 }
 for(const c of latest.candidates){
  const k=c.kalshi?.ticker,p=c.polymarket?.id;
  if(!k||!p)continue;
  const id=String(k)+"|"+String(p),old=map.get(id);
  map.set(id,{id,firstSeen:old?.firstSeen??now,lastSeen:now,seenCount:(old?.seenCount??0)+1,
   category:c.category??"other",kalshiTicker:k,polymarketId:String(p),
   kalshiTitle:c.kalshi?.title??null,polymarketTitle:c.polymarket?.title??null,
   eventScore:c.eventScore??null,contractScore:c.contractScore??null,
   discoverySource:c.discoverySource??"EVENT_LEVEL",ruleConflicts:c.reviewEvidence?.ruleConflicts??[],
   approved:false,executable:false,status:"UNVERIFIED_CANDIDATE"});
 }
 const pairs=[...map.values()].sort((a,b)=>Date.parse(b.lastSeen)-Date.parse(a.lastSeen)).slice(0,maxPairs);
 const counts=Object.fromEntries(["sports","crypto","economics","finance","politics","other"].map(cat=>[cat,pairs.filter(p=>p.category===cat).length]));
 return {timestamp:now,mode:"RESEARCH_ONLY",windowDays:days,totalDistinctPairs:pairs.length,counts,pairs,
  notes:["Archived candidates are not settlement-verified.","Seen counts count completed discovery scans, not profitable opportunities."]};
}
