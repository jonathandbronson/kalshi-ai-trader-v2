import {createHash} from "node:crypto";
const sha=s=>createHash("sha256").update(String(s??"")).digest("hex");
const date=s=>{const n=Date.parse(s??"");return Number.isFinite(n)?new Date(n).toISOString():null};
const text=s=>String(s??"").trim();
export function buildRuleEvidence({kalshiMarket,polymarketMarket,kalshiEvent,polymarketEvent}){
 const km=kalshiMarket??{},pm=polymarketMarket??{},ke=kalshiEvent??{},pe=polymarketEvent??{};
 const kalshiRules=[km.rules_primary,km.rules_secondary].filter(Boolean).join("\n");
 const polyRules=[pm.description,pe.description].filter(Boolean).join("\n");
 const warnings=[];
 if(!kalshiRules)warnings.push("MISSING_KALSHI_RULES");
 if(!polyRules)warnings.push("MISSING_POLYMARKET_RULES");
 const kEnd=date(km.close_time??km.expiration_time),pEnd=date(pm.endDate??pe.endDate);
 if(kEnd&&pEnd&&kEnd.slice(0,10)!==pEnd.slice(0,10))warnings.push("DIFFERENT_LISTED_END_DATES");
 if(!pm.resolutionSource&&!pe.resolutionSource)warnings.push("MISSING_POLYMARKET_RESOLUTION_SOURCE");
 if(/\b(?:postponed|cancelled|canceled|void|abandon|rescheduled)\b/i.test(kalshiRules+" "+polyRules))warnings.push("SPECIAL_VOID_OR_POSTPONEMENT_REVIEW");
 const kText=(km.title??"")+" "+(km.subtitle??""),pText=pm.question??"";
 if(!kText.trim()||!pText.trim())warnings.push("MISSING_MARKET_OUTCOME");
 return {
  fetchedAt:new Date().toISOString(),
  kalshi:{ticker:km.ticker??null,eventTicker:ke.event_ticker??null,marketTitle:kText.trim(),rulesPrimary:text(km.rules_primary)||null,rulesSecondary:text(km.rules_secondary)||null,closeTime:kEnd,ruleSha256:sha(kalshiRules)},
  polymarket:{id:pm.id==null?null:String(pm.id),eventId:pe.id==null?null:String(pe.id),question:pText,description:text(pm.description)||null,eventDescription:text(pe.description)||null,resolutionSource:text(pm.resolutionSource??pe.resolutionSource)||null,endTime:pEnd,ruleSha256:sha(polyRules),conditionId:pm.conditionId??null},
  warnings,reviewChecklist:["IDENTICAL_PAYOFF","IDENTICAL_OUTCOME","IDENTICAL_SETTLEMENT_SOURCE","IDENTICAL_SETTLEMENT_TIME","CANCELLATION_AND_VOID_RULES","TRADING_ELIGIBILITY","CURRENT_FEES","AVAILABLE_LIQUIDITY"],
  verified:false,approved:false
 };
}
export function changedRuleEvidence(oldEvidence,newEvidence){
 return oldEvidence?.kalshi?.ruleSha256!==newEvidence?.kalshi?.ruleSha256||
 oldEvidence?.polymarket?.ruleSha256!==newEvidence?.polymarket?.ruleSha256||
 oldEvidence?.kalshi?.closeTime!==newEvidence?.kalshi?.closeTime||
 oldEvidence?.polymarket?.endTime!==newEvidence?.polymarket?.endTime||
 oldEvidence?.polymarket?.resolutionSource!==newEvidence?.polymarket?.resolutionSource;
}
