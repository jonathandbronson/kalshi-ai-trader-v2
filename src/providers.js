import {defaultReliability} from "./sourceQuality.js";
const UA="kalshi-ai-trader-v2/0.2 research bot";
async function getJson(url){const r=await fetch(url,{headers:{"accept":"application/json","user-agent":UA}});if(!r.ok)throw new Error(`Research provider ${r.status}`);return r.json();}
export async function fetchOfficialSignals(plan){
 const out=[];
 // Safe, credential-free official feeds. Category-specific adapters can be extended later.
 if(plan.category==="economics"){
  out.push({source:"Federal Reserve",claim:"Official Federal Reserve releases should be checked for current policy context.",url:"https://www.federalreserve.gov/newsevents.htm",reliability:.98});
  out.push({source:"BLS",claim:"Official BLS releases should be checked for inflation and labor data.",url:"https://www.bls.gov/bls/newsrels.htm",reliability:.98});
 }
 if(plan.category==="weather"){
  out.push({source:"National Weather Service",claim:"Use the relevant local NWS forecast and observations for the event location.",url:"https://www.weather.gov/",reliability:.98});
  out.push({source:"NOAA",claim:"Use NOAA observations and climatology where applicable.",url:"https://www.noaa.gov/",reliability:.98});
 }
 return out.map(x=>({...x,reliability:defaultReliability(x.url,x.source)}));
}
export async function fetchGdeltArticles(query,max=10){
 const u=new URL("https://api.gdeltproject.org/api/v2/doc/doc");
 u.searchParams.set("query",query);u.searchParams.set("mode","ArtList");u.searchParams.set("maxrecords",String(Math.min(50,max)));u.searchParams.set("format","json");
 const d=await getJson(u);
 return (d.articles??[]).map(a=>({source:a.domain??"GDELT indexed source",claim:a.title,url:a.url,publishedAt:a.seendate??null}));
}
