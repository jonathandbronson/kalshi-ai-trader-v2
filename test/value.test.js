import test from "node:test"; import assert from "node:assert/strict";
import {scoreTrade,classifyEdge} from "../src/value.js";
test("finds YES value",()=>{const x=scoreTrade({independentProbability:.72,yesAsk:.59,noAsk:.43});assert.equal(x.side,"YES");assert.ok(x.netEdge>.12);});
test("rejects small edge",()=>assert.equal(classifyEdge(.079), "PASS"));
test("accepts 8 point edge",()=>assert.equal(classifyEdge(.08), "VALUE"));
