import {readFile,writeFile} from "node:fs/promises";
import {refreshReviewEvidence} from "./evidence-refresh.js";
const source=process.env.ARB_REVIEW_QUEUE_OUTPUT??"arbitrage-review-queue.json";
const queue=JSON.parse(await readFile(source,"utf8"));
const refreshed=await refreshReviewEvidence(queue,{limit:Math.max(0,Math.min(40,Number(process.env.ARB_EVIDENCE_LIMIT??30))),delayMs:Math.max(0,Number(process.env.ARB_EVIDENCE_DELAY_MS??200))});
await writeFile(source,JSON.stringify(refreshed,null,2)+"\n");
console.log(JSON.stringify(refreshed.evidenceRefresh));
