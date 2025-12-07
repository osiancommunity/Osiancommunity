Safe Deployment Checklist (Leaderboard, Badges, Dashboard)

1) Preflight
- Verify `MONGODB_URI`, `JWT_SECRET`, and other env vars are set in the hosting platform.
- Confirm MongoDB indexes exist after new models load (Mongoose will create on first run).
- Ensure `ws` package is installed and available.

2) Feature Flags
- Introduce env flags for real-time leaderboard: `LEADERBOARD_WS_ENABLED=true` (optional, default enabled locally).
- Keep badges read-only visible by default; award logic runs post-submission.

3) Database Backfill
- Run `node scripts/migrateLeaderboardBadges.js` once after deploy to build global leaderboards and award initial badges.
- Monitor logs for errors and re-run if needed.

4) Rolling Out
- Deploy backend first; ensure `/api/health` and `/api/debug/env` succeed.
- Validate `/api/leaderboard` (global/all) returns entries or empty array.
- Validate `/api/badges/me` returns list for a known user.
- Confirm WebSocket endpoint `ws://<host>/ws/leaderboard` connects and pushes updates every 15s.

5) Frontend Update
- Ship updated `dashboard-user.html`, `script-dashboard.js`, and `style-dashboard.css`.
- Verify KPIs, Registered Quizzes, Quiz History populate for logged-in users.
- Confirm Leaderboard renders and updates via WebSocket; filters change REST + WS source.
- Confirm Badges row displays earned badges with tooltips.

6) Post-Deploy Monitoring
- Track error logs for leaderboard rebuild and badge awarding on quiz submission.
- Validate performance: rebuild operations are O(users) per period; consider cron-based rebuild if traffic grows.

7) Rollback Plan
- If issues arise, disable WS via feature flag and rely on REST endpoint.
- Temporarily disable awarding by gating the post-submit hook with an env flag.

