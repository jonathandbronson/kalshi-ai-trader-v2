import test from "node:test";
import assert from "node:assert/strict";
import {screenSettlementRisk,triageRefreshedQueue} from "./settlement-triage.js";
const make=(kTitle,pTitle,kRules,pRules)=>({kalshiTicker:"K",polymarketId:"P",kalshiTitle:kTitle,polymarketTitle:pTitle,ruleEvidence:{kalshi:{rulesPrimary:kRules},polymarket:{description:pRules}}});
test("rejects Patrick Mahomes career total vs first-to-2000 season",()=>{
 const r=screenSettlementRisk(make("Patrick Mahomes: 40,000+ Passing Yards","Will Patrick Mahomes be the first QB to 2,000 passing yards in the 2026-27 NFL regular season?","If Patrick Mahomes records at least 40,000 career regular season passing yards before retirement, resolves Yes.","First quarterback to reach 2,000 passing yards in the 2026-27 NFL regular season."));
 assert.ok(r.reasons.includes("CAREER_VS_SEASON_SETTLEMENT"));
 assert.ok(r.reasons.includes("DIFFERENT_NUMERIC_PAYOUT_THRESHOLD"));
 assert.ok(r.reasons.includes("FIRST_TO_REACH_VS_INDIVIDUAL_OUTCOME"));
});
test("rejects Derrick Henry career vs season threshold",()=>{
 const r=screenSettlementRisk(make("Derrick Henry: 14,000+ Rushing Yards","Will Derrick Henry have 1,000+ rushing yards in the 2026-27 NFL regular season?","At least 14,000 career regular season rushing yards.","Rushing yards in the 2026-27 NFL regular season equals or exceeds 1,000."));
 assert.equal(r.status,"REJECT_AS_INCOMPATIBLE");
});
test("similar Oscar awards stay unverified and require human review",()=>{
 const r=screenSettlementRisk(make("Will Nuisance Bear win Best Documentary Feature Film at the Oscars?","Will Nuisance Bear win Best Documentary Feature Film at the 99th Academy Awards?","If Nuisance Bear has won Best Documentary Feature Film at the 99th Academy Awards, resolves Yes.","If a film is not officially nominated the market resolves No; tie alphabetically; no winner by June 30 resolves Other."));
 assert.equal(r.status,"NEEDS_HUMAN_REVIEW");assert.equal(r.settlementVerified,false);
});
test("triage preserves rejection reasons and never approves",()=>{
 const q=triageRefreshedQueue({candidates:[make("Derrick Henry: 14,000+ Rushing Yards","Derrick Henry 1,000+ rushing yards season","at least 14,000 career regular season rushing yards","equals or exceeds 1,000 regular season rushing yards")]});
 assert.equal(q.settlementTriage.rejected,1);assert.equal(q.candidates.length,0);
});
