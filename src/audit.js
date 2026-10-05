import {loadState} from "./store.js";
export async function auditSummary(){
 const s=await loadState(), analyses=Object.values(s.analyses??{});
 const qualified=analyses.filter(x=>x.qualifies);
 return {researched:Object.keys(s.research??{}).length,analyzed:analyses.length,qualified:qualified.length,
  pass:analyses.length-qualified.length,averageQualifiedEdge:qualified.length?qualified.reduce((n,x)=>n+(x.bestTrade?.netEdge??0),0)/qualified.length:0,
  generatedAt:new Date().toISOString()};
}
