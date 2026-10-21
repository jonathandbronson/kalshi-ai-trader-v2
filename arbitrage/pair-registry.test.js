import test from "node:test";
import assert from "node:assert/strict";
import {mergePairRegistry} from "./pair-registry.js";
import {updateSpreadHistory} from "./spread-history.js";
const checks=Object.fromEntries(["IDENTICAL_PAYOFF","IDENTICAL_OUTCOME","IDENTICAL_SETTLEMENT_SOURCE","IDENTICAL_SETTLEMENT_TIME","CANCELLATION_AND_VOID_RULES","TRADING_ELIGIBILITY","CURRENT_FEES","AVAILABLE_LIQUIDITY"].map(k=>[k,true]));
const now="2026-10-21T12:00:00Z";
const evidence=(k="hashK",p="hashP")=>({kalshi:{rulesPrimary:"Rule K",ruleSha256:k,closeTime:"2026-11-01T00:00:00Z"},polymarket:{description:"Rule P",ruleSha256:p,endTime:"2026-11-01T00:00:00Z",resolutionSource:"Official"}});
const row=(e=evidence())=>({kalshiTicker:"K",polymarketId:"P",category:"crypto",ruleEvidence:e,evidenceRefreshStatus:"REFRESHED"});
const review={kalshiTicker:"K",polymarketId:"P",decision:"VERIFIED",reviewer:"human",reviewedAt:now,yesMeansSameOutcome:true,kalshiRuleSha256:"hashK",polymarketRuleSha256:"hashP",checks};
test("discovered candidate is pending until explicit verified decision",()=>{
 const r=mergePairRegistry(null,{candidates:[row()]},[],{now});
 assert.equal(r.pairs[0].status,"PENDING_REVIEW");
 assert.equal(r.pairs[0].approved,false);
});
test("explicit complete review allows research verification but never executable status",()=>{
 const r=mergePairRegistry(null,{candidates:[row()]},[review],{now});
 assert.equal(r.pairs[0].status,"VERIFIED");
 assert.equal(r.pairs[0].executable,false);
});
test("changed rules revoke previously verified status",()=>{
 const prev=mergePairRegistry(null,{candidates:[row()]},[review],{now});
 const next=mergePairRegistry(prev,{candidates:[row(evidence("newK","hashP"))]},[],{now});
 assert.equal(next.pairs[0].status,"REVERIFY_REQUIRED");
 assert.equal(next.changes.length,1);
});
test("incomplete evidence and old reviews never verify",()=>{
 const incomplete=mergePairRegistry(null,{candidates:[{...row(),evidenceRefreshStatus:"INCOMPLETE"}]},[review],{now});
 assert.equal(incomplete.pairs[0].status,"REVERIFY_REQUIRED");
 const old=mergePairRegistry(null,{candidates:[row()]},[{...review,reviewedAt:"2025-01-01T00:00:00Z"}],{now});
 assert.equal(old.pairs[0].status,"REVERIFY_REQUIRED");
});
test("historical spreads deduplicate and summarize only seven-day window",()=>{
 const observation={timestamp:"2026-10-20T12:00:00Z",pairId:"K|P",direction:"KALSHI_YES_POLY_NO",status:"POSITIVE_NET_EDGE",modeledRoi:.03};
 const r=updateSpreadHistory({observations:[observation,{...observation,timestamp:"2026-09-01T00:00:00Z"}]},{observations:[observation]},{now});
 assert.equal(r.summary.samples,1);assert.equal(r.summary.positive,1);assert.equal(r.summary.byPair["K|P"].bestModeledRoi,.03);
});
