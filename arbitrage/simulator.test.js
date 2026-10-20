import test from "node:test";
import assert from "node:assert/strict";
import {walkAsks,simulatePair,PaperPortfolio,stressPartialFill} from "./simulator.js";
const yes=[{price:.39,size:3},{price:.41,size:7}],no=[{price:.4,size:10}];
test("walks depth at volume-weighted price",()=>{const q=walkAsks(yes,5);assert.equal(q.filled,5);assert.equal(q.costUsd,1.99)});
test("requires reviewed settlement",()=>assert.equal(simulatePair({yesAsks:yes,noAsks:no,quantity:5}).reason,"SETTLEMENT_NOT_VERIFIED"));
test("rejects partial depth",()=>assert.equal(simulatePair({yesAsks:yes,noAsks:no,quantity:11,approved:true,settlementEvidenceVerified:true}).reason,"INSUFFICIENT_DEPTH"));
test("charges fees and reserves slippage",()=>{const p=simulatePair({yesAsks:yes,noAsks:no,quantity:5,approved:true,settlementEvidenceVerified:true,yesFeeRate:.01,noFeeRate:.01,latencySlippageCents:1});assert.equal(p.accepted,true);assert.ok(p.costUsd>4)});
test("rejects over-capital",()=>assert.equal(simulatePair({yesAsks:yes,noAsks:no,quantity:5,approved:true,settlementEvidenceVerified:true,capitalUsd:1}).reason,"INSUFFICIENT_CAPITAL"));
test("rejects no edge",()=>assert.equal(simulatePair({yesAsks:[{price:.6,size:10}],noAsks:[{price:.5,size:10}],quantity:5,approved:true,settlementEvidenceVerified:true}).reason,"NO_NET_EDGE"));
test("portfolio reserves capital and settles",()=>{const p=new PaperPortfolio({bankrollUsd:1000,maxPositionFraction:.03});const a=p.enter({yesAsks:yes,noAsks:no,quantity:5,approved:true,settlementEvidenceVerified:true});assert.equal(a.accepted,true);assert.ok(p.cashUsd<1000);p.settle(a.id);assert.ok(p.realizedPnlUsd>0);assert.equal(p.openPositions,undefined);assert.equal(p.snapshot().openPositions,0)});
test("stress test mismatched settlement",()=>{const p=new PaperPortfolio();const a=p.enter({yesAsks:yes,noAsks:no,quantity:5,approved:true,settlementEvidenceVerified:true});const settled=p.settle(a.id,{sameOutcome:false});assert.equal(settled.realizedPnlUsd,-a.costUsd)});

test("rejects positive spread below 2 percent net ROI",()=>{const q=simulatePair({yesAsks:[{price:.49,size:10}],noAsks:[{price:.49,size:10}],quantity:5,approved:true,settlementEvidenceVerified:true});assert.equal(q.reason,"BELOW_MIN_NET_ROI")});
test("approved alone does not bypass evidence gate",()=>{const q=simulatePair({yesAsks:yes,noAsks:no,quantity:5,approved:true});assert.equal(q.reason,"SETTLEMENT_NOT_VERIFIED")});

test("explicit fee models reduce modeled net return",()=>{const a=simulatePair({yesAsks:yes,noAsks:no,quantity:5,approved:true,settlementEvidenceVerified:true,feeModels:[{type:"kalshi_taker",coefficient:.07},{type:"flat_rate",rate:.02}]});assert.equal(a.accepted,true);assert.ok(a.feesUsd>0)});
test("invalid fee coefficient fails closed",()=>assert.throws(()=>simulatePair({yesAsks:yes,noAsks:no,quantity:5,approved:true,settlementEvidenceVerified:true,feeModels:[{type:"kalshi_taker",coefficient:-1},{type:"flat_rate",rate:0}]}),/INVALID_FEE_PARAMETER/));

test("unhedged leg stress shows downside when second book is empty",()=>{const q=stressPartialFill({yesAsks:[{price:.4,size:10}],noAsks:[],quantity:10});assert.equal(q.unhedged,10);assert.equal(q.worstCasePnlUsd,-4);assert.equal(q.warning,"UNHEDGED_LEG_EXPOSURE")});
