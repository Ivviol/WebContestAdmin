import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB } from './db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
import { getNow, setMockNow, clearMockNow, getMockNow } from './mockTime.js';
import {
  User, Contest, Ticket, WeeklyCard, WeeklyPick,
  League, Proxy, ProxyAuditLog, AuditLog, Settings,
  nextUserId, nextTicketId, nextReceiptNum, nextGameId,
  nextProxyId, nextAuditId, nextAuditLogId, nextLeagueId, nextContestSeq,
  audit,
} from './models.js';

await connectDB();

const app = express();
app.use(cors());
app.use(express.json());

// ── Helpers ───────────────────────────────────────────────────────────────────
async function contestStats(contest) {
  const all    = await Ticket.find({ contestId: contest.id });
  const active = all.filter((t) => t.status !== 'Voided');
  return { totalTickets: active.length, revenue: active.length * contest.entryFee };
}

function doc(d) { return d ? d.toJSON() : null; }

// ── Contest type defaults ─────────────────────────────────────────────────────
app.get('/api/contest-types', async (_req, res) => {
  const s = await Settings.findById('contest-type-defaults');
  res.json({ sc: s.sc, wta: s.wta, surv: s.surv });
});

app.put('/api/contest-types/:type', async (req, res) => {
  const { type } = req.params;
  if (!['sc', 'wta', 'surv'].includes(type)) return res.status(404).json({ error: 'Unknown contest type' });
  const s = await Settings.findById('contest-type-defaults');
  const current = s[type] || {};
  const allowed = ['entryFee', 'ticketLimit', 'picksPerWeek', 'totalWeeks', 'proxyAllowed', 'geoRestricted'];
  const updated = { ...current };
  allowed.forEach((k) => { if (k in req.body) updated[k] = req.body[k]; });
  s[type] = updated;
  s.markModified(type);
  await s.save();
  await audit('settings_changed', type, `Contest type defaults updated: ${type}`);
  res.json(updated);
});

// ── Leagues ───────────────────────────────────────────────────────────────────
app.get('/api/leagues', async (_req, res) => {
  const list = await League.find();
  res.json(list.map((l) => ({ id: l.id, name: l.name, teamCount: l.teams.length })));
});

app.post('/api/leagues', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const league = await new League({ _id: await nextLeagueId(), name: name.trim(), teams: [] }).save();
  await audit('settings_changed', league.id, `League created: ${league.name}`);
  res.status(201).json({ id: league.id, name: league.name, teamCount: 0 });
});

app.put('/api/leagues/:id', async (req, res) => {
  const league = await League.findById(req.params.id);
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (req.body.name) league.name = req.body.name.trim();
  await league.save();
  await audit('settings_changed', league.id, `League renamed: ${league.name}`);
  res.json({ id: league.id, name: league.name, teamCount: league.teams.length });
});

app.delete('/api/leagues/:id', async (req, res) => {
  const league = await League.findById(req.params.id);
  if (!league) return res.status(404).json({ error: 'League not found' });
  const inUse = await WeeklyCard.exists({ leagueId: req.params.id });
  if (inUse) return res.status(409).json({ error: 'League is used by one or more weekly cards and cannot be deleted' });
  await league.deleteOne();
  await audit('settings_changed', req.params.id, `League deleted: ${league.name}`);
  res.json({ ok: true });
});

app.get('/api/leagues/:id/teams', async (req, res) => {
  const league = await League.findById(req.params.id);
  if (!league) return res.status(404).json({ error: 'League not found' });
  res.json([...league.teams].sort((a, b) => a.name.localeCompare(b.name)));
});

app.put('/api/leagues/:id/teams', async (req, res) => {
  const league = await League.findById(req.params.id);
  if (!league) return res.status(404).json({ error: 'League not found' });
  if (!Array.isArray(req.body.teams)) return res.status(400).json({ error: 'teams must be an array' });
  league.teams = req.body.teams
    .filter((t) => t?.name?.trim())
    .map((t) => ({ name: t.name.trim(), abbr: (t.abbr || '').trim().toUpperCase() }));
  await league.save();
  await audit('settings_changed', league.id, `${league.name} team list updated (${league.teams.length} teams)`);
  res.json([...league.teams].sort((a, b) => a.name.localeCompare(b.name)));
});

// ── Contests ──────────────────────────────────────────────────────────────────
app.get('/api/contests', async (req, res) => {
  const filter = req.query.cashier === 'true'
    ? { status: { $in: ['Registration Open', 'Active'] } }
    : {};
  const list = await Contest.find(filter);
  const result = await Promise.all(list.map(async (c) => ({ ...doc(c), ...(await contestStats(c)) })));
  res.json(result);
});

app.get('/api/contests/:id', async (req, res) => {
  const c = await Contest.findById(req.params.id);
  if (!c) return res.status(404).json({ error: 'Contest not found' });
  res.json({ ...doc(c), ...(await contestStats(c)) });
});

