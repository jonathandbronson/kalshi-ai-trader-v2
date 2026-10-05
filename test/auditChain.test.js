import test from "node:test";
import assert from "node:assert/strict";
import {createHash} from "node:crypto";
import {DatabaseSync} from "node:sqlite";
import {mkdtempSync,readFileSync} from "node:fs";
import {join} from "node:path";
import {tmpdir} from "node:os";
import {spawnSync} from "node:child_process";
import {canonicalJson,auditDigest,validateAudit,emptyAuditIntegrity} from "../src/auditChain.js";
import {loadState,transact} from "../src/store.js";

const child=(code,path)=>spawnSync(process.execPath,["--input-type=module","-e",code],{cwd:process.cwd(),env:{...process.env,DATA_PATH:path},encoding:"utf8"});
const reopen=path=>child("const {loadState}=await import('./src/store.js');console.log(JSON.stringify(await loadState()));",path);
function fixture(state){
 const path=join(mkdtempSync(join(tmpdir(),"v2-chain-")),"validation.sqlite"),db=new DatabaseSync(path);
 db.exec("CREATE TABLE state (id INTEGER PRIMARY KEY, value TEXT NOT NULL)");db.prepare("INSERT INTO state VALUES(1,?)").run(JSON.stringify(state));db.close();return path;
}
test("canonical audit hashes are deterministic, key-order independent and strict JSON",()=>{
 const a={z:[1,true,null],a:{y:"text",b:2}},b={a:{b:2,y:"text"},z:[1,true,null]};
 const canonical='{"a":{"b":2,"y":"text"},"z":[1,true,null]}';
 assert.equal(canonicalJson(a),canonical);assert.equal(auditDigest(a),auditDigest(b));
 assert.equal(auditDigest(a),createHash("sha256").update(canonical).digest("hex"));
 for(const value of [undefined,NaN,Infinity,()=>{},new Date(),[undefined]])assert.throws(()=>canonicalJson(value),/Invalid audit/);
});
test("appended events receive deterministic sequence/link/hash and matching committed anchor",async()=>{
 await transact(s=>{s.audit.push({type:"FIRST",details:{b:2,a:1}});s.audit.push({type:"SECOND",at:"2026-10-05T00:00:00Z"});});
 const s=await loadState();assert.equal(validateAudit(s),true);
 assert.equal(s.audit[0].sequence,1);assert.equal(s.audit[0].previousHash,null);assert.equal(s.audit[1].previousHash,s.audit[0].hash);
 assert.deepEqual(s.auditIntegrity,{version:1,count:2,head:s.audit[1].hash});
 const old=structuredClone(s.audit);await transact(next=>next.audit.push({type:"THIRD"}));
 assert.deepEqual((await loadState()).audit.slice(0,2),old);
});
test("earlier audit payloads, links and hashes cannot be rewritten, even with recomputed hashes",async()=>{
 const before=await loadState();
 for(const mutate of [
  s=>{s.audit[0].type="REWRITTEN";},
  s=>{s.audit[0].previousHash="0".repeat(64);},
  s=>{s.audit[0].hash="0".repeat(64);},
  s=>{s.audit[0].type="REWRITTEN";const {hash,...content}=s.audit[0];s.audit[0].hash=auditDigest(content);},
 ]){
  await assert.rejects(transact(mutate),/append-only/);assert.deepEqual(await loadState(),before);
 }
});
test("audit deletion, truncation, replacement and reordering roll back atomically",async()=>{
 const before=await loadState();
 for(const mutate of [
  s=>s.audit.pop(),s=>s.audit.splice(0,1),s=>{s.audit=[];},s=>s.audit.reverse(),
  s=>{s.audit=[{type:"REPLACEMENT"},...s.audit.slice(1)];},
 ]){
  await assert.rejects(transact(s=>{s.costs.push({provider:"fixture"});mutate(s);}),/append-only/);
  assert.deepEqual(await loadState(),before);
 }
});
test("forged metadata/new-event hashes and invalid values fail without committing other state",async()=>{
 const before=await loadState();
 for(const mutate of [
  s=>{s.auditIntegrity.head="0".repeat(64);},
  s=>{s.auditIntegrity.count=0;},
  s=>s.audit.push({type:"FORGED",hash:"0".repeat(64)}),
  s=>s.audit.push({type:"BAD",details:NaN}),
 ]){
  await assert.rejects(transact(mutate),/audit/i);assert.deepEqual(await loadState(),before);
 }
});
test("offline edit/removal/reorder/corrupt link/head/count fails on process reopen",async()=>{
 const good=await loadState();
 for(const mutate of [
  s=>{s.audit[0].type="CORRUPTED";},
  s=>s.audit.pop(),s=>s.audit.reverse(),
  s=>{s.audit[1].previousHash="0".repeat(64);},
  s=>{s.auditIntegrity.head="0".repeat(64);},
  s=>{s.auditIntegrity.count++;},
  s=>{s.auditIntegrity.version=2;},
 ]){
  const bad=structuredClone(good);mutate(bad);const p=reopen(fixture(bad));
  assert.notEqual(p.status,0);assert.match(p.stderr,/Audit integrity failure/);
 }
});
test("a committed chain survives separate process reopen and subsequent append",async()=>{
 const before=await loadState(),p=child("const {transact,loadState}=await import('./src/store.js');await transact(s=>s.audit.push({type:'REOPEN_APPEND'}));console.log(JSON.stringify(await loadState()));",process.env.DATA_PATH);
 assert.equal(p.status,0,p.stderr);const after=JSON.parse(p.stdout);
 assert.deepEqual(after.audit.slice(0,before.audit.length),before.audit);assert.equal(validateAudit(after),true);
 assert.equal(reopen(process.env.DATA_PATH).status,0);
});
test("corruption after opening is detected on both read and write before the callback runs",async()=>{
 const p=child(`
  import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';
  const {loadState,transact}=await import('./src/store.js');
  const db=new DatabaseSync(process.env.DATA_PATH),s=await loadState();s.audit[0].type='CORRUPTED';
  db.prepare('UPDATE state SET value=? WHERE id=1').run(JSON.stringify(s));
  await assert.rejects(loadState(),/Audit integrity failure/);let called=false;
  await assert.rejects(transact(()=>{called=true;}),/Audit integrity failure/);assert.equal(called,false);db.close();
 `,fixture(await loadState()));
 assert.equal(p.status,0,p.stderr);
});
test("legacy nonempty history is rejected; empty history upgrades without adding benchmark events",async()=>{
 const state=await loadState(),legacy=structuredClone(state);delete legacy.auditIntegrity;
 for(const e of legacy.audit){delete e.hash;delete e.previousHash;delete e.sequence;}
 assert.match(reopen(fixture(legacy)).stderr,/explicit isolated validation-copy upgrade/);
 legacy.audit=[];const result=reopen(fixture(legacy));assert.equal(result.status,0,result.stderr);
 const empty=JSON.parse(result.stdout);assert.deepEqual(empty.audit,[]);assert.deepEqual(empty.auditIntegrity,emptyAuditIntegrity());assert.equal(empty.experiment.status,"PREPARATION");
});
test("explicit legacy validation-copy retrofit preserves source bytes and immutable hashes",async()=>{
 const state=await loadState(),legacy=structuredClone(state);delete legacy.auditIntegrity;
 for(const e of legacy.audit){delete e.hash;delete e.previousHash;delete e.sequence;}
 const content={id:"historical-fixture",value:.22};content.hash=createHash("sha256").update(JSON.stringify(content)).digest("hex");
 legacy.forecasts[content.id]=content;
 const source=fixture(legacy),bytes=readFileSync(source),output=join(mkdtempSync(join(tmpdir(),"v2-upgrade-")),"validation-copy.sqlite");
 const result=spawnSync(process.execPath,["scripts/upgrade-validation-audit.mjs",source,output],{encoding:"utf8"});assert.equal(result.status,0,result.stderr);
 assert.deepEqual(readFileSync(source),bytes);const s=JSON.parse(reopen(output).stdout);assert.equal(validateAudit(s),true);
 assert.deepEqual(s.forecasts,legacy.forecasts);assert.equal(s.audit.length,legacy.audit.length+1);
 assert.equal(s.audit.at(-1).type,"LEGACY_VALIDATION_AUDIT_IMPORT");assert.equal(s.audit.at(-1).retroactive,true);
 assert.notEqual(spawnSync(process.execPath,["scripts/upgrade-validation-audit.mjs",source,source]).status,0);
 assert.notEqual(spawnSync(process.execPath,["scripts/upgrade-validation-audit.mjs",source,output]).status,0);
});
