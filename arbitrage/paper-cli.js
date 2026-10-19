import {readFile,writeFile} from "node:fs/promises";
import {PaperPortfolio} from "./simulator.js";
import {synthetic} from "./fixtures.js";
const path=process.env.ARB_PAPER_STATE??"arbitrage-paper-state.json";
const inputPath=process.env.ARB_PAPER_INPUT;
const demo=process.argv.includes("--demo");
async function main(){
 let state;try{state=JSON.parse(await readFile(path,"utf8"))}catch(e){if(e.code!=="ENOENT")throw e;state=null}
 const portfolio=new PaperPortfolio({bankrollUsd:1000,maxPositionFraction:.03});
 if(state){portfolio.cashUsd=state.cashUsd;portfolio.realizedPnlUsd=state.realizedPnlUsd;portfolio.positions=state.positions}
 const settleIndex=process.argv.indexOf("--settle");
 if(settleIndex>=0){
  const id=process.argv[settleIndex+1];if(!id)throw new Error("--settle requires a paper position id");
  const result=portfolio.settle(id,{sameOutcome:!process.argv.includes("--mismatch"),voided:process.argv.includes("--void")});
  await writeFile(path,JSON.stringify(portfolio.snapshot(),null,2)+"\n",{mode:0o600});
  console.log(JSON.stringify({result,portfolio:portfolio.snapshot()},null,2));return;
 }
 const input=demo?synthetic:inputPath?JSON.parse(await readFile(inputPath,"utf8")):null;
 if(!input)throw new Error("Provide --demo for synthetic simulation or ARB_PAPER_INPUT for a reviewed, structured paper quote");
 const result=portfolio.enter(input);
 if(result.accepted)await writeFile(path,JSON.stringify(portfolio.snapshot(),null,2)+"\n",{mode:0o600});
 console.log(JSON.stringify({synthetic:demo,result,portfolio:portfolio.snapshot()},null,2));
}
main().catch(e=>{console.error(e);process.exitCode=1});
