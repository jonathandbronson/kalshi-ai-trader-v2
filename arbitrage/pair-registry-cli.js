import {readFile,writeFile} from "node:fs/promises";
import {mergePairRegistry} from "./pair-registry.js";
const read=async(p,fallback)=>{try{return JSON.parse(await readFile(p,"utf8"))}catch(e){if(e.code==="ENOENT")return fallback;throw e}};
const queue=await read(process.env.ARB_REVIEW_QUEUE_OUTPUT??"arbitrage-review-queue.json",{candidates:[]});
const previous=await read(process.env.ARB_REGISTRY_PREVIOUS??"reports/latest-pair-registry.json",{pairs:[]});
const reviews=await read(process.env.ARB_MANUAL_REVIEWS??"arbitrage/manual-reviews.json",[]);
const report=mergePairRegistry(previous,queue,reviews);
await writeFile(process.env.ARB_REGISTRY_OUTPUT??"arbitrage-pair-registry.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({counts:report.counts,changes:report.changes.length}));
