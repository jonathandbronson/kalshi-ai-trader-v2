import test from "node:test";
import assert from "node:assert/strict";
import {buildRuleEvidence,changedRuleEvidence} from "./rule-evidence.js";
import {canReuseRejection,pruneRejections} from "./rejection-policy.js";
test("rule evidence records source text and defaults to unverified",()=>{
 const e=buildRuleEvidence({kalshiMarket:{ticker:"K",title:"YES",rules_primary:"Official settlement rule",close_time:"2026-11-01T00:00:00Z"},polymarketMarket:{id:"P",question:"YES",description:"Official settlement rule",endDate:"2026-11-02T00:00:00Z"}});
 assert.equal(e.verified,false);assert.equal(e.approved,false);
 assert.ok(e.warnings.includes("DIFFERENT_LISTED_END_DATES"));
 assert.ok(e.warnings.includes("MISSING_POLYMARKET_RESOLUTION_SOURCE"));
 assert.equal(e.kalshi.ruleSha256.length,64);
});
test("changed rule hashes invalidate evidence",()=>{
 const a=buildRuleEvidence({kalshiMarket:{rules_primary:"A"},polymarketMarket:{description:"X"}});
 const b=buildRuleEvidence({kalshiMarket:{rules_primary:"B"},polymarketMarket:{description:"X"}});
 assert.equal(changedRuleEvidence(a,b),true);
});
test("rejection cache is reused only with matching hash and recent timestamp",()=>{
 const now=Date.parse("2026-10-21T00:00:00Z");
 const r={reason:"subregion_vs_statewide_result",rulesHash:"abc",lastSeen:"2026-10-20T00:00:00Z"};
 assert.equal(canReuseRejection(r,{ruleHash:"abc",now}),true);
 assert.equal(canReuseRejection(r,{ruleHash:"changed",now}),false);
 assert.equal(canReuseRejection({...r,lastSeen:"2026-01-01T00:00:00Z"},{ruleHash:"abc",now}),false);
 const out=pruneRejections({old:{...r,lastSeen:"2026-01-01T00:00:00Z"},recent:r},{now});
 assert.equal(out.expired,1);assert.ok(out.rejections.recent);
});
