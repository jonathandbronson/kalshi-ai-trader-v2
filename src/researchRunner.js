import {makeResearchPlan} from "./researchPlan.js";import {fetchOfficialSignals,fetchGdeltArticles} from "./providers.js";import {normalizeEvidence,evidenceDiagnostics} from "./evidence.js";
export async function gatherEvidence(market){
 const plan=makeResearchPlan(market), query=plan.keywords.join(" ");
 const [official,news]=await Promise.all([fetchOfficialSignals(plan),fetchGdeltArticles(query,12).catch(()=>[])]);
 const evidence=normalizeEvidence([...official,...news]);
 return {plan,evidence,diagnostics:evidenceDiagnostics(evidence),query,gatheredAt:new Date().toISOString()};
}
