// Deterministic, zero-money, two-venue paper fill simulator.
const round=n=>Math.round(n*1e8)/1e8;
export function normalizeAsks(levels){
 if(!Array.isArray(levels))throw new TypeError("asks must be an array");
 return levels.map(x=>Array.isArray(x)?{price:Number(x[0]),size:Number(x[1])}:{price:Number(x.price),size:Number(x.size)})
 .filter(x=>Number.isFinite(x.price)&&x.price>=0&&x.price<=1&&Number.isFinite(x.size)&&x.size>0)
 .sort((a,b)=>a.price-b.price);
}
export function walkAsks(levels,quantity){
 if(!Number.isSafeInteger(quantity)||quantity<1)throw new RangeError("quantity must be positive integer");
 let remaining=quantity,cost=0,filled=0;
 for(const level of normalizeAsks(levels)){const take=Math.min(remaining,level.size);cost+=take*level.price;filled+=take;remaining-=take;if(remaining<=1e-9)break}
 return {filled,unfilled:Math.max(0,remaining),costUsd:round(cost),avgPrice:filled?round(cost/filled):null};
}
export function simulatePair({yesAsks,noAsks,quantity,yesFeeRate=0,noFeeRate=0,fixedFeesUsd=0,latencySlippageCents=0,capitalUsd=1000,approved=false,now=new Date().toISOString(),pairId="manual",direction="YES_NO"}){
 for(const [key,v] of Object.entries({yesFeeRate,noFeeRate,fixedFeesUsd,latencySlippageCents,capitalUsd}))if(!Number.isFinite(v)||v<0)throw new RangeError(key+" must be nonnegative");
 if(!approved)return {accepted:false,reason:"SETTLEMENT_NOT_VERIFIED"};
 const yes=walkAsks(yesAsks,quantity),no=walkAsks(noAsks,quantity);
 if(yes.unfilled>1e-9||no.unfilled>1e-9)return {accepted:false,reason:"INSUFFICIENT_DEPTH",yes,no};
 const fees=round(yes.costUsd*yesFeeRate+no.costUsd*noFeeRate+fixedFeesUsd);
 const slippageReserve=round(quantity*2*latencySlippageCents/100);
 const costUsd=round(yes.costUsd+no.costUsd+fees+slippageReserve);
 const netProfitUsd=round(quantity-costUsd);
 if(costUsd>capitalUsd)return {accepted:false,reason:"INSUFFICIENT_CAPITAL",costUsd,capitalUsd};
 if(netProfitUsd<=0)return {accepted:false,reason:"NO_NET_EDGE",costUsd,netProfitUsd};
 return {accepted:true,mode:"PAPER_ONLY",timestamp:now,pairId,direction,quantity,yes,no,feesUsd:fees,slippageReserveUsd:slippageReserve,costUsd,payoutUsd:quantity,modeledNetProfitUsd:netProfitUsd,modeledRoi:round(netProfitUsd/costUsd),settlementStatus:"OPEN",riskNote:"Simulated simultaneous fills; execution and settlement risks remain"};
}
export class PaperPortfolio{
 constructor({bankrollUsd=1000,maxPositionFraction=.03}={}){
  if(!Number.isFinite(bankrollUsd)||bankrollUsd<=0||!(maxPositionFraction>0&&maxPositionFraction<=1))throw new RangeError("invalid bankroll settings");
  this.initialBankrollUsd=bankrollUsd;this.cashUsd=bankrollUsd;this.maxPositionFraction=maxPositionFraction;this.positions=[];this.realizedPnlUsd=0;
 }
 enter(input){
  const cap=Math.min(this.cashUsd,this.initialBankrollUsd*this.maxPositionFraction);
  const result=simulatePair({...input,capitalUsd:cap});
  if(!result.accepted)return result;
  this.cashUsd=round(this.cashUsd-result.costUsd);
  const position={...result,id:"paper-"+(this.positions.length+1)};
  this.positions.push(position);return position;
 }
 settle(id,{sameOutcome=true,voided=false}={}){
  const p=this.positions.find(x=>x.id===id);if(!p||p.settlementStatus!=="OPEN")throw new Error("position missing or already settled");
  const payoutUsd=voided?0:sameOutcome?p.payoutUsd:0;
  // A voided or mismatched settlement is a conservative zero-recovery stress case.
  p.settlementStatus=voided?"VOIDED":sameOutcome?"SETTLED":"MISMATCH";
  p.realizedPnlUsd=round(payoutUsd-p.costUsd);this.realizedPnlUsd=round(this.realizedPnlUsd+p.realizedPnlUsd);this.cashUsd=round(this.cashUsd+payoutUsd);
  return p;
 }
 snapshot(){return {initialBankrollUsd:this.initialBankrollUsd,cashUsd:this.cashUsd,realizedPnlUsd:this.realizedPnlUsd,openPositions:this.positions.filter(x=>x.settlementStatus==="OPEN").length,positions:this.positions}}
}
