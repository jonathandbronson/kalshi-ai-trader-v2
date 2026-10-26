// Same-input, read-only comparison of V1 TF-IDF retrieval and V2 indexed retrieval.
// Heuristic audit flags are NOT ground-truth settlement decisions.
import {readFile,writeFile} from "node:fs/promises";
import {lexicalSemanticCandidates} from "./semantic-retrieval.js";
import {discoverIndexedPairs} from "./discovery-v2.js";
const snapshot=JSON.parse(await readFile(process.env.ARB_V2_SNAPSHOT??"arbitrage-v2-market-snapshot.json","utf8"));
const active=Object.values(snapshot.markets??{}).filter(m=>m.lastSeen===snapshot.timestamp);
const ks=active.filter(m=>m.venue==="kalshi").slice(0,2500),ps=active.filter(m=>m.venue==="polymarket").slice(0,3500);
const toEvents=rows=>rows.map(m=>({title:m.eventTitle,markets:[{ticker:m.venue==="kalshi"?m.marketId:undefined,id:m.venue==="polymarket"?m.marketId:undefined,title:m.title,question:m.title,subtitle:m.subtitle}]}));
const v1=lexicalSemanticCandidates(toEvents(ks),toEvents(ps),{limit:1000});
const v2=discoverIndexedPairs([...ks,...ps],{limit:1000,minScore:.22});
const key=(k,p)=>String(k)+"|"+String(p);
const v1keys=new Set(v1.candidates.map(x=>key(x.kalshi.market.ticker,x.polymarket.market.id)));
const v2keys=new Set(v2.candidates.map(x=>key(x.kalshiTicker,x.polymarketId)));
const overlap=[...v2keys].filter(x=>v1keys.has(x)).length;
const mismatches=c=>{
 const flags=[];
 const a=String(c.kalshiTitle??c.kalshi.market.title??""),b=String(c.polymarketTitle??c.polymarket.market.title??"");
 const yrs=x=>[...new Set(x.match(/\b20\d\d\b/g)??[])];
 const ay=yrs(a),by=yrs(b);
 if(ay.length&&by.length&&!ay.some(y=>by.includes(y)))flags.push("DIFFERENT_EXPLICIT_YEARS");
 const outcome=x=>/\b(nominated|nomination|nominee)\b/i.test(x)?"NOMINATION":/\b(win|wins|winner|champion)\b/i.test(x)?"WIN":"OTHER";
 const ao=outcome(a),bo=outcome(b);
 if(ao!=="OTHER"&&bo!=="OTHER"&&ao!==bo)flags.push("NOMINATION_VS_WIN");
 const tokens=x=>new Set(x.toLowerCase().match(/[a-z]{4,}/g)??[]);
 const x=tokens(a),y=tokens(b);const shared=[...x].filter(t=>y.has(t)).length;
 if(shared<2)flags.push("LOW_TITLE_TOKEN_OVERLAP");
 return flags;
};
const v1Mapped=v1.candidates.map(x=>({kalshiTicker:x.kalshi.market.ticker,polymarketId:x.polymarket.market.id,kalshiTitle:x.kalshi.market.title,polymarketTitle:x.polymarket.market.title,score:x.score}));
const v2Mapped=v2.candidates.map(x=>({kalshiTicker:x.kalshiTicker,polymarketId:x.polymarketId,kalshiTitle:x.kalshiTitle,polymarketTitle:x.polymarketTitle,score:x.score}));
const v2ByKalshi=new Map();for(const c of v2Mapped){if(!v2ByKalshi.has(c.kalshiTicker))v2ByKalshi.set(c.kalshiTicker,[]);v2ByKalshi.get(c.kalshiTicker).push(c)}
const v1ByKalshi=new Map();for(const c of v1Mapped){if(!v1ByKalshi.has(c.kalshiTicker))v1ByKalshi.set(c.kalshiTicker,[]);v1ByKalshi.get(c.kalshiTicker).push(c)}
const commonKalshi=[...v1ByKalshi.keys()].filter(k=>v2ByKalshi.has(k));
const normalizeTitle=s=>String(s??"").toLowerCase().replace(/[^a-z0-9]+/g," ").trim();
const v1Titles=new Set(v1Mapped.map(c=>normalizeTitle(c.kalshiTitle)+"|"+normalizeTitle(c.polymarketTitle)));
const titleOverlap=v2Mapped.filter(c=>v1Titles.has(normalizeTitle(c.kalshiTitle)+"|"+normalizeTitle(c.polymarketTitle))).length;
const sampleDisagreements=commonKalshi.slice(0,12).map(k=>({kalshiTicker:k,v1:v1ByKalshi.get(k).slice(0,2),v2:v2ByKalshi.get(k).slice(0,2)}));
const sampleV1Only=v1Mapped.slice(0,20),sampleV2Only=v2Mapped.slice(0,20);
const audit=rows=>{const counts={};const flagged=[];for(const c of rows){const flags=mismatches(c);for(const f of flags)counts[f]=(counts[f]??0)+1;if(flags.length&&flagged.length<20)flagged.push({...c,flags})}return {flagCounts:counts,flaggedExamples:flagged}};
const report={timestamp:new Date().toISOString(),method:"SAME_SNAPSHOT_V1_TFIDF_VS_V2_INDEX",sample:{kalshi:ks.length,polymarket:ps.length},v1:{...v1.counts,candidates:v1Mapped.length},v2:{...v2.stats,candidates:v2Mapped.length},overlap,union:v1keys.size+v2keys.size-overlap,
 v1Only:v1keys.size-overlap,v2Only:v2keys.size-overlap,titleOverlap,commonKalshiCount:commonKalshi.length,sampleDisagreements,sampleV1Only,sampleV2Only,
 heuristicAudit:{v1:audit(v1Mapped),v2:audit(v2Mapped)},
 caveats:["Identical input subsets, but retrieval thresholds and ranking algorithms differ.","Heuristic flags do not establish settlement equivalence.","No human labels available; precision and recall cannot be computed.","Neither engine approves trades."]};
await writeFile("arbitrage-v2-same-snapshot-comparison.json",JSON.stringify(report,null,2)+"\n");
console.log(JSON.stringify({sample:report.sample,v1:report.v1,v2:report.v2,overlap,titleOverlap,commonKalshiCount:commonKalshi.length,v1Only:report.v1Only,v2Only:report.v2Only,heuristicFlags:{v1:report.heuristicAudit.v1.flagCounts,v2:report.heuristicAudit.v2.flagCounts},examples:{v1:sampleV1Only.slice(0,4),v2:sampleV2Only.slice(0,4),sameKalshi:sampleDisagreements.slice(0,3)}}));
