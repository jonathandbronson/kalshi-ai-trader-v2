import test from "node:test";
import assert from "node:assert/strict";
import {rankForManualReview} from "./review-queue.js";
test("ranked candidate remains unverified and unapproved",()=>{
 const r=rankForManualReview({status:"COLLECTED",timestamp:"2026-10-20",candidates:[{
  category:"sports",eventScore:.95,contractScore:.9,kalshi:{ticker:"A",title:"Team A wins"},
  polymarket:{id:"1",title:"Team A wins"},reviewEvidence:{differentEndDates:false,ruleConflicts:[]}
 }]});
 assert.equal(r.candidates.length,1);
 assert.equal(r.candidates[0].approved,false);
 assert.equal(r.candidates[0].status,"MANUAL_SETTLEMENT_REVIEW_REQUIRED");
 assert.equal(r.verifiedPairs,0);
});
test("review queue caps repeated category",()=>{
 const c=Array.from({length:5},(_,i)=>({category:"politics",kalshi:{ticker:"A"+i},polymarket:{id:String(i)},reviewEvidence:{}}));
 const r=rankForManualReview({candidates:c},{perCategory:2});
 assert.equal(r.candidates.length,2);
});
