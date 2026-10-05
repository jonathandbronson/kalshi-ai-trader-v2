import { analyzeMarket } from "./analyze.js";

export function combineResearchWithMarket(packet, market) {
  if(packet.ticker && market.ticker && packet.ticker!==market.ticker) throw new Error("Ticker mismatch");
  return analyzeMarket({
    ticker:market.ticker,title:market.title,
    independentProbability:packet.independentProbability,
    yesAsk:market.yesAsk,noAsk:market.noAsk,
    evidence:packet.evidence,rationale:packet.rationale,
    resolutionCriteria:packet.resolutionCriteria || market.rulesPrimary
  });
}

export function rankOpportunities(items) {
  return [...items].filter(x=>x.qualifies).map(x=>{
    const liquidity=Math.log10(1+Number(x.volume??0))/5;
    const quality=Number(x.evidenceQuality??0.5);
    const edge=Math.max(0,x.bestTrade?.netEdge??0);
    return {...x,rankScore:edge*0.65+quality*0.25+Math.min(1,liquidity)*0.10};
  }).sort((a,b)=>b.rankScore-a.rankScore);
}
