// Explicit retrofit into a separate validation copy; never modify the source.
import {DatabaseSync} from "node:sqlite";
import {createHash} from "node:crypto";
import {resolve,basename} from "node:path";
import {existsSync} from "node:fs";
import {emptyAuditIntegrity,validateAudit,sealAuditAppend,auditDigest} from "../src/auditChain.js";

const [input,output]=process.argv.slice(2);
if(!input||!output||resolve(input)===resolve(output)||existsSync(output)||!/validation/i.test(basename(output)))throw new Error("Provide source and a new, separate validation-named destination");
const source=new DatabaseSync(input,{readOnly:true});
let state;
try{
 if(source.prepare("PRAGMA integrity_check").get().integrity_check!=="ok")throw new Error("Source SQLite integrity failure");
 state=JSON.parse(source.prepare("SELECT value FROM state WHERE id=1").get().value);
}finally{source.close();}
if(state.schemaVersion!==2||state.experiment?.status!=="PREPARATION"||state.auditIntegrity)throw new Error("Only unsealed PREPARATION validation history can be copied");
for(const record of [...Object.values(state.forecasts),...Object.values(state.evaluations),...Object.values(state.resolutions)]){
 const {hash,...content}=record;
 if(hash!==createHash("sha256").update(JSON.stringify(content)).digest("hex"))throw new Error("Source record integrity failure");
}
const originalStateHash=createHash("sha256").update(JSON.stringify(state)).digest("hex"),originalAuditHash=auditDigest(state.audit),originalEventCount=state.audit.length;
state.auditIntegrity=emptyAuditIntegrity();
state.audit.push({type:"LEGACY_VALIDATION_AUDIT_IMPORT",at:new Date().toISOString(),retroactive:true,originalStateHash,originalAuditHash,originalEventCount});
sealAuditAppend(state,{audit:[],auditIntegrity:emptyAuditIntegrity()});validateAudit(state);
const target=new DatabaseSync(output);
try{
 target.exec("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE state (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL); BEGIN IMMEDIATE");
 target.prepare("INSERT INTO state VALUES(1,?)").run(JSON.stringify(state));target.exec("COMMIT");
}catch(e){if(target.isTransaction)target.exec("ROLLBACK");throw e;}finally{target.close();}
console.log(JSON.stringify({destination:output,originalEventCount,sealedEventCount:state.audit.length,auditHead:state.auditIntegrity.head,retroactive:true,originalStateHash}));
