import test from "node:test";
import assert from "node:assert/strict";
import {normalizeMarkets,mergeSnapshot,discoverIndexedPairs,rankResearchCandidates} from "./discovery-v2.js";
const k=[{event_ticker:"EK",title:"2026 Presidential election",markets:[{ticker:"K1",title:"Will Alice win the 2026 Presidential election?"},{ticker:"K2",title:"Will Alice be nominated in 2026?"}]}];
const p=[{id:"EP",title:"2026 Presidential election",markets:[{id:"P1",question:"Will Alice win the 2026 Presidential election?"},{id:"P2",question:"Will Alice be nominated in 2026?"},{id:"P3",question:"Will Alice win the 2027 election?"}]}];
test("normalizes market identity, venue, and outcomes",()=>{
 const x=normalizeMarkets(k,"kalshi");assert.equal(x.length,2);assert.equal(x[0].id,"kalshi:K1");assert.equal(x[1].outcomeType,"NOMINATION");
});
test("incremental snapshot updates changed records without deleting unseen records",()=>{
 const first=mergeSnapshot({},normalizeMarkets(k,"kalshi"),{now:"2026-10-26T00:00:00Z"});
 const second=mergeSnapshot(first,normalizeMarkets(p,"polymarket"),{now:"2026-10-26T01:00:00Z"});
 assert.equal(second.stats.added,3);assert.equal(second.stats.total,5);
 const third=mergeSnapshot(second,normalizeMarkets(k,"kalshi"),{now:"2026-10-26T02:00:00Z"});
 assert.equal(third.stats.unchanged,2);assert.equal(third.stats.total,5);
});
test("indexed discovery retrieves similar events and excludes conflicting years or outcomes",()=>{
 const rows=[...normalizeMarkets(k,"kalshi"),...normalizeMarkets(p,"polymarket")];
 const result=discoverIndexedPairs(rows,{limit:30,minScore:.2});
 const ids=result.candidates.map(x=>x.kalshiTicker+"|"+x.polymarketId);
 assert.ok(ids.includes("K1|P1"));assert.ok(ids.includes("K2|P2"));
 assert.ok(!ids.includes("K1|P2"));assert.ok(!ids.includes("K1|P3"));
 assert.equal(result.candidates.every(x=>!x.approved&&!x.executable&&!x.settlementVerified),true);
});
test("research priority cannot produce verified trades or invented executable edge",()=>{
 const ranked=rankResearchCandidates([{score:.8,kalshiTicker:"K",polymarketId:"P"}]);
 assert.equal(ranked[0].netExecutableEdge,null);assert.equal(ranked[0].executable,false);
});
