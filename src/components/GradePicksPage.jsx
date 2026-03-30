import { useState, useEffect, useMemo, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import LockIcon from '@mui/icons-material/Lock';
import PublishIcon from '@mui/icons-material/Publish';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import TaskAltIcon from '@mui/icons-material/TaskAlt';
import GradingIcon from '@mui/icons-material/Grading';

// ── Helpers ───────────────────────────────────────────────────────────────────
function spreadLabel(homeTeam, homeSpread) {
  const team = homeTeam.split(' ').pop();
  if (homeSpread === 0) return 'PK';
  return homeSpread < 0 ? `${team} ${homeSpread}` : `${team} +${homeSpread}`;
}

function computeGameResult(homeSpread, awayScoreStr, homeScoreStr) {
  if (awayScoreStr === '' || homeScoreStr === '') return null;
  const margin = Number(homeScoreStr) - Number(awayScoreStr);
  const adj    = margin + homeSpread;
  if (adj === 0)  return 'Push';
  return adj > 0 ? 'home' : 'away';
}

const CARD_STATUS_COLOR = { Draft: 'default', Published: 'info', Locked: 'success' };
const CARD_STATUS_ICON  = {
  Draft:     <LockOpenIcon fontSize="small" />,
  Published: <PublishIcon  fontSize="small" />,
  Locked:    <LockIcon     fontSize="small" />,
};

// ── Score input row ───────────────────────────────────────────────────────────
function GameRow({ game, gameStat, scores, onChange, readOnly }) {
  const s      = scores[game.id] || { awayScore: '', homeScore: '' };
  const result = computeGameResult(game.homeSpread, s.awayScore, s.homeScore);

  const awayPicks = gameStat?.teamCounts?.[game.awayTeam] ?? 0;
  const homePicks = gameStat?.teamCounts?.[game.homeTeam] ?? 0;

  const awayShort = game.awayTeam.split(' ').pop();
  const homeShort = game.homeTeam.split(' ').pop();

  let resultChip = null;
  if (result === 'Push') {
    resultChip = <Chip label="Push" size="small" color="info" variant="muted" />;
  } else if (result === 'home') {
    resultChip = <Chip label={`${homeShort} covers`} size="small" color="success" variant="muted" />;
  } else if (result === 'away') {
    resultChip = <Chip label={`${awayShort} covers`} size="small" color="warning" variant="muted" />;
  }

  return (
    <TableRow hover sx={{ opacity: game.onCard ? 1 : 0.45 }}>
      {/* Away */}
      <TableCell>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" fontWeight={600}>{awayShort}</Typography>
          {awayPicks > 0 && (
            <Chip label={awayPicks} size="small" variant="outlined" color="default"
              sx={{ height: 18, fontSize: 11 }} />
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" noWrap>{game.awayTeam}</Typography>
      </TableCell>

      {/* Away score */}
      <TableCell align="center" sx={{ width: 72 }}>
        <TextField
          value={s.awayScore}
          onChange={(e) => onChange(game.id, 'awayScore', e.target.value)}
          size="small"
          type="number"
          disabled={readOnly}
          slotProps={{ htmlInput: { min: 0, style: { textAlign: 'center', padding: '4px 6px', width: 52 } } }}
        />
      </TableCell>

      <TableCell align="center" sx={{ width: 24, px: 0 }}>
        <Typography variant="body2" color="text.disabled">–</Typography>
      </TableCell>

      {/* Home score */}
      <TableCell align="center" sx={{ width: 72 }}>
        <TextField
          value={s.homeScore}
          onChange={(e) => onChange(game.id, 'homeScore', e.target.value)}
          size="small"
          type="number"
          disabled={readOnly}
          slotProps={{ htmlInput: { min: 0, style: { textAlign: 'center', padding: '4px 6px', width: 52 } } }}
        />
      </TableCell>

      {/* Home */}
      <TableCell>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" fontWeight={600}>{homeShort}</Typography>
          {homePicks > 0 && (
            <Chip label={homePicks} size="small" variant="outlined" color="default"
              sx={{ height: 18, fontSize: 11 }} />
          )}
        </Stack>
        <Typography variant="caption" color="text.secondary" noWrap>{game.homeTeam}</Typography>
      </TableCell>

      {/* Spread */}
      <TableCell align="center" sx={{ width: 100 }}>
        <Typography variant="caption" fontWeight={700} color="text.secondary">
          {spreadLabel(game.homeTeam, game.homeSpread)}
        </Typography>
      </TableCell>

      {/* Live result */}
      <TableCell align="center" sx={{ width: 140 }}>
        {resultChip ?? <Typography variant="caption" color="text.disabled">—</Typography>}
      </TableCell>

      {/* On-card badge */}
      <TableCell align="center" sx={{ width: 80 }}>
        {game.onCard
          ? <Chip label="On card" size="small" color="primary" variant="muted" />
          : <Chip label="Off card" size="small" variant="outlined" sx={{ opacity: 0.4 }} />}
      </TableCell>
    </TableRow>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function GradePicksPage() {
  const [weeks, setWeeks]           = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [card, setCard]             = useState(null);
  const [summary, setSummary]       = useState(null);
  const [scores, setScores]         = useState({});
  const [loadingCard, setLoadingCard] = useState(false);
  const [saving, setSaving]         = useState(false);
  const [gradeResult, setGradeResult] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [error, setError]           = useState('');

  // Load week list
  useEffect(() => {
    fetch('/api/weekly-cards?season=2025')
      .then((r) => r.json())
      .then((data) => {
        const relevant = data
          .filter((w) => w.status !== 'Draft')
          .sort((a, b) => a.weekNum - b.weekNum);
        setWeeks(relevant);
        // Auto-select most recent locked week, else last
        const locked = relevant.filter((w) => w.status === 'Locked');
        const target = locked[locked.length - 1] || relevant[relevant.length - 1];
        if (target) setSelectedId(target.id);
      });
  }, []);

  const loadWeek = useCallback(async (id) => {
    if (!id) return;
    setLoadingCard(true);
    setGradeResult(null);
    setError('');
    try {
      const [cardData, summaryData] = await Promise.all([
        fetch(`/api/weekly-cards/${id}`).then((r) => r.json()),
        fetch(`/api/weekly-cards/${id}/grade-summary`).then((r) => r.json()),
      ]);
      setCard(cardData);
      setSummary(summaryData);
      // Pre-fill scores from existing Final games
      const init = {};
      cardData.games.forEach((g) => {
        init[g.id] = {
          awayScore: g.awayScore != null ? String(g.awayScore) : '',
          homeScore: g.homeScore != null ? String(g.homeScore) : '',
        };
      });
      setScores(init);
    } catch (e) {
      setError('Failed to load week: ' + e.message);
    } finally {
      setLoadingCard(false);
    }
  }, []);

  useEffect(() => { loadWeek(selectedId); }, [selectedId]);

  function handleScoreChange(gameId, field, value) {
    setScores((prev) => ({ ...prev, [gameId]: { ...prev[gameId], [field]: value } }));
  }

  // Live grading preview
  const preview = useMemo(() => {
    if (!summary) return null;
    let wins = 0, losses = 0, pushes = 0, pending = 0;

    summary.gameStats.forEach((gs) => {
      const s = scores[gs.gameId];
      if (!s || s.awayScore === '' || s.homeScore === '') {
        pending += gs.totalPicks;
        return;
      }
      const margin = Number(s.homeScore) - Number(s.awayScore);
      const adj    = margin + gs.homeSpread;
      const homePicks = gs.teamCounts?.[gs.homeTeam] ?? 0;
      const awayPicks = gs.teamCounts?.[gs.awayTeam] ?? 0;

      if (adj === 0) {
        pushes += gs.totalPicks;
      } else if (adj > 0) {
        wins   += homePicks;
        losses += awayPicks;
      } else {
        wins   += awayPicks;
        losses += homePicks;
      }
    });
    return { wins, losses, pushes, pending };
  }, [scores, summary]);

  const filledGames = card
    ? card.games.filter((g) => {
        const s = scores[g.id];
        return s && s.awayScore !== '' && s.homeScore !== '';
      }).length
    : 0;

  async function handleGrade() {
    setSaving(true); setError(''); setConfirmOpen(false);
    try {
      const scoresList = Object.entries(scores)
        .filter(([, v]) => v.awayScore !== '' && v.homeScore !== '')
        .map(([gameId, v]) => ({
          gameId,
          awayScore: Number(v.awayScore),
          homeScore: Number(v.homeScore),
        }));

      const r = await fetch(`/api/weekly-cards/${selectedId}/grade`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scores: scoresList }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setGradeResult(j);

      // Reload summary to reflect updated grade counts
      const updated = await fetch(`/api/weekly-cards/${selectedId}/grade-summary`).then((r) => r.json());
      setSummary(updated);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const onCardGames = card?.games.filter((g) => g.onCard) ?? [];
  const allGames    = card?.games ?? [];

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>Grade Picks</Typography>
          <Typography variant="body2" color="text.secondary">
            Enter final scores, preview results, and apply grades to all entries.
          </Typography>
        </Box>
      </Stack>

      {/* Week selector */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
          Season 2025
        </Typography>
        <Stack direction="row" spacing={0.75} flexWrap="wrap">
          {weeks.map((w) => (
            <Chip
              key={w.id}
              label={`W${w.weekNum}`}
              size="small"
              color={selectedId === w.id ? 'primary' : CARD_STATUS_COLOR[w.status]}
              variant={selectedId === w.id ? 'filled' : 'outlined'}
              icon={selectedId === w.id ? undefined : CARD_STATUS_ICON[w.status]}
              onClick={() => setSelectedId(w.id)}
              sx={{ cursor: 'pointer', fontWeight: selectedId === w.id ? 700 : 400 }}
            />
          ))}
        </Stack>
      </Box>

      {loadingCard && <Stack alignItems="center" py={8}><CircularProgress /></Stack>}

      {!loadingCard && card && (
        <Stack spacing={2}>

          {/* Week header */}
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography variant="h6" fontWeight={800}>Week {card.weekNum}</Typography>
                  <Chip label={card.status} size="small" color={CARD_STATUS_COLOR[card.status]}
                    icon={CARD_STATUS_ICON[card.status]} variant="muted" />
                </Stack>

                {summary && (
                  <Stack direction="row" spacing={3}>
                    {[
                      { label: 'Submissions',    val: summary.totalSubmissions },
                      { label: 'Total Picks',    val: summary.totalPicks },
                      { label: 'Graded',         val: summary.gradedPicks,   color: 'success.main' },
                      { label: 'Ungraded',       val: summary.ungradedPicks, color: summary.ungradedPicks > 0 ? 'warning.main' : 'text.secondary' },
                    ].map(({ label, val, color }) => (
                      <Box key={label} textAlign="right">
                        <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                        <Typography variant="h6" fontWeight={800} color={color || 'text.primary'} lineHeight={1}>
                          {val}
                        </Typography>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Stack>
            </CardContent>
          </Card>

          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

          {/* Grade result banner */}
          {gradeResult && (
            <Alert severity="success" icon={<TaskAltIcon />}
              onClose={() => setGradeResult(null)}>
              Grades applied — {gradeResult.gamesUpdated} game{gradeResult.gamesUpdated !== 1 ? 's' : ''} scored ·{' '}
              <strong>{gradeResult.wins}W</strong> /{' '}
              <strong>{gradeResult.losses}L</strong> /{' '}
              <strong>{gradeResult.pushes}P</strong>
              {gradeResult.skipped > 0 && ` · ${gradeResult.skipped} picks skipped (missing scores)`}
            </Alert>
          )}

          {/* No picks state */}
          {summary?.totalSubmissions === 0 && (
            <Alert severity="info">No picks have been submitted for this week yet.</Alert>
          )}

          {/* Score entry table */}
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
              Game Scores
            </Typography>
            <TableContainer component={Paper} variant="outlined">
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 700 }}>Away</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 72 }} align="center">Pts</TableCell>
                    <TableCell sx={{ width: 24, px: 0 }} />
                    <TableCell sx={{ fontWeight: 700, width: 72 }} align="center">Pts</TableCell>
                    <TableCell sx={{ fontWeight: 700 }}>Home</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 100 }} align="center">Spread</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 140 }} align="center">Result</TableCell>
                    <TableCell sx={{ fontWeight: 700, width: 80 }} align="center" />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {allGames.map((game) => (
                    <GameRow
                      key={game.id}
                      game={game}
                      gameStat={summary?.gameStats.find((gs) => gs.gameId === game.id)}
                      scores={scores}
                      onChange={handleScoreChange}
                      readOnly={card.status !== 'Locked'}
                    />
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Box>

          {/* Not-locked notice */}
          {card.status !== 'Locked' && (
            <Alert severity="info">
              This week is <strong>{card.status}</strong>. Lock the week before entering scores and grading picks.
            </Alert>
          )}

          {/* Grading preview + action */}
          {summary?.totalPicks > 0 && card.status === 'Locked' && (
            <Card variant="outlined">
              <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                  <Box>
                    <Typography variant="body2" fontWeight={700} gutterBottom>Grading Preview</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Based on {filledGames} of {onCardGames.length} on-card game scores entered
                    </Typography>
                  </Box>

                  {preview && (
                    <Stack direction="row" spacing={2} alignItems="center">
                      {[
                        { label: 'Win',    val: preview.wins,    color: 'success' },
                        { label: 'Loss',   val: preview.losses,  color: 'error'   },
                        { label: 'Push',   val: preview.pushes,  color: 'info'    },
                        { label: 'Pending', val: preview.pending, color: 'default' },
                      ].map(({ label, val, color }) => (
                        <Stack key={label} alignItems="center">
                          <Typography variant="h6" fontWeight={900}
                            color={color !== 'default' ? `${color}.main` : 'text.secondary'}
                            lineHeight={1}>
                            {val}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">{label}</Typography>
                        </Stack>
                      ))}

                      <Divider orientation="vertical" flexItem />

                      <Tooltip title={filledGames === 0 ? 'Enter at least one game score first' : ''}>
                        <span>
                          <Button
                            variant="contained"
                            color="primary"
                            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <GradingIcon />}
                            disabled={saving || filledGames === 0}
                            onClick={() => setConfirmOpen(true)}
                          >
                            Save Scores & Grade
                          </Button>
                        </span>
                      </Tooltip>
                    </Stack>
                  )}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {/* Confirm dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Apply Grades — Week {card?.weekNum}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            This will save scores for {filledGames} game{filledGames !== 1 ? 's' : ''} and
            grade {summary?.totalPicks ?? 0} picks across {summary?.totalSubmissions ?? 0} entries.
            Existing grades for scored games will be overwritten.
          </Typography>
          {preview && (
            <Stack direction="row" spacing={2} mt={2}>
              <Box><Typography variant="h6" fontWeight={800} color="success.main">{preview.wins}W</Typography></Box>
              <Box><Typography variant="h6" fontWeight={800} color="error.main">{preview.losses}L</Typography></Box>
              <Box><Typography variant="h6" fontWeight={800} color="info.main">{preview.pushes}P</Typography></Box>
              {preview.pending > 0 && (
                <Box>
                  <Typography variant="h6" fontWeight={800} color="text.secondary">{preview.pending}</Typography>
                  <Typography variant="caption" color="text.secondary">skipped</Typography>
                </Box>
              )}
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)} variant="outlined">Cancel</Button>
          <Button onClick={handleGrade} variant="contained" color="primary"
            startIcon={<GradingIcon />}>
            Confirm & Grade
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
