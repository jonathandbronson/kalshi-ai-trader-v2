import http from "node:http";
import { config } from "./config.js";
import { analyzeMarket } from "./analyze.js";
import { PaperPortfolio } from "./paper.js";
import { getMarkets, getMarket, normalizeMarket } from "./kalshi.js";
import { buildResearchPacket } from "./research.js";
import { combineResearchWithMarket } from "./opportunities.js";
import { saveResearch, saveAnalysis, loadState } from "./store.js";

const portfolio = new PaperPortfolio();
const send=(res,status,data)=>{res.writeHead(status,{"content-type":"application/json","access-control-allow-origin":"*"});res.end(JSON.stringify(data,null,2));};
const body=req=>new Promise((resolve,reject)=>{let s="";req.on("data",c=>s+=c);req.on("end",()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});});

http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,"http://localhost");
  if(req.method==="GET"&&url.pathname==="/health") return send(res,200,{ok:true,strategy:"research-first",minEdge:config.minEdge});
  if(req.method==="GET"&&url.pathname==="/markets"){const d=await getMarkets({limit:Number(url.searchParams.get("limit")??100),cursor:url.searchParams.get("cursor")??undefined});return send(res,200,{...d,markets:(d.markets??[]).map(normalizeMarket)});}
  if(req.method==="GET"&&url.pathname.startsWith("/markets/")){const ticker=decodeURIComponent(url.pathname.slice(9));const d=await getMarket(ticker);return send(res,200,normalizeMarket(d.market??d));}
  if(req.method==="POST"&&url.pathname==="/research"){const p=buildResearchPacket(await body(req));await saveResearch(p);return send(res,201,p);}
  if(req.method==="POST"&&url.pathname==="/evaluate"){const input=await body(req);const state=await loadState();const packet=state.research[input.ticker];if(!packet)throw new Error("Research must be completed and locked before market evaluation");const d=await getMarket(input.ticker);const market=normalizeMarket(d.market??d);const a=combineResearchWithMarket(packet,market);a.volume=market.volume;a.evidenceQuality=packet.evidenceQuality;await saveAnalysis(a);return send(res,200,a);}
  if(req.method==="GET"&&url.pathname==="/state") return send(res,200,await loadState());
  if(req.method==="GET"&&url.pathname==="/paper") return send(res,200,portfolio.snapshot());
  if(req.method==="POST"&&url.pathname==="/analyze") return send(res,200,analyzeMarket(await body(req)));
  if(req.method==="POST"&&url.pathname==="/paper/trades"){const a=analyzeMarket(await body(req));return send(res,201,portfolio.place(a));}
  return send(res,404,{error:"Not found"});
 }catch(e){return send(res,400,{error:e.message});}
}).listen(config.port,()=>console.log(`Kalshi AI Trader v2 listening on :${config.port}`));
