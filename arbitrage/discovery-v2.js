// Discovery V2: incremental market snapshots, deterministic event blocking,
// indexed nearest-neighbor retrieval, and research-only candidate ranking.
// No orders, auto-verification, or execution pathways.
import {createHash} from "node:crypto";
const normalize=s=>String(s??"").toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]+/g," ").replace(/\s+/g," ").trim();
const hash=s=>createHash("sha256").update(String(s)).digest("hex");
const STOP=new Set(["will","the","and","for","who","what","which","this","that","with","from","market","event","yes","no","win","wins","winner","in","on","at","to","of","be","a","an"]);
const tokens=s=>[...new Set(normalize(s).split(" ").filter(x=>x.length>2&&!STOP.has(x)))];
const years=s=>[...new Set((String(s).match(/\b20\d\d\b/g)??[]))].sort();
const date=s=>{const v=Date.parse(s??"");return Number.isFinite(v)?new Date(v).toISOString().slice(0,10):null};
const type=s=>/\b(nominated|nomination|nominee)\b/i.test(s)?"NOMINATION":/\b(win|wins|winner|champion)\b/i.test(s)?"WIN":/\b(over|above|at least)\b/i.test(s)?"ABOVE":/\b(under|below|at most)\b/i.test(s)?"BELOW":"OTHER";
// Conservative intent signatures: unknown intents remain research candidates, never approvals.
export function intentOf(s){
 const t=normalize(s);
 if(/\b(retire|retirement|retiring|announce his retirement|announce her retirement)\b/.test(t))return "RETIREMENT";
 if(/\b(points|rebounds|assists|steals|blocks|turnovers|three pointers|threes|3 pointers|touchdowns|yards|strikeouts|saves|shots|goals|hits|runs|rbi|passes|completions|receptions)\b/.test(t)&&/\b(over|under|o u|total|at least|more than|fewer than)\b/.test(t))return "PLAYER_STAT";
 if(/\b(nominated|nomination|nominee|primary nomination)\b/.test(t))return "NOMINATION";
 if(/\b(prime minister|president|presidential|governor|senate|election|electoral)\b/.test(t)&&/\b(win|wins|winner|elected|become|next)\b/.test(t))return "ELECTION_WIN";
 if(/\b(win|wins|winner|champion|championship|title|tournament|super bowl)\b/.test(t))return "SPORTS_WIN";
 if(/\b(over|above|at least|reach|exceed)\b/.test(t))return "THRESHOLD_ABOVE";
 if(/\b(under|below|at most|less than)\b/.test(t))return "THRESHOLD_BELOW";
 return "UNKNOWN";
}
const category=s=>/\b(nfl|nba|football|soccer|tennis|baseball|championship)\b/i.test(s)?"SPORTS":/\b(senate|election|president|governor|congress)\b/i.test(s)?"POLITICS":/\b(bitcoin|ethereum|crypto|btc|eth)\b/i.test(s)?"CRYPTO":/\b(fed|cpi|inflation|unemployment|gdp)\b/i.test(s)?"ECONOMICS":"OTHER";
export function normalizeMarkets(events,venue){
 const result=[];
 for(const event of events??[])for(const market of event.markets??[]){
  const id=String(market.ticker??market.id??"");if(!id)continue;
  const title=String(market.question??market.title??"");
  const eventTitle=String(event.title??"");
  const full=[title,market.subtitle,eventTitle].filter(Boolean).join(" ");
  if(!title.trim())continue;
  const close=date(market.close_time??market.expiration_time??market.endDate??event.endDate);
  result.push({id:venue+":"+id,venue,marketId:id,eventId:String(event.event_ticker??event.id??""),title,eventTitle,subtitle:String(market.subtitle??""),text:full,
   category:category(full),outcomeType:type(title),intent:intentOf(title),years:years(title).length?years(title):years(full),close,tokens:tokens(full),
   liquidity:Number(market.liquidityNum??market.liquidity??0)||0,volume:Number(market.volume24hr??market.volume_24h??0)||0,
   ruleHash:hash([market.rules_primary,market.rules_secondary,market.description].join("|")),
   textHash:hash(normalize(full)),sourceMarket:market});
 }
 return result;
}
export function refreshDerivedFields(m){
 const title=String(m.title??"");
 const full=[title,m.subtitle,m.eventTitle].filter(Boolean).join(" ");
 return {...m,intent:intentOf(title),outcomeType:type(title),category:category(full),years:years(title).length?years(title):years(full),tokens:tokens(full)};
}
export function mergeSnapshot(previous={},incoming=[],{complete=false,now=new Date().toISOString()}={}){
 const next=complete?{}:{...(previous.markets??{})};
 let added=0,updated=0,unchanged=0,marketDataRefreshed=0;
 for(const m of incoming){
  const prior=next[m.id];
  if(!prior)added++;
  else if(prior.textHash!==m.textHash||prior.ruleHash!==m.ruleHash||prior.close!==m.close)updated++;
  else unchanged++;
  if(prior&&(prior.liquidity!==m.liquidity||prior.volume!==m.volume))marketDataRefreshed++;
  next[m.id]={...m,lastSeen:now};
 }
 return {schemaVersion:2,timestamp:now,markets:next,stats:{added,updated,unchanged,marketDataRefreshed,total:Object.keys(next).length,complete}};
}
function compatible(a,b){
 const exact=normalize(a.title)===normalize(b.title);
 if(a.venue===b.venue)return false;
 if(a.intent&&b.intent&&a.intent!=="UNKNOWN"&&b.intent!=="UNKNOWN"&&a.intent!==b.intent)return false;
 if(a.outcomeType!=="OTHER"&&b.outcomeType!=="OTHER"&&a.outcomeType!==b.outcomeType)return false;
 // Unclassified contracts must have identical titles to avoid name/boilerplate collisions.
 if(!exact&&(a.intent==="UNKNOWN"||b.intent==="UNKNOWN"))return false;
 if(a.years.length&&b.years.length&&!a.years.some(y=>b.years.includes(y)))return false;
 // Different venue close times are not necessarily different settlement events.
 if(!exact&&a.close&&b.close&&Math.abs(Date.parse(a.close)-Date.parse(b.close))>1000*60*60*24*90)return false;
 return true;
}
function blockingKeys(m){
 const keys=new Set();
 for(const t of m.tokens.filter(t=>!/^\d+$/.test(t)).slice(0,16))keys.add("T:"+t);
 for(const y of m.years)keys.add("Y:"+y);
 if(m.eventTitle)for(const t of tokens(m.eventTitle).slice(0,8))keys.add("E:"+t);
 return [...keys];
}
const GENERIC=new Set(["will","would","could","should","there","have","been","this","that","these","those","with","from","which","where","when","what","about","after","before","over","under","above","below","more","than","less","least","most","year","years","market","event","election","presidential","president","winner","winning","wins","champion","championship","nomination","nominated","nominee","price","reach","between","during","against","total","first","next","game","games","team","teams","play","plays","player","players","season","match","matches","league","any","2026","2027","2028","2029"]);
function distinctiveTitleTokens(s){return [...new Set(normalize(s).split(" ").filter(t=>t.length>=4&&!GENERIC.has(t)&&!/^\d+$/.test(t)))];}
function titleAgreement(a,b){
 const x=distinctiveTitleTokens(a.title),y=distinctiveTitleTokens(b.title),ys=new Set(y);
 const common=x.filter(t=>ys.has(t));
 const titleCosine=x.length&&y.length?common.length/Math.sqrt(x.length*y.length):0;
 const exact=normalize(a.title)===normalize(b.title);
 // Without a distinctive common title term, event boilerplate can create spurious matches.
 const enough=exact||(common.length>=2&&titleCosine>=.65);
 return {enough,titleCosine,sharedTitleTokens:common.length,exact};
}
function cosineTokens(a,b){
 const x=new Set(a.tokens),y=new Set(b.tokens);
 if(!x.size||!y.size)return 0;
 let common=0;for(const t of x)if(y.has(t))common++;
 return common/Math.sqrt(x.size*y.size);
}
function cosineVector(a,b){
 if(!a||!b||a.length!==b.length)return null;
 let dot=0,aa=0,bb=0;
 for(let i=0;i<a.length;i++){dot+=a[i]*b[i];aa+=a[i]*a[i];bb+=b[i]*b[i]}
 return aa&&bb?dot/Math.sqrt(aa*bb):null;
}
export function discoverIndexedPairs(markets,{limit=500,perMarket=10,minScore=.22,maxBlock=600,vectors={}}={}){
 // Recompute classification for cached snapshot records from the current rules.
 const fresh=markets.map(refreshDerivedFields);
 const ks=fresh.filter(x=>x.venue==="kalshi"),ps=fresh.filter(x=>x.venue==="polymarket");
 const index=new Map(),exactTitleIndex=new Map();
 for(let j=0;j<ps.length;j++){
  const titleKey=normalize(ps[j].title);
  if(!exactTitleIndex.has(titleKey))exactTitleIndex.set(titleKey,[]);
  exactTitleIndex.get(titleKey).push(j);
  for(const key of blockingKeys(ps[j])){
  if(!index.has(key))index.set(key,[]);
  index.get(key).push(j);
  }
 }
 const candidates=[],seen=new Set();let comparisons=0,blocked=0;
 for(const k of ks){
  const hits=new Map();
  for(const key of blockingKeys(k)){
   const posting=index.get(key)??[];
   if(posting.length>maxBlock)continue;
   for(const j of posting)hits.set(j,(hits.get(j)??0)+1);
  }
  // Exact contract titles bypass posting-list caps; they still pass intent/date checks.
  for(const j of exactTitleIndex.get(normalize(k.title))??[])hits.set(j,Math.max(100,hits.get(j)??0));
  const shortlist=[...hits].sort((a,b)=>b[1]-a[1]).slice(0,Math.max(60,perMarket*12));
  blocked+=shortlist.length;
  const ranked=[];
  for(const [j,sharedKeys] of shortlist){
   const p=ps[j];if(!compatible(k,p))continue;
   const agreement=titleAgreement(k,p);if(!agreement.enough)continue;
   comparisons++;
   const lexical=cosineTokens(k,p);
   const ka=vectors[k.id],pa=vectors[p.id];
   const kv=ka?.hash===k.textHash?ka.vector:null,pv=pa?.hash===p.textHash?pa.vector:null;
   const neural=cosineVector(kv,pv);
   const rawScore=neural===null?lexical:Math.max(lexical,neural);
   const score=.5*rawScore+.5*agreement.titleCosine;
   if(score<minScore)continue;
   ranked.push({kalshiTicker:k.marketId,polymarketId:p.marketId,kalshiTitle:k.title,polymarketTitle:p.title,
    kalshiEventId:k.eventId,polymarketEventId:p.eventId,category:k.category,kalshiIntent:k.intent??intentOf(k.title),polymarketIntent:p.intent??intentOf(p.title),lexicalScore:Number(lexical.toFixed(4)),
    neuralScore:neural===null?null:Number(neural.toFixed(4)),score:Number(score.toFixed(4)),sharedKeys,
    titleAgreement:Number(agreement.titleCosine.toFixed(4)),sharedTitleTokens:agreement.sharedTitleTokens,exactTitle:agreement.exact,
    discoverySource:neural===null?"INDEXED_LEXICAL":"INDEXED_NEURAL",approved:false,settlementVerified:false,executable:false});
  }
  ranked.sort((a,b)=>b.score-a.score);
  for(const candidate of ranked.slice(0,perMarket)){
   const key=candidate.kalshiTicker+"|"+candidate.polymarketId;
   if(seen.has(key))continue;seen.add(key);candidates.push(candidate);
  }
 }
 candidates.sort((a,b)=>b.score-a.score);
 return {candidates:candidates.slice(0,limit),stats:{kalshiMarkets:ks.length,polymarketMarkets:ps.length,blocked,comparisons,uncapped:candidates.length,selected:Math.min(limit,candidates.length),method:"INVERTED_EVENT_INDEX_PLUS_OPTIONAL_NEURAL"}};
}
export function rankResearchCandidates(candidates,{minLiquidity=0}={}){
 return candidates.map(c=>({...c,researchPriority:Number((c.score*100+(c.neuralScore===null?0:5)).toFixed(2)),
  liquidityStatus:"UNVERIFIED",netExecutableEdge:null,approved:false,settlementVerified:false,executable:false}))
 .filter(c=>minLiquidity===0||c.estimatedLiquidity>=minLiquidity)
 .sort((a,b)=>b.researchPriority-a.researchPriority);
}
