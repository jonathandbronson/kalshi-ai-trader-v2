// Candidate triage only. Ranking never grants settlement approval.
export function rankForManualReview(report,{limit=30,perCategory=8}={}){
 if(!Array.isArray(report?.candidates))throw new TypeError("Expected discovery candidates");
 const categories=["sports","crypto","economics","finance","politics","other"];
 const rows=report.candidates.map(c=>{
  const e=c.reviewEvidence??{};
  const conflicts=e.ruleConflicts??[];
  const titleMatch=(Number(c.eventScore??0)+Number(c.contractScore??0))/2;
  const penalties=(e.differentEndDates?0.25:0)+(conflicts.length*0.18);
  return {category:c.category??"other",kalshiTicker:c.kalshi?.ticker??null,
   polymarketId:c.polymarket?.id??null,kalshiTitle:c.kalshi?.title??null,
   polymarketTitle:c.polymarket?.title??null,kalshiEvent:c.kalshi?.eventTitle??null,
   polymarketEvent:c.polymarket?.eventTitle??null,
   kalshiRules:e.kalshiRules??null,polymarketRules:e.polymarketDescription??null,
   kalshiClose:e.kalshiClose??null,polymarketEnd:e.polymarketEnd??null,
   differentEndDates:Boolean(e.differentEndDates),ruleConflicts:conflicts,
   reviewScore:Math.max(0,Math.round((titleMatch-penalties)*1000)/1000),
   status:"MANUAL_SETTLEMENT_REVIEW_REQUIRED",approved:false,executable:false};
 }).filter(x=>x.kalshiTicker&&x.polymarketId);
 const selected=[],seen=new Set(),counts={};
 for(const category of categories){
  for(const row of rows.filter(x=>x.category===category).sort((a,b)=>b.reviewScore-a.reviewScore)){
   if((counts[category]??0)>=perCategory||selected.length>=limit)break;
   const key=row.kalshiTicker+"|"+row.polymarketId;
   if(seen.has(key))continue;seen.add(key);selected.push(row);
   counts[category]=(counts[category]??0)+1;
  }
 }
 return {timestamp:new Date().toISOString(),mode:"RESEARCH_ONLY",verifiedPairs:0,
  sourceStatus:report.status,sourceTimestamp:report.timestamp,categoryCounts:counts,
  candidates:selected,notes:["No candidate is auto-approved.","Review complete contract rules, deadlines, void/cancellation behavior and identifiers before adding to approved-pairs.json."]};
}
