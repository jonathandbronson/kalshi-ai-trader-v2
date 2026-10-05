import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync} from 'node:fs';import {tmpdir} from 'node:os';import {join} from 'node:path';
process.env.DATA_PATH=join(mkdtempSync(join(tmpdir(),'v2-scanner-')),'state.sqlite');
const {scanOpenMarkets}=await import('../src/scanner.js');
const original=globalThis.fetch;
test('scanner excludes combinations, selects liquid related contract and never reads quotes',async()=>{
 const base={event_ticker:'CPI-EVENT',title:'Will CPI inflation exceed the specified threshold?',rules_primary:'Official Bureau of Labor Statistics CPI release will determine the specified inflation threshold for the named month.',rules_secondary:'Kalshi is not affiliated with the source agency.',close_time:new Date(Date.now()+7*86400000).toISOString()};
 const low={...base,ticker:'CPI-LOW',volume_fp:'150'},high={...base,ticker:'CPI-HIGH',volume_fp:'1500'};
 for(const m of [low,high])for(const k of ['yes_ask_dollars','no_ask_dollars','yes_bid','orderbook'])Object.defineProperty(m,k,{get(){throw new Error('Pre-lock quote access');}});
 const queries=[];globalThis.fetch=async url=>{queries.push(new URL(url));return {ok:true,json:async()=>({markets:[low,high],cursor:null})};};
 try{const d=await scanOpenMarkets({maxPages:1,diagnostics:true});assert.equal(d.markets.length,1);assert.equal(d.markets[0].ticker,'CPI-HIGH');assert.equal(d.markets[0].yesAsk,undefined);assert.ok(queries.every(q=>q.searchParams.get('mve_filter')==='exclude'));assert.deepEqual(queries.slice(0,3).map(q=>q.searchParams.get('series_ticker')),['KXCPI','KXFED','KXHIGHNY']);}finally{globalThis.fetch=original;}
});
test('complete discovery outage fails with no candidates instead of pretending scan succeeded',async()=>{globalThis.fetch=async()=>{throw new Error('offline')};try{await assert.rejects(scanOpenMarkets({maxPages:1,seriesTicker:'KXCPI'}),/unavailable/);}finally{globalThis.fetch=original;}});
