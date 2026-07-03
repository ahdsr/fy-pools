# MVP Launch Backlog

Goal: launch a working commissioner-to-participant Round of 16 pool flow where
an organizer can create a pool, invite players, collect valid picks before a
deadline, score entries, and share a leaderboard.

## P0 Launch Blockers

- [x] Production Supabase setup: environment variables are configured,
  migrations apply cleanly, RLS policies are reviewed, and seed/admin setup is
  documented for a fresh production project.
- [x] Auth readiness: sign-up, sign-in, sign-out, protected redirects, profile
  creation, and common auth error states work for commissioners and invited
  participants.
- [x] Commissioner flow: a signed-in commissioner can create a Round of 16 pool,
  configure the bracket teams, set one global pick deadline, add participants,
  and publish the pool.
- [x] Invite flow: publishing generates participant links, shows copyable links
  to the commissioner, and handles pending, accepted, revoked, expired, and
  missing invite states.
- [x] Participant flow: invited players can accept a link, submit picks, update
  picks until the deadline, and are blocked from submitting after the deadline.
- [x] Scoring MVP: Round of 16 winners and enabled bonus props are scored,
  line-item score breakdowns are stored, and leaderboard totals are visible.
- [x] Commissioner dashboard: commissioners can see their pools, invite status,
  entry submission status, submitted entries, and basic notifications.
- [x] Public pool pages: each published pool has a usable overview, leaderboard,
  entry detail page, and bracket display for players to inspect after launch.
- [x] Launch QA: mobile and desktop layouts, empty states, error states,
  production build, and a full create-invite-submit-score-leaderboard smoke test
  are verified.

## P1 Launch Polish

- [ ] Improve bracket setup and pick UI responsiveness, spacing, and copy across
  mobile and desktop.
- [ ] Add better participant reminder/status messaging for missing picks,
  accepted invites, updated picks, and passed deadlines.
- [ ] Add basic audit or operating notes for commissioner actions such as pool
  publish, invite changes, lock changes, and scoring refreshes.
- [ ] Improve deployment documentation and keep `.env.example` aligned with the
  production environment contract.
- [ ] Add minimal privacy, terms, and contact links if the product is launched
  publicly beyond a private test group.

## P2 Post-MVP

- [ ] Pool format feedback: interview organizers and participants, compare
  bracket-style picks, group-stage rankings, match-by-match predictions,
  survivor-style formats, multiple-entry needs, and scoring preferences.
- [ ] Full World Cup predictor template with group ranks, advancers, knockout
  paths, podium picks, and bonus questions.
- [ ] NBA playoff series template with series winners and series score picks.
- [ ] Spreadsheet import for commissioners who already run pools in Excel.
- [ ] Live results automation through a scheduled sports data sync.
- [ ] Game Day Room / On the Pitch: social match rooms with sides, avatars,
  cheers, room energy, and post-match awards.
- [ ] Multiple entries per participant for households, side bets, or paid tiers.
- [ ] Payments and subscriptions.

## Cut From MVP

- Multi-sport generalized template builder.
- Real-time chat and presence.
- Advanced projections and heatmaps as required launch features.
- Automated email sending unless launch distribution requires it.
