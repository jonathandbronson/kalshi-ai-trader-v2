import test from "node:test";
import assert from "node:assert/strict";
import {accumulateCandidates} from "./candidate-history.js";
const now="2026-10-21T12:00:00Z";
const candidate={category:"crypto",kalshi:{ticker:"K",title:"BTC above"},polymarket:{id:"P",title:"Bitcoin above"},eventScore:.8,contractScore:.9};
test("retains previously discovered candidates and increments repeat count",()=>{
 const first=accumulateCandidates(null,{candidates:[candidate]},{now});
 const second=accumulateCandidates(first,{candidates:[candidate]},{now:"2026-10-22T12:00:00Z"});
 assert.equal(second.totalDistinctPairs,1);
 assert.equal(second.pairs[0].seenCount,2);
 assert.equal(second.pairs[0].approved,false);
});
test("expires old candidates outside retention window",()=>{
 const old=accumulateCandidates(null,{candidates:[candidate]},{now:"2026-08-01T12:00:00Z"});
 const current=accumulateCandidates(old,{candidates:[]},{now});
 assert.equal(current.totalDistinctPairs,0);
});
