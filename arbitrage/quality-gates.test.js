import test from "node:test";
import assert from "node:assert/strict";
import {compareContractTerms,qualityScore} from "./quality-gates.js";
import {applyReviewFeedback,evaluateLabeledBatch} from "./quality-feedback.js";
test("career rushing yards never matches single season yards",()=>{
 const r=compareContractTerms("Derrick Henry: 14,000+ Career Rushing Yards","Will Derrick Henry have 1,000+ rushing yards in 2026-27 NFL regular season?");
 assert.ok(r.hardConflicts.includes("DIFFERENT_PERIOD"));
});
test("different calendar deadlines fail closed",()=>{
 const r=compareContractTerms("Will Indiana enact a moratorium before 2028?","Will Indiana enact a moratorium by December 31 2028?");
 assert.ok(r.hardConflicts.some(x=>x.startsWith("DIFFERENT_DEADLINE")));
});
test("identical explicit numeric thresholds survive",()=>{
 const r=compareContractTerms("Bitcoin above 100000 on October 31 2026","Bitcoin above 100000 on October 31 2026");
 assert.deepEqual(r.hardConflicts,[]);
});
test("same event with distinct explicit dates rejected",()=>{
 const r=compareContractTerms("Bitcoin above 100000 on October 30 2026","Bitcoin above 100000 on October 31 2026");
 assert.ok(r.hardConflicts.includes("DIFFERENT_EXPLICIT_DATE"));
});
test("unknown liquidity scores zero rather than inventing tradability",()=>{
 const q=qualityScore({kalshi:{ticker:"K",title:"Bitcoin above 100000"},polymarket:{id:"P",title:"Bitcoin above 100000"},contractScore:1});
 assert.equal(q.components.liquidity,0);
 assert.equal(q.settlementVerified,false);
});
test("human rejected pair is excluded only while official rule hashes match",()=>{
 const c={kalshi:{ticker:"K"},polymarket:{id:"P"},ruleEvidence:{kalshi:{ruleSha256:"a"},polymarket:{ruleSha256:"b"}}};
 const r=[{kalshiTicker:"K",polymarketId:"P",decision:"REJECTED",kalshiRuleSha256:"a",polymarketRuleSha256:"b"}];
 assert.equal(applyReviewFeedback([c],r).candidates.length,0);
 assert.equal(applyReviewFeedback([{...c,ruleEvidence:{kalshi:{ruleSha256:"changed"},polymarket:{ruleSha256:"b"}}}],r).candidates.length,1);
});
test("real label benchmark never claims accuracy from empty labels",()=>{
 const empty=evaluateLabeledBatch([],[]);
 assert.equal(empty.precision,null);assert.equal(empty.recall,null);
 const r=evaluateLabeledBatch([{kalshiTicker:"K",polymarketId:"P"}],[{kalshiTicker:"K",polymarketId:"P",label:"MISMATCH"}]);
 assert.equal(r.falsePositive,1);assert.equal(r.precision,0);
});
