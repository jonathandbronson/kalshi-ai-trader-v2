import {readFile,writeFile} from "node:fs/promises";
import {updateSpreadHistory} from "./spread-history.js";
const read=async(p,fallback)=>{try{return JSON.parse(await readFile(p,"utf8"))}catch(e){if(e.code==="ENOENT")return fallback;throw e}};
const prior=await read(process.env.ARB_PREVIOUS_SPREAD_HISTORY??"reports/latest-spread-history.json",{observations:[]});
const latest=await read(process.env.ARB_SPREAD_REPORT??"arbitrage-spread-observations.json",{observations:[]});
const history=updateSpreadHistory(prior,latest);
await writeFile(process.env.ARB_SPREAD_HISTORY_OUTPUT??"arbitrage-spread-history.json",JSON.stringify(history,null,2)+"\n");
console.log(JSON.stringify(history.summary));
