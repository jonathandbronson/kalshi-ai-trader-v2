// Synthetic labeled discovery benchmark. This is not a real-world settlement-equivalence validation.
import {findMarketCandidates} from "./market-matcher.js";
const rows=[
 ["Bitcoin above $100000 on October 31 2026?","Bitcoin above $100000 on October 31 2026?",true],
 ["Bitcoin above $100000?","Bitcoin above $110000?",false],
 ["Bitcoin above $100000?","Bitcoin below $100000?",false],
 ["Bitcoin above $100000 October 30 2026?","Bitcoin above $100000 October 31 2026?",false],
 ["Gold above $3000 on November 1 2026?","Gold above $3000 on November 1 2026?",true],
 ["Gold above $3000?","Silver above $3000?",false],
 ["Ethereum above $5000?","Ethereum above $5000?",true],
 ["Bitcoin above $100000?","Bitcoin above $100000?",true]
];
export function runSyntheticBenchmark(){
 let tp=0,fp=0,fn=0,tn=0;
 for(let i=0;i<rows.length;i++){
  const [left,right,expected]=rows[i];
  const result=findMarketCandidates([{event_ticker:"K"+i,title:"Different event",markets:[{ticker:"K"+i,title:left}]}],
   [{id:i,title:"Other heading",markets:[{id:String(i+1),question:right,outcomes:'["Yes","No"]'}]}]);
  const found=result.candidates.length>0;
  if(found&&expected)tp++;else if(found)fp++;else if(expected)fn++;else tn++;
 }
 return {kind:"SYNTHETIC_FIXTURES_ONLY",total:rows.length,truePositive:tp,falsePositive:fp,falseNegative:fn,trueNegative:tn,
  precision:tp+fp?tp/(tp+fp):null,recall:tp+fn?tp/(tp+fn):null};
}
