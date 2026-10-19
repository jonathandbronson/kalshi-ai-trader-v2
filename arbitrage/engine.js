// Pure read-only arbitrage calculations. Prices are dollars per $1 contract.
export function quotePair({yesAsk,noAsk,quantity,feeUsd=0,yesDepth=Infinity,noDepth=Infinity,sameSettlement=false}) {
 for(const [name,value] of Object.entries({yesAsk,noAsk})) if(!Number.isFinite(value)||value<0||value>1) throw new RangeError(name+" must be 0..1");
 if(!Number.isSafeInteger(quantity)||quantity<=0) throw new RangeError("quantity must be a positive integer");
 if(!Number.isFinite(feeUsd)||feeUsd<0) throw new RangeError("feeUsd must be nonnegative");
 if(!sameSettlement) return {eligible:false,reason:"SETTLEMENT_NOT_VERIFIED"};
 if(yesDepth<quantity||noDepth<quantity) return {eligible:false,reason:"INSUFFICIENT_DEPTH"};
 const costUsd=quantity*(yesAsk+noAsk)+feeUsd,payoutUsd=quantity,netProfitUsd=payoutUsd-costUsd;
 return {eligible:netProfitUsd>0,reason:netProfitUsd>0?"POSITIVE_NET_SPREAD":"NO_NET_EDGE",quantity,costUsd,payoutUsd,netProfitUsd,returnOnCapital:costUsd>0?netProfitUsd/costUsd:null};
}
