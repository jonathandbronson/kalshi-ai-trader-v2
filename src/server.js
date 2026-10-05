import http from "node:http";
import {readFile} from "node:fs/promises";import {extname,join} from "node:path";
import {config} from "./config.js";import {getMarkets,getMarket,normalizeMarket} from "./kalshi.js";
import {scanOpenMarkets,researchQueue} from "./scanner.js";import {makeResearchPlan} from "./researchPlan.js";
import {gatherEvidence} from "./researchRunner.js";import {researchMarket} from "./pipeline.js";
import {loadState} from "./store.js";import {auditSummary} from "./audit.js";import {rankOpportunities} from "./opportunities.js";
import {paperSnapshot,placePaperTrade,settlePaperTrade} from "./paperStore.js";import {performanceMetrics} from "./metrics.js";
import {aiConfigured} from "./aiEstimator.js";

const mime={".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"text/javascript; charset=utf-8"};
const send=(res,status,data)=>{res.writeHead(status,{"content-type":"application/json","access-control-allow-origin":"*"});res.end(JSON.stringify(data,null,2));};
const body=req=>new Promise((resolve,reject)=>{let s="";req.on("data",c=>{s+=c;if(s.length>1e6)reject(new Error("Request too large"))});req.on("end",()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}})});
const file=async(res,name)=>{try{const d=await readFile(join("public",name));res.writeHead(200,{"content-type":mime[extname(name)]??"application/octet-stream"});res.end(d);return true}catch{return false}};

http.createServer(async(req,res)=>{try{
 const url=new URL(req.url,"http://localhost");
 if(req.method==="GET"&&url.pathname==="/")return void await file(res,"index.html");
 if(req.method==="GET"&&["/app.css","/app.js"].includes(url.pathname))return void await file(res,url.pathname.slice(1));
 if(req.method==="GET"&&url.pathname==="/health")return send(res,200,{ok:true,version:"1.0.0",researchFirst:true,minEdge:config.minEdge,realMoneyTrading:false,aiConfigured:aiConfigured()});
 if(req.method==="GET"&&url.pathname==="/scan"){const result=await scanOpenMarkets({limit:Number(url.searchParams.get("limit")??100),minVolume:Number(url.searchParams.get("minVolume")??0),diagnostics:true});return send(res,200,{count:result.markets.length,queue:researchQueue(result.markets,Number(url.searchParams.get("max")??25)),diagnostics:result.diagnostics});}
 if(req.method==="POST"&&url.pathname.startsWith("/pipeline/"))return send(res,200,await researchMarket(decodeURIComponent(url.pathname.slice(10))));
 if(req.method==="POST"&&url.pathname.startsWith("/gather/")){const ticker=decodeURIComponent(url.pathname.slice(8)),d=await getMarket(ticker);return send(res,200,await gatherEvidence(normalizeMarket(d.market??d)));}
 if(req.method==="GET"&&url.pathname.startsWith("/research-plan/")){const ticker=decodeURIComponent(url.pathname.slice(15)),d=await getMarket(ticker);return send(res,200,makeResearchPlan(normalizeMarket(d.market??d)));}
 if(req.method==="GET"&&url.pathname==="/opportunities"){const s=await loadState();return send(res,200,rankOpportunities(Object.values(s.analyses??{})));}
 if(req.method==="GET"&&url.pathname==="/paper")return send(res,200,await paperSnapshot());
 if(req.method==="POST"&&url.pathname==="/paper/trades"){const input=await body(req),s=await loadState(),a=s.analyses?.[input.ticker];if(!a)throw new Error("Saved analysis not found");return send(res,201,await placePaperTrade(a,input.fraction));}
 if(req.method==="POST"&&url.pathname.startsWith("/paper/settle/")){const input=await body(req);return send(res,200,await settlePaperTrade(decodeURIComponent(url.pathname.slice(14)),input.outcome));}
 if(req.method==="GET"&&url.pathname==="/metrics")return send(res,200,await performanceMetrics());
 if(req.method==="GET"&&url.pathname==="/audit")return send(res,200,await auditSummary());
 if(req.method==="GET"&&url.pathname==="/state")return send(res,200,await loadState());
 if(req.method==="GET"&&url.pathname==="/markets"){const d=await getMarkets({limit:Number(url.searchParams.get("limit")??100),cursor:url.searchParams.get("cursor")??undefined});return send(res,200,{...d,markets:(d.markets??[]).map(normalizeMarket)});}
 if(req.method==="GET"&&url.pathname.startsWith("/markets/")){const d=await getMarket(decodeURIComponent(url.pathname.slice(9)));return send(res,200,normalizeMarket(d.market??d));}
 return send(res,404,{error:"Not found"});
}catch(e){send(res,400,{error:e.message})}}).listen(config.port,()=>console.log(`Kalshi AI Trader v2 listening on :${config.port}`));
