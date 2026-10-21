import test from "node:test";
import assert from "node:assert/strict";
import {selectEmbeddingInputs,generateEmbeddings} from "./neural-embedding-provider.js";
import {requestAdvisoryReview,parseAdvisoryReview,reviewFingerprint} from "./ai-settlement-review.js";
const k=[{title:"Elections",markets:[{ticker:"K1",title:"Will Alice win the election?"}]}];
const p=[{title:"Elections",markets:[{id:"P1",question:"Will Alice win?"}]}];
test("neural provider selects uncached markets and respects cache",()=>{
 const entries=selectEmbeddingInputs(k,p,{},10);assert.equal(entries.length,2);
 const cache={[entries[0].id]:{hash:entries[0].hash,vector:[1,0]}};
 assert.equal(selectEmbeddingInputs(k,p,cache,10).length,1);
});
test("real embeddings require an explicit API key",async()=>{
 await assert.rejects(generateEmbeddings([{id:"k",text:"test",hash:"h"}],{apiKey:""}),/key required/);
});
test("embedding response maps by index and validates numeric vectors",async()=>{
 const inputs=[{id:"a",text:"a",hash:"h1"},{id:"b",text:"b",hash:"h2"}];
 const fetcher=async()=>({ok:true,json:async()=>({data:[{index:1,embedding:[0,1]},{index:0,embedding:[1,0]}]})});
 const result=await generateEmbeddings(inputs,{apiKey:"test",fetcher});
 assert.deepEqual(result.vectors.a.vector,[1,0]);assert.equal(result.calls,1);
});
test("AI review is always advisory and never authorizes a trade",async()=>{
 const row={kalshiTitle:"Will Alice win?",polymarketTitle:"Alice winner?",ruleEvidence:{kalshi:{rulesPrimary:"Official Kalshi rules text."},polymarket:{description:"Official Polymarket rules text."}}};
 const fetcher=async()=>({ok:true,json:async()=>({choices:[{message:{content:JSON.stringify({assessment:"POSSIBLY_EQUIVALENT",differences:[],unresolved:["Confirm cancellation rules"]})}}]})});
 const r=await requestAdvisoryReview(row,{apiKey:"test",fetcher});
 assert.equal(r.assessment,"POSSIBLY_EQUIVALENT");assert.equal(r.settlementVerified,false);assert.equal(r.approved,false);assert.equal(r.executable,false);assert.ok(reviewFingerprint(row));
 assert.throws(()=>parseAdvisoryReview('{"assessment":"VERIFIED","differences":[],"unresolved":[]}'));
});
