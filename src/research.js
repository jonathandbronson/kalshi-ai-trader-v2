function cleanEvidence(item) {
  if(!item || typeof item !== "object") throw new Error("Evidence must be an object");
  if(!item.source || !item.claim) throw new Error("Evidence requires source and claim");
  return {source:String(item.source),claim:String(item.claim),url:item.url?String(item.url):null,
    publishedAt:item.publishedAt??null,reliability:Math.max(0,Math.min(1,Number(item.reliability??0.5)))};
}

export function buildResearchPacket({ticker,question,resolutionCriteria,evidence,probability,rationale}) {
  if(!question) throw new Error("question required");
  if(!Array.isArray(evidence)||evidence.length<2) throw new Error("At least two independent evidence items required");
  const p=Number(probability);
  if(!Number.isFinite(p)||p<=0||p>=1) throw new Error("Independent probability must be between 0 and 1");
  const items=evidence.map(cleanEvidence);
  const sourceNames=items.map(x=>x.source.toLowerCase());
  if(sourceNames.some(x=>x.includes("kalshi"))) throw new Error("Kalshi cannot be used as evidence for the independent estimate");
  const quality=items.reduce((s,x)=>s+x.reliability,0)/items.length;
  return {ticker,question,resolutionCriteria:resolutionCriteria??"",evidence:items,
    independentProbability:p,rationale:rationale??"",evidenceQuality:quality,lockedAt:new Date().toISOString()};
}
