import {codeFingerprint} from "./version.js";
import http from "node:http";
import {readFile} from "node:fs/promises";
import {fileURLToPath} from "node:url";
import {resolve} from "node:path";
import {config} from "./config.js";
import {getResearchMarket} from "./kalshi.js";
import {scanOpenMarkets,researchQueue} from "./scanner.js";
import {makeResearchPlan} from "./researchPlan.js";
import {gatherEvidence} from "./researchRunner.js";
import {researchMarket} from "./pipeline.js";
import {loadState} from "./store.js";
import {auditSummary} from "./audit.js";
import {rankOpportunities} from "./opportunities.js";
import {paperSnapshot,placePaperTrade} from "./paperStore.js";
import {monitorSettlements} from "./settlement.js";
import {performanceMetrics} from "./metrics.js";
import {aiConfigured} from "./aiEstimator.js";
const root=fileURLToPath(new URL("../public/",import.meta.url));
const send=(res,status,data)=>{res.writeHead(status,{"content-type":"application/json","cache-control":"no-store","x-content-type-options":"nosniff"});res.end(JSON.stringify(data));};
async function body(req){let text="";for await(const chunk of req){text+=chunk;if(Buffer.byteLength(text)>100000)throw new Error("Request too large");}return text?JSON.parse(text):{};}
export function createServer(){const server=http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,"http://localhost");
 if(!["GET","POST"].includes(req.method))return send(res,405,{error:"Method not allowed"});
 if(req.method==="POST"){
 if(req.headers.origin&&new URL(req.headers.origin).host!==req.headers.host)return send(res,403,{error:"Cross-origin mutation rejected"});
 if(req.headers["sec-fetch-site"]==="cross-site")return send(res,403,{error:"Cross-site mutation rejected"});
 if(!req.headers["content-type"]?.startsWith("application/json"))return send(res,415,{error:"JSON content type required"});
 }
 if(req.method==="GET"&&["/","/app.js","/app.css"].includes(url.pathname)){const name=url.pathname==="/"?"index.html":url.pathname.slice(1);const data=await readFile(resolve(root,name));res.writeHead(200,{"content-type":name.endsWith("html")?"text/html; charset=utf-8":name.endsWith("js")?"text/javascript; charset=utf-8":"text/css; charset=utf-8","content-security-policy":"default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'","x-content-type-options":"nosniff"});return res.end(data);}
 if(req.method==="GET"&&url.pathname==="/health"){const state=await loadState();return send(res,200,{ok:true,version:config.version,codeFingerprint,researchFirst:true,minEdge:config.minEdge,realMoneyTrading:false,aiConfigured:aiConfigured(),experiment:state.experiment.status});}
 if(req.method==="GET"&&url.pathname==="/scan"){const d=await scanOpenMarkets({limit:Number(url.searchParams.get("limit")??100),minVolume:Number(url.searchParams.get("minVolume")??100),diagnostics:true});return send(res,200,{count:d.markets.length,queue:researchQueue(d.markets,Number(url.searchParams.get("max")??25)),diagnostics:d.diagnostics});}
 if(req.method==="POST"&&url.pathname.startsWith("/pipeline/")){await body(req);return send(res,200,await researchMarket(decodeURIComponent(url.pathname.slice(10))));}
 if(req.method==="GET"&&url.pathname.startsWith("/research-plan/")){const m=await getResearchMarket(decodeURIComponent(url.pathname.slice(15)));return send(res,200,makeResearchPlan(m));}
 if(req.method==="POST"&&url.pathname.startsWith("/gather/")){await body(req);const m=await getResearchMarket(decodeURIComponent(url.pathname.slice(8)));return send(res,200,await gatherEvidence(m));}
 if(req.method==="GET"&&url.pathname==="/opportunities"){const s=await loadState();return send(res,200,rankOpportunities(Object.values(s.analyses).filter(a=>a.quote&&!s.resolutions[a.forecastId]&&Date.now()-Date.parse(a.quote.quotedAt)<=config.quoteMaxAgeMs)));}
 if(req.method==="GET"&&url.pathname==="/forecasts"){const s=await loadState();return send(res,200,Object.values(s.forecasts).map(f=>({...f,resolution:s.resolutions[f.id]??null,evaluations:Object.values(s.evaluations).filter(e=>e.forecastId===f.id)})));}
 if(req.method==="GET"&&url.pathname==="/paper")return send(res,200,await paperSnapshot());
 if(req.method==="POST"&&url.pathname==="/paper/trades"){const input=await body(req),s=await loadState(),a=s.analyses[input.ticker];return send(res,201,await placePaperTrade(a,input.fraction));}
 if(req.method==="POST"&&url.pathname==="/settlements/check"){await body(req);return send(res,200,await monitorSettlements());}
 if(req.method==="GET"&&url.pathname==="/metrics")return send(res,200,await performanceMetrics());
 if(req.method==="GET"&&url.pathname==="/audit")return send(res,200,await auditSummary());
 return send(res,404,{error:"Not found"});
 }catch(e){const safe=/^(Invalid|Malformed|Duplicate|Correlated|Quote|Position|Only persisted|Category|Request too large|JSON|Independent forecast|Research concurrency|API request|Forecast must)/.test(e.message)?e.message:"Operation failed safely; no trade was submitted";send(res,400,{error:safe});}});
 let timer,running=false;server.on("listening",()=>{timer=setInterval(async()=>{if(running)return;running=true;try{await monitorSettlements();}catch{}finally{running=false;}},300000);timer.unref();});server.on("close",()=>clearInterval(timer));server.requestTimeout=30000;server.headersTimeout=10000;return server;
}
if(process.argv[1]&&resolve(process.argv[1])===fileURLToPath(import.meta.url))createServer().listen(config.port,process.env.HOST??"127.0.0.1",()=>console.log(`Paper-only server listening on :${config.port}`));
