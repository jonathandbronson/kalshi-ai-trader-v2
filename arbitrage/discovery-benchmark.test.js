import test from "node:test";
import assert from "node:assert/strict";
import {runSyntheticBenchmark} from "./discovery-benchmark.js";
test("synthetic benchmark has no known false positives or false negatives",()=>{
 const r=runSyntheticBenchmark();
 assert.equal(r.total,8);
 assert.equal(r.falsePositive,0);
 assert.equal(r.falseNegative,0);
 assert.equal(r.precision,1);
 assert.equal(r.recall,1);
});
