import test from "node:test";
import assert from "node:assert/strict";
import {readArticle,allowedArticle} from "../src/articles.js";
import {parseFeed,blsFeedReport,BLS_CPI_FEED,FED_FEED,BBC_BUSINESS_FEED} from "../src/publicFeeds.js";
import {elementBody,publicDocument} from "../src/publicDocuments.js";
import {requestSpacer} from "../src/providers.js";
import {fetchJson} from "../src/network.js";
import {gatherEvidence} from "../src/researchRunner.js";
import {loadState} from "../src/store.js";
import {estimateFromEvidence} from "../src/aiEstimator.js";

const fresh=new Date().toISOString(),nativeFetch=globalThis.fetch;
async function withFetch(mock,fn){globalThis.fetch=mock;try{return await fn();}finally{globalThis.fetch=nativeFetch;}}
const cpi="The CPI Consumer Price Index rose in the latest release. Shelter and food prices increased, while energy prices fell. The official seasonally adjusted index and component statistics reflect monthly consumer price changes across surveyed households. ";
const fed="Inflation remains elevated and employment has slowed. Uncertainty about the economic outlook remains elevated. Risks to employment have increased, and the Committee carefully assesses incoming inflation data and downside risks in determining policy. ";
const atom=`<feed><updated>${fresh}</updated><entry><title>CPI release</title><link href="https://www.bls.gov/news.release/archives/cpi_01012026.htm"/><content>${cpi}</content><published>${fresh}</published></entry></feed>`;
const market={ticker:"CPI-TEST",title:"Will CPI inflation rise in September 2026?",rulesPrimary:"Official Consumer Price Index statistics determine the result."};

