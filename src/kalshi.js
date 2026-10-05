const BASE_URL = process.env.KALSHI_API_BASE_URL ?? "https://api.elections.kalshi.com/trade-api/v2";

async function request(path) {
  const response = await fetch(`${BASE_URL}${path}`, {headers:{"accept":"application/json","user-agent":"kalshi-ai-trader-v2/0.1"}});
  if (!response.ok) throw new Error(`Kalshi API ${response.status}: ${await response.text()}`);
  return response.json();
}

export async function getMarkets({limit=100,cursor,status="open",seriesTicker}={}) {
  const q=new URLSearchParams({limit:String(Math.min(1000,Math.max(1,limit)))});
  if(cursor) q.set("cursor",cursor);
  if(status) q.set("status",status);
  if(seriesTicker) q.set("series_ticker",seriesTicker);
  return request(`/markets?${q}`);
}

export async function getMarket(ticker) {
  if(!ticker) throw new Error("ticker required");
  return request(`/markets/${encodeURIComponent(ticker)}`);
}

export async function getOrderbook(ticker, depth=10) {
  if(!ticker) throw new Error("ticker required");
  return request(`/markets/${encodeURIComponent(ticker)}/orderbook?depth=${Math.max(1,Math.min(100,depth))}`);
}

export function centsToProbability(cents){ return cents == null ? null : Number(cents)/100; }

export function normalizeMarket(raw) {
  return {
    ticker:raw.ticker,title:raw.title,subtitle:raw.subtitle,
    status:raw.status,closeTime:raw.close_time,
    yesBid:centsToProbability(raw.yes_bid),yesAsk:centsToProbability(raw.yes_ask),
    noBid:centsToProbability(raw.no_bid),noAsk:centsToProbability(raw.no_ask),
    volume:Number(raw.volume ?? 0),openInterest:Number(raw.open_interest ?? 0),
    rulesPrimary:raw.rules_primary ?? "",rulesSecondary:raw.rules_secondary ?? ""
  };
}
