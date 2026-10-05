import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {chromium} from 'playwright';
process.env.DATA_PATH=join(mkdtempSync(join(tmpdir(),'v2-browser-')),'state.sqlite');
process.env.TRADER_AI_KEY='isolated-test-fixture';
process.env.MODEL_INPUT_USD_PER_MILLION='1';
process.env.MODEL_OUTPUT_USD_PER_MILLION='2';
const {loadState}=await import('../src/store.js');
const {createServer}=await import('../src/server.js');
const nativeFetch=globalThis.fetch;
const now=new Date().toISOString();let resolved=false,quoteCalls=0,modelCalls=0;
const metadata={ticker:'CPI-FIXTURE-YES',event_ticker:'CPI-FIXTURE',title:'Will CPI inflation exceed 3%?',rules_primary:'The Bureau of Labor Statistics official monthly CPI release will determine whether year-over-year inflation exceeds 3 percent for the named reporting period.',close_time:new Date(Date.now()+7*86400000).toISOString(),status:'active',volume_fp:'1000',yes_ask_dollars:'.99',no_ask_dollars:'.99'};
const report1='CPI inflation releases from the Bureau of Labor Statistics show continued pressure across shelter and transportation components. Measured annual index changes indicate that consumer prices have remained above the three percent threshold. Historical revisions to comparable monthly releases are small, though the upcoming observation is not yet available. This primary release describes the official measurement definition and limitations.';
const report2='Independent reporters covering CPI inflation interviewed household economists about softer future price growth. Wage negotiations and declining energy demand suggest a meaningful downside scenario for the next reporting period. Supply chain inventories and retailer promotions could lower annual inflation unexpectedly. Interviews offer contradictory context rather than simply repeating the official statistical report.';
globalThis.fetch=async(input,options={})=>{
 const url=new URL(String(input));
 if(url.hostname==='external-api.kalshi.com'){
  if(url.pathname.endsWith('/orderbook')){quoteCalls++;assert.equal(Object.values((await loadState()).forecasts).length,1,'orderbook only after durable lock');return Response.json({orderbook:{yes:[[39,100]],no:[[60,100]]}});}
  if(url.pathname.endsWith('/markets'))return Response.json({markets:[metadata],cursor:null});
  return Response.json({market:{...metadata,status:resolved?'settled':'active',result:resolved?'yes':undefined}});
 }
 if(url.hostname==='api.gdeltproject.org')return Response.json({articles:[{domain:'bls.gov',title:'Official CPI release',url:'https://www.bls.gov/fixture',seendate:now},{domain:'apnews.com',title:'CPI downside context',url:'https://apnews.com/fixture',seendate:now}]});
 if(url.hostname==='www.bls.gov'||url.hostname==='apnews.com')return new Response(`<html><head><meta property="article:published_time" content="${now}"></head><main><article>${url.hostname==='www.bls.gov'?report1:report2}</article></main></html>`,{headers:{'content-type':'text/html'}});
 if(url.hostname==='api.openai.com'){
  modelCalls++;const body=JSON.parse(options.body),input=JSON.parse(body.input);
  assert.equal(Object.keys((await loadState()).forecasts).length,0,'independent model before lock');
  assert.equal(input.yesAsk,undefined);assert.equal(input.orderbook,undefined);assert.ok(!/\.99|yes_ask|no_ask|volume_fp/.test(body.input));
  return Response.json({output_text:JSON.stringify({probability:.8,confidence:.8,low:.7,high:.9,rationale:'Official measurements support continued inflation with meaningful downside uncertainty.',yesCase:'Persistent shelter costs support inflation above the threshold.',noCase:'Energy demand and retailer promotions may depress inflation.',unknowns:'The next observation and subsequent revisions are not known.',baseRateReasoning:'Comparable monthly inflation persistence provides a prior, qualified by changing demand.',citations:[1,2]}),usage:{input_tokens:1000,output_tokens:300,total_tokens:1300}});
 }
 return nativeFetch(input,options);
};
const server=createServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base='http://127.0.0.1:'+server.address().port;
let browser;
test('iPhone-sized browser: discovery, research, lock, fresh book, paper entry, official resolution and scores',{timeout:60000},async()=>{
 browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH??'/usr/bin/chromium',args:['--no-sandbox']});
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(base);await page.waitForFunction(()=>document.querySelector('#ai').textContent==='CONFIGURED');
 await page.getByRole('button',{name:'Scan candidates'}).click();await page.getByRole('button',{name:'Research independently'}).waitFor();
 await page.getByRole('button',{name:'Research independently'}).click();await page.waitForFunction(()=>document.querySelector('.result')?.textContent.includes('post-lock decision STRONG_VALUE'));
 assert.equal(modelCalls,1);assert.equal(quoteCalls,1);
 await page.getByRole('button',{name:'Opportunities',exact:true}).click();await page.getByRole('button',{name:'Add paper position'}).click();
 await page.getByRole('button',{name:'Paper positions',exact:true}).click();await page.locator('#open-trades .card').waitFor();
 const state=await loadState();assert.equal(state.paperTrades.length,1);assert.ok(state.paperTrades[0].stake<=30);assert.equal(state.costs.find(c=>c.provider==='openai').usage.total_tokens,1300);
 resolved=true;await page.getByRole('button',{name:'Locked forecasts',exact:true}).click();await page.getByRole('button',{name:'Check official resolutions'}).click();await page.waitForFunction(()=>document.querySelector('#forecast-list').textContent.includes('Official YES'));
 await page.getByRole('button',{name:'Performance & cost',exact:true}).click();await page.waitForFunction(()=>document.querySelector('#metrics').textContent.includes('0.0400'));
 assert.match(await page.locator('#metrics').innerText(),/resolved 1\/200/);assert.match(await page.locator('#calibration').innerText(),/n=1/);assert.match(await page.locator('#cost').innerText(),/1300/);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'no mobile horizontal overflow');assert.deepEqual(errors,[]);
 await page.screenshot({path:join(tmpdir(),'kalshi-v2-mobile.png'),fullPage:true});await page.close();
});
test('desktop browser shows persisted history, settled ledger, audit details and failed discovery',{timeout:30000},async()=>{
 const page=await browser.newPage({viewport:{width:1280,height:900}});const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base);
 await page.getByRole('button',{name:'Locked forecasts',exact:true}).click();await page.locator('#forecast-list .card').waitFor();await page.getByText('Audit evidence and decision',{exact:true}).click();assert.match(await page.locator('#forecast-list').innerText(),/Post-lock quote/);
 await page.getByRole('button',{name:'Paper positions',exact:true}).click();await page.locator('#settled-trades .card').waitFor();assert.match(await page.locator('#settled-trades').innerText(),/WON/);
 await page.route('**/scan?*',r=>r.fulfill({status:400,contentType:'application/json',body:JSON.stringify({error:'Provider unavailable'})}));await page.getByRole('button',{name:'Candidates',exact:true}).click();await page.getByRole('button',{name:'Scan candidates'}).click();await page.waitForFunction(()=>document.querySelector('#error').textContent==='Provider unavailable');assert.equal(await page.locator('#scan').isEnabled(),true);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);assert.deepEqual(errors,[]);await page.close();
});
test.after(async()=>{globalThis.fetch=nativeFetch;await browser?.close();await new Promise(r=>server.close(r));});
