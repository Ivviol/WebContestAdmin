import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../UserContext.jsx';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Grid from '@mui/material/Grid';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssignmentIcon from '@mui/icons-material/Assignment';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import CheckIcon from '@mui/icons-material/Check';
import LogoutIcon from '@mui/icons-material/Logout';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

// ── Shared constants ──────────────────────────────────────────────────────────
const STATUS_COLOR       = { Active: 'success', 'Pending Payment': 'warning', Suspended: 'default', Voided: 'error', 'Eliminated (Survivor)': 'error' };
const RESULT_COLOR       = { Win: 'success', Loss: 'error', Push: 'warning' };
const SUB_STATUS_COLOR   = { Graded: 'success', Submitted: 'info', Missed: 'error', Open: 'default' };
const CONTEST_TYPE_LABEL = { sc: 'SuperContest', wta: 'Winner Take All', surv: 'Survivor' };

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtSpread(val) {
  if (val == null) return '';
  if (val === 0)   return 'PK';
  return val > 0 ? `+${val}` : String(val);
}

function fmtScore(pick) {
  if (pick.awayScore == null) return null;
  return `${pick.awayTeam.split(' ').pop()} ${pick.awayScore} – ${pick.homeScore} ${pick.homeTeam.split(' ').pop()}`;
}

function fmtDeadline(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

// Safe-area-aware bottom padding (iOS home indicator)
const safeBottom = 'max(env(safe-area-inset-bottom, 0px), 16px)';

// ── Page shell with sticky header ─────────────────────────────────────────────
function PageShell({ title, subtitle, onBack, actions, children }) {
  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      <AppBar
        position="sticky"
        color="default"
        elevation={0}
        sx={{ borderBottom: '1px solid', borderColor: 'divider', backdropFilter: 'blur(8px)' }}
      >
        <Toolbar sx={{ gap: 1 }}>
          {onBack && (
            <IconButton edge="start" onClick={onBack} sx={{ mr: 0.5 }}>
              <ArrowBackIcon />
            </IconButton>
          )}
          {!onBack && <EmojiEventsIcon sx={{ color: 'warning.main', flexShrink: 0 }} />}
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={900} lineHeight={1.2} noWrap>{title}</Typography>
            {subtitle && (
              <Typography variant="caption" color="text.secondary" noWrap display="block">{subtitle}</Typography>
            )}
          </Box>
          {actions}
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflowY: 'auto' }}>
        {children}
      </Box>
    </Box>
  );
}

// ── Dashboard: entry card ─────────────────────────────────────────────────────
function EntryCard({ entry, onViewDetail, onSubmitPicks }) {
  const canSubmit = entry.status === 'Active';
  return (
    <Card variant="outlined">
      <CardActionArea onClick={() => onViewDetail(entry.id)} sx={{ minHeight: 72 }}>
        <CardContent>
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={1}>
            <Box sx={{ minWidth: 0, mr: 1 }}>
              <Typography variant="subtitle1" fontWeight={800} noWrap>{entry.contestName}</Typography>
              <Typography variant="body2" color="text.secondary" noWrap>
                {CONTEST_TYPE_LABEL[entry.contestType] ?? entry.contestType} · {entry.label}
              </Typography>
            </Box>
            <Chip label={entry.status} size="small" color={STATUS_COLOR[entry.status] ?? 'default'} variant="muted" sx={{ flexShrink: 0 }} />
          </Stack>
          <Stack direction="row" spacing={2} mt={0.5} flexWrap="wrap" gap={1}>
            <Box>
              <Typography variant="caption" color="text.secondary" display="block">Ticket</Typography>
              <Typography variant="caption" fontFamily="monospace" fontWeight={700}>{entry.id}</Typography>
            </Box>
            {entry.receiptNum && (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Receipt</Typography>
                <Typography variant="caption" fontFamily="monospace">#{entry.receiptNum}</Typography>
              </Box>
            )}
            {entry.proxyName && (
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Proxy</Typography>
                <Typography variant="caption">{entry.proxyName}</Typography>
              </Box>
            )}
          </Stack>
        </CardContent>
      </CardActionArea>

      {canSubmit && (
        <>
          <Divider />
          <Stack direction="row" sx={{ px: 1, py: 0.5 }}>
            <Button
              size="small"
              startIcon={<AssignmentIcon />}
              onClick={(e) => { e.stopPropagation(); onSubmitPicks(entry.id); }}
              sx={{ flex: 1, minHeight: 44 }}
            >
              Submit Picks
            </Button>
            <Divider orientation="vertical" flexItem />
            <Button
              size="small"
              startIcon={<SportsFootballIcon />}
              onClick={(e) => { e.stopPropagation(); onViewDetail(entry.id); }}
              sx={{ flex: 1, minHeight: 44 }}
            >
              View History
            </Button>
          </Stack>
        </>
      )}
    </Card>
  );
}

