import test from "node:test";import assert from "node:assert/strict";
import {kalshiDepth,polyDepth,fetchPairDepth} from "./live-adapters.js";
import {PaperPortfolio} from "./simulator.js";
import {runPaperCycle} from "./paper-live-engine.js";
const pair={id:"demo",kalshiTicker:"TEST",polymarketId:"789",polyYesTokenId:"123",polyNoTokenId:"456",approved:true,settlementReviewed:true,yesMeansSameOutcome:true,settlementEvidenceVerified:true};
const mock=async url=>({ok:true,json:async()=>{
 if(url.includes("kalshi"))return {orderbook_fp:{yes_dollars:[["0.60","20.00"]],no_dollars:[["0.60","20.00"]]}};
 if(url.includes("gamma-api"))return {active:true,closed:false,outcomes:'["Yes","No"]',clobTokenIds:'["123","456"]',conditionId:"0xabc"};
 const id=new URL(url).searchParams.get("token_id");
 return {asset_id:id,market:"0xabc",asks:[{price:id==="456"?"0.35":"0.39",size:"20"}]};
}});
test("Kalshi fixed point",()=>{const a=kalshiDepth({orderbook_fp:{yes_dollars:[["0.60","10"]],no_dollars:[["0.61","9"]]}});assert.equal(a.yes[0].price,.39)});
test("Polymarket CLOB",()=>assert.equal(polyDepth({asks:[{price:"0.41",size:"5"}]})[0].size,5));
test("mock API data to paper portfolio and deduplication",async()=>{const p=new PaperPortfolio();await runPaperCycle({pairs:[pair],portfolio:p,fetcher:mock,quantity:10,yesFeeRate:0,noFeeRate:0,latencySlippageCents:0});assert.equal(p.positions.length,2);await runPaperCycle({pairs:[pair],portfolio:p,fetcher:mock,quantity:10,yesFeeRate:0,noFeeRate:0,latencySlippageCents:0});assert.equal(p.positions.length,2)});
test("unapproved pairs cannot fetch",async()=>{const p=new PaperPortfolio();const r=await runPaperCycle({pairs:[{...pair,approved:false}],portfolio:p,fetcher:()=>{throw Error("called")}});assert.equal(r.results[0].error,"PAIR_NOT_APPROVED")});
test("wrong Polymarket outcome token fails closed",async()=>{const bad={...pair,polyNoTokenId:"999"};await assert.rejects(()=>fetchPairDepth(bad,mock),/POLYMARKET_METADATA_MISMATCH/)});
test("wrong book asset id fails closed",async()=>{const bad=async url=>{const r=await mock(url);if(url.includes("clob.polymarket.com")&&url.includes("123"))return {ok:true,json:async()=>({...await r.json(),asset_id:"999"})};return r};await assert.rejects(()=>fetchPairDepth(pair,bad),/POLYMARKET_BOOK_TOKEN_MISMATCH/)});
