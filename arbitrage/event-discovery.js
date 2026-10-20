// Event-first cross-venue discovery. Read-only; never approves contracts or places orders.
import {writeFile,readFile} from "node:fs/promises";
import {createHash} from "node:crypto";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const PAGES=Math.max(1,Math.min(20,Number(process.env.ARB_EVENT_PAGES??8)));
const MAX_PAIRS=Math.max(1,Math.min(100,Number(process.env.ARB_EVENT_CANDIDATES??40)));
async function json(url){
 for(let n=0;n<4;n++){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),12000);
  try{
   const r=await fetch(url,{signal:ctrl.signal,headers:{accept:"application/json"}});
   if((r.status===429||r.status>=500)&&n<3){const retry=Number(r.headers.get("retry-after"));await sleep(Number.isFinite(retry)&&retry>0?Math.min(retry*1000,12000):600*2**n);continue;}
   if(!r.ok)throw Error("HTTP "+r.status+" "+new URL(url).hostname);
   return await r.json();
  }finally{clearTimeout(timer)}
 }
 throw Error("Retries exhausted");
}
const normalized=s=>String(s??"").toLowerCase().replace(/[^a-z0-9 ]/g," ").replace(/\s+/g," ").trim();
const stop=new Set(["will","the","and","with","that","this","have","from","2026","2027","2028","market","event","what","which","wins","win","does","over","under","before","after","yes","no","more","than","against","versus","match","game","team","teams","score","goals","price","above","below","united","states"]);
const words=s=>new Set(normalized(s).split(" ").filter(w=>w.length>2&&!stop.has(w)));
function score(a,b){const x=words(a),y=words(b);if(!x.size||!y.size)return 0;const overlap=[...x].filter(t=>y.has(t)).length;return overlap/Math.sqrt(x.size*y.size)}
const parse=v=>{try{const x=typeof v==="string"?JSON.parse(v):v;return Array.isArray(x)?x:[]}catch{return []}};
const day=s=>{const d=Date.parse(s??"");return Number.isFinite(d)?new Date(d).toISOString().slice(0,10):null};
function contractFingerprint(title){
 const t=normalized(title);
 const strike=String(title??"").match(/\b(?:above|below|over|under|at least|at most)\s*\$?([\d,]+(?:\.\d+)?)/i);
 const direction=/\b(?:above|over|at least)\b/i.test(t)?"above":/\b(?:below|under|at most)\b/i.test(t)?"below":null;
 const asset=/\b(gold|silver|bitcoin|solana|ethereum|oil|treasury)\b/i.exec(t)?.[1]?.toLowerCase()??null;
 const kind=/\b(?:champion|championship|playoffs|finals|nomination)\b/.test(t)?"season":/\b(?:minutes?|mins?)\b/.test(t)?"intraday":/\b(?:goals|score|1st half|2nd half)\b/.test(t)?"match-prop":"other";
 return {kind,asset,strike:strike?Number(strike[1].replaceAll(",","")):null,direction};
}
function outcomeLabel(m,eventTitle){
 const t=String(m.title??""),sub=String(m.subtitle??"");
 const event=String(eventTitle??"");
 // Generic "Who will win?" titles must use the explicit contract subtitle.
 const generic=/^(?:who will win|which person|winner\??$)/i.test(t.trim());
 if(generic)return sub.trim()||null;
 return [t,sub].filter(Boolean).join(" ");
}
function hasNamedOutcome(label,eventTitle){
 if(!label)return false;
 const l=normalized(label),e=normalized(eventTitle);
 if(/^(who will win|winner|yes|no|other|field|any other|none of the above)$/.test(l))return false;
 // Generic event name alone is not a selection of the same candidate.
 if(l===e)return false;
 return true;
}
function personSelection(text){
 const t=String(text??"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
 const m=t.match(/\bwill\s+(.+?)\s+(?:be\s+the\s+next|win\s+the|become\s+the)\b/);
 if(!m)return null;
 const candidate=m[1].trim().replace(/^the\s+/,"");
 if(/^(republicans?|democrats?|gop|a|an|someone|person\s+[a-z])$/.test(candidate))return null;
 return candidate;
}
function electionScope(text){
 const t=normalized(text);
 const states=["alabama","alaska","arizona","arkansas","california","colorado","connecticut","delaware","florida","georgia","hawaii","idaho","illinois","indiana","iowa","kansas","kentucky","louisiana","maine","maryland","massachusetts","michigan","minnesota","mississippi","missouri","montana","nebraska","nevada","new hampshire","new jersey","new mexico","new york","north carolina","north dakota","ohio","oklahoma","oregon","pennsylvania","rhode island","south carolina","south dakota","tennessee","texas","utah","vermont","virginia","washington","west virginia","wisconsin","wyoming"];
 const state=states.find(x=>new RegExp("\\b"+x+"\\b").test(t))??null;
 const district=/\b(?:al|ak|az|ar|ca|co|ct|de|fl|ga|hi|id|il|in|ia|ks|ky|la|me|md|ma|mi|mn|ms|mo|mt|ne|nv|nh|nj|nm|ny|nc|nd|oh|ok|or|pa|ri|sc|sd|tn|tx|ut|vt|va|wa|wv|wi|wy)-\d{1,2}\b/.exec(String(text).toLowerCase())?.[0]??null;
 const national=!state&&!district&&/\b(?:control|majority|balance of power|win the house|win the senate)\b/.test(t);
 return {state,district,national};
}
function scopeCompatible(a,b){
 const x=electionScope(a),y=electionScope(b);
 if(x.state!==y.state||x.district!==y.district||x.national!==y.national)return false;
 return true;
}
function electionOutcome(text){
 const t=normalized(text);
 const party=/\b(?:republicans?|gop)\b/.test(t)?"republican":/\b(?:democrats?|democratic)\b/.test(t)?"democrat":null;
 const named=/\bperson [a-z]\b/.test(t);
 const senate=/\bsenate\b/.test(t),house=/\bhouse\b/.test(t);
 return {party,named,senate,house};
}
function electionCompatible(a,b){
 const x=electionOutcome(a),y=electionOutcome(b);
 if(x.party!==y.party)return false;
 if(x.named!==y.named)return false;
 if(x.senate!==y.senate||x.house!==y.house)return false;
 return true;
}
function incompatibleEventIdentity(kEvent,pEvent,kMarket,pMarket){
 const a=normalized(kEvent+" "+kMarket),b=normalized(pEvent+" "+pMarket);
 // A character in a film and the lead actor in that film are distinct outcomes.
 const role=/\b(?:as q|cast as q|perform as q)\b/;
 const bond=/\b(?:next james bond|as james bond|bond actor)\b/;
 if((role.test(a)&&bond.test(b))||(role.test(b)&&bond.test(a)))return "different_film_role";
 // National elections, individual races, and succession are not equivalent.
 const succession=/\b(?:succeed|successor|after netanyahu|after the next election|following the election)\b/;
 if(succession.test(a)!==succession.test(b))return "different_trigger";
 return null;
}
function reviewEvidence(k,p,km,pm){
 const kalshiClose=day(km.close_time??km.expiration_time),polyEnd=day(pm.endDate??pm.end_date_iso);
 const differentEndDates=Boolean(kalshiClose&&polyEnd&&kalshiClose!==polyEnd);
 return {
  kalshiRules:km.rules_primary??null,kalshiSecondaryRules:km.rules_secondary??null,
  polymarketDescription:pm.description??null,polymarketResolutionSource:pm.resolutionSource??null,
  kalshiClose,polymarketEnd:polyEnd,differentEndDates,
  manualChecks:["same_exact_outcome","same_resolution_trigger","same_measurement_source","same_void_and_cancellation_rules","same_settlement_deadline","fee_and_orderbook_depth"],
  settlementVerified:false,reviewPriority:differentEndDates?"CHECK_DATE_AND_SETTLEMENT_TRIGGER":"CHECK_SETTLEMENT_RULES"
 };
}
function settlementConflicts(evidence){
 const k=String(evidence.kalshiRules??"")+" "+String(evidence.kalshiSecondaryRules??"");
 const p=String(evidence.polymarketDescription??"");
 const conflicts=[];
 if(!k.trim()||!p.trim())return ["missing_rule_text"];
 const kInterim=/\b(?:acting|interim|caretaker)\b[^.]{0,100}\b(?:count|holding the position)\b/i.test(k);
 const pInterimExcluded=/\b(?:interim|caretaker)\b[^.]{0,100}\b(?:will not count|do not count|not count)\b/i.test(p);
 if(kInterim&&pInterimExcluded)conflicts.push("interim_appointment_treatment");
 const pDeadline=/\b(?:by|before|until)\s+(?:december|january|february|march|april|may|june|july|august|september|october|november)\s+\d{1,2},?\s+20\d\d\b/i.test(p);
 if(pDeadline&&!/\b(?:by|before|until|expiration|close|deadline)\b/i.test(k))conflicts.push("explicit_deadline_only_on_polymarket");
 const meetingDeadline=t=>t.match(/\b(?:before|by|until)\s+(?:dec(?:ember)?|jan(?:uary)?)\s+\d{1,2},?\s*(20\d\d)\b/i)?.[1]??null;
 const kMeeting=meetingDeadline(k),pMeeting=meetingDeadline(p);
 if(kMeeting&&pMeeting&&kMeeting!==pMeeting)conflicts.push("different_meeting_deadline_year");
 const senateTerm=k.match(/\bterm beginning in\s+(20\d\d)\b/i)?.[1];
 const senateElection=p.match(/\b(20\d\d)\b[^.]{0,90}\b(?:senate\s+(?:special\s+)?election|senate\s+race)\b/i)?.[1];
 if(senateTerm&&senateElection&&Number(senateTerm)!==Number(senateElection)+1)conflicts.push("different_senate_election_cycle");
 if(/\b(?:county|precinct|congressional district)\b/i.test(p)&&!/\b(?:county|precinct|congressional district)\b/i.test(k))conflicts.push("subregion_vs_statewide_result");
 const pVote=/\bvote of confidence\b/i.test(p);
 if(pVote&&!/\bvote of confidence\b/i.test(k))conflicts.push("parliamentary_vote_requirement_unconfirmed");
 return conflicts;
}
function semanticConflict(a,b){
 const x=normalized(a),y=normalized(b);
 const type=t=>/\b(?:nominated|nomination|nominee)\b/.test(t)?"nomination":/\b(?:win|wins|winner|winning)\b/.test(t)?"win":null;
 const ax=type(x),by=type(y);
 if(ax&&by&&ax!==by)return "nomination_vs_win";
 const names=["putin","zelenskyy","zelensky","trump","biden","macron","erdogan"];
 const people=t=>names.filter(n=>new RegExp("\\b"+n+"\\b").test(t)).map(n=>n==="zelensky"?"zelenskyy":n).sort().join("|");
 const px=people(x),py=people(y);
 if(px&&py&&px!==py)return "different_named_participants";
 const years=t=>[...new Set((t.match(/\b20\d\d\b/g)??[]))].sort().join("|");
 const xx=years(x),yy=years(y);
 if(xx&&yy&&xx!==yy)return "different_explicit_years";
 return null;
}
function compatible(a,b){
 const x=contractFingerprint(a),y=contractFingerprint(b);
 if(x.kind!==y.kind||x.asset!==y.asset||x.strike!==y.strike||x.direction!==y.direction)return false;
 // A missing explicit event date is insufficient to establish event equivalence.
 const datePattern=/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2}(?:,?\s+20\d\d)?\b/i;
 const da=a.match(datePattern)?.[0],db=b.match(datePattern)?.[0];
 if(Boolean(da)!==Boolean(db))return false;
 if(da&&db&&normalized(da)!==normalized(db))return false;
 return true;
}
const hash=s=>createHash("sha256").update(String(s??"")).digest("hex").slice(0,16);
async function loadRejections(){try{const v=JSON.parse(await readFile("reports/rejected-pairs.json","utf8"));return v&&typeof v.rejections==="object"?v.rejections:{}}catch{return {}}}
function eventCategory(t){
 const text=normalized(t);
 if(/\b(?:election|president|senate|house|prime minister|governor|nomination|parliament|party)\b/.test(text))return "politics";
 if(/\b(?:football|soccer|nba|nfl|tennis|baseball|championship|world cup|premier league|ufc|f1)\b/.test(text))return "sports";
 if(/\b(?:bitcoin|ethereum|solana|crypto|btc|eth)\b/.test(text))return "crypto";
 if(/\b(?:inflation|fed|interest|treasury|gdp|unemployment|cpi|recession)\b/.test(text))return "economics";
 if(/\b(?:gold|silver|oil|stock|nasdaq|s&p)\b/.test(text))return "finance";
 return "other";
}
async function collect(){
 const report={timestamp:new Date().toISOString(),mode:"EVENT_FIRST_READ_ONLY",status:"COLLECTING",autoApproved:0,verifiedPairs:0,errors:[],counts:{},candidates:[],notes:["Event similarity is not proof of identical settlement rules.","No orders or paper entries are created.","Only manually reviewed contracts may be approved for simulation."]};
 const kalshi=[],poly=[];let cursor="";
 for(let i=0;i<PAGES;i++){
  try{
   const u=new URL("https://external-api.kalshi.com/trade-api/v2/events");
   u.searchParams.set("limit","100");u.searchParams.set("status","open");u.searchParams.set("with_nested_markets","true");
   if(cursor)u.searchParams.set("cursor",cursor);
   const data=await json(u);kalshi.push(...(data.events??[]));cursor=data.cursor??"";
   if(!cursor)break;await sleep(350);
  }catch(e){report.errors.push("kalshi events: "+e.message);break}
 }
 for(let i=0;i<PAGES;i++){
  try{
   const u=new URL("https://gamma-api.polymarket.com/events");
   u.searchParams.set("limit","100");u.searchParams.set("offset",String(i*100));u.searchParams.set("active","true");u.searchParams.set("closed","false");u.searchParams.set("order","volume24hr");u.searchParams.set("ascending","false");
   const data=await json(u);if(!Array.isArray(data))throw Error("Unexpected event response");
   poly.push(...data);if(data.length<100)break;
  }catch(e){report.errors.push("polymarket events: "+e.message);break}
 }
 // Supplement the volume-sorted Polymarket sample with newer events, avoiding duplicate IDs.
 const existingPoly=new Set(poly.map(e=>String(e.id)));
 for(let i=0;i<Math.min(4,PAGES);i++){
  try{
   const u=new URL("https://gamma-api.polymarket.com/events");
   u.searchParams.set("limit","100");u.searchParams.set("offset",String(i*100));u.searchParams.set("active","true");u.searchParams.set("closed","false");u.searchParams.set("order","id");u.searchParams.set("ascending","false");
   const data=await json(u);if(!Array.isArray(data))throw Error("Unexpected recent events response");
   for(const e of data)if(!existingPoly.has(String(e.id))){existingPoly.add(String(e.id));poly.push(e)}
   if(data.length<100)break;
  }catch(e){report.errors.push("polymarket recent events: "+e.message);break}
 }
 report.counts={kalshiEvents:kalshi.length,polymarketEvents:poly.length,kalshiNestedMarkets:kalshi.reduce((n,e)=>n+(e.markets?.length??0),0),polymarketNestedMarkets:poly.reduce((n,e)=>n+(e.markets?.length??0),0),eventPagesRequested:PAGES,polymarketDiscoverySources:["volume24hr","recent_id"],kalshiDiscoverySources:["open_cursor_pagination"]};
 // Bidirectional token-index lookup: discover counterpart events from either venue
 // without relying on the same event appearing at the same listing position.
 const index=events=>{
  const map=new Map();
  for(const e of events)for(const token of words(e.title)){
   if(!map.has(token))map.set(token,new Set());
   map.get(token).add(e);
  }
  return map;
 };
 const ki=index(kalshi),pi=index(poly),matches=new Map();
 const search=(sources,targetIndex,kalshiSource)=>{
  for(const source of sources){
   const hits=new Map();
   for(const token of words(source.title)){
    for(const target of targetIndex.get(token)??[]){
     hits.set(target,(hits.get(target)??0)+1);
    }
   }
   for(const [target,overlap] of hits){
    if(overlap<2)continue;
    const k=kalshiSource?source:target,p=kalshiSource?target:source;
    const confidence=score(k.title??"",p.title??"");
    if(confidence<0.52)continue;
    const key=String(k.event_ticker)+"|"+String(p.id);
    if(!matches.has(key))matches.set(key,{k,p,confidence});
   }
  }
 };
 search(kalshi,pi,true);
 search(poly,ki,false);
 const eventMatches=[...matches.values()];
 eventMatches.sort((a,b)=>b.confidence-a.confidence);
 report.counts.eventMatches=eventMatches.length;
 report.counts.eventMatchThreshold={minimumSharedTokens:2,minimumSimilarity:0.52};
 report.counts.discoveryStrategy="bidirectional_inverted_index";
 report.counts.eventMatchCategories=Object.fromEntries(["politics","sports","crypto","economics","finance","other"].map(c=>[c,eventMatches.filter(({k,p})=>eventCategory(k.title+" "+p.title)===c).length]));
 report.counts.sourceEventCategories={kalshi:Object.fromEntries(["politics","sports","crypto","economics","finance","other"].map(c=>[c,kalshi.filter(e=>eventCategory(e.title)===c).length])),polymarket:Object.fromEntries(["politics","sports","crypto","economics","finance","other"].map(c=>[c,poly.filter(e=>eventCategory(e.title)===c).length]))};
 report.counts.discoveryCoverageWarning=["sports","crypto","economics","finance"].filter(c=>report.counts.eventMatchCategories[c]===0);
 const rejected=await loadRejections(),seen=new Set(),pool=[];
 const rejectReasons={};let cachedRejections=0;const rejectionCacheLoaded=Object.keys(rejected).length;
 const reject=(key,reason)=>{rejectReasons[reason]=(rejectReasons[reason]??0)+1;rejected[key]={reason,lastSeen:report.timestamp};};
 for(const {k,p,confidence} of eventMatches){
  for(const km of k.markets??[])for(const pm of p.markets??[]){
   if(!km.ticker||!pm.id||!km.title||!pm.question)continue;
   const kalshiOutcome=outcomeLabel(km,k.title);
   if(!hasNamedOutcome(kalshiOutcome,k.title))continue;
   if(/^who will win/i.test(km.title)&&!String(km.subtitle??"").trim())continue;
   if(!compatible(kalshiOutcome,pm.question))continue;
   if(semanticConflict(kalshiOutcome,pm.question))continue;
   if(!electionCompatible(kalshiOutcome,pm.question))continue;
   if(!scopeCompatible(kalshiOutcome,pm.question))continue;
   if(incompatibleEventIdentity(k.title,p.title,kalshiOutcome,pm.question))continue;
   const kp=personSelection(kalshiOutcome),pp=personSelection(pm.question);
   if(kp!==pp&&(kp!==null||pp!==null))continue;
   const scoreValue=score([k.title,kalshiOutcome].join(" "),[p.title,pm.question].join(" "));
   const contractOverlap=[...words(kalshiOutcome)].filter(w=>words(pm.question).has(w));
   if(contractOverlap.length<2||scoreValue<0.55)continue;
   const key=km.ticker+":"+pm.id;if(seen.has(key))continue;seen.add(key);
   const evidence=reviewEvidence(k,p,km,pm);
   const rulesHash=hash([evidence.kalshiRules,evidence.kalshiSecondaryRules,evidence.polymarketDescription].join("|"));
   if(["interim_appointment_treatment","different_meeting_deadline_year","different_senate_election_cycle","subregion_vs_statewide_result"].includes(rejected[key]?.reason)&&rejected[key]?.rulesHash===rulesHash){cachedRejections++;continue;}
   evidence.ruleConflicts=settlementConflicts(evidence);
   const hardConflict=evidence.ruleConflicts.find(c=>["interim_appointment_treatment","different_meeting_deadline_year","different_senate_election_cycle","subregion_vs_statewide_result"].includes(c));
   if(hardConflict){reject(key,hardConflict);rejected[key].rulesHash=rulesHash;continue;}
   // Different listed dates require review; they do not alone prove different payouts.
   const outcomes=parse(pm.outcomes),tokens=parse(pm.clobTokenIds);
   if(outcomes.length!==2||tokens.length!==2||!outcomes.includes("Yes")||!outcomes.includes("No"))continue;
   const category=eventCategory(k.title+" "+p.title);
   if(evidence.ruleConflicts.length)evidence.reviewPriority="RULE_DIFFERENCES_REQUIRE_REVIEW";
   const settlementFingerprint={outcome:normalized(kalshiOutcome),kalshiRuleHash:hash([evidence.kalshiRules,evidence.kalshiSecondaryRules].join("|")),polymarketRuleHash:hash(evidence.polymarketDescription),kalshiClose:evidence.kalshiClose,polymarketEnd:evidence.polymarketEnd,conflicts:evidence.ruleConflicts};
   pool.push({
    category,eventScore:Number(confidence.toFixed(3)),contractScore:Number(scoreValue.toFixed(3)),
    kalshi:{eventTicker:k.event_ticker,title:km.title,subtitle:km.subtitle??null,outcomeLabel:kalshiOutcome,ticker:km.ticker,eventTitle:k.title,closeDate:day(km.close_time)},
    polymarket:{eventId:p.id,id:String(pm.id),eventTitle:p.title,title:pm.question,endDate:day(pm.endDate)},
    settlementFingerprint,reviewEvidence:evidence,reviewStatus:"UNVERIFIED_SETTLEMENT_RULES",approved:false,executable:false
   });
  }
 }
 // Round-robin across categories and distinct events before selecting additional
 // contracts from an already represented event.
 pool.sort((a,b)=>b.contractScore-a.contractScore);
 const buckets=new Map();
 for(const item of pool){if(!buckets.has(item.category))buckets.set(item.category,[]);buckets.get(item.category).push(item)}
 const eventUsed=new Set(),selected=new Set(),categories=[...buckets.keys()];
 for(let pass=0;pass<2&&report.candidates.length<MAX_PAIRS;pass++){
  let progress=true;
  while(progress&&report.candidates.length<MAX_PAIRS){
   progress=false;
   for(const cat of categories){
    const bucket=buckets.get(cat);
    const idx=bucket.findIndex(item=>!selected.has(item)&&(!pass&&!eventUsed.has(String(item.kalshi.eventTicker)+"|"+String(item.polymarket.eventId))||pass));
    if(idx<0)continue;
    const item=bucket[idx],key=item.kalshi.ticker+"|"+item.polymarket.id;
    selected.add(item);eventUsed.add(String(item.kalshi.eventTicker)+"|"+String(item.polymarket.eventId));
    report.candidates.push(item);progress=true;
    if(report.candidates.length>=MAX_PAIRS)break;
   }
  }
 }
 report.counts.eligibleCandidatePool=pool.length;
 report.counts.eligibleDistinctKalshiMarkets=new Set(pool.map(x=>x.kalshi.ticker)).size;
 report.counts.eligibleDistinctPolymarketMarkets=new Set(pool.map(x=>x.polymarket.id)).size;
 report.counts.eligiblePoolCategories=Object.fromEntries(["politics","sports","crypto","economics","finance","other"].map(c=>[c,pool.filter(x=>x.category===c).length]));
 report.counts.rejectedByReason=rejectReasons;
 report.counts.rejectionCacheEntries=Object.keys(rejected).length;
 report.counts.rejectionCacheLoaded=rejectionCacheLoaded;
 report.counts.cachedRejections=cachedRejections;
 await writeFile(process.env.ARB_REJECTION_OUTPUT??"arbitrage-rejected-pairs.json",JSON.stringify({timestamp:report.timestamp,rejections:rejected},null,2)+"\n");
 report.counts.dateMismatchCandidates=pool.filter(x=>x.reviewEvidence.differentEndDates).length;
 report.counts.ruleWarningCandidates=pool.filter(x=>x.reviewEvidence.ruleConflicts.length>0).length;
 report.counts.noRuleWarningCandidates=pool.filter(x=>x.reviewEvidence.ruleConflicts.length===0).length;
 report.counts.uniqueEligibleEventPairs=new Set(pool.map(x=>String(x.kalshi.eventTicker)+"|"+String(x.polymarket.eventId))).size;
 report.counts.candidateCategories=Object.fromEntries(categories.map(c=>[c,report.candidates.filter(x=>x.category===c).length]));
 report.counts.uniqueMatchedEventPairs=eventUsed.size;
 report.counts.candidates=report.candidates.length;
 report.status=report.errors.length?"PARTIAL":"COLLECTED";
 await writeFile(process.env.ARB_EVENT_OUTPUT??"arbitrage-events.json",JSON.stringify(report,null,2)+"\n");
 console.log(JSON.stringify({status:report.status,counts:report.counts,errors:report.errors,candidates:report.candidates.slice(0,5)},null,2));
}
collect().catch(e=>{console.error(e);process.exitCode=1});