app.post('/api/contests', async (req, res) => {
  const {
    type, name, season, entryFee, ticketLimit, picksPerWeek, totalWeeks,
    prizeStructure, proxyAllowed, geoRestricted,
    registrationOpen, registrationClose, contestStart, contestEnd, notes,
  } = req.body;
  if (!type || !['sc', 'wta', 'surv'].includes(type))
    return res.status(400).json({ error: 'Invalid contest type. Must be wta, surv, or sc.' });
  if (!name || !season)
    return res.status(400).json({ error: 'name and season are required.' });

  const s = await Settings.findById('contest-type-defaults');
  const defaults = s[type] || {};
  const seq = await nextContestSeq();
  const id  = `${type}-${season}-${seq}`;

  const contest = await new Contest({
    _id: id, type, name, season,
    entryFee:          entryFee          ?? defaults.entryFee,
    ticketLimit:       ticketLimit       ?? defaults.ticketLimit,
    picksPerWeek:      picksPerWeek      ?? defaults.picksPerWeek,
    totalWeeks:        totalWeeks        ?? defaults.totalWeeks,
    prizeStructure:    prizeStructure    ?? defaults.prizeStructure,
    proxyAllowed:      proxyAllowed      ?? defaults.proxyAllowed,
    geoRestricted:     geoRestricted     ?? defaults.geoRestricted,
    registrationOpen:  registrationOpen  || null,
    registrationClose: registrationClose || null,
    contestStart:      contestStart      || null,
    contestEnd:        contestEnd        || null,
    status: 'Draft', notes: notes || '',
  }).save();
  res.status(201).json(doc(contest));
});

app.put('/api/contests/:id', async (req, res) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) return res.status(404).json({ error: 'Contest not found' });
  const IMMUTABLE = ['id', 'type', 'createdAt'];
  for (const [k, v] of Object.entries(req.body)) {
    if (!IMMUTABLE.includes(k)) contest[k] = v;
  }
  await contest.save();
  res.json(doc(contest));
});

const VALID_TRANSITIONS = {
  Draft:               ['Registration Open', 'Archived'],
  'Registration Open': ['Active', 'Draft', 'Archived'],
  Active:              ['Closed'],
  Closed:              ['Archived'],
  Archived:            [],
};

app.patch('/api/contests/:id/status', async (req, res) => {
  const { status } = req.body;
  const contest = await Contest.findById(req.params.id);
  if (!contest) return res.status(404).json({ error: 'Contest not found' });
  const allowed = VALID_TRANSITIONS[contest.status] || [];
  if (!allowed.includes(status))
    return res.status(409).json({ error: `Cannot transition from "${contest.status}" to "${status}". Allowed: ${allowed.join(', ') || 'none'}.` });
  const prev = contest.status;
  contest.status = status;
  await contest.save();
  await audit('contest_status', contest.id, `${contest.name} status changed: ${prev} → ${status}`);
  res.json(doc(contest));
});

// ── Weekly Cards ──────────────────────────────────────────────────────────────
app.get('/api/weekly-cards', async (req, res) => {
  const season = req.query.season || '2025';
  const list = await WeeklyCard.find({ season }).sort({ weekNum: 1 });
  res.json(list.map((w) => {
    const o = doc(w);
    o.gameCount   = w.games.length;
    o.onCardCount = w.games.filter((g) => g.onCard).length;
    delete o.games;
    return o;
  }));
});

app.get('/api/weekly-cards/:id', async (req, res) => {
  const card = await WeeklyCard.findById(req.params.id);
  if (!card) return res.status(404).json({ error: 'Week not found' });
  const applicableContests = await Promise.all(
    (card.contestIds || []).map((id) => Contest.findById(id))
  );
  const league = card.leagueId ? await League.findById(card.leagueId) : null;
  res.json({
    ...doc(card),
    leagueName: league?.name ?? null,
    applicableContests: applicableContests.filter(Boolean).map((c) => ({ id: c.id, name: c.name, type: c.type })),
  });
});

app.post('/api/weekly-cards', async (req, res) => {
  const { season = '2025', weekNum, picksDeadline, contestIds = [], leagueId } = req.body;
  if (!weekNum) return res.status(400).json({ error: 'weekNum is required' });
  if (await WeeklyCard.exists({ season, weekNum: Number(weekNum) }))
    return res.status(409).json({ error: `Week ${weekNum} for season ${season} already exists` });
  const defaultLeague = await League.findOne();
  const card = await new WeeklyCard({
    _id: `wc-${season}-${weekNum}`,
    season, weekNum: Number(weekNum),
    contestIds,
    leagueId: leagueId || defaultLeague?.id || null,
    status: 'Draft',
    picksDeadline: picksDeadline || null,
    games: [],
  }).save();
  res.status(201).json(doc(card));
});

app.post('/api/weekly-cards/:id/games', async (req, res) => {
  const card = await WeeklyCard.findById(req.params.id);
  if (!card) return res.status(404).json({ error: 'Week not found' });
  if (card.status !== 'Draft') return res.status(409).json({ error: 'Can only add games to Draft cards' });
  const { awayTeam, homeTeam, homeSpread, gameDate, onCard = true } = req.body;
  if (!awayTeam || !homeTeam) return res.status(400).json({ error: 'awayTeam and homeTeam are required' });
  const game = {
    id: await nextGameId(),
    awayTeam, homeTeam,
    homeSpread: homeSpread != null ? Number(homeSpread) : 0,
    gameDate: gameDate || null,
    onCard: Boolean(onCard),
    status: 'Scheduled',
    awayScore: null, homeScore: null,
  };
  card.games.push(game);
  await card.save();
  res.status(201).json(game);
});

