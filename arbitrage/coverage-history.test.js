import test from "node:test";
import assert from "node:assert/strict";
import {appendCoverage} from "./coverage-history.js";
test("coverage telemetry retains distinct snapshots and rejects old data",()=>{
 const old={snapshots:[{timestamp:"2026-01-01T00:00:00Z",kalshiEvents:1}]};
 const current={timestamp:"2026-10-21T12:00:00Z",status:"COLLECTED",counts:{kalshiEvents:800,polymarketEvents:1200,eligibleCandidatePool:30,marketLevelDiscovery:{comparisons:1200}},errors:[]};
 const first=appendCoverage(old,current,{now:"2026-10-21T12:00:00Z"});
 const second=appendCoverage(first,current,{now:"2026-10-21T12:00:00Z"});
 assert.equal(second.snapshots.length,1);
 assert.equal(second.latest.kalshiEvents,800);
 assert.equal(second.latest.verifiedPairs,0);
});
