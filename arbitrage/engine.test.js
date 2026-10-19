import test from "node:test";
import assert from "node:assert/strict";
import {quotePair} from "./engine.js";
test("profitable pair after fees",()=>{const r=quotePair({yesAsk:.4,noAsk:.4,quantity:100,feeUsd:2,yesDepth:100,noDepth:100,sameSettlement:true});assert.equal(r.eligible,true);assert.ok(Math.abs(r.netProfitUsd-18)<1e-9)});
test("unverified settlement rejected",()=>assert.equal(quotePair({yesAsk:.3,noAsk:.3,quantity:10}).reason,"SETTLEMENT_NOT_VERIFIED"));
test("insufficient depth rejected",()=>assert.equal(quotePair({yesAsk:.4,noAsk:.4,quantity:10,yesDepth:9,noDepth:10,sameSettlement:true}).reason,"INSUFFICIENT_DEPTH"));
test("fees erase edge",()=>assert.equal(quotePair({yesAsk:.48,noAsk:.48,quantity:10,feeUsd:1,sameSettlement:true}).eligible,false));
test("invalid quote rejected",()=>assert.throws(()=>quotePair({yesAsk:-1,noAsk:.4,quantity:10}),RangeError));
