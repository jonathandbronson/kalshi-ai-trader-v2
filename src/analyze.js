import { config } from "./config.js";
import { scoreTrade, classifyEdge } from "./value.js";

export function analyzeMarket(input) {
  const required = ["ticker","title","independentProbability","yesAsk","noAsk"];
  for (const key of required) if (input[key] === undefined) throw new Error(`Missing ${key}`);

  const best = scoreTrade(input);
  const classification = classifyEdge(best?.netEdge, config.minEdge, config.strongEdge);
  const evidence = Array.isArray(input.evidence) ? input.evidence : [];
  const warnings = [];
  if (!input.resolutionCriteria) warnings.push("Resolution criteria not reviewed");
  if (evidence.length < 2) warnings.push("Independent evidence is thin");
  if (input.independentProbabilitySource === "kalshi") warnings.push("Invalid: Kalshi price contaminated independent estimate");

  return {
    ticker: input.ticker, title: input.title,
    independentProbability: input.independentProbability,
    bestTrade: best, classification, qualifies: classification !== "PASS" && warnings.length === 0,
    evidenceCount: evidence.length, warnings,
    rationale: input.rationale ?? "",
    resolutionCriteria: input.resolutionCriteria ?? ""
  };
}
