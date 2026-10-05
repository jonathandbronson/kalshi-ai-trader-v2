import {scoreEvidence} from "./sourceQuality.js";
export function normalizeEvidence(items){
 const seen=new Set(),out=[];
 for(const raw of items??[]){
  if(!raw?.source||!raw?.claim)continue;
  const key=(raw.url??raw.source+"|"+raw.claim).toLowerCase();
  if(seen.has(key))continue;seen.add(key);
  out.push({...raw,reliability:scoreEvidence(raw)});
 }
 return out;
}
export function evidenceDiagnostics(items){
 const e=normalizeEvidence(items),hosts=new Set(e.map(x=>{try{return new URL(x.url).hostname}catch{return x.source}}));
 return {count:e.length,uniqueSources:hosts.size,averageReliability:e.length?e.reduce((s,x)=>s+x.reliability,0)/e.length:0,
  sufficient:e.length>=2&&hosts.size>=2};
}
