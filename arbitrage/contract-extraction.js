// Offline-first contract interpretation. Optional AI extraction is supplied as a
// human-auditable JSON cache, never as an automatic settlement approval.
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
const norm=s=>String(s??"").toLowerCase().replace(/\s+/g," ").trim();
export const rulesHash=s=>createHash("sha256").update(String(s??"")).digest("hex");
export function extractSettlementFields(title,primaryRules="",secondaryRules=""){
 const titleText=norm(title),rules=norm(primaryRules+" "+secondaryRules),all=titleText+" "+rules;
 const period=/\b(?:career|lifetime|all.time)\b/.test(all)?"CAREER":/\b(?:regular season|single season|nfl season)\b/.test(all)?"SEASON":/\b(?:single game|one game)\b/.test(all)?"GAME":null;
 const source=/\b(?:chainlink|coinbase|binance|kraken|nfl|ampas|academy awards|associated press|bureau of labor statistics|bls)\b/g;
 const settlementSources=[...new Set((rules.match(source)??[]))].sort();
 const payouts={firstToReach:/\bfirst (?:quarterback|qb|player|candidate|person|to reach)\b/.test(all),
  nominationRequirement:/\b(?:not officially nominated|if .* not nominated|must be nominated)\b/.test(all),
  tieBreakAlphabetical:/\b(?:tie\b.{0,90}\balphabetical|alphabetical\b.{0,90}\btie)\b/.test(all),
  splitOutcome:/\b(?:50-50|50\/50|split evenly)\b/.test(all),
  voidOrCancel:/\b(?:void|refund|cancell?ed)\b/.test(all)};
 const dates=[...new Set((all.match(/\b20\d\d-\d\d-\d\d\b/g)??[]))].sort();
 return {period,settlementSources,payouts,explicitIsoDates:dates,hasRules:rules.length>20,extractor:"DETERMINISTIC_V1",verified:false};
}
export function compareSettlementFields(a,b){
 const hard=[],warnings=[];
 if(a.period&&b.period&&a.period!==b.period)hard.push("DIFFERENT_MEASUREMENT_PERIOD");
 if(a.payouts.firstToReach!==b.payouts.firstToReach)hard.push("DIFFERENT_FIRST_TO_REACH_PAYOFF");
 if(a.payouts.nominationRequirement!==b.payouts.nominationRequirement)warnings.push("NOMINATION_TREATMENT_DIFFERS");
 if(a.payouts.tieBreakAlphabetical!==b.payouts.tieBreakAlphabetical)warnings.push("TIEBREAK_TREATMENT_DIFFERS");
 if(a.payouts.splitOutcome!==b.payouts.splitOutcome)warnings.push("SPLIT_SETTLEMENT_TREATMENT_DIFFERS");
 if(a.settlementSources.length&&b.settlementSources.length&&!a.settlementSources.some(x=>b.settlementSources.includes(x)))warnings.push("DIFFERENT_SETTLEMENT_SOURCES");
 if(!a.hasRules||!b.hasRules)warnings.push("MISSING_RULES");
 return {hardConflicts:hard,warnings,verified:false};
}
export async function loadAiExtractionCache(path){
 try{const j=JSON.parse(await readFile(path,"utf8"));return j.schemaVersion===1&&j.entries&&typeof j.entries==="object"?j.entries:{}}catch(e){if(e.code==="ENOENT")return {};throw e}
}
export function cachedAiExtraction(cache,id,rules,title){
 const e=cache[id];if(!e||e.rulesHash!==rulesHash(title+"\n"+rules)||e.reviewed!==true)return null;
 // Untrusted model output must be bounded and typed before being displayed.
 const v=e.fields;
 if(!v||typeof v!=="object"||typeof v.event!=="string"||typeof v.outcome!=="string"||typeof v.settlementTrigger!=="string")return null;
 return {event:v.event.slice(0,500),outcome:v.outcome.slice(0,500),settlementTrigger:v.settlementTrigger.slice(0,1000),measurementWindow:String(v.measurementWindow??"").slice(0,500),deadline:String(v.deadline??"").slice(0,500),source:String(v.source??"").slice(0,500),cancellation:String(v.cancellation??"").slice(0,500),verified:false};
}
