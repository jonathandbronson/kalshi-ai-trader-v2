import http from "node:http";
import { config } from "./config.js";
import { analyzeMarket } from "./analyze.js";
import { PaperPortfolio } from "./paper.js";

const portfolio = new PaperPortfolio();
const send=(res,status,data)=>{res.writeHead(status,{"content-type":"application/json"});res.end(JSON.stringify(data,null,2));};
const body=req=>new Promise((resolve,reject)=>{let s="";req.on("data",c=>s+=c);req.on("end",()=>{try{resolve(s?JSON.parse(s):{})}catch(e){reject(e)}});});

http.createServer(async(req,res)=>{
  try{
    if(req.method==="GET"&&req.url==="/health") return send(res,200,{ok:true,strategy:"research-first",minEdge:config.minEdge});
    if(req.method==="GET"&&req.url==="/paper") return send(res,200,portfolio.snapshot());
    if(req.method==="POST"&&req.url==="/analyze") return send(res,200,analyzeMarket(await body(req)));
    if(req.method==="POST"&&req.url==="/paper/trades"){const a=analyzeMarket(await body(req));return send(res,201,portfolio.place(a));}
    return send(res,404,{error:"Not found"});
  }catch(e){return send(res,400,{error:e.message});}
}).listen(config.port,()=>console.log(`Kalshi AI Trader v2 listening on :${config.port}`));
