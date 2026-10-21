// Read-only category-balanced event sourcing; all results remain unverified.
export const CATEGORIES=["Sports","Economics","Financials","Crypto"];
const TAG_KEYWORDS={
 Sports:/sports|football|basketball|baseball|soccer|tennis/i,
 Economics:/econom|inflation|federal reserve|fed|cpi|gdp|interest rates|jobs/i,
 Financials:/finance|financial|stock|equities|commodit|market/i,
 Crypto:/crypto|bitcoin|ethereum|solana/i
};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function getJson(url,fetcher){
 for(let attempt=0;attempt<3;attempt++){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),10000);
  try{
   const r=await fetcher(url,{signal:ctrl.signal,headers:{accept:"application/json"}});
   if((r.status===429||r.status>=500)&&attempt<2){await sleep(400*2**attempt);continue}
   if(!r.ok)throw Error("HTTP "+r.status);
   return await r.json();
  }finally{clearTimeout(timer)}
 }
 throw Error("RETRY_EXHAUSTED");
}
export async function collectCategoryEvents({fetcher=fetch,seriesPerCategory=3,tagsPerCategory=2,pagesPerSource=2}={}){
 const kalshi=[],poly=[],errors=[],coverage={};
 const safe=async(url,label)=>{try{return await getJson(url,fetcher)}catch(e){errors.push(label+": "+e.message);return null}};
 const tagData=await safe("https://gamma-api.polymarket.com/tags?limit=500","polymarket tags");
 const tags=Array.isArray(tagData)?tagData:[];
 for(const category of CATEGORIES){
  const record={kalshiSeries:0,kalshiEvents:0,polyTags:0,polyEvents:0};
  const u=new URL("https://external-api.kalshi.com/trade-api/v2/series");
  u.searchParams.set("category",category);
  const seriesData=await safe(u.toString(),"kalshi series "+category);
  const series=Array.isArray(seriesData?.series)?seriesData.series:[];
  // Prefer series with activity indicators when available; do not assume API order is relevant.
  const ranked=[...series].sort((a,b)=>Number(b.volume_24h??b.volume24h??b.volume??0)-Number(a.volume_24h??a.volume24h??a.volume??0));
  for(const item of ranked.slice(0,Math.max(0,seriesPerCategory))){
   if(!item.ticker)continue;
   record.kalshiSeries++;
   let cursor="";
   for(let page=0;page<pagesPerSource;page++){
    const v=new URL("https://external-api.kalshi.com/trade-api/v2/events");
    v.searchParams.set("series_ticker",item.ticker);v.searchParams.set("status","open");
    v.searchParams.set("with_nested_markets","true");v.searchParams.set("limit","100");
    if(cursor)v.searchParams.set("cursor",cursor);
    const data=await safe(v.toString(),"kalshi events "+item.ticker);
    if(!data)break;
    const events=Array.isArray(data.events)?data.events:[];
    kalshi.push(...events);record.kalshiEvents+=events.length;
    cursor=data.cursor??"";if(!cursor)break;
   }
  }
  const selected=tags.filter(t=>TAG_KEYWORDS[category].test(String(t.slug??"")+" "+String(t.label??"")))
   .sort((a,b)=>Number(b.volume24hr??b.volume24h??b.volume??0)-Number(a.volume24hr??a.volume24h??a.volume??0))
   .slice(0,Math.max(0,tagsPerCategory));
  // /tags may return a truncated list; query high-value slugs directly when absent.
  const fallbackSlugs={Sports:["sports"],Economics:["economics","macro"],Financials:["finance","stocks"],Crypto:["crypto","bitcoin"]}[category]??[];
  if(selected.length===0)for(const slug of fallbackSlugs){
   const u="https://gamma-api.polymarket.com/tags/slug/"+encodeURIComponent(slug);
   const found=await safe(u,"polymarket tag slug "+slug);
   for(const tag of (Array.isArray(found)?found:found?.id!=null?[found]:[]))if(tag.id!=null&&!selected.some(x=>String(x.id)===String(tag.id)))selected.push(tag);
   if(selected.length>=tagsPerCategory)break;
  }
  for(const tag of selected.slice(0,Math.max(0,tagsPerCategory))){
   if(tag.id==null)continue;
   record.polyTags++;
   for(let page=0;page<pagesPerSource;page++){
    const v=new URL("https://gamma-api.polymarket.com/events");
    v.searchParams.set("tag_id",String(tag.id));v.searchParams.set("active","true");v.searchParams.set("closed","false");
    v.searchParams.set("limit","100");v.searchParams.set("offset",String(page*100));
    v.searchParams.set("order","volume24hr");v.searchParams.set("ascending","false");
    const data=await safe(v.toString(),"polymarket events "+tag.slug);
    if(!Array.isArray(data))break;
    poly.push(...data);record.polyEvents+=data.length;
    if(data.length<100)break;
   }
  }
  coverage[category]=record;
 }
 const unique=(items,key)=>[...new Map(items.filter(x=>x?.[key]!=null).map(x=>[String(x[key]),x])).values()];
 return {kalshi:unique(kalshi,"event_ticker"),poly:unique(poly,"id"),coverage,errors};
}
