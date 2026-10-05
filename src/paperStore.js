import {config} from "./config.js";import {loadState,saveState} from "./store.js";
export async function paperSnapshot(){
 const s=await loadState(),trades=s.paperTrades??[];let cash=config.simulatedBankroll;
 for(const t of trades){cash-=t.stake;if(t.status==="WON")cash+=t.stake/t.price;}
 const settled=trades.filter(t=>t.status!=="OPEN"),pnl=cash-config.simulatedBankroll;
 return {initialBankroll:config.simulatedBankroll,cash,portfolioValue:cash+trades.filter(t=>t.status==="OPEN").reduce((n,t)=>n+t.stake,0),pnl,open:trades.filter(t=>t.status==="OPEN").length,settled:settled.length,trades};
}
export async function placePaperTrade(analysis,fraction){
 if(!analysis?.qualifies)throw new Error("Only qualifying analyses can be paper traded");
 const snap=await paperSnapshot(),max=Math.min(config.maxFractionPerTrade,Math.max(0,Number(fraction??analysis.suggestedPaperFraction??config.maxFractionPerTrade)));
 const stake=Math.round(snap.cash*max*100)/100;if(stake<=0)throw new Error("No paper cash available");
 const t={id:crypto.randomUUID(),ticker:analysis.ticker,title:analysis.title,side:analysis.bestTrade.side,price:analysis.bestTrade.cost,estimatedProbability:analysis.bestTrade.winProbability,edge:analysis.bestTrade.netEdge,stake,status:"OPEN",openedAt:new Date().toISOString()};
 const s=await loadState();s.paperTrades??=[];s.paperTrades.push(t);await saveState(s);return t;
}
export async function settlePaperTrade(id,outcome){
 const s=await loadState(),t=(s.paperTrades??[]).find(x=>x.id===id);if(!t||t.status!=="OPEN")throw new Error("Open paper trade not found");
 const yesWon=String(outcome).toUpperCase()==="YES";t.status=(t.side==="YES")===yesWon?"WON":"LOST";t.outcome=yesWon?"YES":"NO";t.settledAt=new Date().toISOString();await saveState(s);return t;
}
