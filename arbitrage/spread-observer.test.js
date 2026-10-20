import test from "node:test";
import assert from "node:assert/strict";
import {observeSpreads} from "./spread-observer.js";
const approved={id:"reviewed",kalshiTicker:"TEST",polymarketId:"789",polyYesTokenId:"123",polyNoTokenId:"456",approved:true,settlementReviewed:true,yesMeansSameOutcome:true,settlementEvidenceVerified:true,kalshiFeeModel:{type:"flat_rate",rate:0},polymarketFeeModel:{type:"flat_rate",rate:0}};
const mock=async url=>({ok:true,json:async()=>{
 if(url.includes("kalshi"))return {orderbook_fp:{yes_dollars:[["0.60","20.00"]],no_dollars:[["0.60","20.00"]]}};
 if(url.includes("gamma-api"))return {active:true,closed:false,outcomes:'["Yes","No"]',clobTokenIds:'["123","456"]',conditionId:"0xabc"};
 const id=new URL(url).searchParams.get("token_id");
 return {asset_id:id,market:"0xabc",asks:[{price:id==="456"?"0.35":"0.39",size:"20"}]};
}});
test("unverified watchlist pairs do not fetch",async()=>{
 const r=await observeSpreads({pairs:[{...approved,settlementEvidenceVerified:false}],fetcher:()=>{throw Error("should not fetch")}});
 assert.equal(r.summary.unverified,1);assert.equal(r.observations[0].status,"UNVERIFIED_SETTLEMENT");
});
test("observes both trade directions without entering positions",async()=>{
 const r=await observeSpreads({pairs:[approved],fetcher:mock,quantity:5,slippageCents:0});
 assert.equal(r.observations.length,2);
 assert.equal(r.observations.filter(x=>x.status==="POSITIVE_NET_EDGE").length,2);
 assert.equal(r.mode,"READ_ONLY_RESEARCH");
});
test("missing fee model does not fetch",async()=>{
 const r=await observeSpreads({pairs:[{...approved,kalshiFeeModel:null}],fetcher:()=>{throw Error("should not fetch")}});
 assert.equal(r.observations[0].status,"MISSING_FEE_MODEL");
});
