import test from "node:test";import assert from "node:assert/strict";
import {estimateProbability,probabilityRange} from "../src/probability.js";
test("estimator combines independent signals",()=>{const e=estimateProbability({baseRate:.5,signals:[{probability:.7,reliability:.9,independence:.9},{probability:.65,reliability:.8,independence:.8}]});assert.ok(e.probability>.5);assert.ok(e.probability<.9);});
test("uncertain evidence gets wider interval",()=>{const a=estimateProbability({signals:[{probability:.6,reliability:.2},{probability:.6,reliability:.2}]});const r=probabilityRange(a);assert.ok(r.high-r.low>.2);});
