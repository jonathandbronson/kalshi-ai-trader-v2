import test from "node:test";
import assert from "node:assert/strict";
import {kalshiDepth,polyDepth,fetchPairDepth} from "./live-adapters.js";
test("legacy Kalshi cent quotes",()=>{const b=kalshiDepth({orderbook:{yes:[[55,4]],no:[[65,3]]}});assert.equal(b.yes[0].price,.35);assert.equal(b.no[0].price,.45)});
test("Kalshi fp quote complement",()=>{const b=kalshiDepth({orderbook_fp:{yes_dollars:[["0.62","3.00"]],no_dollars:[["0.55","2.00"]]}});assert.equal(b.yes[0].price,.45);assert.equal(b.no[0].price,.38)});
test("Polymarket asks sorted",()=>{const b=polyDepth({asks:[{price:"0.7",size:"1"},{price:"0.4",size:"2"}]});assert.equal(b[0].price,.4)});
test("rejects unapproved pair before network",async()=>{await assert.rejects(()=>fetchPairDepth({approved:false},()=>{throw Error("unexpected fetch")}),/PAIR_NOT_APPROVED/)});
