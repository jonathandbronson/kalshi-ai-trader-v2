import test from "node:test";import assert from "node:assert/strict";import {classifyMarket,makeResearchPlan} from "../src/researchPlan.js";import {evidenceDiagnostics} from "../src/evidence.js";
test("classifies weather",()=>assert.equal(classifyMarket({title:"Will NYC temperature exceed 90F?"}),"weather"));
test("plan bans prediction market anchoring",()=>assert.ok(makeResearchPlan({ticker:"X",title:"Will CPI exceed 3%?"}).instructions.some(x=>x.includes("Do not use Kalshi"))));
test("requires diverse evidence",()=>assert.equal(evidenceDiagnostics([{source:"A",url:"https://a.com/1",claim:"x"},{source:"A",url:"https://a.com/2",claim:"y"}]).sufficient,false));
