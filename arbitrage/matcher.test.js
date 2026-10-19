import test from "node:test";
import assert from "node:assert/strict";
import {suggestMatches,validateApprovedPair} from "./matcher.js";
import {bestAsk,kalshiTopAsks,parseArray} from "./adapters.js";
test("matching is advisory only",()=>{const r=suggestMatches([{id:"K",title:"Will it rain tomorrow?"}],[{id:"P",title:"Will it rain tomorrow?"}]);assert.equal(r[0].verified,false)});
test("pair needs explicit approval",()=>{const k={id:"K"},p={id:"P",outcomes:["Yes","No"]};assert.equal(validateApprovedPair({kalshiTicker:"K",polymarketId:"P",approved:true,settlementReviewed:false,yesMeansSameOutcome:true},k,p),false)});
test("CLOB asks sorted cheapest first",()=>assert.equal(bestAsk({asks:[{price:".6",size:"3"},{price:".4",size:"2"}]}).price,.4));
test("Kalshi bid conversion",()=>{const r=kalshiTopAsks({yes:[[30,10]],no:[[60,8]]});assert.ok(Math.abs(r.yes.price-.4)<1e-9)});
test("array JSON parsing",()=>assert.deepEqual(parseArray('["Yes","No"]'),["Yes","No"]));
