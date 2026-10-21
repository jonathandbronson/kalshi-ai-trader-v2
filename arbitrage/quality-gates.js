// Conservative pre-review matching. Never asserts settlement equivalence.
const norm=s=>String(s??"").toLowerCase().replace(/,/g,"").replace(/\s+/g," ").trim();
const months={jan:"01",feb:"02",mar:"03",apr:"04",may:"05",jun:"06",jul:"07",aug:"08",sep:"09",oct:"10",nov:"11",dec:"12"};
const dateRx=/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+(\d{1,2})(?:\s+(20\d\d))?\b/g;
function dates(s){const out=[];for(const m of norm(s).matchAll(dateRx))out.push((m[3]??"????")+"-"+months[m[1]]+"-"+m[2].padStart(2,"0"));for(const m of norm(s).matchAll(/\b(20\d\d)-(\d\d)-(\d\d)\b/g))out.push(m[1]+"-"+m[2]+"-"+m[3]);return [...new Set(out)].sort()}
function threshold(s){
 const m=norm(s).match(/\b(?:above|below|over|under|at least|at most|more than|less than|reach|reaches|exceed|exceeds|hit|hits|have|with)\s+(?:a\s+)?(?:total\s+of\s+)?(?:\$\s*)?(\d+(?:\.\d+)?)\s*(k|m|b|%|bps|\+)?\b/);
 if(!m)return null;
 return {value:Number(m[1])*({k:1e3,m:1e6,b:1e9}[m[2]]??1),unit:m[2]==="%"?"percent":m[2]==="bps"?"bps":"count"};
}
function direction(s){const t=norm(s);return /\b(?:above|over|greater than|more than|exceed|exceeds)\b/.test(t)?"above":/\b(?:below|under|less than)\b/.test(t)?"below":/\b(?:at least|reach|reaches|hit|hits|have|with)\b/.test(t)?"minimum":/\bat most\b/.test(t)?"maximum":null}
function period(s){const t=norm(s);if(/\b(?:career|all time|all-time|lifetime)\b/.test(t))return "career";if(/\b(?:regular season|season|season-long|20\d\d[-\/]20\d\d)\b/.test(t))return "season";if(/\b(?:single game|one game|per game|in a game)\b/.test(t))return "game";if(/\b(?:monthly|in a month)\b/.test(t))return "month";if(/\b(?:quarterly|in a quarter)\b/.test(t))return "quarter";return null}
function statistic(s){const t=norm(s);for(const [name,rx] of [["rushing_yards",/\brushing yards?\b/],["passing_yards",/\bpassing yards?\b/],["receiving_yards",/\breceiving yards?\b/],["touchdowns",/\btouchdowns?\b/],["goals",/\bgoals?\b/],["cpi",/\b(?:cpi|inflation)\b/],["price",/\b(?:price|trade|trading)\b/]])if(rx.test(t))return name;return null}
function deadline(s){const t=norm(s);const found=[...t.matchAll(/\b(?:before|by|until|through|no later than|on or before)\b[^.!?]{0,48}/g)].map(x=>x[0]);const d=found.flatMap(dates);const years=found.flatMap(x=>x.match(/\b20\d\d\b/g)??[]);return {dates:[...new Set(d)].sort(),years:[...new Set(years)].sort()}}
export function extractContractTerms(title,ruleText=""){
 const t=norm(title),r=norm(ruleText);
 const entities=[...new Set(((t+" "+r).match(/\b(?:bitcoin|btc|ethereum|eth|solana|gold|silver|oil|derrick henry|navdeep bains|indiana)\b/g)??[]).map(x=>({btc:"bitcoin",eth:"ethereum"}[x]??x)))];
 return {threshold:threshold(t),direction:direction(t),period:period(t),statistic:statistic(t),titleDates:dates(t),titleDeadline:deadline(t),ruleDeadline:deadline(r),entities,years:[...new Set(t.match(/\b20\d\d\b/g)??[])].sort(),
  ruleAvailable:r.length>20,sourceMentioned:/\b(?:source|according to|determined by|official|reported by)\b/.test(r)};
}
export function compareContractTerms(kTitle,pTitle,kRules="",pRules=""){
 const a=extractContractTerms(kTitle,kRules),b=extractContractTerms(pTitle,pRules),reasons=[];
 const conflict=(code,condition)=>{if(condition)reasons.push(code)};
 conflict("DIFFERENT_PERIOD",Boolean(a.period&&b.period&&a.period!==b.period));
 conflict("PERIOD_UNCONFIRMED",Boolean((a.period&&!b.period)||(!a.period&&b.period)));
 conflict("DIFFERENT_STATISTIC",Boolean(a.statistic&&b.statistic&&a.statistic!==b.statistic));
 conflict("STATISTIC_UNCONFIRMED",Boolean((a.statistic&&!b.statistic)||(!a.statistic&&b.statistic)));
 conflict("DIFFERENT_THRESHOLD",Boolean(a.threshold&&b.threshold&&(a.threshold.value!==b.threshold.value||a.threshold.unit!==b.threshold.unit)));
 conflict("THRESHOLD_UNCONFIRMED",Boolean(Boolean(a.threshold)!==Boolean(b.threshold)));
 conflict("DIFFERENT_DIRECTION",Boolean(a.direction&&b.direction&&a.direction!==b.direction));
 conflict("DIRECTION_UNCONFIRMED",Boolean(Boolean(a.direction)!==Boolean(b.direction)));
 conflict("DIFFERENT_EXPLICIT_DATE",Boolean(a.titleDates.length&&b.titleDates.length&&a.titleDates.join("|")!==b.titleDates.join("|")));
 conflict("EXPLICIT_DATE_UNCONFIRMED",Boolean(Boolean(a.titleDates.length)!==Boolean(b.titleDates.length)));
 conflict("DIFFERENT_DEADLINE",Boolean(a.titleDeadline.dates.length&&b.titleDeadline.dates.length&&a.titleDeadline.dates.join("|")!==b.titleDeadline.dates.join("|")||
 a.titleDeadline.years.length&&b.titleDeadline.years.length&&a.titleDeadline.years.join("|")!==b.titleDeadline.years.join("|")));
 conflict("DEADLINE_UNCONFIRMED",Boolean(Boolean(a.titleDeadline.dates.length||a.titleDeadline.years.length)!==Boolean(b.titleDeadline.dates.length||b.titleDeadline.years.length)));
 conflict("DIFFERENT_RULE_DEADLINE",Boolean(a.ruleDeadline.dates.length&&b.ruleDeadline.dates.length&&a.ruleDeadline.dates.join("|")!==b.ruleDeadline.dates.join("|")));
 conflict("DIFFERENT_ENTITY",Boolean(a.entities.length&&b.entities.length&&!a.entities.some(x=>b.entities.includes(x))));
 conflict("ENTITY_UNCONFIRMED",Boolean(Boolean(a.entities.length)!==Boolean(b.entities.length)));
 conflict("DIFFERENT_EXPLICIT_YEAR",Boolean(a.years.length&&b.years.length&&!a.years.some(x=>b.years.includes(x))));
 const hard=reasons.filter(x=>!x.endsWith("_UNCONFIRMED"));
 return {compatible:hard.length===0,hardConflicts:hard,uncertainties:reasons.filter(x=>x.endsWith("_UNCONFIRMED")),kalshi:a,polymarket:b,verified:false};
}
export function qualityScore(candidate){
 const e=candidate.reviewEvidence??{},rules=candidate.ruleEvidence??{};
 const comparison=candidate.qualityComparison??compareContractTerms(candidate.kalshi?.outcomeLabel??candidate.kalshi?.title,candidate.polymarket?.title,e.kalshiRules,e.polymarketDescription);
 const completeness=(Number(Boolean(rules.kalshi?.rulesPrimary??e.kalshiRules))+Number(Boolean(rules.polymarket?.description??e.polymarketDescription)))/2;
 const title=Math.max(0,Math.min(1,Number(candidate.contractScore??0)));
 const identifiers=Number(Boolean(candidate.kalshi?.ticker&&candidate.polymarket?.id));
 const liquidity=Number.isFinite(candidate.liquidity?.minDepthUsd)?Math.min(1,candidate.liquidity.minDepthUsd/500):0;
 const exact=Math.max(0,1-comparison.hardConflicts.length*.5-comparison.uncertainties.length*.12);
 const rulesQuality=Math.max(0,completeness-(e.ruleConflicts?.length??0)*.15);
 const score=.35*exact+.30*rulesQuality+.15*identifiers+.15*liquidity+.05*title;
 return {score:Number(score.toFixed(4)),components:{exact,ruleCompleteness:rulesQuality,identifiers,liquidity,title},hardConflicts:comparison.hardConflicts,uncertainties:comparison.uncertainties,eligibleForReview:comparison.hardConflicts.length===0,settlementVerified:false};
}
