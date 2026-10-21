import {readFile,writeFile} from "node:fs/promises";
import {appendCoverage} from "./coverage-history.js";
const read=async(path,fallback)=>{try{return JSON.parse(await readFile(path,"utf8"))}catch(e){if(e.code==="ENOENT")return fallback;throw e}};
const latest=await read(process.env.ARB_EVENT_OUTPUT??"arbitrage-events.json",{counts:{}});
const prior=await read(process.env.ARB_COVERAGE_HISTORY_PREVIOUS??"reports/latest-coverage-history.json",{snapshots:[]});
const report=appendCoverage(prior,latest);
await writeFile(process.env.ARB_COVERAGE_HISTORY_OUTPUT??"arbitrage-coverage-history.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({snapshots:report.snapshots.length,latest:report.latest}));
