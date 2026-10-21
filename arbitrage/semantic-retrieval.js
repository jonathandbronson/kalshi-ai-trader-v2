// Independent semantic candidate retrieval using optional precomputed embedding vectors.
// Offline fallback uses character n-gram TF-IDF; it is NOT a neural embedding.
// No network requests, credentials, trading or settlement approval.
import {createHash} from "node:crypto";
import {readFile} from "node:fs/promises";
const normalize=s=>String(s??"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
export const marketText=(market,event)=>[market.question??market.title,market.subtitle??"",event?.title??""].filter(Boolean).join(" ");
export const marketId=(venue,market)=>venue+":"+String(market.ticker??market.id);
export const fingerprintText=s=>createHash("sha256").update(normalize(s)).digest("hex");
function grams(s){const t="  "+normalize(s)+"  ",v=new Map();for(let i=0;i<t.length-2;i++){const g=t.slice(i,i+3);if(!g.trim())continue;v.set(g,(v.get(g)??0)+1)}return v}
const cosine=(a,b)=>{let dot=0,aa=0,bb=0;for(const x of a.values())aa+=x*x;for(const x of b.values())bb+=x*x;for(const [k,v] of a)dot+=v*(b.get(k)??0);return aa&&bb?dot/Math.sqrt(aa*bb):0};
export function lexicalSemanticCandidates(kalshiEvents,polymarketEvents,{limit=120,minScore=.46,perKalshi=3,maxPostings=250}={}){
 const build=(events,venue)=>events.flatMap(event=>(event.markets??[]).filter(m=>m.ticker||m.id).map(m=>({venue,event,market:m,id:marketId(venue,m),text:marketText(m,event)}))).filter(x=>x.text.length>=8);
 const kalshi=build(kalshiEvents,"kalshi").slice(0,Math.max(1,Math.min(6000,Number(process.env.ARB_SEMANTIC_KALSHI_CAP??2500))));
 const poly=build(polymarketEvents,"polymarket").slice(0,Math.max(1,Math.min(8000,Number(process.env.ARB_SEMANTIC_POLY_CAP??3500))));
 const df=new Map(),polyGrams=poly.map(x=>grams(x.text)),kGrams=kalshi.map(x=>grams(x.text));
 for(const v of [...kGrams,...polyGrams])for(const g of v.keys())df.set(g,(df.get(g)??0)+1);
 const n=kalshi.length+poly.length,weight=v=>new Map([...v].map(([g,count])=>[g,(1+Math.log(count))*(1+Math.log((n+1)/((df.get(g)??0)+1)))]));
 const pWeighted=polyGrams.map(weight),index=new Map();
 for(let i=0;i<poly.length;i++)for(const g of pWeighted[i].keys()){if(!index.has(g))index.set(g,[]);index.get(g).push(i)}
 const candidates=[],seen=new Set();let comparisons=0;
 for(let i=0;i<kalshi.length;i++){
  const kw=weight(kGrams[i]),hits=new Map();
  for(const g of kw.keys()){const postings=index.get(g)??[];if(postings.length>maxPostings)continue;for(const j of postings)hits.set(j,(hits.get(j)??0)+1)}
  const top=[...hits].filter(([,v])=>v>=5).sort((a,b)=>b[1]-a[1]).slice(0,80);
  const ranked=[];
  for(const [j] of top){comparisons++;const similarity=cosine(kw,pWeighted[j]);if(similarity>=minScore)ranked.push({kalshi:kalshi[i],polymarket:poly[j],score:Number(similarity.toFixed(4)),source:"CHAR_NGRAM_TFIDF",approved:false,executable:false})}
  ranked.sort((a,b)=>b.score-a.score);
  for(const r of ranked.slice(0,perKalshi)){const key=r.kalshi.id+"|"+r.polymarket.id;if(!seen.has(key)){seen.add(key);candidates.push(r)}}
 }
 candidates.sort((a,b)=>b.score-a.score);
 return {candidates:candidates.slice(0,limit),counts:{kalshiMarkets:kalshi.length,polymarketMarkets:poly.length,comparisons,matchedBeforeCap:candidates.length,selected:Math.min(limit,candidates.length),method:"CHAR_NGRAM_TFIDF_NOT_NEURAL_EMBEDDINGS"}};
}
// Versioned, hash-keyed cache for externally generated vectors; no embedding provider is required.
export async function loadEmbeddingCache(path){try{const data=JSON.parse(await readFile(path,"utf8"));return data.schemaVersion===1&&data.vectors&&typeof data.vectors==="object"?data.vectors:{}}catch(e){if(e.code==="ENOENT")return {};throw e}}
export function embeddingCandidates(kalshiEvents,polymarketEvents,vectors,{limit=120,minScore=.70,perKalshi=3}={}){
 const build=(events,venue)=>events.flatMap(event=>(event.markets??[]).map(m=>({venue,event,market:m,id:marketId(venue,m),text:marketText(m,event)}))).filter(x=>x.market.ticker||x.market.id);
 const lookup=x=>{const entry=vectors[x.id];return entry?.hash===fingerprintText(x.text)&&Array.isArray(entry.vector)&&entry.vector.length>0&&entry.vector.every(Number.isFinite)?entry.vector:null};
 const ks=build(kalshiEvents,"kalshi").map(x=>({...x,vector:lookup(x)})).filter(x=>x.vector);
 const ps=build(polymarketEvents,"polymarket").map(x=>({...x,vector:lookup(x)})).filter(x=>x.vector);
 const sim=(a,b)=>{if(a.length!==b.length)return 0;let dot=0,aa=0,bb=0;for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}return aa&&bb?dot/Math.sqrt(aa*bb):0};
 const out=[];let comparisons=0;
 for(const k of ks){const ranked=[];for(const p of ps){comparisons++;const score=sim(k.vector,p.vector);if(score>=minScore)ranked.push({kalshi:k,polymarket:p,score:Number(score.toFixed(4)),source:"CACHED_NEURAL_EMBEDDING",approved:false,executable:false})}ranked.sort((a,b)=>b.score-a.score);out.push(...ranked.slice(0,perKalshi))}
 out.sort((a,b)=>b.score-a.score);
 return {candidates:out.slice(0,limit),counts:{cachedKalshi:ks.length,cachedPolymarket:ps.length,comparisons,selected:Math.min(limit,out.length),method:"CACHED_NEURAL_EMBEDDING"}};
}
