const assert = require('assert');
const { computeComposite, summarizeFromResults } = require('../utils/leaderboard');

function testComputeComposite() {
  const a = computeComposite(80, 70, 10);
  const b = computeComposite(50, 50, 1);
  assert(a > b, 'Higher inputs should yield higher composite');
  const c = computeComposite(0, 0, 0);
  assert.strictEqual(Math.round(c), 0, 'Zero inputs should be near zero');
}

function testSummarize() {
  const res = summarizeFromResults([
    { score: 8, totalQuestions: 10 },
    { score: 6, totalQuestions: 10 }
  ]);
  assert.strictEqual(res.attempts, 2, 'Attempts aggregated');
  assert.strictEqual(Math.round(res.avgScorePct), 70, 'Average percentage should be 70');
  assert.strictEqual(Math.round(res.accuracyPct), 70, 'Accuracy equals percentage in current model');
}

function run() {
  testComputeComposite();
  testSummarize();
  console.log('Leaderboard utils tests passed');
}

run();

