import {classifyMarket} from "./researchPlan.js";
export function eventIdentity(m){return m.eventId||m.ticker?.split("-").slice(0,-1).join("-")||m.ticker;}
export function driverIdentity(m){return String(m.title??"").toLowerCase().replace(/\b(?:above|below|over|under|exceed|between|at least|more than|less than)\b.*$/," ").replace(/\d+(?:\.\d+)?/g,"#").replace(/[^a-z# ]/g," ").replace(/\s+/g," ").trim();}
export function screenMarket(m,now=Date.now()){
 const reasons=[],horizon=(Date.parse(m.closeTime)-now)/86400000;
 if(m.status&&!["open","active"].includes(m.status))reasons.push("MARKET_NOT_OPEN");
 if(!m.title||!m.rulesPrimary||m.rulesPrimary.length<40)reasons.push("UNCLEAR_RESOLUTION");
 if(!Number.isFinite(horizon)||horizon<1/24||horizon>365)reasons.push("UNSUITABLE_HORIZON");
 if(/multivariate|combo|parlay|mention|say the word|otherwise determined|sole discretion/i.test(m.title+" "+m.rulesPrimary))reasons.push("AMBIGUOUS_OR_COMPLEX_EVENT");
 if(/fair price|non.binary|void|refund|50.cent|50 percent/i.test(m.rulesPrimary+" "+m.rulesSecondary))reasons.push("NONBINARY_OR_VOID_SETTLEMENT");
 return {eligible:reasons.length===0,reasons,category:classifyMarket(m),horizonDays:horizon,eventId:eventIdentity(m),driverId:driverIdentity(m),researchDifficulty:"DEEP_RESEARCH_REQUIRED"};
}