// ── Dashboard view ────────────────────────────────────────────────────────────
function DashboardView({ currentUser, onViewDetail, onSubmitPicks, onLogout }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    fetch(`/api/tickets?userId=${currentUser.id}`)
      .then((r) => r.json())
      .then(setEntries)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentUser.id]);

  const active = entries.filter((e) => e.status === 'Active');
  const other  = entries.filter((e) => e.status !== 'Active');

  return (
    <PageShell
      title="My Entries"
      subtitle={`${currentUser.name} · ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`}
      actions={
        <Tooltip title="Sign out">
          <IconButton onClick={onLogout} edge="end">
            <LogoutIcon />
          </IconButton>
        </Tooltip>
      }
    >
      <Box sx={{ px: 2, pt: 2, pb: safeBottom, maxWidth: 640, mx: 'auto', width: '100%' }}>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && <Stack alignItems="center" py={6}><CircularProgress /></Stack>}

        {!loading && entries.length === 0 && (
          <Alert severity="info">No entries found. Visit the cashier window to register.</Alert>
        )}

        {active.length > 0 && (
          <Stack spacing={1.5} mb={3}>
            {active.map((e) => (
              <EntryCard key={e.id} entry={e} onViewDetail={onViewDetail} onSubmitPicks={onSubmitPicks} />
            ))}
          </Stack>
        )}

        {other.length > 0 && (
          <>
            <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
              Inactive Entries
            </Typography>
            <Stack spacing={1.5}>
              {other.map((e) => (
                <EntryCard key={e.id} entry={e} onViewDetail={onViewDetail} onSubmitPicks={onSubmitPicks} />
              ))}
            </Stack>
          </>
        )}
      </Box>
    </PageShell>
  );
}

// ── Entry detail ──────────────────────────────────────────────────────────────
function PickRow({ pick }) {
  const pickedIsHome = pick.pickedTeam === pick.homeTeam;
  const pickedSpread = pickedIsHome ? pick.homeSpread : -pick.homeSpread;
  const opponent     = pickedIsHome ? pick.awayTeam : pick.homeTeam;
  const finalScore   = fmtScore(pick);

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.25, minHeight: 56 }}>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Stack direction="row" alignItems="center" spacing={0.75}>
          <CheckIcon sx={{ fontSize: 14, color: 'primary.main', flexShrink: 0 }} />
          <Typography variant="body2" fontWeight={800}>{pick.pickedTeam.split(' ').pop()}</Typography>
          <Chip label={fmtSpread(pickedSpread)} size="small" variant="outlined" color="primary"
            sx={{ height: 18, fontSize: '0.7rem', fontWeight: 700 }} />
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ pl: 2.75 }}>
          vs {opponent.split(' ').pop()}
        </Typography>
        {finalScore && (
          <Typography variant="caption" color="text.secondary"
            sx={{ pl: 2.75, display: 'block', fontStyle: 'italic' }}>
            Final: {finalScore}
          </Typography>
        )}
      </Box>
      <Box sx={{ flexShrink: 0, ml: 2 }}>
        {pick.result
          ? <Chip label={pick.result} size="small" color={RESULT_COLOR[pick.result] ?? 'default'} variant="muted" />
          : <Chip label="Pending" size="small" variant="outlined" color="default" />}
      </Box>
    </Stack>
  );
}

