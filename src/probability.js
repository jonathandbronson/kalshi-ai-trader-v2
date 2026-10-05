const clamp=(x,min,max)=>Math.max(min,Math.min(max,x));
export function logit(p){p=clamp(Number(p),.001,.999);return Math.log(p/(1-p));}
export function logistic(x){return 1/(1+Math.exp(-x));}

/**
 * Combine independently-produced evidence signals without market-price input.
 * Each signal: { probability, reliability, independence, label }.
 * Reliability controls strength; independence discounts correlated evidence.
 */
export function estimateProbability({baseRate=.5,signals=[]}){
 if(!Array.isArray(signals)||signals.length<2) throw new Error("At least two probability signals required");
 let odds=logit(baseRate), totalWeight=0;
 const contributions=signals.map(s=>{
   const p=clamp(Number(s.probability),.01,.99);
   const reliability=clamp(Number(s.reliability??.5),0,1);
   const independence=clamp(Number(s.independence??.7),0,1);
   const weight=reliability*independence;
   // Evidence updates the prior; cap each contribution to avoid one source dominating.
   const delta=clamp((logit(p)-logit(baseRate))*weight,-1.5,1.5);
   odds+=delta; totalWeight+=weight;
   return {label:s.label??"signal",probability:p,reliability,independence,weight,logOddsContribution:delta};
 });
 const raw=logistic(odds);
 // Low-quality packets shrink toward the prior instead of creating false confidence.
 const confidence=clamp(totalWeight/signals.length,0,1);
 const probability=baseRate+(raw-baseRate)*confidence;
 return {probability:clamp(probability,.01,.99),baseRate,confidence,contributions};
}

export function probabilityRange(estimate){
 const width=.20*(1-estimate.confidence)+.04;
 return {low:clamp(estimate.probability-width,.01,.99),high:clamp(estimate.probability+width,.01,.99)};
}
