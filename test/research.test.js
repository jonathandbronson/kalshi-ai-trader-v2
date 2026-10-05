import test from "node:test";import assert from "node:assert/strict";
import {buildResearchPacket} from "../src/research.js";
test("locks independent research",()=>{const p=buildResearchPacket({ticker:"X",question:"Will X happen?",probability:.61,evidence:[{source:"NOAA",claim:"a",reliability:.9},{source:"NWS",claim:"b",reliability:.9}]});assert.equal(p.independentProbability,.61);assert.equal(p.evidenceQuality,.9);});
test("rejects Kalshi as research evidence",()=>assert.throws(()=>buildResearchPacket({question:"x",probability:.5,evidence:[{source:"Kalshi",claim:"x"},{source:"AP",claim:"y"}]})));