function WeekHeader({ week }) {
  const wins   = week.picks.filter((p) => p.result === 'Win').length;
  const losses = week.picks.filter((p) => p.result === 'Loss').length;
  const pushes = week.picks.filter((p) => p.result === 'Push').length;
  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ px: 2, py: 1.5, minHeight: 52 }}>
      <Stack direction="row" alignItems="center" spacing={1}>
        <Typography variant="subtitle2" fontWeight={800}>Week {week.weekNum}</Typography>
        <Chip label={week.submissionStatus} size="small"
          color={SUB_STATUS_COLOR[week.submissionStatus] ?? 'default'} variant="muted" />
      </Stack>
      <Stack direction="row" alignItems="center" spacing={1.5}>
        {week.submissionStatus === 'Graded' && (
          <>
            <Typography variant="caption" color="text.secondary">
              {wins}W–{losses}L{pushes > 0 ? `–${pushes}P` : ''}
            </Typography>
            <Typography variant="body2" fontWeight={900} color="warning.main">
              {week.weekScore} pts
            </Typography>
          </>
        )}
        {week.submissionStatus === 'Submitted' && (
          <Typography variant="caption" color="text.secondary">Awaiting grades</Typography>
        )}
      </Stack>
    </Stack>
  );
}

function EntryDetailView({ ticketId, currentUser, onBack, onSubmitPicks }) {
  const [data, setData]       = useState(null);
  const [ticket, setTicket]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`/api/tickets?userId=${currentUser.id}`).then((r) => r.json()),
      fetch(`/api/tickets/${ticketId}/picks`).then((r) => r.json()),
    ]).then(([allTickets, picksData]) => {
      const t = allTickets.find((t) => t.id === ticketId);
      if (!t) { setError('Entry not found'); return; }
      setTicket(t);
      setData(picksData);
    }).catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticketId, currentUser.id]);

  const totals = useMemo(() => {
    if (!data?.weeks) return null;
    let wins = 0, losses = 0, pushes = 0, missed = 0;
    data.weeks.forEach((w) => {
      if (w.submissionStatus === 'Missed') { missed++; return; }
      w.picks.forEach((p) => {
        if (p.result === 'Win')  wins++;
        if (p.result === 'Loss') losses++;
        if (p.result === 'Push') pushes++;
      });
    });
    return { wins, losses, pushes, missed };
  }, [data]);

  const canSubmit = ticket?.status === 'Active';

  return (
    <PageShell
      title={ticket?.contestName ?? '…'}
      subtitle={ticket ? `${CONTEST_TYPE_LABEL[ticket.contestType]} · ${ticket.label}` : undefined}
      onBack={onBack}
      actions={canSubmit && (
        <Button size="small" variant="outlined" startIcon={<AssignmentIcon />}
          onClick={() => onSubmitPicks(ticketId)}
          sx={{ minHeight: 36, whiteSpace: 'nowrap' }}>
          Submit Picks
        </Button>
      )}
    >
      {loading && <Stack alignItems="center" py={10}><CircularProgress /></Stack>}
      {error   && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}

      {!loading && data && (
        <Box sx={{ px: 2, pt: 2, pb: safeBottom, maxWidth: 640, mx: 'auto', width: '100%' }}>

          {/* Season summary — responsive grid */}
          {totals && (
            <Paper variant="outlined" sx={{ mb: 2 }}>
              <Grid container>
                {[
                  { label: 'Total Points', value: data.totalScore ?? 0, color: 'warning.main', large: true },
                  { label: 'Record', value: `${totals.wins}–${totals.losses}${totals.pushes > 0 ? `–${totals.pushes}` : ''}` },
                  { label: 'Weeks Graded', value: data.weeksGraded },
                  ...(totals.missed > 0 ? [{ label: 'Missed', value: totals.missed, color: 'error.main' }] : []),
                ].map(({ label, value, color, large }) => (
                  <Grid key={label} size={{ xs: 6, sm: 'auto' }}
                    sx={{ p: 2, borderRight: '1px solid', borderColor: 'divider',
                          '&:last-child': { borderRight: 0 } }}>
                    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                    <Typography variant={large ? 'h4' : 'h5'} fontWeight={900}
                      color={color ?? 'text.primary'} lineHeight={1.1}>
                      {value}
                    </Typography>
                  </Grid>
                ))}
              </Grid>
            </Paper>
          )}

          {data.weeks?.length === 0 && (
            <Alert severity="info">No picks history yet. Submit your picks for the current week!</Alert>
          )}

          <Stack spacing={1.5}>
            {data.weeks?.map((week) => (
              <Paper key={week.weekNum} variant="outlined">
                <WeekHeader week={week} />
                {week.picks?.length > 0 && (
                  <>
                    <Divider />
                    <Stack divider={<Divider />}>
                      {week.picks.map((pick, i) => <PickRow key={i} pick={pick} />)}
                    </Stack>
                  </>
                )}
                {week.submissionStatus === 'Missed' && (
                  <>
                    <Divider />
                    <Typography variant="caption" color="error.main"
                      sx={{ px: 2, py: 1.25, display: 'block' }}>
                      No picks submitted before the deadline — 0 pts this week
                    </Typography>
                  </>
                )}
              </Paper>
            ))}
          </Stack>
        </Box>
      )}
    </PageShell>
  );
}

