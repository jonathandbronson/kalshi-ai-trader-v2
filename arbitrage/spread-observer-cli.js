import {readFile,writeFile} from "node:fs/promises";
import {observeSpreads} from "./spread-observer.js";
const input=process.env.ARB_APPROVED_PAIRS_FILE??"arbitrage/approved-pairs.json";
const output=process.env.ARB_SPREAD_REPORT??"arbitrage-spread-observations.json";
async function main(){
 const pairs=JSON.parse(await readFile(input,"utf8"));
 if(!Array.isArray(pairs))throw Error("Expected an array of approved pairs");
 const report=await observeSpreads({pairs,quantity:Number(process.env.ARB_OBSERVE_QUANTITY??10),slippageCents:Number(process.env.ARB_SLIPPAGE_CENTS??1)});
 await writeFile(output,JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify(report.summary));
}
main().catch(e=>{console.error(e);process.exitCode=1});
