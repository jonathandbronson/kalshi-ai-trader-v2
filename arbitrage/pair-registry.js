// Persistent research-only pair registry. A discovery score never grants approval.
import {changedRuleEvidence} from "./rule-evidence.js";
export const REVIEW_STATES=["PENDING_REVIEW","REJECTED","VERIFIED","REVERIFY_REQUIRED"];
export const pairKey=(kalshiTicker,polymarketId)=>String(kalshiTicker)+"|"+String(polymarketId);
const nonempty=s=>typeof s==="string"&&s.trim().length>0;
export function validReview(r){
 return r&&r.decision==="VERIFIED"&&nonempty(r.reviewer)&&nonempty(r.reviewedAt)&&Number.isFinite(Date.parse(r.reviewedAt))&&
  ["IDENTICAL_PAYOFF","IDENTICAL_OUTCOME","IDENTICAL_SETTLEMENT_SOURCE","IDENTICAL_SETTLEMENT_TIME","CANCELLATION_AND_VOID_RULES","TRADING_ELIGIBILITY","CURRENT_FEES","AVAILABLE_LIQUIDITY"].every(k=>r.checks?.[k]===true)&&
  nonempty(r.kalshiRuleSha256)&&nonempty(r.polymarketRuleSha256)&&r.yesMeansSameOutcome===true;
}
export function mergePairRegistry(previous,queue,reviews=[],{now=new Date().toISOString(),maxAgeDays=30}={}){
 if(!Array.isArray(queue?.candidates)||!Array.isArray(reviews))throw TypeError("Invalid registry input");
 const records=new Map((previous?.pairs??[]).map(x=>[x.id,{...x}]));
 const reviewByKey=new Map(reviews.filter(x=>x?.kalshiTicker&&x?.polymarketId).map(x=>[pairKey(x.kalshiTicker,x.polymarketId),x]));
 const seen=new Set();const changes=[];
 for(const c of queue.candidates){
  const id=pairKey(c.kalshiTicker,c.polymarketId);
  if(!c.kalshiTicker||!c.polymarketId||seen.has(id))continue;seen.add(id);
  const old=records.get(id),evidence=c.ruleEvidence??null,review=reviewByKey.get(id)??old?.review??null;
  const hasEvidence=Boolean(evidence?.kalshi?.rulesPrimary&&evidence?.polymarket?.description);
  const evidenceChanged=Boolean(old?.evidence&&evidence)&&changedRuleEvidence(old.evidence,evidence);
  const reviewHashesMatch=review?.kalshiRuleSha256===evidence?.kalshi?.ruleSha256&&review?.polymarketRuleSha256===evidence?.polymarket?.ruleSha256;
  const age=Date.parse(review?.reviewedAt??"");
  const recent=Number.isFinite(age)&&Date.parse(now)>=age&&Date.parse(now)-age<=maxAgeDays*86400000;
  let status="PENDING_REVIEW";
  if(review?.decision==="REJECTED")status="REJECTED";
  else if(review?.decision==="VERIFIED"&&validReview(review)&&hasEvidence&&reviewHashesMatch&&recent&&!evidenceChanged&&c.evidenceRefreshStatus==="REFRESHED")status="VERIFIED";
  else if(review?.decision==="VERIFIED")status="REVERIFY_REQUIRED";
  if(old?.status==="VERIFIED"&&status!=="VERIFIED")changes.push({id,from:"VERIFIED",to:status,reason:evidenceChanged?"RULES_CHANGED":"REVIEW_OR_EVIDENCE_NOT_CURRENT"});
  records.set(id,{id,kalshiTicker:c.kalshiTicker,polymarketId:c.polymarketId,category:c.category??"other",firstSeen:old?.firstSeen??now,lastSeen:now,
   kalshiTitle:c.kalshiTitle??null,polymarketTitle:c.polymarketTitle??null,
   evidence:evidence??old?.evidence??null,review,status,approved:false,executable:false,
   settlementVerified:status==="VERIFIED",notes:c.ruleConflicts??[]});
 }
 // Missing from a capped shortlist does not imply a market was removed.
 for(const [id,old] of records)if(!seen.has(id)){
  const review=reviewByKey.get(id)??old.review??null;
  records.set(id,{...old,review,status:old.status==="VERIFIED"?"REVERIFY_REQUIRED":old.status,approved:false,executable:false,settlementVerified:false});
 }
 const pairs=[...records.values()].sort((a,b)=>a.id.localeCompare(b.id));
 const counts=Object.fromEntries(REVIEW_STATES.map(s=>[s,pairs.filter(p=>p.status===s).length]));
 return {schemaVersion:1,timestamp:now,mode:"RESEARCH_ONLY",counts,pairs,changes,notes:["Registry verification does not authorize live trading.","Only fresh, explicit, eight-check human reviews can mark a pair VERIFIED.","Every pair remains non-executable; no credentials or orders are used."]};
}
