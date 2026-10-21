import {writeFile} from "node:fs/promises";
import {runSyntheticBenchmark} from "./discovery-benchmark.js";
const report={timestamp:new Date().toISOString(),...runSyntheticBenchmark(),notes:["Synthetic fixture metrics only; not evidence of real-market matching precision.","Human settlement verification is required before any pair can be approved."]};
await writeFile(process.env.ARB_BENCHMARK_OUTPUT??"arbitrage-discovery-benchmark.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report));
