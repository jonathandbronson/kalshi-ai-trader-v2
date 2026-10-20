// Read-only cross-exchange spread observations. Never authorizes a trade.
import {fetchPairDepth} from "./live-adapters.js";
import {simulatePair} from "./simulator.js";
const directions=b=>[
 ["KALSHI_YES_POLY_NO",b.kalshi.yes,b.polyNo],
 ["POLY_YES_KALSHI_NO",b.polyYes,b.kalshi.no]
];
export async function observeSpreads({pairs,fetcher=fetch,quantity=10,slippageCents=1,maxFetchMs=5000,now=new Date().toISOString()}){
 if(!Array.isArray(pairs))throw new TypeError("pairs must be an array");
 const observations=[];
 for(const pair of pairs){
  const base={timestamp:now,pairId:pair.id??null,mode:"READ_ONLY_RESEARCH"};
  if(!pair.approved||!pair.settlementReviewed||!pair.yesMeansSameOutcome||pair.settlementEvidenceVerified!==true){
   observations.push({...base,status:"UNVERIFIED_SETTLEMENT"});continue;
  }
  if(!pair.kalshiFeeModel||!pair.polymarketFeeModel){
   observations.push({...base,status:"MISSING_FEE_MODEL"});continue;
  }
  try{
   const book=await fetchPairDepth(pair,fetcher);
   if(book.fetchDurationMs>maxFetchMs){observations.push({...base,status:"STALE_BOOKS"});continue}
   for(const [direction,yesAsks,noAsks] of directions(book)){
    const feeModels=direction==="KALSHI_YES_POLY_NO"?[pair.kalshiFeeModel,pair.polymarketFeeModel]:[pair.polymarketFeeModel,pair.kalshiFeeModel];
    const quote=simulatePair({yesAsks,noAsks,quantity,feeModels,latencySlippageCents:slippageCents,minNetRoi:0,approved:true,settlementEvidenceVerified:true,pairId:pair.id,direction,now});
    // Preserve even negative or insufficient-depth observations; no paper entries.
    observations.push({...base,direction,status:quote.accepted?"POSITIVE_NET_EDGE":quote.reason,
     quantity,modeledNetProfitUsd:quote.modeledNetProfitUsd??quote.netProfitUsd??null,
     modeledRoi:quote.modeledRoi??null,costUsd:quote.costUsd??null,
     feesUsd:quote.feesUsd??null,slippageReserveUsd:quote.slippageReserveUsd??null,
     yesDepthFilled:quote.yes?.filled??null,noDepthFilled:quote.no?.filled??null});
   }
  }catch(e){observations.push({...base,status:"FETCH_OR_MODEL_ERROR",error:String(e.message).slice(0,200)})}
 }
 return {timestamp:now,mode:"READ_ONLY_RESEARCH",pairCount:pairs.length,observations,
  summary:{observations:observations.length,positive:observations.filter(x=>x.status==="POSITIVE_NET_EDGE").length,
   unverified:observations.filter(x=>x.status==="UNVERIFIED_SETTLEMENT").length}};
}
