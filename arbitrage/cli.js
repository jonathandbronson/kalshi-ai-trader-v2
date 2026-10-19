import {readFile} from "node:fs/promises";
import {scanOnce} from "./scanner.js";
const file=process.env.ARB_APPROVED_PAIRS_FILE;
const intervalMs=Math.max(5000,Number(process.env.ARB_POLL_MS??30000));
async function cycle(){
 let approvedPairs=[];
 if(file){const raw=JSON.parse(await readFile(file,"utf8"));if(!Array.isArray(raw))throw new Error("Approved pairs file must be a JSON array");approvedPairs=raw}
 const result=await scanOnce({approvedPairs,limit:Number(process.env.ARB_MARKET_LIMIT??100),quantity:Number(process.env.ARB_QUANTITY??1),feeUsd:Number(process.env.ARB_ESTIMATED_FEES_USD??0)});
 console.log(JSON.stringify(result));
}
if(import.meta.url===new URL("file://"+process.argv[1]).href){
 await cycle().catch(e=>console.error(e));
 if(process.argv.includes("--watch"))setInterval(()=>cycle().catch(e=>console.error(e)),intervalMs);
}
