import {strategyFingerprint} from "./version.js";
import {config} from "./config.js";
import {loadState,transact} from "./store.js";
export function snapshot(s){let cash=1000;for(const t of s.paperTrades){if(!["OPEN","WON","LOST"].includes(t.status)||!Number.isFinite(t.stake)||t.stake<=0||!Number.isFinite(t.price)||t.price<=0||t.price>=1)throw new Error("Corrupt paper ledger");cash-=t.stake;if(t.status==="WON")cash+=t.contracts??t.stake/t.price;}const open=s.paperTrades.filter(t=>t.status==="OPEN"),openValue=open.reduce((n,t)=>n+t.stake,0);return {initialBankroll:1000,cash,portfolioValue:cash+openValue,pnl:cash+openValue-1000,valuation:"Open positions carried at cost, not executable liquidation value",open:open.length,settled:s.paperTrades.length-open.length,trades:s.paperTrades};}
export async function paperSnapshot(){return snapshot(await loadState());}
export async function placePaperTrade(input,fraction){return transact(s=>{
 const a=s.evaluations[input?.id];if(!a||!a.qualifies||!s.forecasts[a.forecastId])throw new Error("Only persisted qualifying analyses can be paper traded");
 if(s.resolutions[a.forecastId])throw new Error("Forecast already officially resolved");
 if(s.forecasts[a.forecastId].strategyFingerprint!==strategyFingerprint)throw new Error("Forecast version mismatch");
 const quoteTime=Date.parse(a.quote.quotedAt),requestTime=Date.parse(a.quote.requestedAt);if(!Number.isFinite(quoteTime)||!Number.isFinite(requestTime)||quoteTime>Date.now()+1000||!Number.isInteger(a.bestTrade.side==="YES"?a.quote.yesAvailable:a.quote.noAvailable))throw new Error("Invalid executable quote");
 if(Date.now()-quoteTime>config.quoteMaxAgeMs||Date.parse(a.quote.requestedAt)<Date.parse(s.forecasts[a.forecastId].lockedAt))throw new Error("Quote stale or predates forecast lock");
 if(s.paperTrades.some(t=>t.forecastId===a.forecastId||t.ticker===a.ticker))throw new Error("Duplicate paper trade");
 const open=s.paperTrades.filter(t=>t.status==="OPEN");if(open.some(t=>t.eventId===a.eventId||t.driverId===a.driverId))throw new Error("Correlated paper exposure");
 if(!["YES","NO"].includes(a.bestTrade?.side)||!Number.isFinite(a.bestTrade.cost)||a.bestTrade.cost<=0||a.bestTrade.cost>=1||!Number.isFinite(a.bestTrade.estimatedFees)||a.bestTrade.estimatedFees<0||!Number.isFinite(a.suggestedPaperFraction)||a.suggestedPaperFraction<=0)throw new Error("Invalid paper execution assumptions");
 const cash=snapshot(s).cash,f=Number(fraction??a.suggestedPaperFraction);if(!Number.isFinite(f)||f<=0)throw new Error("Invalid position fraction");
 const budget=Math.floor(cash*Math.min(.03,a.suggestedPaperFraction,f)*100)/100,fee=a.bestTrade.estimatedFees??0,price=a.bestTrade.cost;
 const contracts=Math.min(Math.floor(budget/(price+fee)),a.bestTrade.side==="YES"?a.quote.yesAvailable:a.quote.noAvailable),stake=Math.ceil(contracts*(price+fee)*100-1e-8)/100;if(contracts<1||stake>cash*.03)throw new Error("Position too small or exceeds cash cap");
 if(open.filter(t=>t.category===a.category).reduce((n,t)=>n+t.stake,0)+stake>100)throw new Error("Category exposure cap");
 const t={id:crypto.randomUUID(),forecastId:a.forecastId,evaluationId:a.id,eventId:a.eventId,driverId:a.driverId,category:a.category,version:a.version,ticker:a.ticker,title:a.title,side:a.bestTrade.side,price,feePerContract:fee,contracts,estimatedProbability:a.bestTrade.winProbability,edge:a.bestTrade.netEdge,stake,status:"OPEN",openedAt:new Date().toISOString()};s.paperTrades.push(t);s.audit.push({type:"PAPER_ENTRY",id:t.id,at:t.openedAt});return t;
 });}
export async function settlePaperTrade(){throw new Error("Manual settlement disabled; use official settlement monitoring");}