app.put('/api/weekly-cards/:id/games/:gameId', async (req, res) => {
  const card = await WeeklyCard.findById(req.params.id);
  if (!card) return res.status(404).json({ error: 'Week not found' });
  const game = card.games.find((g) => g.id === req.params.gameId);
  if (!game) return res.status(404).json({ error: 'Game not found' });

  // Guard dangerous edits on Published/Locked cards
  if (card.status === 'Published' || card.status === 'Locked') {
    const turningOffCard  = 'onCard' in req.body && !req.body.onCard && game.onCard;
    const changingSpread  = 'homeSpread' in req.body && Number(req.body.homeSpread) !== game.homeSpread;

    if (turningOffCard || changingSpread) {
      // Check for existing picks that reference this game
      const subs = await WeeklyPick.find({ weekCardId: card.id });
      const gamePicks = subs.flatMap((s) => s.picks).filter((p) => p.gameId === game.id);

      if (turningOffCard && gamePicks.length > 0) {
        return res.status(409).json({
          error: `Cannot remove game from card — ${gamePicks.length} pick${gamePicks.length !== 1 ? 's' : ''} already reference this game. Remove those picks first or lock the week without this game.`,
        });
      }

      if (changingSpread) {
        const gradedPicks = gamePicks.filter((p) => p.result);
        if (gradedPicks.length > 0) {
          return res.status(409).json({
            error: `Cannot change spread — ${gradedPicks.length} pick${gradedPicks.length !== 1 ? 's' : ''} for this game have already been graded. Re-grade the week after updating.`,
          });
        }
      }
    }
  }

  const IMMUTABLE = ['id'];
  for (const [k, v] of Object.entries(req.body)) {
    if (!IMMUTABLE.includes(k)) game[k] = v;
  }
  if (game.homeSpread != null) game.homeSpread = Number(game.homeSpread);
  await card.save();
  res.json(game);
});

app.delete('/api/weekly-cards/:id/games/:gameId', async (req, res) => {
  const card = await WeeklyCard.findById(req.params.id);
  if (!card) return res.status(404).json({ error: 'Week not found' });
  if (card.status !== 'Draft') return res.status(409).json({ error: 'Can only remove games from Draft cards' });
  const before = card.games.length;
  card.games = card.games.filter((g) => g.id !== req.params.gameId);
  if (card.games.length === before) return res.status(404).json({ error: 'Game not found' });
  await card.save();
  res.status(204).end();
});

app.patch('/api/weekly-cards/:id', async (req, res) => {
  const card = await WeeklyCard.findById(req.params.id);
  if (!card) return res.status(404).json({ error: 'Week not found' });
  if ('picksDeadline' in req.body) card.picksDeadline = req.body.picksDeadline;
  if ('contestIds'    in req.body) card.contestIds    = req.body.contestIds;
  await card.save();
  res.json(doc(card));
});

const CARD_TRANSITIONS = { Draft: ['Published'], Published: ['Locked', 'Draft'], Locked: [] };

app.patch('/api/weekly-cards/:id/status', async (req, res) => {
  const { status } = req.body;
  const card = await WeeklyCard.findById(req.params.id);
  if (!card) return res.status(404).json({ error: 'Week not found' });
  if (!(CARD_TRANSITIONS[card.status] || []).includes(status))
    return res.status(409).json({ error: `Cannot transition from "${card.status}" to "${status}"` });
  card.status = status;
  if (status === 'Published') card.publishedAt = getNow();
  if (status === 'Locked')    card.lockedAt    = getNow();
  await card.save();
  await audit('week_status', card.id, `Week ${card.weekNum} card ${status.toLowerCase()}`);
  res.json(doc(card));
});

// ── Grade summary ─────────────────────────────────────────────────────────────
app.get('/api/weekly-cards/:id/grade-summary', async (req, res) => {
  const card = await WeeklyCard.findById(req.params.id);
  if (!card) return res.status(404).json({ error: 'Week not found' });
  const subs     = await WeeklyPick.find({ weekCardId: card.id });
  const allPicks = subs.flatMap((s) => s.picks);
  const gameStats = card.games.filter((g) => g.onCard).map((game) => {
    const gamePicks = allPicks.filter((p) => p.gameId === game.id);
    const teamCounts = {};
    gamePicks.forEach((p) => { teamCounts[p.pickedTeam] = (teamCounts[p.pickedTeam] || 0) + 1; });
    return {
      gameId: game.id, awayTeam: game.awayTeam, homeTeam: game.homeTeam,
      homeSpread: game.homeSpread, gameStatus: game.status,
      awayScore: game.awayScore, homeScore: game.homeScore,
      totalPicks: gamePicks.length,
      gradedPicks: gamePicks.filter((p) => p.result !== null).length,
      teamCounts,
    };
  });
  const gradedPicks = allPicks.filter((p) => p.result !== null).length;
  res.json({ totalSubmissions: subs.length, totalPicks: allPicks.length, gradedPicks, ungradedPicks: allPicks.length - gradedPicks, gameStats });
});

