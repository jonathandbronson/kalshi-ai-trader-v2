import {makeResearchPlan} from "./researchPlan.js";
import {fetchGdeltArticles} from "./providers.js";
import {normalizeEvidence,evidenceDiagnostics} from "./evidence.js";
import {readArticle} from "./articles.js";
import {assertIndependent} from "./contamination.js";
export async function gatherEvidence(market,{evidence=[]}={}){
 assertIndependent({title:market.title,rules:market.rulesPrimary});const plan=makeResearchPlan(market),query=plan.keywords.join(" ");let leads=[],providerErrors=[];
 if(!evidence.length)try{const support=await fetchGdeltArticles(query,8);
 const against=await fetchGdeltArticles(query+' (uncertainty OR downside OR reversal OR contrary OR risk)',8);
 leads=[...new Map([...support,...against].map(l=>[l.url,l])).values()];}catch{providerErrors.push("GDELT unavailable; required counterevidence search incomplete");}
 // Headlines are discovery leads; no claim that a full report was read.
 const reports=[...evidence];
 for(const lead of leads.slice(0,10)){try{reports.push(await readArticle(lead));}catch{providerErrors.push("Article unavailable, unsupported or contaminated");}}
 const maxAgeDays={weather:1,sports:2,politics:14,economics:30,crypto:2,technology:30,business:30,legal:30,science:180,general:30}[plan.category];
 const vetted=normalizeEvidence(reports).filter(e=>(Date.now()-Date.parse(e.publishedAt))/86400000<=maxAgeDays&&e.claim.length>=80&&plan.keywords.some(k=>e.claim.toLowerCase().includes(k.toLowerCase())));
 return {plan,evidence:vetted,leads,providerErrors,diagnostics:{...evidenceDiagnostics(vetted),sufficient:evidenceDiagnostics(vetted).sufficient&&!providerErrors.some(e=>e.includes("required counterevidence"))},searches:[query,query+" uncertainty/downside/reversal/contrary/risk"],query,gatheredAt:new Date().toISOString()};
}
