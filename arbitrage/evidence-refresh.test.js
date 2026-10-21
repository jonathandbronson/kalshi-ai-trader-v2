import test from "node:test";
import assert from "node:assert/strict";
import {refreshReviewEvidence} from "./evidence-refresh.js";
test("official detail fetches update evidence but never approve",async()=>{
 const urls=[];
 const fetcher=async url=>{
  urls.push(url);
  const data=url.includes("kalshi")?{market:{ticker:"K",title:"Bitcoin above 100k",rules_primary:"Official K",close_time:"2026-11-01T00:00:00Z"}}:
   {id:"P",question:"Bitcoin above 100k",description:"Official P",resolutionSource:"https://example.org",endDate:"2026-11-01T00:00:00Z"};
  return {ok:true,status:200,json:async()=>data};
 };
 const queue={candidates:[{kalshiTicker:"K",polymarketId:"P",approved:true}]};
 const r=await refreshReviewEvidence(queue,{fetcher,delayMs:0});
 assert.equal(r.evidenceRefresh.successful,1);assert.equal(urls.length,2);
 assert.equal(r.candidates[0].approved,false);assert.equal(r.candidates[0].ruleEvidence.verified,false);
 assert.equal(r.candidates[0].ruleEvidence.kalshi.rulesPrimary,"Official K");
});
test("partial venue outage remains incomplete and unapproved",async()=>{
 const fetcher=async url=>url.includes("kalshi")?{ok:false,status:403}:{ok:true,status:200,json:async()=>({id:"P"})};
 const r=await refreshReviewEvidence({candidates:[{kalshiTicker:"K",polymarketId:"P"}]},{fetcher,delayMs:0});
 assert.equal(r.evidenceRefresh.failed,1);assert.equal(r.candidates[0].evidenceRefreshStatus,"INCOMPLETE");
 assert.equal(r.candidates[0].approved,false);
});
