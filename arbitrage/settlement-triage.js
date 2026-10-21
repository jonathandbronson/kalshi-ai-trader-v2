import {extractSettlementFields,compareSettlementFields} from "./contract-extraction.js";
// Post-refresh settlement risk screen. Conservative: flags evident mismatches,
// and leaves ambiguous cases for human review. Never marks pairs VERIFIED.
const normalized=s=>String(s??"").toLowerCase().replace(/,/g,"").replace(/\s+/g," ");
const metrics=[["rushing_yards",/\brushing yards?\b/],["passing_yards",/\bpassing yards?\b/],["receiving_yards",/\breceiving yards?\b/],["touchdowns",/\btouchdowns?\b/],["goals",/\bgoals?\b/]];
function metric(s){const t=normalized(s);return metrics.find(x=>x[1].test(t))?.[0]??null}
function threshold(s){
 const t=normalized(s);
 // Supports "14,000+", "at least 14000", "reach 2000" and "equals or exceeds 2000".
 const m=t.match(/\b(?:at least|reach(?:es)?|equals or exceeds|exceeds|above|over|hit(?:s)?|total of)\s+(\d+(?:\.\d+)?)(?:\s*(k|m|b))?\b/)||
 t.match(/\b(\d+(?:\.\d+)?)(?:\s*(k|m|b))?\s*\+/);
 if(!m)return null;
 return Number(m[1])*({k:1e3,m:1e6,b:1e9}[m[2]]??1);
}
function period(s){const t=normalized(s);return /\b(?:career|lifetime|all time)\b/.test(t)?"CAREER":/\b(?:regular season|single season|during the 20\d\d|20\d\d[-/]20\d\d nfl)\b/.test(t)?"SEASON":null}
function firstTo(s){return /\b(?:first (?:qb|quarterback|player|person)|first to reach|first .* to \d|first .* to reach)\b/.test(normalized(s))}
function senateTermYear(s){const m=normalized(s).match(/\bterm\s+beginning\s+in\s+(20\d\d)\b/);return m?Number(m[1]):null}
function senateElectionYear(s){const t=normalized(s);const m=t.match(/\b(20\d\d)\s+(?:midterm\s+)?(?:[a-z ]{0,40})?(?:u\.s\.\s+)?senate\s+(?:special\s+)?election\b/)||t.match(/\bsenate\s+(?:special\s+)?election\s+in\s+(20\d\d)\b/);return m?Number(m[1]):null}
function voidTreatment(s){const t=normalized(s);return /\b(?:50-50|50\/50|half|split evenly)\b/.test(t)?"SPLIT":/\b(?:refund|void|cancel(?:led|ed)?)\b/.test(t)?"VOID_OR_CANCEL":null}
export function screenSettlementRisk(row){
 const kr=[row.ruleEvidence?.kalshi?.rulesPrimary,row.ruleEvidence?.kalshi?.rulesSecondary,row.kalshiRules].filter(Boolean).join(" ");
 const pr=[row.ruleEvidence?.polymarket?.description,row.polymarketRules].filter(Boolean).join(" ");
 const kt=[row.kalshiTitle,kr].filter(Boolean).join(" "),pt=[row.polymarketTitle,pr].filter(Boolean).join(" ");
 const reasons=[],warnings=[];
 const extractedKalshi=extractSettlementFields(row.kalshiTitle,kr),extractedPolymarket=extractSettlementFields(row.polymarketTitle,pr);
 const extractedComparison=compareSettlementFields(extractedKalshi,extractedPolymarket);
 reasons.push(...extractedComparison.hardConflicts);warnings.push(...extractedComparison.warnings);
 const kPeriod=period(kr)||period(row.kalshiTitle),pPeriod=period(pr)||period(row.polymarketTitle);
 if(kPeriod&&pPeriod&&kPeriod!==pPeriod)reasons.push("CAREER_VS_SEASON_SETTLEMENT");
 const km=metric(kt),pm=metric(pt);
 if(km&&pm&&km!==pm)reasons.push("DIFFERENT_STATISTIC");
 const kn=threshold(kr)??threshold(row.kalshiTitle),pn=threshold(pr)??threshold(row.polymarketTitle);
 if(kn!==null&&pn!==null&&kn!==pn)reasons.push("DIFFERENT_NUMERIC_PAYOUT_THRESHOLD");
 if(firstTo(pt)!==firstTo(kt))reasons.push("FIRST_TO_REACH_VS_INDIVIDUAL_OUTCOME");
 const kTerm=senateTermYear(kr),pTerm=senateTermYear(pr),kElection=senateElectionYear(kt),pElection=senateElectionYear(pt);
 if(kTerm&&pElection&&kTerm!==pElection+1)reasons.push("SENATE_TERM_YEAR_VS_ELECTION_YEAR");
 if(pTerm&&kElection&&pTerm!==kElection+1)reasons.push("SENATE_TERM_YEAR_VS_ELECTION_YEAR");
 const kv=voidTreatment(kr),pv=voidTreatment(pr);
 if(kv&&pv&&kv!==pv)warnings.push("POSSIBLE_VOID_RULE_MISMATCH");
 if((kv===null)!==(pv===null))warnings.push("VOID_TREATMENT_NOT_CONFIRMED");
 if(!kr.trim()||!pr.trim())warnings.push("MISSING_OFFICIAL_RULES");
 if(kn===null||pn===null)warnings.push("NUMERIC_THRESHOLD_NOT_ESTABLISHED");
 if(!kPeriod||!pPeriod)warnings.push("PERIOD_NOT_ESTABLISHED");
 return {status:reasons.length?"REJECT_AS_INCOMPATIBLE":"NEEDS_HUMAN_REVIEW",reasons,warnings,structuredExtraction:{kalshi:extractedKalshi,polymarket:extractedPolymarket},terms:{kalshi:{period:kPeriod,metric:km,threshold:kn,firstTo:firstTo(kt)},polymarket:{period:pPeriod,metric:pm,threshold:pn,firstTo:firstTo(pt)}},settlementVerified:false};
}
export function triageRefreshedQueue(queue){
 if(!Array.isArray(queue?.candidates))throw TypeError("Invalid review queue");
 const candidates=[],rejected=[];
 for(const c of queue.candidates){
  const screen=screenSettlementRisk(c);
  const item={...c,settlementScreen:screen,approved:false,executable:false};
  if(screen.status==="REJECT_AS_INCOMPATIBLE")rejected.push({kalshiTicker:c.kalshiTicker,polymarketId:c.polymarketId,kalshiTitle:c.kalshiTitle,polymarketTitle:c.polymarketTitle,reasons:screen.reasons});
  else candidates.push(item);
 }
 return {...queue,candidates,settlementTriage:{input:queue.candidates.length,remaining:candidates.length,rejected:rejected.length,rejectedPairs:rejected},notes:[...(queue.notes??[]),"Post-refresh settlement screen is conservative and never grants verification."]};
}
