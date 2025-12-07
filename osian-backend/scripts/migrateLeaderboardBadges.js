require('dotenv').config();
const mongoose = require('mongoose');
const { rebuildScopeLeaderboard } = require('../controllers/leaderboardController');
const { awardBadgesForUser, ensureDefaultBadges } = require('../controllers/badgeController');
const User = require('../models/User');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/osian';
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 30000 });
  console.log('Connected for migration');

  await ensureDefaultBadges();

  // Rebuild global and quiz leaderboards
  console.log('Rebuilding leaderboards...');
  await rebuildScopeLeaderboard({ scope: 'global', period: 'all' });
  await rebuildScopeLeaderboard({ scope: 'global', period: '30d' });
  await rebuildScopeLeaderboard({ scope: 'global', period: '7d' });

  // Award badges for all users
  console.log('Awarding badges to users...');
  const users = await User.find({});
  for (const u of users) {
    await awardBadgesForUser(u._id);
  }

  console.log('Migration complete');
  await mongoose.disconnect();
}

main().catch(err => { console.error('Migration failed', err); process.exit(1); });

