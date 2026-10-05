export function clampProbability(p) {
  if (!Number.isFinite(p)) throw new TypeError("probability must be finite");
  return Math.max(0.001, Math.min(0.999, p));
}

export function scoreTrade({ independentProbability, yesAsk, noAsk, feeRate = 0 }) {
  const p = clampProbability(independentProbability);
  const yesCost = yesAsk == null ? null : clampProbability(yesAsk);
  const noCost = noAsk == null ? null : clampProbability(noAsk);
  const candidates = [];
  if (yesCost !== null) candidates.push(makeCandidate("YES", p, yesCost, feeRate));
  if (noCost !== null) candidates.push(makeCandidate("NO", 1 - p, noCost, feeRate));
  return candidates.sort((a,b) => b.netEdge - a.netEdge)[0] ?? null;
}

function makeCandidate(side, winProbability, cost, feeRate) {
  const grossEdge = winProbability - cost;
  const expectedProfitPerDollarPayout = winProbability * (1 - cost) - (1 - winProbability) * cost;
  const estimatedFees = Math.max(0, feeRate) * cost;
  return {
    side, winProbability, cost, grossEdge,
    netEdge: grossEdge - estimatedFees,
    expectedProfitPerDollarPayout: expectedProfitPerDollarPayout - estimatedFees
  };
}

export function classifyEdge(edge, minEdge = 0.08, strongEdge = 0.12) {
  if (edge < minEdge) return "PASS";
  if (edge < strongEdge) return "VALUE";
  return "STRONG_VALUE";
}
