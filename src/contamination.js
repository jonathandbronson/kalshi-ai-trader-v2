const forbidden=/kalshi|polymarket|predictit|metaculus|manifold\s*markets|prediction[ -]?market|betting[ -]?(?:odds|markets)|bookmaker|sportsbook|trading\s+at\s+\d|contracts?\s+(?:priced|cost|at)\s+\d|exchange\s+consensus|implied\s+probabilit|crowd\s+(?:forecast|probabilit)|market\s+(?:consensus|odds|probabilit)|\bodds\s+(?:of|at|are)|\b(?:yes|no)\s+(?:price|contract|bid|ask)/i;
export function assertIndependent(value){
 const forbiddenKey=/^(?:yes|no)[_ ]?(?:ask|bid|price)|order[_ ]?book|implied[_ ]?probability|market[_ ]?(?:probability|consensus)|spread/i;
 function inspect(v){if(v&&typeof v==='object'){for(const [key,item] of Object.entries(v)){if(forbiddenKey.test(key))throw new Error("Market-price contamination rejected");inspect(item);}}}
 inspect(value);
 if(forbidden.test(JSON.stringify(value).normalize("NFKC").replace(/[\u200B-\u200D\uFEFF]/g,"")))throw new Error("Market-price contamination rejected");
 return value;
}
export function independentCriteria(text){
 const value=String(text??"");
 if(/kalshi[^.!?\n]*(?:price|odds|probabilit|consensus|cents|¢|bid|ask|%)/i.test(value))throw new Error("Market-price contamination rejected");
 const clean=value.replace(/\bKalshi\b/gi,"market operator");assertIndependent(clean);return clean;
}
export function researchMetadata(raw){
 if(!raw||typeof raw.ticker!=="string"||raw.ticker.length>200||typeof raw.title!=="string"||raw.title.length>3000)throw new Error("Malformed market metadata");
 const m={ticker:raw.ticker,eventId:raw.event_ticker??raw.eventId??raw.ticker?.split("-").slice(0,-1).join("-"),title:raw.title,status:raw.status,subtitle:raw.subtitle??"",rulesPrimary:independentCriteria(raw.rules_primary??raw.rulesPrimary),rulesSecondary:independentCriteria(raw.rules_secondary??raw.rulesSecondary),exactResolutionCriteria:[raw.rules_primary??raw.rulesPrimary??"",raw.rules_secondary??raw.rulesSecondary??""].filter(Boolean).join("\n"),closeTime:raw.close_time??raw.closeTime,category:raw.category??null};
 // Identifiers are never sent to the forecasting model; screen text independently.
 assertIndependent({title:m.title,subtitle:m.subtitle,rulesPrimary:m.rulesPrimary,rulesSecondary:m.rulesSecondary});return m;
}

export async function fetchMetadata(request,ticker){const raw=await request(ticker);return researchMetadata(raw.market??raw);}
