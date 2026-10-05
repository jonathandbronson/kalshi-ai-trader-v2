import {transact} from "./store.js";
import {fetchJson} from "./network.js";
// Guidance is a research plan, never event evidence.
export async function fetchOfficialSignals(){return [];}
export function requestSpacer(interval=5100,{now=Date.now,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 let next=0;return async()=>{const at=Math.max(now(),next);next=at+interval;const wait=at-now();if(wait>0)await sleep(wait);};
}
const gdeltSlot=requestSpacer();
export async function fetchGdeltArticles(query,max=10){const u=new URL("https://api.gdeltproject.org/api/v2/doc/doc");u.searchParams.set("query",query);u.searchParams.set("mode","ArtList");u.searchParams.set("maxrecords",String(Math.min(50,max)));u.searchParams.set("format","json");const id=crypto.randomUUID();await transact(s=>{s.costs.push({id,provider:"gdelt",stage:"EVIDENCE_DISCOVERY",estimatedCost:0,status:"REQUESTED",at:new Date().toISOString()});});let d;try{d=await fetchJson(u,{onAttempt:async attempts=>{await gdeltSlot();await transact(s=>{s.costs.find(c=>c.id===id).attempts=attempts;});}});if(!Array.isArray(d.articles))throw new Error("Malformed GDELT response");await transact(s=>{s.costs.find(c=>c.id===id).status="COMPLETED";});}catch(e){await transact(s=>{s.costs.find(c=>c.id===id).status="FAILED";});throw e;}return d.articles.map(a=>({source:a.domain,claim:a.title,url:a.url,indexedAt:a.seendate,headlineOnly:true}));}
