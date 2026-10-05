export function hostname(url){try{return new URL(url).hostname.replace(/^www\./,"").toLowerCase()}catch{return ""}}
export function defaultReliability(url){const h=hostname(url);if(/\.gov$/.test(h))return .95;if(/\.edu$/.test(h))return .85;if(/^(?:.*\.)?(reuters\.com|apnews\.com)$/.test(h))return .9;return .6;}
export function freshnessWeight(date,now=Date.now()){const t=Date.parse(date);if(!Number.isFinite(t)||t>now+300000)return 0;const age=(now-t)/86400000;return age<=1?1:age<=7?.95:age<=30?.85:age<=180?.7:.3;}
export function scoreEvidence(e){return Math.min(defaultReliability(e.url),Number.isFinite(e.reliability)?e.reliability:1)*freshnessWeight(e.publishedAt);}
