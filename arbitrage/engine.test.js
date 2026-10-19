const test = require('node:test');
const assert = require('node:assert/strict');
const { quotePair } = require('./engine');
test('profitable matched pair after fees', () => {
  const r = quotePair({ yesAsk: .4, noAsk: .4, quantity: 100, feeUsd: 2, yesDepth: 100, noDepth: 100, sameSettlement: true });
  assert.equal(r.eligible, true);
  assert.ok(Math.abs(r.netProfitUsd - 18) < 1e-9);
});
test('rejects unverified settlement', () => {
  assert.equal(quotePair({ yesAsk: .3, noAsk: .3, quantity: 10 }).reason, 'SETTLEMENT_NOT_VERIFIED');
});
test('rejects insufficient depth', () => {
  assert.equal(quotePair({ yesAsk: .4, noAsk: .4, quantity: 10, yesDepth: 9, noDepth: 10, sameSettlement: true }).reason, 'INSUFFICIENT_DEPTH');
});
test('rejects fees that erase edge', () => {
  assert.equal(quotePair({ yesAsk: .48, noAsk: .48, quantity: 10, feeUsd: 1, sameSettlement: true }).eligible, false);
});
test('rejects invalid quotes', () => {
  assert.throws(() => quotePair({ yesAsk: -1, noAsk: .4, quantity: 10 }), RangeError);
});
