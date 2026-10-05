import {scoreEvidence,hostname,defaultReliability} from "./sourceQuality.js";
import {assertIndependent} from "./contamination.js";
export function normalizeEvidence(items){const seen=new Set(),out=[];for(const raw of items??[]){
 if(!raw?.source||!raw?.claim||!raw.url||raw.guidanceOnly||raw.headlineOnly)continue;
 try{assertIndependent(raw);const u=new URL(raw.url);if(u.protocol!=="https:")continue;}catch{continue;}
 const report=String(raw.claim).toLowerCase().replace(/[^a-z0-9 ]/g,"").replace(/\s+/g," ").trim();
 const key=raw.originId??report;
 const words=new Set(report.split(" ").filter(w=>w.length>3));
 if(out.some(e=>{const other=new Set(e.claim.toLowerCase().replace(/[^a-z0-9 ]/g,"").split(/\s+/).filter(w=>w.length>3));const overlap=[...words].filter(w=>other.has(w)).length;return overlap/Math.max(1,Math.min(words.size,other.size))>.85;}))continue;
 if(seen.has(key))continue;seen.add(key);
 const sourceReliability=raw.sourceReliability??raw.reliability??defaultReliability(raw.url);const reliability=scoreEvidence({...raw,reliability:sourceReliability});if(reliability<.5)continue;
 out.push({...raw,sourceReliability,reliability,originId:key});}return out;}
export function evidenceDiagnostics(items){const e=normalizeEvidence(items),hosts=new Set(e.map(x=>{const h=hostname(x.url);return /(?:^|\.)(?:noaa|weather)\.gov$/.test(h)?"NOAA/NWS":h})),origins=new Set(e.map(x=>x.originId));return {count:e.length,uniqueSources:hosts.size,independentReports:origins.size,averageReliability:e.length?e.reduce((n,x)=>n+x.reliability,0)/e.length:0,sufficient:e.length>=2&&hosts.size>=2&&origins.size>=2};}
