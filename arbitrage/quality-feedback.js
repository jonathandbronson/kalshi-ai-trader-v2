// Use adjudicated human outcomes to avoid repeatedly reviewing known false pairs.
// Never use a prior review to auto-approve a newly discovered pair.
const key=(k,p)=>String(k)+"|"+String(p);
export function applyReviewFeedback(candidates,reviews=[]){
 const rejected=new Map(),positive=new Set();
 for(const r of reviews){
  if(!r?.kalshiTicker||!r?.polymarketId)continue;
  const id=key(r.kalshiTicker,r.polymarketId);
  if(r.decision==="REJECTED")rejected.set(id,r);
  if(r.decision==="VERIFIED")positive.add(id);
 }
 const kept=[],rejectedPairs=[];
 for(const c of candidates){
  const id=key(c.kalshi?.ticker??c.kalshiTicker,c.polymarket?.id??c.polymarketId);
  const old=rejected.get(id);
  const kHash=c.ruleEvidence?.kalshi?.ruleSha256,pHash=c.ruleEvidence?.polymarket?.ruleSha256;
  // Rejections expire if either venue changed its official rules.
  if(old&&old.kalshiRuleSha256&&old.polymarketRuleSha256&&old.kalshiRuleSha256===kHash&&old.polymarketRuleSha256===pHash){
   rejectedPairs.push({id,reason:old.reason??"HUMAN_REJECTED"});continue;
  }
  kept.push({...c,previouslyReviewed:positive.has(id),approved:false,executable:false});
 }
 return {candidates:kept,excluded:rejectedPairs,counts:{reviewedRejections:rejectedPairs.length,previouslyVerifiedSeen:kept.filter(c=>c.previouslyReviewed).length}};
}
export function evaluateLabeledBatch(candidates,labels){
 const gold=new Map(labels.filter(x=>x?.kalshiTicker&&x?.polymarketId&&["MATCH","MISMATCH"].includes(x.label)).map(x=>[key(x.kalshiTicker,x.polymarketId),x.label]));
 const predicted=new Set(candidates.map(c=>key(c.kalshi?.ticker??c.kalshiTicker,c.polymarket?.id??c.polymarketId)));
 let tp=0,fp=0,fn=0,tn=0;
 for(const [id,label] of gold){
  const found=predicted.has(id);
  if(label==="MATCH"&&found)tp++;else if(label==="MATCH")fn++;else if(found)fp++;else tn++;
 }
 return {groundTruthPairs:gold.size,truePositive:tp,falsePositive:fp,falseNegative:fn,trueNegative:tn,
  precision:tp+fp?tp/(tp+fp):null,recall:tp+fn?tp/(tp+fn):null,
  caveat:"Only measures supplied human-adjudicated pairs; unlabeled candidates are excluded."};
}
