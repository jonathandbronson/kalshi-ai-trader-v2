import test from "node:test";import assert from "node:assert/strict";import {normalizeMarket,centsToProbability} from "../src/kalshi.js";
test("normalizes cent quotes to probabilities",()=>{assert.equal(centsToProbability(63),.63);const m=normalizeMarket({ticker:"X",title:"x",yes_ask:61,no_ask:41,volume:12});assert.equal(m.yesAsk,.61);assert.equal(m.noAsk,.41);});
