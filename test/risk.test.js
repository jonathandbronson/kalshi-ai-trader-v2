import test from "node:test";import assert from "node:assert/strict";import {suggestedPaperFraction,riskFlags} from "../src/risk.js";
test("position sizing is zero below threshold",()=>assert.equal(suggestedPaperFraction({edge:.07}),0));
test("position sizing never exceeds cap",()=>assert.ok(suggestedPaperFraction({edge:.5,evidenceQuality:1,confidence:1})<=.03));
test("risk flags weak evidence and liquidity",()=>{const f=riskFlags({volume:2,evidenceQuality:.3});assert.ok(f.includes("LOW_LIQUIDITY"));assert.ok(f.includes("WEAK_EVIDENCE"));});