// ── Grade picks ───────────────────────────────────────────────────────────────
app.post('/api/weekly-cards/:id/grade', async (req, res) => {
  const card = await WeeklyCard.findById(req.params.id);
  if (!card) return res.status(404).json({ error: 'Week not found' });
  const { scores = [] } = req.body;

  // Update game scores
  let gamesUpdated = 0;
  for (const { gameId, awayScore, homeScore } of scores) {
    const game = card.games.find((g) => g.id === gameId);
    if (!game || awayScore == null || homeScore == null) continue;
    game.awayScore = Number(awayScore);
    game.homeScore = Number(homeScore);
    game.status    = 'Final';
    gamesUpdated++;
  }
  await card.save();

  // Grade all picks for this week
  const subs = await WeeklyPick.find({ weekCardId: card.id });
  let wins = 0, losses = 0, pushes = 0, skipped = 0;

  for (const sub of subs) {
    const ticket  = await Ticket.findById(sub.ticketId);
    const contest = ticket ? await Contest.findById(ticket.contestId) : null;
    const isSurvivor = contest?.type === 'surv';
    let changed = false;

    for (const pick of sub.picks) {
      const game = card.games.find((g) => g.id === pick.gameId);
      if (!game || game.status !== 'Final' || game.awayScore == null) { skipped++; continue; }

      const margin     = game.homeScore - game.awayScore;
      const pickedHome = pick.pickedTeam === game.homeTeam;
      let result;

      if (isSurvivor) {
        if (margin === 0)        result = 'Push';
        else if (pickedHome)     result = margin > 0 ? 'Win' : 'Loss';
        else                     result = margin < 0 ? 'Win' : 'Loss';
      } else {
        const adj = margin + game.homeSpread;
        if (adj === 0)           result = 'Push';
        else if (pickedHome)     result = adj > 0 ? 'Win' : 'Loss';
        else                     result = adj < 0 ? 'Win' : 'Loss';
      }

      pick.result = result;
      changed = true;
      if (result === 'Win')  wins++;
      else if (result === 'Loss') losses++;
      else pushes++;
    }
    if (changed) await sub.save();

    // Survivor: eliminate ticket if any pick this week was a Loss
    if (isSurvivor && changed) {
      const hasLoss = sub.picks.some((p) => p.result === 'Loss');
      if (hasLoss && ticket && ticket.status === 'Active') {
        ticket.status = 'Eliminated (Survivor)';
        await ticket.save();
        const user = await User.findById(ticket.userId);
        await audit('survivor_eliminated', ticket.id,
          `Survivor eliminated: ${user?.name ?? ticket.userId} — Week ${card.weekNum}`);
      }
    }
  }

  // Survivor: eliminate active tickets that didn't submit picks this week
  const submittedTicketIds = new Set(subs.map((s) => s.ticketId));
  const survivorContests = await Contest.find({ type: 'surv' });
  const survivorContestIds = survivorContests.map((c) => c.id);
  if (survivorContestIds.some((cid) => card.contestIds.includes(cid))) {
    const activeTickets = await Ticket.find({ contestId: { $in: survivorContestIds }, status: 'Active' });
    for (const ticket of activeTickets) {
      if (!submittedTicketIds.has(ticket.id)) {
        ticket.status = 'Eliminated (Survivor)';
        await ticket.save();
        const user = await User.findById(ticket.userId);
        await audit('survivor_eliminated', ticket.id,
          `Survivor eliminated (no picks): ${user?.name ?? ticket.userId} — Week ${card.weekNum}`);
      }
    }
  }

  await audit('picks_graded', card.id, `Week ${card.weekNum} picks graded: ${gamesUpdated} games scored, ${wins}W / ${losses}L / ${pushes}P`);
  res.json({ gamesUpdated, wins, losses, pushes, skipped });
});

// ── Standings ─────────────────────────────────────────────────────────────────
app.get('/api/standings', async (req, res) => {
  const { contestId, season = '2025' } = req.query;
  if (!contestId) return res.status(400).json({ error: 'contestId is required' });
  const contest = await Contest.findById(contestId);
  if (!contest) return res.status(404).json({ error: 'Contest not found' });

  const gradedCards = await WeeklyCard.find({
    season, status: 'Locked', contestIds: contestId,
  }).sort({ weekNum: 1 });

  const contestTickets = await Ticket.find({ contestId, status: { $ne: 'Voided' } });

  const entries = await Promise.all(contestTickets.map(async (ticket) => {
    const user = await User.findById(ticket.userId);
    const subs = await WeeklyPick.find({ ticketId: ticket.id });
    const weekScores = {};
    let totalScore = 0, wins = 0, losses = 0, pushes = 0, missed = 0;

    gradedCards.forEach((card) => {
      const sub = subs.find((s) => s.weekCardId === card.id);
      if (!sub) { weekScores[card.weekNum] = null; missed++; return; }
      let ws = 0;
      sub.picks.forEach((p) => {
        if (p.result === 'Win')  { wins++;   ws += 1.0; }
        if (p.result === 'Push') { pushes++; ws += 0.5; }
        if (p.result === 'Loss') { losses++; }
      });
      weekScores[card.weekNum] = ws;
      totalScore += ws;
    });

    return { ticketId: ticket.id, userId: ticket.userId, userName: user?.name ?? 'Unknown',
             label: ticket.label, status: ticket.status, totalScore, wins, losses, pushes, missed, weekScores };
  }));

  entries.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.wins !== a.wins)             return b.wins - a.wins;
    return a.userName.localeCompare(b.userName);
  });

  let rank = 1;
  entries.forEach((e, i) => {
    e.rank = (i > 0 && e.totalScore === entries[i-1].totalScore && e.wins === entries[i-1].wins)
      ? entries[i-1].rank : rank;
    rank++;
  });

  res.json({
    contest: { id: contest.id, name: contest.name, type: contest.type, totalWeeks: contest.totalWeeks },
    gradedWeeks: gradedCards.map((w) => w.weekNum),
    totalWeeks: contest.totalWeeks,
    entries,
  });
});