test("Federal Reserve nested body and actual publication heading are extracted without navigation",async()=>{
 const html=`<nav>yes price forbidden navigation</nav><div id='article'><div><p class='article__time'>${fresh.slice(0,10)}</p></div><div><p>${fed}</p><div>Final substantive paragraph.</div></div></div><footer>outside footer</footer>`;
 await withFetch(async(_url,options)=>{assert.equal(options.redirect,"error");return new Response(html,{headers:{"content-type":"text/html"}});},async()=>{
  const e=await readArticle({url:"https://www.federalreserve.gov/newsevents/pressreleases/monetary20260101a.htm",claim:"Official policy statement"});
  assert.match(e.claim,/Final substantive/);assert.doesNotMatch(e.claim,/navigation|outside footer/);assert.equal(e.publishedAt,fresh.slice(0,10));assert.equal(e.headlineOnly,false);
 });
});
test("balanced main/article extraction does not truncate nested same-name containers",()=>{
 assert.equal(elementBody("<article><article>inner</article>end</article>",tag=>tag==="article"),"<article>inner</article>end");
 assert.equal(elementBody("<div id='article'><div>x</div>tail</div>",(_,a)=>a.id==="article"),"<div>x</div>tail");
});
test("publication metadata attribute order is irrelevant and missing publication is not replaced by index time",async()=>{
 await withFetch(async()=>new Response(`<meta content="${fresh}" property="article:published_time"><main>${cpi}</main>`,{headers:{"content-type":"text/html"}}),async()=>{
  assert.equal((await readArticle({url:"https://apnews.com/report",claim:"Official report"})).publishedAt,fresh);
 });
 await withFetch(async()=>new Response(`<main>${cpi}</main>`,{headers:{"content-type":"text/html"}}),async()=>{
  await assert.rejects(readArticle({url:"https://apnews.com/report",claim:"Report",indexedAt:fresh}),/publication date/);
 });
});
test("BLS 403 uses only the matching legitimate Atom release, preserving excerpt/date/provenance",async()=>{
 const calls=[];
 await withFetch(async url=>{calls.push(String(url));return String(url)===BLS_CPI_FEED?new Response(atom,{headers:{"content-type":"application/atom+xml"}}):new Response("denied",{status:403});},async()=>{
  const e=await readArticle({url:"https://www.bls.gov/news.release/archives/cpi_01012026.htm",claim:"CPI release"});
  assert.equal(e.url,BLS_CPI_FEED);assert.equal(e.publishedAt,fresh);assert.equal(e.provenance.excerpt,true);assert.equal(e.originId,e.canonicalUrl);assert.match(e.claim,/Shelter/);
  await assert.rejects(readArticle({url:"https://www.bls.gov/news.release/archives/cpi_02022026.htm",claim:"CPI release"}),/no matching/);
  assert.ok(calls.every(url=>url.startsWith("https://www.bls.gov/")));
 });
});
test("official feed headlines, missing entry dates, entities and unapproved destinations fail closed",()=>{
 const [entry]=parseFeed(atom,BLS_CPI_FEED);assert.equal(entry.headlineOnly,true);
 assert.throws(()=>blsFeedReport({...entry,feedBody:"headline only"}),/Insufficient/);
 assert.throws(()=>blsFeedReport({...entry,publishedAt:undefined}),/Insufficient/);
 assert.throws(()=>parseFeed("<!DOCTYPE feed [<!ENTITY a SYSTEM 'https://evil.test'>]><feed/>",BLS_CPI_FEED),/Unsupported/);
 assert.throws(()=>parseFeed(atom,"https://evil.test/feed"),/Unsupported/);
 assert.throws(()=>parseFeed("<html>challenge page</html>",BLS_CPI_FEED),/Unsupported/);
 assert.equal(parseFeed(atom.replace(/<published>.*?<\/published>/,""),BLS_CPI_FEED)[0].publishedAt,undefined);
});
test("HTTPS allowlist, credentials/ports, redirects, body size and contamination protections remain enforced",async()=>{
 for(const url of ["http://www.bls.gov/feed/cpi.rss","https://bls.gov.evil.test/a","https://127.0.0.1/a","https://user@www.bls.gov/a","https://www.bls.gov:8080/a"])assert.equal(allowedArticle(url),false);
 await withFetch(async()=>new Response("redirect",{status:302,headers:{location:"https://127.0.0.1"}}),async()=>assert.rejects(readArticle({url:"https://apnews.com/a",claim:"Report"}),/HTTP 302/));
 await withFetch(async()=>new Response("x".repeat(500001),{headers:{"content-type":"text/html"}}),async()=>assert.rejects(publicDocument("https://apnews.com/a"),/too large/));
 await withFetch(async()=>new Response(`<time datetime="${fresh}"></time><main>${cpi} The prediction-market consensus says yes.</main>`,{headers:{"content-type":"text/html"}}),async()=>assert.rejects(readArticle({url:"https://apnews.com/a",claim:"Report"}),/contamination/));
});
test("GDELT request slots include retries/concurrent calls and respect the five-second minimum",async()=>{
 const waits=[],slot=requestSpacer(5100,{now:()=>0,sleep:async ms=>waits.push(ms)});
 await Promise.all([slot(),slot(),slot()]);assert.deepEqual(waits,[5100,10200]);
});
test("Retry-After is respected without bypassing a long cooldown or retrying paid POSTs",async()=>{
 let calls=0;await withFetch(async()=>{calls++;return calls===1?new Response("",{status:429,headers:{"retry-after":"0"}}):Response.json({ok:true});},async()=>assert.deepEqual(await fetchJson("https://api.gdeltproject.org"),{ok:true}));assert.equal(calls,2);
 calls=0;await withFetch(async()=>{calls++;return new Response("",{status:429,headers:{"retry-after":"120"}});},async()=>assert.rejects(fetchJson("https://api.gdeltproject.org"),/Provider request failed/));assert.equal(calls,1);
 calls=0;await withFetch(async()=>{calls++;return new Response("",{status:429});},async()=>assert.rejects(fetchJson("https://api.openai.com",{method:"POST"})));assert.equal(calls,1);
});
test("provider diagnostics expose only bounded status/code/type/parameter, never message or credential text",async()=>{
 await withFetch(async()=>Response.json({error:{code:"unsupported_parameter",type:"invalid_request_error",param:"text.format",message:"private credential must never escape",secret:"private"}},{status:400}),async()=>{
  try{await fetchJson("https://api.openai.com",{method:"POST"});assert.fail("Expected rejection");}catch(e){
   assert.equal(e.cause.status,400);assert.deepEqual(e.cause.details,{code:"unsupported_parameter",type:"invalid_request_error",param:"text.format"});
   assert.doesNotMatch(JSON.stringify(e.cause.details),/private|credential/);
  }
 });
});
const fallbackDeps=(reports,successfulFeeds=2)=>({
 fetchGdeltArticles:async()=>{throw new Error("GDELT unavailable");},
 fallbackDiscovery:async()=>({leads:reports.map(r=>({url:r.url})),successfulFeeds,errors:[]}),
 readArticle:async lead=>reports.find(r=>r.url===lead.url)
});
const reports=[{source:"bls.gov",url:"https://www.bls.gov/news",claim:cpi,publishedAt:fresh},{source:"federalreserve.gov",url:"https://www.federalreserve.gov/news",claim:fed,publishedAt:fresh}];
test("fallback requires independent substantive sources and actually searched counterevidence, with persisted audit",async()=>{
 const r=await gatherEvidence(market,{deps:fallbackDeps(reports)});
 assert.equal(r.diagnostics.sufficient,true);assert.equal(r.searchAudit.counterSearchComplete,true);assert.equal(r.searchAudit.counterReports,1);
 assert.ok((await loadState()).audit.some(a=>a.type==="EVIDENCE_SEARCH"&&a.details.provider==="APPROVED_PUBLIC_FEED_FALLBACK"));
 for(const bad of [[reports[0]],reports.map(r=>({...r,claim:cpi})),reports.map(r=>({...r,publishedAt:"2000-01-01"})),reports.map(r=>({...r,headlineOnly:true}))]){
  assert.equal((await gatherEvidence(market,{deps:fallbackDeps(bad)})).diagnostics.sufficient,false);
 }
 assert.equal((await gatherEvidence(market,{deps:fallbackDeps(reports,1)})).diagnostics.sufficient,false);
});
test("failed support or counter-query switches to fallback rather than declaring GDELT search complete",async()=>{
 let queries=0;const deps={...fallbackDeps(reports),fetchGdeltArticles:async()=>{if(++queries===2)throw new Error("Counter query failed");return [];}};
 const r=await gatherEvidence(market,{deps});assert.equal(queries,2);assert.equal(r.searchAudit.provider,"APPROVED_PUBLIC_FEED_FALLBACK");assert.equal(r.diagnostics.sufficient,true);
});
test("Responses JSON input marker repeats the output contract without introducing any contract quotes",async()=>{
 process.env.TRADER_AI_KEY="isolated-fixture";
 try{await withFetch(async(_url,options)=>{
  const request=JSON.parse(options.body),input=JSON.parse(request.input);assert.equal(input.responseFormat,"JSON");
  assert.equal(input.yesAsk,undefined);assert.equal(input.orderbook,undefined);
  return Response.json({output_text:JSON.stringify({probability:.5,confidence:.6,low:.3,high:.7,rationale:"Substantive sources leave uncertainty about this future observation.",yesCase:"The official price observations support further inflation increases.",noCase:"The policy statement describes downside risks to employment.",unknowns:"The actual September observation has not yet been published.",baseRateReasoning:"No quantified historical base rate is supported by these reports.",citations:[1,2]}),usage:{input_tokens:100,output_tokens:100}});
 },async()=>estimateFromEvidence({market:{title:market.title},packet:{resolutionCriteria:market.rulesPrimary,category:"economics",evidence:reports}}));}finally{delete process.env.TRADER_AI_KEY;}
});
test("real fallback adapter retrieves approved feed bodies after GDELT failure; external links and headlines cannot bypass gates",async()=>{
 const fedUrl="https://www.federalreserve.gov/newsevents/pressreleases/monetary20260101a.htm",calls=[];
 await withFetch(async url=>{
  calls.push(String(url));
  if(String(url)===BLS_CPI_FEED)return new Response(atom,{headers:{"content-type":"application/atom+xml"}});
  if(String(url)===FED_FEED)return new Response(`<rss><channel><item><title><![CDATA[Official FOMC statement]]></title><link><![CDATA[${fedUrl}]]></link><pubDate>${fresh}</pubDate></item><item><title>Unapproved lead</title><link>https://127.0.0.1/private</link><pubDate>${fresh}</pubDate></item></channel></rss>`,{headers:{"content-type":"application/rss+xml"}});
  if(String(url)===BBC_BUSINESS_FEED)return new Response("<rss><channel/></rss>",{headers:{"content-type":"text/xml"}});
  if(String(url)===fedUrl)return new Response(`<div id="article"><p class="article__time">${fresh.slice(0,10)}</p><div>${fed}</div></div>`,{headers:{"content-type":"text/html"}});
  return new Response("blocked",{status:403});
 },async()=>{
  const r=await gatherEvidence(market,{deps:{fetchGdeltArticles:async()=>{throw new Error("GDELT unavailable");}}});
  assert.equal(r.diagnostics.sufficient,true);assert.equal(r.diagnostics.uniqueSources,2);assert.equal(r.searchAudit.counterSearchComplete,true);
  assert.ok(r.evidence.some(e=>e.provenance?.format==="OFFICIAL_ATOM_RELEASE_EXCERPT"));
  assert.ok(calls.every(url=>!url.includes("127.0.0.1")));assert.equal(r.evidence.some(e=>e.headlineOnly),false);
 });
});
test("RSS CDATA preserves canonical URL and entry publication, never feed build/index time",()=>{
 const entries=parseFeed(`<rss><channel><lastBuildDate>${fresh}</lastBuildDate><item><title><![CDATA[Policy &amp; inflation]]></title><link><![CDATA[https://www.federalreserve.gov/report]]></link><pubDate>${fresh}</pubDate></item><item><title>Undated</title><link>https://www.federalreserve.gov/other</link></item></channel></rss>`,FED_FEED);
 assert.equal(entries[0].url,"https://www.federalreserve.gov/report");assert.equal(entries[0].publishedAt,fresh);assert.equal(entries[0].headlineOnly,true);assert.equal(entries[1].publishedAt,undefined);
});
test("JSON-mode input error is classified with a fixed safe label, not the provider's message",async()=>{
 await withFetch(async()=>Response.json({error:{type:"invalid_request_error",param:"input",message:"input must contain the word json; private text"}},{status:400}),async()=>{
  try{await fetchJson("https://api.openai.com",{method:"POST"});assert.fail("Expected error");}catch(e){assert.equal(e.cause.details.diagnostic,"JSON_MODE_REQUIRES_JSON_INPUT");assert.doesNotMatch(JSON.stringify(e.cause.details),/private/);}
 });
});
