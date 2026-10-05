import {config} from "./config.js";
import {codeFingerprint,strategyFingerprint} from "./version.js";
import {getMarket,getResearchMarket,getOrderbook,normalizeMarket,executableBook} from "./kalshi.js";
import {fetchMetadata} from "./contamination.js";
import {gatherEvidence} from "./researchRunner.js";
import {buildResearchPacket} from "./research.js";
import {estimateFromEvidence,aiConfigured,validateForecast} from "./aiEstimator.js";
import {combineResearchWithMarket} from "./opportunities.js";
import {riskFlags,suggestedPaperFraction} from "./risk.js";
import {saveResearch,saveAnalysis,loadForecastHistory,unresolvedDrivers,latestEvaluation,transact} from "./store.js";
import {screenMarket} from "./selection.js";
const inFlight=new Map();let active=0;
export function researchMarket(ticker,options={}){if(inFlight.has(ticker))return inFlight.get(ticker);if(active>=2)return Promise.reject(new Error("Research concurrency limit reached"));active++;const promise=run(ticker,options).catch(async e=>{try{await transact(s=>{s.audit.push({type:"PIPELINE_FAILED_NO_TRADE",ticker,at:new Date().toISOString()});});}catch{}throw e;}).finally(()=>{inFlight.delete(ticker);active--;});inFlight.set(ticker,promise);return promise;}
async function run(ticker,{evidence=[],revision=false,deps={}}={}){
 const api=deps.getMarket??getMarket,lock=deps.saveResearch??saveResearch,analyze=deps.saveAnalysis??saveAnalysis;
 const history=await loadForecastHistory(),activeDrivers=new Set(await unresolvedDrivers());let packet=history.filter(f=>f.ticker===ticker).at(-1);
 if(packet&&packet.strategyFingerprint!==strategyFingerprint&&!revision)return {stage:"VERSION_MISMATCH",reasons:["Explicit new forecast revision required; old history preserved"]};
 if(packet&&!revision){const existing=await latestEvaluation(packet.id);if(existing&&Date.now()-Date.parse(existing.quote.quotedAt)<=60000)return {stage:"EVALUATED",packet,analysis:existing,reused:true};}
 if(!packet||revision){
 // Market API includes prices; the adapter immediately projects metadata without reading quote fields.
 const market=await (deps.getMarket?fetchMetadata(deps.getMarket,ticker):getResearchMarket(ticker)),screen=screenMarket(market);
 if(market.ticker!==ticker)throw new Error("Market metadata ticker mismatch");
 if(!screen.eligible)return {stage:"REJECTED",reasons:screen.reasons};
 if(history.some(f=>(f.eventId===screen.eventId||(activeDrivers.has(screen.driverId)&&f.driverId===screen.driverId))&&f.ticker!==ticker))return {stage:"REJECTED",reasons:["CORRELATED_FORECAST"]};
 const gathered=await (deps.gatherEvidence??gatherEvidence)(market,{evidence});
 if(!gathered.diagnostics.sufficient)return {stage:"INSUFFICIENT_EVIDENCE",...gathered};
 if(!(deps.aiConfigured??aiConfigured)())return {stage:"EVIDENCE_READY",requiresAiConfiguration:true,...gathered};
 const draft={question:market.title,resolutionCriteria:[market.rulesPrimary,market.rulesSecondary].filter(Boolean).join("\n"),category:screen.category,evidence:gathered.evidence};
 const forecast=await (deps.estimateFromEvidence??estimateFromEvidence)({market:{title:market.title,subtitle:market.subtitle},packet:draft});validateForecast(forecast,gathered.evidence);
 packet=await lock(buildResearchPacket({ticker,question:market.title,resolutionCriteria:draft.resolutionCriteria,evidence:gathered.evidence,probability:forecast.probability,exactResolutionCriteria:market.exactResolutionCriteria,eventDescription:market.subtitle,rationale:forecast.rationale,forecast,uncertainty:{low:forecast.low,high:forecast.high,confidence:forecast.confidence},eventId:screen.eventId,driverId:screen.driverId,category:screen.category,closeTime:market.closeTime,horizonDays:screen.horizonDays,researchMetadata:{gatheredAt:gathered.gatheredAt,sourceTypes:gathered.plan.sourceTypes,screen},priorForecastId:packet?.id??null}));
 if(forecast.requestId)await transact(s=>{const c=s.costs.find(c=>c.id===forecast.requestId);if(c)c.forecastId=packet.id;});
 }
 // No price adapter call is reachable before lock returns from a committed durable transaction.
 const requestedAt=new Date().toISOString(),raw=await api(ticker,{stage:"POST_LOCK_STATUS"}),market=normalizeMarket(raw.market??raw);
 const book=executableBook(await (deps.getOrderbook??getOrderbook)(ticker));Object.assign(market,book);const quotedAt=new Date().toISOString();
 if(market.ticker!==ticker)throw new Error("Quote ticker mismatch");
 const analysis=combineResearchWithMarket(packet,market);
 const fees=analysis.bestTrade?Math.ceil(.07*analysis.bestTrade.cost*(1-analysis.bestTrade.cost)*100)/100:0;
 if(analysis.bestTrade){analysis.bestTrade.estimatedFees=fees;analysis.bestTrade.netEdge-=fees;}
 analysis.forecastId=packet.id;analysis.eventId=packet.eventId;analysis.driverId=packet.driverId;analysis.category=packet.category;analysis.version=packet.version;
 analysis.quote={yesAsk:market.yesAsk,noAsk:market.noAsk,yesBid:market.yesBid,noBid:market.noBid,yesAvailable:book.yesAvailable,noAvailable:book.noAvailable,requestedAt,quotedAt,status:market.status,assumptions:"Ask inferred from fresh opposite-side bids; capped at displayed top-level depth; integer contracts; conservative 7% taker fee rounded up per contract; no guaranteed fill; no real orders"};
 analysis.volume=market.volume;analysis.evidenceQuality=packet.evidenceQuality;analysis.uncertainty=packet.uncertainty;
 analysis.riskFlags=riskFlags({closeTime:market.closeTime,volume:market.volume,spread:market.yesAsk!=null&&market.yesBid!=null?market.yesAsk-market.yesBid:null,evidenceQuality:packet.evidenceQuality});
 if(!["open","active"].includes(market.status))analysis.riskFlags.push("MARKET_NOT_OPEN");
 if(!analysis.bestTrade||analysis.bestTrade.netEdge<config.minEdge||analysis.riskFlags.length)analysis.qualifies=false;
 const robust=analysis.bestTrade?.side==="YES"?packet.uncertainty.low:1-packet.uncertainty.high;
 if(!analysis.bestTrade||robust-analysis.bestTrade.cost-fees<config.minEdge){analysis.qualifies=false;analysis.riskFlags.push("UNCERTAINTY_ERASES_EDGE");}
 analysis.classification=analysis.qualifies?(analysis.bestTrade.netEdge>=config.strongEdge?"STRONG_VALUE":"VALUE"):"PASS";
 analysis.suggestedPaperFraction=analysis.qualifies?suggestedPaperFraction({edge:analysis.bestTrade.netEdge,evidenceQuality:packet.evidenceQuality,confidence:packet.uncertainty.confidence}):0;
 return {stage:"EVALUATED",packet,analysis:await analyze(analysis)};
}