// ── Payouts ───────────────────────────────────────────────────────────────────
app.get('/api/contests/:id/payouts', async (req, res) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) return res.status(404).json({ error: 'Contest not found' });

  const all   = await Ticket.find({ contestId: contest.id, status: { $ne: 'Voided' } });
  const paid  = all.filter((t) => t.paymentMethod != null);
  const prizePool = paid.length * contest.entryFee;

  const rawTiers     = contest.payoutTiers || [];
  const totalPercent = rawTiers.reduce((s, t) => s + t.percent, 0);
  const tiers        = rawTiers.map((t) => ({ ...t.toObject(), amount: Math.round(prizePool * t.percent / 100) }));

  const gradedCards = await WeeklyCard.find({
    season: contest.season, status: 'Locked', contestIds: contest.id,
  }).sort({ weekNum: 1 });

  const ranked = await Promise.all(all.map(async (ticket) => {
    const user = await User.findById(ticket.userId);
    const subs = await WeeklyPick.find({ ticketId: ticket.id });
    let totalScore = 0, wins = 0;
    gradedCards.forEach((card) => {
      const sub = subs.find((s) => s.weekCardId === card.id);
      if (!sub) return;
      sub.picks.forEach((p) => {
        if (p.result === 'Win')  { wins++; totalScore += 1.0; }
        if (p.result === 'Push') { totalScore += 0.5; }
      });
    });
    return { ticketId: ticket.id, userId: ticket.userId, userName: user?.name ?? 'Unknown',
             label: ticket.label, status: ticket.status, totalScore, wins };
  }));

  ranked.sort((a, b) => {
    if (b.totalScore !== a.totalScore) return b.totalScore - a.totalScore;
    if (b.wins !== a.wins)             return b.wins - a.wins;
    return a.userName.localeCompare(b.userName);
  });

  let rankCtr = 1;
  ranked.forEach((e, i) => {
    e.rank = (i > 0 && e.totalScore === ranked[i-1].totalScore && e.wins === ranked[i-1].wins)
      ? ranked[i-1].rank : rankCtr;
    rankCtr++;
  });

  const payoutList = ranked.map((entry) => {
    const tier = tiers.find((t) => t.rank === entry.rank);
    return { ...entry, prize: tier?.amount ?? 0, tierLabel: tier?.label ?? null };
  });

  res.json({
    prizePool, paidEntries: paid.length, totalEntries: all.length, entryFee: contest.entryFee,
    prizeStructure: contest.prizeStructure, payoutsStatus: contest.payoutsStatus || 'Draft',
    tiers, totalPercent, totalPayout: tiers.reduce((s, t) => s + t.amount, 0), payoutList,
  });
});

app.put('/api/contests/:id/payout-tiers', async (req, res) => {
  const contest = await Contest.findById(req.params.id);
  if (!contest) return res.status(404).json({ error: 'Contest not found' });
  if (!Array.isArray(req.body.tiers)) return res.status(400).json({ error: 'tiers must be an array' });
  contest.payoutTiers = req.body.tiers.map((t, i) => ({
    rank: i + 1,
    label: t.label || `${i+1}${['st','nd','rd'][i] || 'th'} Place`,
    percent: Number(t.percent) || 0,
  }));
  await contest.save();
  res.json({ tiers: contest.payoutTiers });
});

app.patch('/api/contests/:id/payouts-status', async (req, res) => {
  const { status } = req.body;
  if (!['Draft', 'Finalized'].includes(status)) return res.status(400).json({ error: 'status must be Draft or Finalized' });
  const contest = await Contest.findById(req.params.id);
  if (!contest) return res.status(404).json({ error: 'Contest not found' });
  contest.payoutsStatus = status;
  await contest.save();
  await audit(status === 'Finalized' ? 'payout_finalized' : 'payout_reopened', contest.id,
    `${contest.name} payouts ${status === 'Finalized' ? 'finalized' : 'reopened'}`);
  res.json({ payoutsStatus: status });
});

// ── Health / Seed ─────────────────────────────────────────────────────────────
app.get('/api/health', async (_req, res) => {
  const [users, contests, tickets, leagues, proxies, auditLogs, weeklyCards, weeklyPicks] =
    await Promise.all([
      User.countDocuments(), Contest.countDocuments(), Ticket.countDocuments(),
      League.countDocuments(), Proxy.countDocuments(), AuditLog.countDocuments(),
      WeeklyCard.countDocuments(), WeeklyPick.countDocuments(),
    ]);
  res.json({ status: 'ok', counts: { users, contests, tickets, leagues, proxies, auditLogs, weeklyCards, weeklyPicks } });
});

app.post('/api/seed', async (_req, res) => {
  const { execFile } = await import('child_process');
  const { fileURLToPath } = await import('url');
  const seedPath = path.join(path.dirname(fileURLToPath(import.meta.url)), 'seed.js');
  execFile(process.execPath, [seedPath], { env: process.env }, (err, stdout, stderr) => {
    if (err) return res.status(500).json({ error: err.message, stderr });
    res.json({ ok: true, output: stdout });
  });
});

