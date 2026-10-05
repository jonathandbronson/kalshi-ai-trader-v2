const STOP=/\b(will|the|a|an|be|by|on|in|of|to|and|or|for|at|before|after|during|this|that)\b/gi;
export function classifyMarket(m){
 const t=(m.title+" "+(m.subtitle??"")).toLowerCase();
 if(/temperature|rain|snow|weather|hurricane|wind/.test(t))return "weather";
 if(/election|president|senate|house|governor|vote|nominee/.test(t))return "politics";
 if(/fed|fomc|interest rate|cpi|inflation|gdp|jobs|unemployment/.test(t))return "economics";
 if(/bitcoin|ethereum|btc|eth|crypto/.test(t))return "crypto";
 if(/nba|nfl|mlb|nhl|ncaa|game|match|tournament|championship/.test(t))return "sports";
 return "general";
}
export function makeResearchPlan(m){
 const category=classifyMarket(m);
 const keywords=m.title.replace(STOP," ").replace(/[^a-z0-9 ]/gi," ").split(/\s+/).filter(x=>x.length>2).slice(0,10);
 const sourceTypes={
  weather:["official meteorological forecast","observations","historical climatology"],
  politics:["official election data","high-quality polling","demographic/fundamentals data"],
  economics:["official economic releases","central-bank releases","economist/market-independent forecasts"],
  crypto:["spot/index data","network/market fundamentals","macro/news catalysts"],
  sports:["official injury/status reports","team/player statistics","schedule/rest/context"],
  general:["primary sources","official statistics","high-quality independent reporting"]
 }[category];
 return {ticker:m.ticker,category,question:m.title,resolutionCriteria:m.rulesPrimary??"",keywords,sourceTypes,
  instructions:["Read resolution criteria before research","Do not use Kalshi prices or prediction-market probabilities as evidence","Prefer primary/official sources","Seek disconfirming evidence","Produce at least two materially independent signals"]};
}
