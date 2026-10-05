import {codeFingerprint,strategyFingerprint,strategyMetadata} from "./version.js";
import {DatabaseSync} from "node:sqlite";
import {mkdirSync,existsSync,readFileSync} from "node:fs";
import {dirname} from "node:path";
import {createHash} from "node:crypto";
const path=process.env.DATA_PATH??"./data/state.sqlite";
mkdirSync(dirname(path),{recursive:true});
// Never open legacy JSON as SQLite; retain it and migrate to a sibling database.
const legacy=path.endsWith(".json")?path:path==="./data/state.sqlite"?"./data/state.json":null;
const db=new DatabaseSync(path.endsWith(".json")?path+".sqlite":path);
db.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL)");
const blank=()=>({schemaVersion:2,research:{},analyses:{},paperTrades:[],forecasts:{},evaluations:{},resolutions:{},costs:[],audit:[],experiment:{version:"v2-integrity-1",status:"PREPARATION",target:200}});
if(!db.prepare("SELECT value FROM state WHERE id=1").get()){
 const old=legacy&&existsSync(legacy)?JSON.parse(readFileSync(legacy,"utf8")):{};
 db.prepare("INSERT INTO state VALUES(1,?)").run(JSON.stringify({...blank(),...old,schemaVersion:2,experiment:blank().experiment}));
}
export const digest=x=>createHash("sha256").update(JSON.stringify(x)).digest("hex");
function read(){const s=JSON.parse(db.prepare("SELECT value FROM state WHERE id=1").get().value);if(s.schemaVersion!==2||![s.forecasts,s.evaluations,s.resolutions,s.research,s.analyses].every(v=>v&&typeof v==="object"&&!Array.isArray(v))||![s.paperTrades,s.costs,s.audit].every(Array.isArray))throw new Error("Invalid persisted state");for(const f of [...Object.values(s.forecasts),...Object.values(s.evaluations),...Object.values(s.resolutions)]){const {hash,...content}=f;if(hash!==digest(content))throw new Error("Forecast integrity failure");}return s;}
export async function loadState(){return read();}
// Research-facing read deliberately omits all quote and portfolio data.
export async function loadForecastHistory(){return Object.values(read().forecasts);}
export async function unresolvedDrivers(){const s=read();return Object.values(s.forecasts).filter(f=>!s.resolutions[f.id]).map(f=>f.driverId);}
export async function latestEvaluation(forecastId){return Object.values(read().evaluations).filter(e=>e.forecastId===forecastId).at(-1);}
export async function transact(fn){
 db.exec("BEGIN IMMEDIATE");try{const s=read(),before=structuredClone(s.forecasts),evaluations=structuredClone(s.evaluations),resolutions=structuredClone(s.resolutions);const result=fn(s);if(result?.then)throw new Error("Transactions must be synchronous");
 for(const [id,f] of Object.entries(before))if(JSON.stringify(s.forecasts[id])!==JSON.stringify(f))throw new Error("Locked forecasts are immutable");
 for(const [id,e] of Object.entries(evaluations))if(JSON.stringify(s.evaluations[id])!==JSON.stringify(e))throw new Error("Quote evaluations are immutable");
 for(const [id,r] of Object.entries(resolutions))if(JSON.stringify(s.resolutions[id])!==JSON.stringify(r))throw new Error("Official resolutions are immutable");
 for(const f of [...Object.values(s.forecasts),...Object.values(s.evaluations),...Object.values(s.resolutions)]){const {hash,...content}=f;if(hash!==digest(content))throw new Error("Invalid forecast hash");}
 db.prepare("UPDATE state SET value=? WHERE id=1").run(JSON.stringify(s));db.exec("COMMIT");return result;
 }catch(e){db.exec("ROLLBACK");throw e;}
}
export async function saveResearch(packet){return transact(s=>{const f=structuredClone(packet);f.id??=crypto.randomUUID();
 const previous=Object.values(s.forecasts).filter(x=>x.ticker===f.ticker).at(-1);
 if(Object.values(s.forecasts).some(x=>x.ticker===f.ticker&&s.resolutions[x.id]))throw new Error("Cannot forecast an officially resolved event");
 if(previous&&f.priorForecastId!==previous.id)throw new Error("Duplicate forecast or revision conflict");
 if(Object.values(s.forecasts).some(x=>x.ticker!==f.ticker&&(x.eventId===f.eventId||(!s.resolutions[x.id]&&x.driverId===f.driverId))))throw new Error("Correlated forecast");
 f.version=s.experiment.version;f.codeFingerprint=codeFingerprint;f.strategyFingerprint=strategyFingerprint;f.strategyMetadata=strategyMetadata;delete f.hash;f.hash=digest(f);if(s.forecasts[f.id])throw new Error("Duplicate forecast");s.forecasts[f.id]=f;s.research[f.ticker]=f;s.audit.push({type:"FORECAST_LOCKED",id:f.id,at:f.lockedAt});return f;});}
export async function saveAnalysis(a){return transact(s=>{if(!s.forecasts[a.forecastId])throw new Error("Forecast must be durably locked first");const e={...a,id:crypto.randomUUID(),savedAt:new Date().toISOString()};delete e.hash;e.hash=digest(e);s.evaluations[e.id]=e;s.analyses[e.ticker]=e;s.audit.push({type:"QUOTE_EVALUATED",id:e.id,forecastId:e.forecastId,at:e.savedAt});return e;});}
