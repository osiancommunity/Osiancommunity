const { rebuildScopeLeaderboard } = require('../controllers/leaderboardController');

(async function(){
  const scopes = ['global'];
  const periods = ['all','30d','7d'];
  for (const s of scopes) {
    for (const p of periods) {
      await rebuildScopeLeaderboard({ scope: s, period: p });
    }
  }
  process.exit(0);
})();
