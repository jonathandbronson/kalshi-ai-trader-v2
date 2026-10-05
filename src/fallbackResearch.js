import {transact} from "./store.js";
import {BLS_CPI_FEED,FED_FEED,BBC_BUSINESS_FEED,readFeed} from "./publicFeeds.js";
import {allowedArticle} from "./articles.js";
// Discovery is limited to already-approved organizations' legitimate public feeds.
// No feed headline counts as evidence; the runner must retrieve dated report bodies.
export async function fallbackDiscovery(plan){
 if(plan.category!=="economics")return {leads:[],successfulFeeds:0,errors:["No approved fallback for this category"]};
 const feeds=[BLS_CPI_FEED,FED_FEED,BBC_BUSINESS_FEED],errors=[];
 const batches=await Promise.all(feeds.map(async url=>{
  const id=crypto.randomUUID();await transact(s=>s.costs.push({id,provider:"public_feed",url,stage:"EVIDENCE_DISCOVERY",status:"REQUESTED",attempts:1,estimatedCost:0,at:new Date().toISOString()}));
  try{const entries=await readFeed(url);await transact(s=>{s.costs.find(c=>c.id===id).status="COMPLETED";});return {url,entries};}
  catch{await transact(s=>{s.costs.find(c=>c.id===id).status="FAILED";});errors.push(`Approved feed unavailable: ${url}`);return null;}
 }));
 const leads=[];
 for(const batch of batches.filter(Boolean)){
  for(const e of batch.entries){
   const age=(Date.now()-Date.parse(e.publishedAt))/86400000;
   if(!allowedArticle(e.url)||!Number.isFinite(age)||age<-.0035||age>30)continue;
   // Official releases provide inflation/policy context; BBC candidates must mention the topic.
   if(batch.url===BBC_BUSINESS_FEED&&!/\binflation\b|\bCPI\b|consumer prices|interest rate|Federal Reserve|\bFed\b/i.test(e.title+" "+e.claim))continue;
   leads.push(e);if(leads.filter(x=>x.feedUrl===batch.url).length>=3)break;
  }
 }
 return {leads:leads.slice(0,9),successfulFeeds:batches.filter(Boolean).length,errors};
}
