import {compareContractTerms,qualityScore} from "./quality-gates.js";
// Candidate triage only. Ranking never grants settlement approval.
export function rankForManualReview(report,{limit=30,perCategory=8}={}){
 if(!Array.isArray(report?.candidates))throw new TypeError("Expected discovery candidates");
 const categories=["sports","crypto","economics","finance","politics","other"];
 const rejectedByReason={};
 const rows=report.candidates.map(c=>{
  const e=c.reviewEvidence??{};
  const conflicts=e.ruleConflicts??[];
  const comparison=c.qualityComparison??compareContractTerms(c.kalshi?.outcomeLabel??c.kalshi?.title,c.polymarket?.title,e.kalshiRules,e.polymarketDescription);
  const quality=qualityScore({...c,qualityComparison:comparison});
  if(!quality.eligibleForReview){for(const reason of quality.hardConflicts)rejectedByReason[reason]=(rejectedByReason[reason]??0)+1;return null;}
  return {category:c.category??"other",kalshiTicker:c.kalshi?.ticker??null,
   polymarketId:c.polymarket?.id??null,kalshiTitle:c.kalshi?.title??null,
   polymarketTitle:c.polymarket?.title??null,kalshiEvent:c.kalshi?.eventTitle??null,
   polymarketEvent:c.polymarket?.eventTitle??null,
   kalshiRules:e.kalshiRules??null,polymarketRules:e.polymarketDescription??null,
   kalshiClose:e.kalshiClose??null,polymarketEnd:e.polymarketEnd??null,
   differentEndDates:Boolean(e.differentEndDates),ruleConflicts:conflicts,
   ruleEvidence:c.ruleEvidence??null,qualityComparison:comparison,qualityComponents:quality.components,uncertainties:quality.uncertainties,
   discoverySource:c.discoverySource??"EVENT_LEVEL",
   reviewScore:quality.score,
   status:"MANUAL_SETTLEMENT_REVIEW_REQUIRED",approved:false,executable:false};
 }).filter(x=>x?.kalshiTicker&&x?.polymarketId);
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
  sourceStatus:report.status,sourceTimestamp:report.timestamp,categoryCounts:counts,qualityRejections:rejectedByReason,
  candidates:selected,notes:["No candidate is auto-approved.","Review complete contract rules, deadlines, void/cancellation behavior and identifiers before adding to approved-pairs.json."]};
}
