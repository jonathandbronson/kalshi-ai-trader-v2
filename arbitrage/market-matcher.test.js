import test from "node:test";
import assert from "node:assert/strict";
import {fingerprint,contradiction,findMarketCandidates} from "./market-matcher.js";
const k=(title,subtitle="",eventTitle="Unrelated parent heading")=>[{title:eventTitle,event_ticker:"KEVT",markets:[{ticker:"KTEST",title,subtitle,rules_primary:"Official rule"}]}];
const p=(question,eventTitle="Different parent heading")=>[{title:eventTitle,id:100,markets:[{id:200,question,outcomes:'["Yes","No"]',clobTokenIds:'["1","2"]',description:"Official rule"}]}];
test("market-level matcher discovers same market despite different parent titles",()=>{
 const r=findMarketCandidates(k("Will bitcoin be above $100000 on October 31 2026?"),p("Bitcoin above $100000 on October 31 2026?"));
 assert.equal(r.candidates.length,1);assert.equal(r.candidates[0].approved,false);
});
test("threshold mismatch is rejected",()=>{
 const r=findMarketCandidates(k("Bitcoin above $100000?"),p("Bitcoin above $110000?"));
 assert.equal(r.candidates.length,0);
});
test("direction mismatch is rejected",()=>{
 assert.equal(contradiction("Bitcoin above $100000","Bitcoin below $100000"),"DIFFERENT_DIRECTION");
});
test("explicit day mismatch is rejected",()=>{
 assert.equal(contradiction("Bitcoin above $100000 October 30 2026","Bitcoin above $100000 October 31 2026"),"DIFFERENT_EXPLICIT_DATE");
});
test("missing threshold does not match an explicit threshold",()=>{
 assert.equal(contradiction("Bitcoin price above $100000","Bitcoin price this year"),"DIFFERENT_THRESHOLD");
});
test("normalized 100k and 100000 thresholds compare equally",()=>{
 assert.equal(fingerprint("Bitcoin above $100k").threshold,100000);
 assert.equal(contradiction("Bitcoin above $100k","Bitcoin above $100000"),null);
});
test("non-binary markets excluded",()=>{
 const r=findMarketCandidates(k("Bitcoin above $100000"),[{id:1,title:"Crypto",markets:[{id:2,question:"Bitcoin above $100000",outcomes:'["A","B","C"]'}]}]);
 assert.equal(r.candidates.length,0);
});
