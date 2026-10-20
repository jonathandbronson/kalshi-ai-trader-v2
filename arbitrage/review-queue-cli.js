import {readFile,writeFile} from "node:fs/promises";
import {rankForManualReview} from "./review-queue.js";
const source=process.env.ARB_EVENT_OUTPUT??"arbitrage-events.json";
const dest=process.env.ARB_REVIEW_QUEUE_OUTPUT??"arbitrage-review-queue.json";
const report=JSON.parse(await readFile(source,"utf8"));
const queue=rankForManualReview(report);
await writeFile(dest,JSON.stringify(queue,null,2)+"\n");
console.log(JSON.stringify({reviewCandidates:queue.candidates.length,categoryCounts:queue.categoryCounts}));
