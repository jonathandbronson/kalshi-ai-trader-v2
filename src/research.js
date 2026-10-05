import {assertIndependent} from "./contamination.js";
export function buildResearchPacket({ticker,question,resolutionCriteria,evidence,probability,rationale,...metadata}){
 if(!question||!Array.isArray(evidence)||evidence.length<2)throw new Error("Question and independent evidence required");
 if(typeof probability!=="number"||!Number.isFinite(probability)||probability<0||probability>1)throw new Error("Independent probability must be between 0 and 1");
 assertIndependent({question,resolutionCriteria,evidence,rationale});
 return {ticker,question,resolutionCriteria:resolutionCriteria??"",evidence:structuredClone(evidence),independentProbability:probability,rationale:rationale??"",evidenceQuality:evidence.reduce((n,e)=>n+(e.reliability??.5),0)/evidence.length,lockedAt:new Date().toISOString(),...metadata};
}
