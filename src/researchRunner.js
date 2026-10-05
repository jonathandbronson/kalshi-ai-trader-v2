import {makeResearchPlan} from "./researchPlan.js";
import {fetchGdeltArticles} from "./providers.js";
import {normalizeEvidence,evidenceDiagnostics} from "./evidence.js";
import {readArticle} from "./articles.js";
import {assertIndependent} from "./contamination.js";
import {fallbackDiscovery} from "./fallbackResearch.js";
import {transact} from "./store.js";
export async function gatherEvidence(market,{evidence=[],deps={}}={}){
 assertIndependent({title:market.title,rules:market.rulesPrimary});const plan=makeResearchPlan(market),query=plan.keywords.join(" ");let leads=[],providerErrors=[],fallback=null;
 if(!evidence.length)try{const support=await (deps.fetchGdeltArticles??fetchGdeltArticles)(query,8);
 const against=await (deps.fetchGdeltArticles??fetchGdeltArticles)(query+' (uncertainty OR downside OR reversal OR contrary OR risk)',8);
 leads=[...new Map([...support,...against].map(l=>[l.url,l])).values()];}catch{providerErrors.push("GDELT unavailable");fallback=await (deps.fallbackDiscovery??fallbackDiscovery)(plan);leads=fallback.leads;providerErrors.push(...fallback.errors);}
 // Headlines are discovery leads; no claim that a full report was read.
 const reports=[...evidence];
 const retrievals=[];
 for(const lead of leads.slice(0,10)){try{reports.push(await (deps.readArticle??readArticle)(lead));retrievals.push({url:lead.url,status:"SUBSTANTIVE_BODY"});}catch(e){providerErrors.push("Article unavailable, unsupported or contaminated");retrievals.push({url:lead.url,status:"REJECTED",reason:e.message});}}
 const maxAgeDays={weather:1,sports:2,politics:14,economics:30,crypto:2,technology:30,business:30,legal:30,science:180,general:30}[plan.category];
 const vetted=normalizeEvidence(reports).filter(e=>(Date.now()-Date.parse(e.publishedAt))/86400000<=maxAgeDays&&e.claim.length>=80&&plan.keywords.some(k=>e.claim.toLowerCase().includes(k.toLowerCase())));
 const counterReports=vetted.filter(e=>/\b(?:uncertainty|downside|reversal|contrary|risk)\b/i.test(e.claim));
 const counterSearchComplete=!fallback||(fallback.successfulFeeds>=2&&counterReports.length>0);
 if(!counterSearchComplete)providerErrors.push("Required counterevidence search incomplete");
 const searchAudit={provider:fallback?"APPROVED_PUBLIC_FEED_FALLBACK":"GDELT",scope:fallback?"bounded dated public feed candidates and full report bodies":"support and counterevidence queries",
  supportQuery:query,counterQuery:query+" uncertainty/downside/reversal/contrary/risk",counterSearchComplete,counterReports:counterReports.length,retrievals};
 await transact(s=>s.audit.push({type:"EVIDENCE_SEARCH",ticker:market.ticker,at:new Date().toISOString(),details:searchAudit}));
 return {plan,evidence:vetted,leads,providerErrors,diagnostics:{...evidenceDiagnostics(vetted),sufficient:evidenceDiagnostics(vetted).sufficient&&counterSearchComplete},searchAudit,searches:[query,query+" uncertainty/downside/reversal/contrary/risk"],query,gatheredAt:new Date().toISOString()};
}
