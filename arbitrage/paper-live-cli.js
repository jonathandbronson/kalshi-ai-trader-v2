import {readFile,writeFile} from "node:fs/promises";
import {PaperPortfolio} from "./simulator.js";
import {runPaperCycle} from "./paper-live-engine.js";
const file=process.env.ARB_APPROVED_PAIRS_FILE,statePath=process.env.ARB_PAPER_STATE??"arbitrage-live-paper-state.json";
async function main(){
 if(!file)throw Error("ARB_APPROVED_PAIRS_FILE required");
 const pairs=JSON.parse(await readFile(file,"utf8"));if(!Array.isArray(pairs))throw Error("pairs must be array");
 const p=new PaperPortfolio({bankrollUsd:1000,maxPositionFraction:.03});
 try{const s=JSON.parse(await readFile(statePath,"utf8"));p.cashUsd=s.cashUsd;p.realizedPnlUsd=s.realizedPnlUsd;p.positions=s.positions}catch(e){if(e.code!=="ENOENT")throw e}
 const cycle=async()=>{const r=await runPaperCycle({pairs,portfolio:p,quantity:Number(process.env.ARB_QUANTITY??10),yesFeeRate:Number(process.env.ARB_FEE_RATE??.02),noFeeRate:Number(process.env.ARB_FEE_RATE??.02),latencySlippageCents:Number(process.env.ARB_SLIPPAGE_CENTS??1)});await writeFile(statePath,JSON.stringify(p.snapshot(),null,2)+"\n",{mode:0o600});console.log(JSON.stringify(r))};
 await cycle();if(process.argv.includes("--watch"))setInterval(()=>cycle().catch(console.error),Math.max(10000,Number(process.env.ARB_POLL_MS??30000)));
}
main().catch(e=>{console.error(e);process.exitCode=1});
