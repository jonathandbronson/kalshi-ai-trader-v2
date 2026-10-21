// Rolling scanner coverage telemetry; distinguishes more data from more verified pairs.
export function appendCoverage(previous,latest,{now=new Date().toISOString(),days=30,maxSnapshots=240}={}){
 const cutoff=Date.parse(now)-days*86400000;
 const existing=(previous?.snapshots??[]).filter(x=>Number.isFinite(Date.parse(x.timestamp))&&Date.parse(x.timestamp)>=cutoff);
 const c=latest?.counts??{};
 const snapshot={timestamp:latest?.timestamp??now,status:latest?.status??"UNKNOWN",
  kalshiEvents:c.kalshiEvents??0,polymarketEvents:c.polymarketEvents??0,
  kalshiMarkets:c.kalshiNestedMarkets??0,polymarketMarkets:c.polymarketNestedMarkets??0,
  eventMatches:c.eventMatches??0,marketMatches:c.marketLevelDiscovery?.matchedBeforeCap??0,
  marketComparisons:c.marketLevelDiscovery?.comparisons??0,
  eligiblePairs:c.eligibleCandidatePool??0,shortlistedPairs:c.candidates??latest?.candidates?.length??0,
  verifiedPairs:c.settlementVerifiedCandidates??0,sourceErrors:latest?.errors?.length??0,
  categoryCoverage:c.categorySourceCoverage??{},candidateCategories:c.eligiblePoolCategories??{}};
 const byTime=new Map(existing.map(x=>[x.timestamp,x]));byTime.set(snapshot.timestamp,snapshot);
 const snapshots=[...byTime.values()].sort((a,b)=>a.timestamp.localeCompare(b.timestamp)).slice(-maxSnapshots);
 return {timestamp:now,mode:"RESEARCH_ONLY",windowDays:days,snapshots,latest:snapshot,
  notes:["Event/market counts represent sampled discovery coverage, not the full venue universe.","Unverified candidates are not profitable or risk-free arbitrage opportunities."]};
}