// ── Users ─────────────────────────────────────────────────────────────────────
app.get('/api/users', async (_req, res) => {
  try {
    const users = await User.find();
    const result = await Promise.all(users.map(async (u) => {
      const all      = await Ticket.find({ userId: u.id });
      const nonVoided = all.filter((t) => t.status !== 'Voided');
      const active   = all.filter((t) => t.status === 'Active');
      const paid     = all.filter((t) => t.paymentMethod != null && t.status !== 'Voided');
      const contestIds = [...new Set(active.map((t) => t.contestId))];
      const contests = await Contest.find({ _id: { $in: paid.map((t) => t.contestId) } });
      const revenue = paid.reduce((sum, t) => {
        const c = contests.find((c) => c.id === t.contestId);
        return sum + (c?.entryFee ?? 0);
      }, 0);
      return { ...doc(u), totalEntries: nonVoided.length, activeEntries: active.length, contestCount: contestIds.length, revenue };
    }));
    res.json(result);
  } catch (err) {
    console.error('GET /api/users error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/users', async (req, res) => {
  const { name, email, phone } = req.body;
  if (!name?.trim()) return res.status(400).json({ error: 'name is required' });
  const user = await new User({ _id: await nextUserId(), name: name.trim(), email: (email||'').trim(), phone: (phone||'').trim() }).save();
  await audit('contestant_added', user.id, `Contestant added: ${user.name}${user.email ? ` (${user.email})` : ''}`);
  res.status(201).json(doc(user));
});

app.get('/api/users/search', async (req, res) => {
  const q = (req.query.q || '').trim();
  if (!q) return res.json([]);
  const regex = new RegExp(q, 'i');
  const results = await User.find({ $or: [{ name: regex }, { email: regex }, { phone: regex }, { _id: regex }] }).limit(10);
  res.json(results.map(doc));
});

app.get('/api/users/:id', async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  const available = await Contest.find({ status: { $in: ['Registration Open', 'Active'] } });
  const userTickets = await Ticket.find({ userId: user.id });
  const summary = available.map((c) => {
    const ct     = userTickets.filter((t) => t.contestId === c.id);
    const active = ct.filter((t) => t.status !== 'Voided');
    return { contestId: c.id, contestName: c.name, contestType: c.type, ticketLimit: c.ticketLimit,
             price: c.entryFee, used: active.length, remaining: Math.max(0, c.ticketLimit - active.length), tickets: ct.map(doc) };
  });
  res.json({ ...doc(user), contestSummary: summary });
});

// ── Tickets ───────────────────────────────────────────────────────────────────
app.post('/api/tickets', async (req, res) => {
  const { userId, contestId, label, paymentMethod } = req.body;
  const user    = await User.findById(userId);
  if (!user)    return res.status(404).json({ error: 'User not found' });
  const contest = await Contest.findById(contestId);
  if (!contest) return res.status(404).json({ error: 'Contest not found' });
  if (!['Registration Open', 'Active'].includes(contest.status))
    return res.status(409).json({ error: `Contest "${contest.name}" is not open for registration (status: ${contest.status}).` });

  const existing = await Ticket.find({ userId, contestId, status: { $ne: 'Voided' } });
  if (existing.length >= contest.ticketLimit)
    return res.status(409).json({ error: `Ticket limit reached. ${user.name} already has ${existing.length}/${contest.ticketLimit} tickets for ${contest.name}.` });

  const ticket = await new Ticket({
    _id: await nextTicketId(), userId, contestId, status: 'Active',
    receiptNum: await nextReceiptNum(),
    label: label || `Entry ${String.fromCharCode(65 + existing.length)}`,
    paymentMethod: paymentMethod || 'Cash',
  }).save();
  await audit('entry_sold', ticket.id, `Entry sold: ${user.name} — ${contest.name}, ${ticket.label} (${ticket.paymentMethod})`);
  res.status(201).json({ ticket: doc(ticket), contest: doc(contest), user: doc(user) });
});

app.get('/api/tickets', async (req, res) => {
  const filter = {};
  if (req.query.contestId) filter.contestId = req.query.contestId;
  if (req.query.status)    filter.status    = req.query.status;
  if (req.query.userId)    filter.userId    = req.query.userId;

  const list = await Ticket.find(filter);
  const result = await Promise.all(list.map(async (t) => {
    const [user, contest, proxy] = await Promise.all([
      User.findById(t.userId),
      Contest.findById(t.contestId),
      t.proxyId ? Proxy.findById(t.proxyId) : null,
    ]);
    const sameUser = await Ticket.find({ userId: t.userId, contestId: t.contestId }).sort({ createdAt: 1 });
    const entryIndex = sameUser.findIndex((x) => x.id === t.id);
    return { ...doc(t), userName: user?.name ?? 'Unknown', userEmail: user?.email ?? '',
      contestName: contest?.name ?? t.contestId, contestType: contest?.type ?? '',
      picksPerWeek: contest?.picksPerWeek ?? 5, entryFee: contest?.entryFee ?? 0,
      entryNum: `${entryIndex + 1} of ${sameUser.length}`, proxyName: proxy?.name ?? null };
  }));
  res.json(result);
});

app.get('/api/tickets/:id/picks', async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });

  const cards = await WeeklyCard.find({
    status: { $in: ['Published', 'Locked'] },
    contestIds: ticket.contestId,
  }).sort({ weekNum: 1 });

  const subs = await WeeklyPick.find({ ticketId: ticket.id });

  const weeks = cards.map((card) => {
    const sub = subs.find((s) => s.weekCardId === card.id);
    if (!sub) return {
      weekNum: card.weekNum, weekCardId: card.id, cardStatus: card.status,
      submissionStatus: card.status === 'Locked' ? 'Missed' : 'Open',
      submittedAt: null, picks: [], weekScore: 0,
    };
    const enrichedPicks = sub.picks.map((pick) => {
      const game = card.games.find((g) => g.id === pick.gameId);
      return { gameId: pick.gameId, pickedTeam: pick.pickedTeam, result: pick.result,
        awayTeam: game?.awayTeam ?? '—', homeTeam: game?.homeTeam ?? '—',
        homeSpread: game?.homeSpread ?? 0, gameDate: game?.gameDate ?? null,
        gameStatus: game?.status ?? 'Unknown', awayScore: game?.awayScore ?? null, homeScore: game?.homeScore ?? null };
    });
    const weekScore = enrichedPicks.reduce((s, p) => s + (p.result === 'Win' ? 1 : p.result === 'Push' ? 0.5 : 0), 0);
    const allGraded = enrichedPicks.every((p) => p.result !== null);
    return { weekNum: card.weekNum, weekCardId: card.id, cardStatus: card.status,
      submissionStatus: allGraded ? 'Graded' : 'Submitted', submittedAt: sub.submittedAt, picks: enrichedPicks, weekScore };
  });

  const totalScore  = weeks.reduce((s, w) => s + w.weekScore, 0);
  const weeksGraded = weeks.filter((w) => w.submissionStatus === 'Graded').length;
  res.json({ weeks, totalScore, weeksGraded });
});

