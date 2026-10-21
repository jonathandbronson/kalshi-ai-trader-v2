import {requestAdvisoryReview} from "./ai-settlement-review.js";
import {loadAiExtractionCache,cachedAiExtraction} from "./contract-extraction.js";
import {triageRefreshedQueue} from "./settlement-triage.js";
import {readFile,writeFile} from "node:fs/promises";
import {refreshReviewEvidence} from "./evidence-refresh.js";
const source=process.env.ARB_REVIEW_QUEUE_OUTPUT??"arbitrage-review-queue.json";
const queue=JSON.parse(await readFile(source,"utf8"));
const refreshed=await refreshReviewEvidence(queue,{limit:Math.max(0,Math.min(40,Number(process.env.ARB_EVIDENCE_LIMIT??30))),delayMs:Math.max(0,Number(process.env.ARB_EVIDENCE_DELAY_MS??200))});
const screened=triageRefreshedQueue(refreshed);
const aiCache=await loadAiExtractionCache(process.env.ARB_AI_EXTRACTION_CACHE??"arbitrage/ai-extractions.json");
for(const row of screened.candidates){
 const kRules=[row.ruleEvidence?.kalshi?.rulesPrimary,row.ruleEvidence?.kalshi?.rulesSecondary].filter(Boolean).join(" ");
 const pRules=row.ruleEvidence?.polymarket?.description??"";
 row.reviewedAiExtraction={kalshi:cachedAiExtraction(aiCache,"kalshi:"+row.kalshiTicker,kRules,row.kalshiTitle),polymarket:cachedAiExtraction(aiCache,"polymarket:"+row.polymarketId,pRules,row.polymarketTitle)};
}
if(process.env.ARB_ENABLE_AI_REVIEW==="true"&&process.env.OPENAI_API_KEY){
 const limit=Math.max(0,Math.min(30,Number(process.env.ARB_AI_REVIEW_LIMIT??8)));
 for(const row of screened.candidates.slice(0,limit)){
  try{row.aiSettlementReview=await requestAdvisoryReview(row)}catch(e){row.aiSettlementReview={status:"AI_REVIEW_FAILED",error:String(e.message).slice(0,150),settlementVerified:false}}
 }
}
await writeFile(source,JSON.stringify(screened,null,2)+"\n");
console.log(JSON.stringify({evidenceRefresh:refreshed.evidenceRefresh,settlementTriage:screened.settlementTriage}));
