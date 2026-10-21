import test from "node:test";
import assert from "node:assert/strict";
import {lexicalSemanticCandidates,embeddingCandidates,marketText,fingerprintText} from "./semantic-retrieval.js";
import {extractSettlementFields,compareSettlementFields,cachedAiExtraction,rulesHash} from "./contract-extraction.js";
const k=[{title:"Oscars",markets:[{ticker:"K1",title:"Will Nuisance Bear win Best Documentary Feature Film?"},{ticker:"K2",title:"Patrick Mahomes 40000 career passing yards"}]}];
const p=[{title:"99th Academy Awards",markets:[{id:"P1",question:"Will Nuisance Bear win the 99th Academy Award for Best Documentary Feature Film?"},{id:"P2",question:"Will Patrick Mahomes be first QB to 2000 passing yards in the 2026 NFL season?"}]}];
test("independent TF-IDF retrieval never grants approval",()=>{const r=lexicalSemanticCandidates(k,p,{minScore:0.2,limit:10});assert.ok(r.candidates.length>0);assert.ok(r.candidates.every(x=>x.approved===false&&x.executable===false));assert.equal(r.counts.method,"CHAR_NGRAM_TFIDF_NOT_NEURAL_EMBEDDINGS")});
test("embedding cache requires hash-matching market text",()=>{
 const a=k[0].markets[0],b=p[0].markets[0];
 const v={"kalshi:K1":{hash:fingerprintText(marketText(a,k[0])),vector:[1,0]},"polymarket:P1":{hash:fingerprintText(marketText(b,p[0])),vector:[1,0]}};
 assert.equal(embeddingCandidates(k,p,v).candidates.length,1);
 v["polymarket:P1"].hash="stale";
 assert.equal(embeddingCandidates(k,p,v).candidates.length,0);
});
test("contract extraction catches different career and season windows",()=>{
 const a=extractSettlementFields("Patrick Mahomes 40000 passing yards","Career regular season passing yards before retirement.");
 const b=extractSettlementFields("Patrick Mahomes 2000 passing yards","First QB to reach 2000 in the 2026 NFL season.");
 assert.ok(compareSettlementFields(a,b).hardConflicts.includes("DIFFERENT_MEASUREMENT_PERIOD"));
 assert.ok(compareSettlementFields(a,b).hardConflicts.includes("DIFFERENT_FIRST_TO_REACH_PAYOFF"));
});
test("cached AI extraction must be reviewed and rule-hash current",()=>{
 const title="Will X win?",rules="Official rules";
 const entry={rulesHash:rulesHash(title+"\n"+rules),reviewed:true,fields:{event:"X",outcome:"Yes",settlementTrigger:"Award"}};
 assert.equal(cachedAiExtraction({id:entry},"id",rules,title).verified,false);
 assert.equal(cachedAiExtraction({id:{...entry,reviewed:false}},"id",rules,title),null);
 assert.equal(cachedAiExtraction({id:entry},"id","Changed rules",title),null);
});
