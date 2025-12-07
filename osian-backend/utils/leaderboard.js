function computeComposite(avgScorePct, accuracyPct, attempts) {
  const scoreComp = (Number(avgScorePct) || 0) * 0.60;
  const accComp = (Number(accuracyPct) || 0) * 0.30;
  const attComp = Math.log(1 + (Number(attempts) || 0)) * 10; // scale ~10
  return Number((scoreComp + accComp + attComp).toFixed(4));
}

function summarizeFromResults(results) {
  const attempts = results.length;
  let totalScorePct = 0;
  let totalAccuracyPct = 0;
  for (const r of results) {
    const totalQ = Number(r.totalQuestions) || 0;
    const correct = Number(r.score) || 0;
    const pct = totalQ > 0 ? (correct / totalQ) * 100 : 0;
    totalScorePct += pct;
    totalAccuracyPct += pct; // accuracy equals percentage in current model
  }
  const avgScorePct = attempts > 0 ? totalScorePct / attempts : 0;
  const accuracyPct = attempts > 0 ? totalAccuracyPct / attempts : 0;
  return { attempts, avgScorePct, accuracyPct, composite: computeComposite(avgScorePct, accuracyPct, attempts) };
}

module.exports = { computeComposite, summarizeFromResults };