app.patch('/api/tickets/:id/status', async (req, res) => {
  const { status } = req.body;
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const VALID = ['Active', 'Suspended', 'Voided', 'Pending Payment', 'Eliminated (Survivor)'];
  if (!VALID.includes(status)) return res.status(400).json({ error: `Invalid status "${status}".` });
  if (ticket.status === 'Voided') return res.status(409).json({ error: 'Cannot change status of a voided ticket.' });
  if (ticket.status === 'Eliminated (Survivor)') return res.status(409).json({ error: 'Cannot change status of an eliminated entry.' });
  const prev = ticket.status;
  ticket.status = status;
  await ticket.save();
  const user = await User.findById(ticket.userId);
  await audit('entry_status', ticket.id, `Entry ${ticket.id} status changed: ${prev} → ${status}${user ? ` (${user.name})` : ''}`);
  res.json(doc(ticket));
});

app.patch('/api/tickets/:id/void', async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (ticket.status === 'Voided') return res.status(409).json({ error: 'Already voided' });
  if (ticket.status === 'Eliminated (Survivor)') return res.status(409).json({ error: 'Cannot void an eliminated Survivor entry.' });
  ticket.status = 'Voided';
  await ticket.save();
  res.json(doc(ticket));
});

// ── Proxies ───────────────────────────────────────────────────────────────────
app.get('/api/proxies', async (_req, res) => {
  const proxies = await Proxy.find();
  const result  = await Promise.all(proxies.map(async (p) => ({
    ...doc(p),
    assignedCount: await Ticket.countDocuments({ proxyId: p.id, status: { $ne: 'Voided' } }),
  })));
  res.json(result);
});

app.post('/api/proxies', async (req, res) => {
  const { name, email, phone, notes } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });
  const proxy = await new Proxy({ _id: await nextProxyId(), name, email: email||'', phone: phone||'', notes: notes||'' }).save();
  await audit('proxy_registered', proxy.id, `Proxy registered: ${proxy.name}${proxy.email ? ` (${proxy.email})` : ''}`);
  res.status(201).json(doc(proxy));
});

app.get('/api/proxies/:id', async (req, res) => {
  const proxy = await Proxy.findById(req.params.id);
  if (!proxy) return res.status(404).json({ error: 'Proxy not found' });
  const tickets = await Ticket.find({ proxyId: proxy.id, status: { $ne: 'Voided' } });
  const assigned = await Promise.all(tickets.map(async (t) => {
    const [user, contest] = await Promise.all([User.findById(t.userId), Contest.findById(t.contestId)]);
    return { ticketId: t.id, userId: t.userId, userName: user?.name ?? 'Unknown',
             label: t.label, contestName: contest?.name ?? t.contestId, contestType: contest?.type ?? '', status: t.status };
  }));
  const auditEntries = await ProxyAuditLog.find({ proxyId: proxy.id }).sort({ changedAt: -1 });
  res.json({ ...doc(proxy), assigned, audit: auditEntries.map(doc) });
});

app.patch('/api/proxies/:id', async (req, res) => {
  const proxy = await Proxy.findById(req.params.id);
  if (!proxy) return res.status(404).json({ error: 'Proxy not found' });
  const ALLOWED = ['name', 'email', 'phone', 'notes', 'status'];
  const prev = proxy.status;
  ALLOWED.forEach((k) => { if (k in req.body) proxy[k] = req.body[k]; });
  await proxy.save();
  if (req.body.status && req.body.status !== prev) {
    await new ProxyAuditLog({ _id: await nextAuditId(), type: 'status_changed', proxyId: proxy.id,
      fromStatus: prev, toStatus: proxy.status, changedAt: getNow(), changedBy: 'admin', note: req.body.note||'' }).save();
    await audit('proxy_status', proxy.id, `Proxy ${proxy.id} (${proxy.name}) status changed: ${prev} → ${proxy.status}`);
  }
  res.json(doc(proxy));
});

app.patch('/api/tickets/:id/proxy', async (req, res) => {
  const ticket = await Ticket.findById(req.params.id);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  const { proxyId, note = '' } = req.body;
  if (proxyId != null) {
    const proxy = await Proxy.findById(proxyId);
    if (!proxy) return res.status(404).json({ error: 'Proxy not found' });
    if (proxy.status !== 'Active') return res.status(409).json({ error: `Proxy is ${proxy.status} and cannot be assigned` });
  }
  const previousProxyId = ticket.proxyId ?? null;
  ticket.proxyId = proxyId ?? null;
  await ticket.save();
  await new ProxyAuditLog({ _id: await nextAuditId(), type: proxyId ? 'assigned' : 'removed',
    proxyId: proxyId ?? previousProxyId, ticketId: ticket.id, previousProxyId,
    changedAt: getNow(), changedBy: 'admin', note }).save();
  res.json(doc(ticket));
});

