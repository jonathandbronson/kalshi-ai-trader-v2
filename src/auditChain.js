import {createHash} from "node:crypto";

// Canonical JSON makes hashes independent of object-property insertion order.
export function canonicalJson(value){
 if(value===null||typeof value==="string"||typeof value==="boolean")return JSON.stringify(value);
 if(typeof value==="number"&&Number.isFinite(value))return JSON.stringify(value);
 if(Array.isArray(value))return "["+Array.from(value,canonicalJson).join(",")+"]";
 if(value&&typeof value==="object"&&[Object.prototype,null].includes(Object.getPrototypeOf(value))){
  return "{"+Object.keys(value).sort().map(k=>JSON.stringify(k)+":"+canonicalJson(value[k])).join(",")+"}";
 }
 throw new Error("Invalid audit JSON value");
}
export const emptyAuditIntegrity=()=>({version:1,count:0,head:null});
export const auditDigest=value=>createHash("sha256").update(canonicalJson(value)).digest("hex");
const reserved=["sequence","previousHash","hash"];
function seal(event,sequence,previousHash){
 if(!event||typeof event!=="object"||Array.isArray(event)||reserved.some(k=>Object.hasOwn(event,k)))throw new Error("Invalid new audit event");
 const sealed={...event,sequence,previousHash};return {...sealed,hash:auditDigest(sealed)};
}
export function validateAudit(state){
 const {audit,auditIntegrity:a}=state;
 if(!Array.isArray(audit)||!a||a.version!==1||!Number.isSafeInteger(a.count)||a.count!==audit.length)throw new Error("Audit integrity failure: invalid anchor/count");
 let previous=null;
 for(let i=0;i<audit.length;i++){
  const event=audit[i];
  if(!event||typeof event!=="object"||Array.isArray(event)||event.sequence!==i+1||event.previousHash!==previous||typeof event.hash!=="string")throw new Error("Audit integrity failure: sequence/link");
  const {hash,...content}=event;
  if(hash!==auditDigest(content))throw new Error("Audit integrity failure: event hash");
  previous=hash;
 }
 if(a.head!==previous)throw new Error("Audit integrity failure: head");
 return true;
}
export function sealAuditAppend(state,before){
 validateAudit(before);
 if(canonicalJson(state.auditIntegrity)!==canonicalJson(before.auditIntegrity)||!Array.isArray(state.audit)||state.audit.length<before.audit.length)throw new Error("Audit history is append-only");
 for(let i=0;i<before.audit.length;i++)if(canonicalJson(state.audit[i])!==canonicalJson(before.audit[i]))throw new Error("Audit history is append-only");
 let previous=before.auditIntegrity.head;
 for(let i=before.audit.length;i<state.audit.length;i++){state.audit[i]=seal(state.audit[i],i+1,previous);previous=state.audit[i].hash;}
 state.auditIntegrity={version:1,count:state.audit.length,head:previous};
 validateAudit(state);
}
