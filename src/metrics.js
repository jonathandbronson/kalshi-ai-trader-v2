import {brierScore,calibrationBins} from "./calibration.js";import {loadState} from "./store.js";
export async function performanceMetrics(){
 const s=await loadState(),settled=(s.paperTrades??[]).filter(t=>t.status!=="OPEN");
 const predictions=settled.map(t=>({probability:t.estimatedProbability,outcome:t.status==="WON"?1:0}));
 const wins=settled.filter(t=>t.status==="WON").length;
 return {settled:settled.length,wins,losses:settled.length-wins,winRate:settled.length?wins/settled.length:null,brierScore:brierScore(predictions),calibration:calibrationBins(predictions),targetRange:{minimum:200,preferred:500},readyForReview:settled.length>=200};
}
