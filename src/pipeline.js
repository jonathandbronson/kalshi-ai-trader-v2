import {getMarket,normalizeMarket} from "./kalshi.js";
import {gatherEvidence} from "./researchRunner.js";
import {buildResearchPacket} from "./research.js";
import {estimateFromEvidence,aiConfigured} from "./aiEstimator.js";
import {combineResearchWithMarket} from "./opportunities.js";
import {riskFlags,suggestedPaperFraction} from "./risk.js";
import {saveResearch,saveAnalysis} from "./store.js";

export async function researchMarket(ticker){
 const raw=await getMarket(ticker),market=normalizeMarket(raw.market??raw);
 // Snapshot is fetched for rules/metadata, but quote fields are stripped before research/AI.
 // The same snapshot is used only after the forecast is locked to avoid a second-network-call race.
 const researchMarket={ticker:market.ticker,title:market.title,subtitle:market.subtitle,rulesPrimary:market.rulesPrimary,rulesSecondary:market.rulesSecondary,closeTime:market.closeTime};
 const gathered=await gatherEvidence(researchMarket);
 if(!gathered.diagnostics.sufficient)throw new Error("Not enough independent evidence to estimate this market safely");
 if(!aiConfigured())return {stage:"EVIDENCE_READY",requiresAiConfiguration:true,market:researchMarket,...gathered};
 const draft={ticker,question:market.title,resolutionCriteria:market.rulesPrimary,category:gathered.plan.category,evidence:gathered.evidence};
 const forecast=await estimateFromEvidence({market:researchMarket,packet:draft});
 const packet=buildResearchPacket({ticker,question:market.title,resolutionCriteria:market.rulesPrimary,evidence:gathered.evidence,probability:forecast.probability,rationale:forecast.rationale});
 packet.category=gathered.plan.category;packet.forecast=forecast;
 await saveResearch(packet);
 // Price is combined only after the independent packet has been saved/locked.
 const analysis=combineResearchWithMarket(packet,market);
 analysis.volume=market.volume;analysis.openInterest=market.openInterest;analysis.closeTime=market.closeTime;analysis.evidenceQuality=packet.evidenceQuality;
 analysis.uncertainty={low:forecast.low,high:forecast.high,confidence:forecast.confidence};
 analysis.riskFlags=riskFlags({closeTime:market.closeTime,volume:market.volume,spread:market.yesAsk!=null&&market.yesBid!=null?market.yesAsk-market.yesBid:null,evidenceQuality:packet.evidenceQuality});
 analysis.suggestedPaperFraction=suggestedPaperFraction({edge:analysis.bestTrade.netEdge,evidenceQuality:packet.evidenceQuality,confidence:forecast.confidence});
 await saveAnalysis(analysis);
 return {stage:"EVALUATED",packet,market,analysis};
}
