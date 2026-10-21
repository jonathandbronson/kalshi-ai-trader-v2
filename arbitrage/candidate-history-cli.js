import {readFile,writeFile} from "node:fs/promises";
import {accumulateCandidates} from "./candidate-history.js";
const read=async(path,fallback)=>{try{return JSON.parse(await readFile(path,"utf8"))}catch(e){if(e.code==="ENOENT")return fallback;throw e}};
const latest=await read(process.env.ARB_EVENT_OUTPUT??"arbitrage-events.json",{candidates:[]});
const prior=await read(process.env.ARB_CANDIDATE_HISTORY_PREVIOUS??"reports/latest-candidate-history.json",{pairs:[]});
const report=accumulateCandidates(prior,latest);
await writeFile(process.env.ARB_CANDIDATE_HISTORY_OUTPUT??"arbitrage-candidate-history.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({totalDistinctPairs:report.totalDistinctPairs,counts:report.counts}));
