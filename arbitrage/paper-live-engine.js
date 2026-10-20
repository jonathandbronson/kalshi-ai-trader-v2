import {fetchPairDepth} from "./live-adapters.js";
import {PaperPortfolio,simulatePair} from "./simulator.js";
export async function runPaperCycle({pairs,portfolio,fetcher=fetch,quantity=10,yesFeeRate=.02,noFeeRate=.02,latencySlippageCents=1,maxFetchMs=5000,minNetRoi=.02}){
 const results=[];
 for(const pair of pairs){
  if(!pair.approved||!pair.settlementReviewed||!pair.yesMeansSameOutcome||pair.settlementEvidenceVerified!==true){results.push({pairId:pair.id,error:"PAIR_NOT_APPROVED"});continue}
  try{
   if(!pair.kalshiFeeModel||!pair.polymarketFeeModel){results.push({pairId:pair.id,error:"VENUE_FEE_MODELS_REQUIRED"});continue}
   const b=await fetchPairDepth(pair,fetcher);
   if(b.fetchDurationMs>maxFetchMs){results.push({pairId:pair.id,error:"STALE_BOOKS"});continue}
   for(const [direction,yesAsks,noAsks] of [["KALSHI_YES_POLY_NO",b.kalshi.yes,b.polyNo],["POLY_YES_KALSHI_NO",b.polyYes,b.kalshi.no]]){
    const exists=portfolio.positions.some(x=>x.settlementStatus==="OPEN"&&x.pairId===pair.id);
    if(exists){results.push({pairId:pair.id,direction,reason:"PAIR_EXPOSURE_ALREADY_OPEN"});continue}
    const feeModels=direction==="KALSHI_YES_POLY_NO"
      ?[pair.kalshiFeeModel,pair.polymarketFeeModel]
      :[pair.polymarketFeeModel,pair.kalshiFeeModel];
    if(!feeModels.every(m=>m&&typeof m==="object")){results.push({pairId:pair.id,direction,reason:"VENUE_FEE_MODELS_REQUIRED"});continue}
    const quote={pairId:pair.id,direction,yesAsks,noAsks,quantity,yesFeeRate,noFeeRate,feeModels,latencySlippageCents,approved:true,settlementEvidenceVerified:true,minNetRoi};
    const result=portfolio.enter(quote);results.push({pairId:pair.id,direction,...result});
   }
  }catch(e){results.push({pairId:pair.id,error:e.message})}
 }
 return {mode:"PAPER_ONLY",timestamp:new Date().toISOString(),results,portfolio:portfolio.snapshot()};
}
