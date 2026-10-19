// Read-only change detection for event discovery reports. No market orders.
import {readFile,writeFile} from "node:fs/promises";
const source=process.env.ARB_EVENT_OUTPUT??"arbitrage-events.json";
const previous=process.env.ARB_PREVIOUS_EVENTS??"reports/latest-events.json";
const destination=process.env.ARB_EVENT_CHANGES_OUTPUT??"arbitrage-event-changes.json";
const read=async path=>{try{return JSON.parse(await readFile(path,"utf8"))}catch(e){if(e.code==="ENOENT")return null;throw e}};
const key=c=>String(c.kalshi?.ticker??"")+"|"+String(c.polymarket?.id??"");
const now=await read(source),old=await read(previous);
if(!now||!Array.isArray(now.candidates))throw Error("Missing or invalid new event report");
const prior=new Map((old?.candidates??[]).map(c=>[key(c),c]));
const current=new Map(now.candidates.map(c=>[key(c),c]));
const added=[...current.keys()].filter(k=>!prior.has(k));
const removed=[...prior.keys()].filter(k=>!current.has(k));
const report={timestamp:new Date().toISOString(),status:"DIFF_ONLY",currentScanStatus:now.status,previousScanStatus:old?.status??null,previousTimestamp:old?.timestamp??null,counts:{previous:prior.size,current:current.size,added:added.length,removed:removed.length},added,removed,notes:["Only compares the candidate shortlist, not the entire event universe.","Disappearance from the shortlist does not mean an event closed.","No settlement verification or trade approval."]};
await writeFile(destination,JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify(report.counts));
