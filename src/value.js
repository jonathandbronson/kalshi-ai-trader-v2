export function clampProbability(p){if(typeof p!=="number"||!Number.isFinite(p)||p<0||p>1)throw new TypeError("Invalid probability");return p;}
export function scoreTrade({independentProbability,yesAsk,noAsk,feeRate=0}){
 const p=clampProbability(independentProbability),out=[];
 for(const [side,winProbability,cost] of [["YES",p,yesAsk],["NO",1-p,noAsk]]){
 if(cost==null)continue;clampProbability(cost);if(cost<=0||cost>=1)continue;
 if(!Number.isFinite(feeRate)||feeRate<0)throw new Error("Invalid fees");
 const estimatedFees=feeRate?feeRate*cost:0;
 out.push({side,winProbability,cost,grossEdge:winProbability-cost,estimatedFees,netEdge:winProbability-cost-estimatedFees,expectedProfitPerDollarPayout:winProbability-cost-estimatedFees});}
 return out.sort((a,b)=>b.netEdge-a.netEdge)[0]??null;
}
export function classifyEdge(edge,minEdge=.08,strongEdge=.12){if(!Number.isFinite(edge)||edge<minEdge)return "PASS";return edge<strongEdge?"VALUE":"STRONG_VALUE";}
