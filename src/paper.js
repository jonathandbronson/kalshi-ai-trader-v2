import { config } from "./config.js";

export class PaperPortfolio {
  constructor(bankroll = config.simulatedBankroll) {
    this.initialBankroll = bankroll; this.cash = bankroll; this.trades = [];
  }
  place(analysis, fraction = config.maxFractionPerTrade) {
    if (!analysis.qualifies) throw new Error("Trade does not meet strategy requirements");
    const stake = Math.min(this.cash, this.cash * Math.max(0, Math.min(config.maxFractionPerTrade, fraction)));
    const t = {id: crypto.randomUUID(), ticker:analysis.ticker, side:analysis.bestTrade.side, price:analysis.bestTrade.cost,
      estimatedProbability:analysis.bestTrade.winProbability, edge:analysis.bestTrade.netEdge, stake, status:"OPEN", openedAt:new Date().toISOString()};
    this.cash -= stake; this.trades.push(t); return t;
  }
  settle(id, won) {
    const t=this.trades.find(x=>x.id===id); if(!t||t.status!=="OPEN") throw new Error("Open trade not found");
    t.status=won?"WON":"LOST"; t.settledAt=new Date().toISOString();
    if(won) this.cash += t.stake / t.price;
    return t;
  }
  snapshot(){ return {initialBankroll:this.initialBankroll,cash:this.cash,open:this.trades.filter(t=>t.status==="OPEN").length,trades:this.trades}; }
}
