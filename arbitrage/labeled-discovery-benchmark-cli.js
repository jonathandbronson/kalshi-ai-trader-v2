// Evaluate retrieval against human-adjudicated real pairs, not synthetic titles.
// No labels => no precision/recall claim. The archive is pre-settlement discovery only.
import {readFile,writeFile} from "node:fs/promises";
import {evaluateLabeledBatch} from "./quality-feedback.js";
const read=async(path,fallback)=>{try{return JSON.parse(await readFile(path,"utf8"))}catch(e){if(e.code==="ENOENT")return fallback;throw e}};
const archive=await read(process.env.ARB_DISCOVERY_ARCHIVE??"arbitrage-discovery-archive.json",{candidates:[]});
const labels=await read(process.env.ARB_GROUND_TRUTH??"arbitrage/ground-truth.json",[]);
if(!Array.isArray(labels))throw Error("Ground truth must be an array");
const sources=[...new Set((archive.candidates??[]).map(x=>x.discoverySource))].filter(Boolean);
const report={timestamp:new Date().toISOString(),kind:"HUMAN_LABELED_DISCOVERY",labels:labels.length,
 all:evaluateLabeledBatch(archive.candidates??[],labels),
 bySource:Object.fromEntries(sources.map(source=>[source,evaluateLabeledBatch(archive.candidates.filter(x=>x.discoverySource===source),labels)])),
 warning:labels.length===0?"NO_HUMAN_GROUND_TRUTH_YET":null,
 notes:["Discovery recall is measured before settlement triage; no candidate is verified by this report.","Ground truth labels must be manually adjudicated and include both positive and negative examples."]};
await writeFile(process.env.ARB_LABELED_BENCHMARK_OUTPUT??"arbitrage-labeled-benchmark.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({kind:report.kind,labels:report.labels,precision:report.all.precision,recall:report.all.recall}));