// ── Weekly Picks ──────────────────────────────────────────────────────────────
app.post('/api/weekly-picks', async (req, res) => {
  const { ticketId, weekCardId, picks } = req.body;
  if (!ticketId || !weekCardId || !Array.isArray(picks))
    return res.status(400).json({ error: 'ticketId, weekCardId and picks are required' });

  const ticket = await Ticket.findById(ticketId);
  if (!ticket) return res.status(404).json({ error: 'Ticket not found' });
  if (ticket.status !== 'Active') return res.status(409).json({ error: `Ticket is ${ticket.status} — only Active entries can submit picks` });

  const card = await WeeklyCard.findById(weekCardId);
  if (!card) return res.status(404).json({ error: 'Week card not found' });
  if (card.status !== 'Published') return res.status(409).json({ error: `Week ${card.weekNum} is ${card.status}` });
  if (card.picksDeadline && getNow() > new Date(card.picksDeadline))
    return res.status(409).json({ error: 'Picks deadline has passed' });
  if (!(card.contestIds || []).includes(ticket.contestId))
    return res.status(409).json({ error: "This week card does not apply to the entry's contest" });

  const contest = await Contest.findById(ticket.contestId);
  const isSurvivor  = contest?.type === 'surv';
  const picksPerWeek = contest?.picksPerWeek ?? 5;

  if (picks.length !== picksPerWeek)
    return res.status(400).json({ error: `Must submit exactly ${picksPerWeek} pick${picksPerWeek !== 1 ? 's' : ''}` });

  const onCardTeams = card.games.filter((g) => g.onCard).flatMap((g) => [g.homeTeam, g.awayTeam]);
  for (const p of picks) {
    if (!onCardTeams.includes(p.pickedTeam)) return res.status(400).json({ error: `Team "${p.pickedTeam}" is not on this week's card` });
  }

  if (isSurvivor) {
    if (ticket.status === 'Voided' || ticket.status === 'Eliminated (Survivor)')
      return res.status(409).json({ error: 'This Survivor entry has been eliminated' });

    // Check prior graded weeks: loss or missed week = eliminated
    const gradedCards = await WeeklyCard.find({
      contestIds: ticket.contestId, status: 'Locked', _id: { $ne: weekCardId },
    });
    for (const gc of gradedCards) {
      const sub = await WeeklyPick.findOne({ ticketId, weekCardId: gc.id });
      if (!sub) return res.status(409).json({ error: 'This Survivor entry has been eliminated (missed a week)' });
      if (sub.picks.some((p) => p.result === 'Loss'))
        return res.status(409).json({ error: 'This Survivor entry has been eliminated' });
    }

    const prevSubs  = await WeeklyPick.find({ ticketId, weekCardId: { $ne: weekCardId } });
    const usedTeams = prevSubs.flatMap((s) => s.picks.map((p) => p.pickedTeam));
    const reused    = picks.find((p) => usedTeams.includes(p.pickedTeam));
    if (reused) return res.status(409).json({ error: `${reused.pickedTeam} has already been used this season` });
  }

  const existing = await WeeklyPick.findOne({ ticketId, weekCardId });
  const submissionData = {
    ticketId, weekCardId, weekNum: card.weekNum,
    submittedAt: getNow(),
    picks: picks.map((p) => ({ gameId: p.gameId, pickedTeam: p.pickedTeam, result: null })),
  };

  let submission, isUpdate;
  if (existing) {
    Object.assign(existing, submissionData);
    await existing.save();
    submission = existing;
    isUpdate = true;
  } else {
    submission = await new WeeklyPick({ _id: `wp-${ticketId}-${card.weekNum}`, ...submissionData }).save();
    isUpdate = false;
  }

  const user = await User.findById(ticket.userId);
  await audit('picks_submitted', ticketId,
    `Picks ${isUpdate ? 'updated' : 'recorded'} for ${user?.name ?? ticketId} — Week ${card.weekNum} (${picks.map((p) => p.pickedTeam.split(' ').pop()).join(', ')})`);

  res.status(isUpdate ? 200 : 201).json(doc(submission));
});

app.get('/api/weekly-picks', async (req, res) => {
  const { ticketId, weekCardId } = req.query;
  if (!ticketId || !weekCardId) return res.status(400).json({ error: 'ticketId and weekCardId are required' });
  const sub = await WeeklyPick.findOne({ ticketId, weekCardId });
  res.json(sub ? doc(sub) : null);
});

// ── Audit Log ─────────────────────────────────────────────────────────────────
app.get('/api/audit-log', async (req, res) => {
  const { type, search, from, to } = req.query;
  const filter = {};
  if (type) filter.type = type;
  if (from || to) {
    filter.timestamp = {};
    if (from) filter.timestamp.$gte = new Date(from);
    if (to)   filter.timestamp.$lte = new Date(to + 'T23:59:59Z');
  }
  let results = await AuditLog.find(filter).sort({ timestamp: -1 });
  if (search) {
    const q = search.toLowerCase();
    results = results.filter((e) => e.description.toLowerCase().includes(q) || e.entity.toLowerCase().includes(q));
  }
  res.json(results.map(doc));
});

// ── Dev / QA time travel ──────────────────────────────────────────────────────
if (process.env.NODE_ENV !== 'production') {
  app.get('/api/dev/mock-date', (_req, res) => {
    res.json({ mockNow: getMockNow(), realNow: new Date().toISOString() });
  });
  app.post('/api/dev/mock-date', (req, res) => {
    const { date } = req.body;
    if (!date) return res.status(400).json({ error: 'date is required (ISO string)' });
    setMockNow(date);
    res.json({ mockNow: getMockNow() });
  });
  app.delete('/api/dev/mock-date', (_req, res) => {
    clearMockNow();
    res.json({ mockNow: null });
  });
}

// ── Serve frontend in production ──────────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../dist');
  app.use(express.static(distPath));
  app.get('/{*path}', (_req, res) => res.sendFile(path.join(distPath, 'index.html')));
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
