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

test("price and volume changes are not falsely counted as contract revisions",()=>{
 const base=normalizeMarkets(k,"kalshi");
 const first=mergeSnapshot({},base);
 const changed=base.map(m=>({...m,volume:m.volume+5,liquidity:m.liquidity+2}));
 const second=mergeSnapshot(first,changed);
 assert.equal(second.stats.updated,0);
 assert.equal(second.stats.unchanged,2);
 assert.equal(second.stats.marketDataRefreshed,2);
});

test("shared event boilerplate cannot match unrelated contracts",()=>{
 const kalshi=[{title:"2026 Presidential election",markets:[{ticker:"KA",title:"Will Alice Johnson win the 2026 Presidential election?"}]}];
 const poly=[{title:"2026 Presidential election",markets:[{id:"PB",question:"Will Robert Smith win the 2026 Presidential election?"},{id:"PA",question:"Will Alice Johnson win the 2026 Presidential election?"}]}];
 const result=discoverIndexedPairs([...normalizeMarkets(kalshi,"kalshi"),...normalizeMarkets(poly,"polymarket")],{minScore:.2});
 assert.ok(result.candidates.some(x=>x.kalshiTicker==="KA"&&x.polymarketId==="PA"));
 assert.ok(!result.candidates.some(x=>x.kalshiTicker==="KA"&&x.polymarketId==="PB"));
});
test("title identity outranks generic event similarity",()=>{
 const a=[{title:"2026 election",markets:[{ticker:"KX",title:"Will Alice Johnson win the 2026 election?"}]}];
 const b=[{title:"2026 election",markets:[{id:"PX",question:"Will Alice Johnson win the 2026 election?"}]}];
 const result=discoverIndexedPairs([...normalizeMarkets(a,"kalshi"),...normalizeMarkets(b,"polymarket")],{minScore:.2});
 assert.equal(result.candidates[0].exactTitle,true);
 assert.ok(result.candidates[0].titleAgreement>.9);
});

test("retirement contracts never pair with presidential election or player statistics",()=>{
 const a=[{title:"NBA",markets:[{ticker:"L",title:"Will LeBron James announce his retirement before the 2028-29 NBA season?"},{ticker:"K",title:"Will Kyrie Irving announce his retirement before the 2026-27 NBA season?"}]}];
 const b=[{title:"Sports",markets:[{id:"P",question:"Will LeBron James win the 2028 US Presidential Election?"},{id:"Q",question:"Kyrie Irving: Points O/U 21.5"}]}];
 const rows=[...normalizeMarkets(a,"kalshi"),...normalizeMarkets(b,"polymarket")];
 const pairs=discoverIndexedPairs(rows,{minScore:.1}).candidates;
 assert.equal(pairs.length,0);
});
test("identical prime minister titles survive generic posting-list suppression",()=>{
 const title="Will Naftali Bennett be the next Prime Minister of Israel?";
 const a=[{title:"Israeli politics",markets:[{ticker:"PM",title}]}];
 const b=[{title:"Israeli politics",markets:[{id:"PM2",question:title}]}];
 const pairs=discoverIndexedPairs([...normalizeMarkets(a,"kalshi"),...normalizeMarkets(b,"polymarket")],{minScore:.1,maxBlock:0}).candidates;
 assert.ok(pairs.some(x=>x.kalshiTicker==="PM"&&x.polymarketId==="PM2"));
});