// ── Submit picks ──────────────────────────────────────────────────────────────
function SubmitPicksView({ ticketId, currentUser, onBack }) {
  const [ticket, setTicket]       = useState(null);
  const [openWeeks, setOpenWeeks] = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [card, setCard]           = useState(null);
  const [existing, setExisting]   = useState(null);
  const [usedTeams, setUsedTeams] = useState([]);
  const [picks, setPicks]         = useState({});
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState('');
  const [saved, setSaved]         = useState(false);

  const isSurvivor   = ticket?.contestType === 'surv';
  const picksPerWeek = ticket?.picksPerWeek ?? 5;

  useEffect(() => {
    Promise.all([
      fetch(`/api/tickets?userId=${currentUser.id}`).then((r) => r.json()),
      fetch('/api/weekly-cards').then((r) => r.json()),
    ]).then(([allTickets, cards]) => {
      const t = allTickets.find((t) => t.id === ticketId);
      if (!t) { setError('Entry not found'); return; }
      setTicket(t);
      const relevant = cards.filter(
        (c) => c.status === 'Published' && (c.contestIds || []).includes(t.contestId)
      );
      setOpenWeeks(relevant);
      if (relevant.length > 0) setSelectedWeekId(relevant[relevant.length - 1].id);
    }).catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [ticketId, currentUser.id]);

  useEffect(() => {
    if (!selectedWeekId || !ticket) return;
    setPicks({});
    Promise.all([
      fetch(`/api/weekly-cards/${selectedWeekId}`).then((r) => r.json()),
      fetch(`/api/weekly-picks?ticketId=${ticketId}&weekCardId=${selectedWeekId}`).then((r) => r.json()),
      fetch(`/api/tickets/${ticketId}/picks`).then((r) => r.json()),
    ]).then(([cardData, existingSub, allPicks]) => {
      setCard(cardData);
      setExisting(existingSub);
      if (existingSub?.picks) {
        if (isSurvivor) {
          const p = existingSub.picks[0];
          if (p) setPicks({ survivor: p.pickedTeam, gameId: p.gameId });
        } else {
          const filled = {};
          existingSub.picks.forEach((p) => { filled[p.gameId] = p.pickedTeam; });
          setPicks(filled);
        }
      }
      if (isSurvivor && allPicks?.weeks) {
        const used = allPicks.weeks
          .filter((w) => w.weekCardId !== selectedWeekId && w.status !== 'Missed')
          .flatMap((w) => (w.picks || []).map((p) => p.pickedTeam));
        setUsedTeams(used);
      }
    });
  }, [selectedWeekId, ticket, isSurvivor, ticketId]);

  const onCardGames    = card?.games?.filter((g) => g.onCard) ?? [];
  const pickCount      = isSurvivor ? (picks.survivor ? 1 : 0) : Object.keys(picks).length;
  const isComplete     = pickCount === picksPerWeek;
  const deadlinePassed = card?.picksDeadline && new Date() > new Date(card.picksDeadline);

  async function handleSubmit() {
    setSaving(true); setError('');
    const payload = isSurvivor
      ? [{ gameId: picks.gameId, pickedTeam: picks.survivor }]
      : Object.entries(picks).map(([gameId, pickedTeam]) => ({ gameId, pickedTeam }));
    try {
      const res = await fetch('/api/weekly-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId, weekCardId: selectedWeekId, picks: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to submit');
      setSaved(true);
      setTimeout(() => onBack(), 1500);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <PageShell
      title="Submit Picks"
      subtitle={ticket ? `${ticket.contestName} · ${ticket.label}` : undefined}
      onBack={onBack}
    >
      {loading && <Stack alignItems="center" py={10}><CircularProgress /></Stack>}

      {!loading && (
        /* Flex column so the sticky submit button stays at the bottom */
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100%' }}>
          <Box sx={{ flex: 1, px: 2, pt: 2, maxWidth: 600, mx: 'auto', width: '100%' }}>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {saved  && <Alert severity="success" sx={{ mb: 2 }}>Picks saved! Going back…</Alert>}

            {openWeeks.length === 0 && (
              <Alert severity="info">No weeks are currently open for pick submission.</Alert>
            )}

            {openWeeks.length > 0 && (
              <>
                {/* Deadline banner */}
                {card?.picksDeadline && (
                  <Paper variant="outlined"
                    sx={{ p: 2, mb: 2, borderColor: deadlinePassed ? 'error.main' : 'divider' }}>
                    <Typography variant="caption" color="text.secondary" display="block">Picks deadline</Typography>
                    <Typography variant="body2" fontWeight={700}
                      color={deadlinePassed ? 'error.main' : 'text.primary'}>
                      {fmtDeadline(card.picksDeadline)}{deadlinePassed && ' — PASSED'}
                    </Typography>
                  </Paper>
                )}

                {existing && (
                  <Alert severity="warning" sx={{ mb: 2 }}>
                    Picks already submitted for Week {card?.weekNum} — saving will overwrite them.
                  </Alert>
                )}

                {/* Progress header */}
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {isSurvivor ? 'Pick one team' : `Pick ${picksPerWeek} teams`}
                  </Typography>
                  {!isSurvivor && (
                    <Chip
                      label={`${pickCount} / ${picksPerWeek}`}
                      size="small"
                      color={isComplete ? 'success' : 'default'}
                      variant={isComplete ? 'filled' : 'outlined'}
                    />
                  )}
                </Stack>

                {/* Survivor picker */}
                {isSurvivor ? (
                  <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                      {onCardGames.flatMap((g) => [
                        { team: g.awayTeam, gameId: g.id },
                        { team: g.homeTeam, gameId: g.id },
                      ]).sort((a, b) => a.team.localeCompare(b.team)).map(({ team, gameId }) => {
                        const used     = usedTeams.includes(team);
                        const isPicked = picks.survivor === team;
                        return (
                          <Chip
                            key={team}
                            label={team.split(' ').pop()}
                            variant={isPicked ? 'filled' : 'outlined'}
                            color={isPicked ? 'primary' : 'default'}
                            disabled={used || deadlinePassed}
                            onClick={() => !used && !deadlinePassed && setPicks({ survivor: team, gameId })}
                            sx={{
                              cursor: (used || deadlinePassed) ? 'default' : 'pointer',
                              opacity: used ? 0.4 : 1,
                              height: 36,
                              fontSize: '0.85rem',
                            }}
                          />
                        );
                      })}
                    </Box>
                  </Paper>
                ) : (
                  /* SC / WTA toggle buttons */
                  <Paper variant="outlined" sx={{ mb: 2 }}>
                    <Stack divider={<Divider />}>
                      {onCardGames.map((game) => (
                        <Box key={game.id} sx={{ px: 1.5, py: 1.25 }}>
                          <ToggleButtonGroup
                            exclusive
                            fullWidth
                            size="small"
                            value={picks[game.id] ?? null}
                            onChange={(_, val) => {
                              if (val === null || deadlinePassed) return;
                              setPicks((prev) => {
                                const next = { ...prev };
                                if (next[game.id] === val) delete next[game.id];
                                else next[game.id] = val;
                                return next;
                              });
                            }}
                          >
                            {[
                              { team: game.awayTeam, spread: fmtSpread(-game.homeSpread) },
                              { team: game.homeTeam,  spread: fmtSpread(game.homeSpread)  },
                            ].map(({ team, spread }) => (
                              <ToggleButton
                                key={team}
                                value={team}
                                sx={{ textTransform: 'none', minHeight: 56, py: 1 }}
                              >
                                <Stack alignItems="center" spacing={0}>
                                  <Typography variant="body2" fontWeight={700} lineHeight={1.2}>
                                    {team.split(' ').pop()}
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary" lineHeight={1.2}>
                                    {spread}
                                  </Typography>
                                </Stack>
                              </ToggleButton>
                            ))}
                          </ToggleButtonGroup>
                        </Box>
                      ))}
                    </Stack>
                  </Paper>
                )}
              </>
            )}
          </Box>

          {/* Sticky submit button at the bottom */}
          {openWeeks.length > 0 && (
            <Box
              sx={{
                position: 'sticky',
                bottom: 0,
                bgcolor: 'background.default',
                borderTop: '1px solid',
                borderColor: 'divider',
                px: 2,
                pt: 1.5,
                pb: safeBottom,
              }}
            >
              <Button
                variant="contained"
                fullWidth
                size="large"
                disabled={!isComplete || saving || deadlinePassed || saved}
                onClick={handleSubmit}
                sx={{ minHeight: 52 }}
              >
                {saving ? 'Submitting…' : existing ? 'Update Picks' : 'Submit Picks'}
              </Button>
            </Box>
          )}
        </Box>
      )}
    </PageShell>
  );
}

// ── Root page ─────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { currentUser, logout } = useUser();
  const [view, setView]         = useState('dashboard');
  const [ticketId, setTicketId] = useState(null);

  if (!currentUser) {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto', py: 8, px: 2 }}>
        <Alert severity="info">
          No user selected. Go to <strong>User Login</strong> to choose a contestant.
        </Alert>
      </Box>
    );
  }

  function goDetail(id)  { setTicketId(id); setView('detail'); }
  function goSubmit(id)  { setTicketId(id); setView('submit'); }
  function goBack()      { setView('dashboard'); setTicketId(null); }
  function handleLogout() { logout(); setView('dashboard'); setTicketId(null); }

  if (view === 'detail') {
    return <EntryDetailView ticketId={ticketId} currentUser={currentUser}
      onBack={goBack} onSubmitPicks={goSubmit} />;
  }
  if (view === 'submit') {
    return <SubmitPicksView ticketId={ticketId} currentUser={currentUser}
      onBack={() => goDetail(ticketId)} />;
  }
  return <DashboardView currentUser={currentUser}
    onViewDetail={goDetail} onSubmitPicks={goSubmit} onLogout={handleLogout} />;
}
