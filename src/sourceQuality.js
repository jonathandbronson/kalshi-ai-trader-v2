const HOST_WEIGHTS=[[/\.gov$/,.95],[/\.edu$/,.85],[/reuters\.com$|apnews\.com$/,.9],[/noaa\.gov$|weather\.gov$/,.98],[/bls\.gov$|bea\.gov$|federalreserve\.gov$/,.98]];
export function hostname(url){try{return new URL(url).hostname.replace(/^www\./,"").toLowerCase()}catch{return ""}}
export function defaultReliability(url,source=""){
 const h=hostname(url),s=String(source).toLowerCase();
 for(const [re,w] of HOST_WEIGHTS)if(re.test(h))return w;
 if(/official|government|primary/.test(s))return .9;
 return .6;
}
export function freshnessWeight(publishedAt,now=Date.now()){
 if(!publishedAt)return .7; const age=Math.max(0,now-new Date(publishedAt).getTime())/86400000;
 if(age<=1)return 1;if(age<=7)return .95;if(age<=30)return .85;if(age<=180)return .7;return .55;
}
export function scoreEvidence(e){
 const reliability=Number.isFinite(Number(e.reliability))?Number(e.reliability):defaultReliability(e.url,e.source);
 return Math.max(0,Math.min(1,reliability*freshnessWeight(e.publishedAt)));
}
