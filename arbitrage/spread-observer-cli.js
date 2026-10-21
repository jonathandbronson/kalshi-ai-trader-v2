import {readFile,writeFile} from "node:fs/promises";
import {observeSpreads} from "./spread-observer.js";
const input=process.env.ARB_APPROVED_PAIRS_FILE??"arbitrage/approved-pairs.json";
const output=process.env.ARB_SPREAD_REPORT??"arbitrage-spread-observations.json";
async function main(){
 const configured=JSON.parse(await readFile(input,"utf8"));
 if(!Array.isArray(configured))throw Error("Expected an array of approved pairs");
 // Only pairs explicitly verified in the persistent registry may be observed.
 // An empty verified registry is a valid, safe no-op.
 const registry=JSON.parse(await readFile(process.env.ARB_REGISTRY_OUTPUT??"arbitrage-pair-registry.json","utf8"));
 const verified=new Set((registry.pairs??[]).filter(p=>p.status==="VERIFIED").map(p=>String(p.id??p.key??"")));
 const pairs=configured.filter(p=>verified.has(String(p.id??p.key??""))&&p.approved===true&&p.settlementEvidenceVerified===true);
 const report=await observeSpreads({pairs,quantity:Number(process.env.ARB_OBSERVE_QUANTITY??10),slippageCents:Number(process.env.ARB_SLIPPAGE_CENTS??1)});
 await writeFile(output,JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify({...report.summary,configured:configured.length,registryVerified:verified.size,eligibleForObservation:pairs.length}));
}
main().catch(e=>{console.error(e);process.exitCode=1});
