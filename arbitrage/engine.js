// Pure, read-only arbitrage calculations. No trading credentials or order placement.
function assertPrice(value, label) {
  if (!Number.isFinite(value) || value < 0 || value > 1) throw new RangeError(label + ' must be between 0 and 1');
}
function quotePair({ yesAsk, noAsk, quantity, feeUsd = 0, yesDepth = Infinity, noDepth = Infinity, sameSettlement = false }) {
  assertPrice(yesAsk, 'yesAsk');
  assertPrice(noAsk, 'noAsk');
  if (!Number.isSafeInteger(quantity) || quantity <= 0) throw new RangeError('quantity must be a positive integer');
  if (!Number.isFinite(feeUsd) || feeUsd < 0) throw new RangeError('feeUsd must be nonnegative');
  if (!(yesDepth >= quantity && noDepth >= quantity)) return { eligible: false, reason: 'INSUFFICIENT_DEPTH' };
  if (!sameSettlement) return { eligible: false, reason: 'SETTLEMENT_NOT_VERIFIED' };
  const costUsd = quantity * (yesAsk + noAsk) + feeUsd;
  const payoutUsd = quantity;
  const netProfitUsd = payoutUsd - costUsd;
  return {
    eligible: netProfitUsd > 0,
    reason: netProfitUsd > 0 ? 'POSITIVE_NET_SPREAD' : 'NO_NET_EDGE',
    quantity, costUsd, payoutUsd, netProfitUsd,
    returnOnCapital: costUsd > 0 ? netProfitUsd / costUsd : null
  };
}
module.exports = { quotePair };
