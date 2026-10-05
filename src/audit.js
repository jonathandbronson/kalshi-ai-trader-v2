import {loadState} from "./store.js";
export async function auditSummary(){const s=await loadState();return {version:s.experiment.version,experiment:s.experiment.status,locked:Object.keys(s.forecasts).length,evaluated:Object.keys(s.evaluations).length,resolved:Object.keys(s.resolutions).length,events:s.audit,generatedAt:new Date().toISOString()};}
