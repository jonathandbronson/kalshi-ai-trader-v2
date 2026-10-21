// Refresh authoritative market-level rules for shortlist review; never approves contracts.
import {buildRuleEvidence,changedRuleEvidence} from "./rule-evidence.js";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function request(url,fetcher){
 for(let attempt=0;attempt<3;attempt++){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
  try{
   const r=await fetcher(url,{signal:ctrl.signal,headers:{accept:"application/json"}});
   if((r.status===429||r.status>=500)&&attempt<2){await sleep(500*2**attempt);continue}
   if(!r.ok)throw Error("HTTP "+r.status);
   return await r.json();
  }finally{clearTimeout(timer)}
 }
 throw Error("RETRIES_EXHAUSTED");
}
export async function refreshReviewEvidence(queue,{fetcher=fetch,delayMs=200,limit=30}={}){
 if(!Array.isArray(queue?.candidates))throw TypeError("Invalid review queue");
 const refreshed=[],errors=[];let successful=0,changed=0;
 for(const candidate of queue.candidates.slice(0,Math.max(0,limit))){
  const row={...candidate,approved:false,executable:false,status:"MANUAL_SETTLEMENT_REVIEW_REQUIRED"};
  const ticker=row.kalshiTicker,id=row.polymarketId;
  if(!ticker||!id){errors.push({key:String(ticker)+"|"+String(id),reason:"MISSING_MARKET_ID"});refreshed.push(row);continue}
  let k=null,p=null;
  try{
   const data=await request("https://external-api.kalshi.com/trade-api/v2/markets/"+encodeURIComponent(ticker),fetcher);
   k=data?.market??null;
  }catch(e){errors.push({key:ticker+"|"+id,venue:"kalshi",reason:String(e.message)})}
  if(delayMs>0)await sleep(delayMs);
  try{p=await request("https://gamma-api.polymarket.com/markets/"+encodeURIComponent(id),fetcher)}
  catch(e){errors.push({key:ticker+"|"+id,venue:"polymarket",reason:String(e.message)})}
  if(k&&p){
   const next=buildRuleEvidence({kalshiMarket:k,polymarketMarket:p});
   row.evidenceChanged=Boolean(row.ruleEvidence)&&changedRuleEvidence(row.ruleEvidence,next);
   if(row.evidenceChanged)changed++;
   row.ruleEvidence=next;row.evidenceRefreshStatus="REFRESHED";successful++;
  }else row.evidenceRefreshStatus="INCOMPLETE";
  refreshed.push(row);
  if(delayMs>0)await sleep(delayMs);
 }
 return {...queue,refreshedAt:new Date().toISOString(),candidates:refreshed,
  evidenceRefresh:{attempted:refreshed.length,successful,changed,failed:refreshed.length-successful,errors},
  verifiedPairs:0,mode:"RESEARCH_ONLY"};
}
