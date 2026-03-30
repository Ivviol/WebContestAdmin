import { useState, useEffect, useMemo } from 'react';
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
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import PicksDrawer from './PicksDrawer.jsx';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(score) {
  if (score == null) return null;
  return score % 1 === 0 ? String(score) : score.toFixed(1);
}

function weekScoreColor(score, isSurvivor) {
  if (score == null) return 'text.disabled';
  if (isSurvivor) return score > 0 ? 'success.main' : 'error.main';
  if (score >= 4.5) return 'success.main';
  if (score >= 3.5) return 'success.light';
  if (score >= 2.5) return 'text.primary';
  if (score >= 1.5) return 'warning.main';
  return 'error.main';
}

const RANK_COLOR = { 1: '#FFD700', 2: '#B0BEC5', 3: '#CD7F32' };

const CONTEST_TYPE_LABEL = { sc: 'SuperContest', wta: 'Winner Take All', surv: 'Survivor' };

const ENTRY_STATUS_COLOR = {
  Active:            'success',
  Suspended:         'default',
  'Pending Payment': 'warning',
};

// ── Rank cell ─────────────────────────────────────────────────────────────────
function RankCell({ rank }) {
  return (
    <Typography
      variant="body2"
      fontWeight={900}
      sx={{ color: RANK_COLOR[rank] ?? 'text.secondary', minWidth: 28 }}
    >
      {rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : `#${rank}`}
    </Typography>
  );
}

// ── Week score cell ───────────────────────────────────────────────────────────
function WeekCell({ score, isSurvivor }) {
  if (score == null) {
    return (
      <Tooltip title="No submission">
        <Typography variant="body2" color="text.disabled" align="center">—</Typography>
      </Tooltip>
    );
  }
  const label = isSurvivor ? (score > 0 ? 'W' : 'L') : fmt(score);
  return (
    <Typography
      variant="body2"
      fontWeight={700}
      align="center"
      color={weekScoreColor(score, isSurvivor)}
    >
      {label}
    </Typography>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function StandingsPage() {
  const [contestsList, setContestsList] = useState([]);
  const [selectedId, setSelectedId]     = useState(null);
  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [picksEntry, setPicksEntry]     = useState(null); // { ticketId, label, userName }

  // Load contest list
  useEffect(() => {
    fetch('/api/contests')
      .then((r) => r.json())
      .then((list) => {
        const active = list.filter(
          (c) => c.status === 'Active' || c.status === 'Registration Open'
        );
        setContestsList(active);
        if (active.length > 0) setSelectedId(active[0].id);
      });
  }, []);

  // Load standings when contest changes
  useEffect(() => {
    if (!selectedId) return;
    setLoading(true);
    setError('');
    fetch(`/api/standings?contestId=${selectedId}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [selectedId]);

  const isSurvivor = data?.contest?.type === 'surv';
  const gradedWeeks = data?.gradedWeeks ?? [];

  // Split active vs suspended entries for display
  const { active: activeEntries, suspended: suspendedEntries } = useMemo(() => {
    if (!data) return { active: [], suspended: [] };
    const active    = data.entries.filter((e) => e.status !== 'Suspended');
    const suspended = data.entries.filter((e) => e.status === 'Suspended');
    return { active, suspended };
  }, [data]);

  // Summary stats
  const stats = useMemo(() => {
    if (!data || data.entries.length === 0) return null;
    const scores = data.entries.map((e) => e.totalScore);
    const leader = data.entries[0];
    const avg    = scores.reduce((s, v) => s + v, 0) / scores.length;
    return { leader, avg, weeksGraded: gradedWeeks.length };
  }, [data, gradedWeeks]);

  function EntriesTable({ entries, dimmed = false }) {
    if (entries.length === 0) return null;
    return (
      <TableContainer component={Paper} variant="outlined" sx={{ opacity: dimmed ? 0.6 : 1 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 56 }}>Rank</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Contestant</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Entry</TableCell>
              {gradedWeeks.map((wn) => (
                <TableCell key={wn} align="center" sx={{ fontWeight: 700, width: 56 }}>
                  W{wn}
                </TableCell>
              ))}
              <TableCell align="right" sx={{ fontWeight: 700, width: 72 }}>Total</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: 96 }}>Record</TableCell>
              <TableCell align="center" sx={{ fontWeight: 700, width: 80 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {entries.map((entry) => (
              <TableRow
                key={entry.ticketId}
                hover
                onClick={() => setPicksEntry({ id: entry.ticketId, label: entry.label, userName: entry.userName, contestName: data.contest.name })}
                sx={{
                  cursor: 'pointer',
                  opacity: entry.status === 'Suspended' ? 0.65 : 1,
                  bgcolor: entry.rank === 1 && !dimmed ? 'rgba(255,215,0,0.04)' : undefined,
                }}
              >
                {/* Rank */}
                <TableCell>
                  <RankCell rank={entry.rank} />
                </TableCell>

                {/* Contestant */}
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{entry.userName}</Typography>
                  <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                    {entry.ticketId}
                  </Typography>
                </TableCell>

                {/* Label */}
                <TableCell>
                  <Typography variant="body2">{entry.label}</Typography>
                </TableCell>

                {/* Per-week scores */}
                {gradedWeeks.map((wn) => (
                  <TableCell key={wn} align="center">
                    <WeekCell score={entry.weekScores[wn] ?? null} isSurvivor={isSurvivor} />
                  </TableCell>
                ))}

                {/* Total */}
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={900}
                    color={entry.rank === 1 ? 'warning.main' : 'text.primary'}>
                    {isSurvivor ? entry.wins : fmt(entry.totalScore)}
                  </Typography>
                </TableCell>

                {/* Record */}
                <TableCell align="center">
                  {isSurvivor ? (
                    <Typography variant="caption" color="text.secondary">
                      {entry.wins}W–{entry.losses + entry.missed}L
                    </Typography>
                  ) : (
                    <Typography variant="caption" color="text.secondary">
                      {entry.wins}–{entry.losses}
                      {entry.pushes > 0 ? `–${entry.pushes}` : ''}
                    </Typography>
                  )}
                </TableCell>

                {/* Status */}
                <TableCell align="center">
                  <Chip
                    label={entry.status}
                    size="small"
                    color={ENTRY_STATUS_COLOR[entry.status] || 'default'}
                    variant="muted"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>Standings</Typography>
          <Typography variant="body2" color="text.secondary">
            Season rankings based on graded weeks. Updated after each grading run.
          </Typography>
        </Box>
      </Stack>

      {/* Contest selector */}
      <Stack direction="row" spacing={0.75} flexWrap="wrap" mb={3}>
        {contestsList.map((c) => (
          <Chip
            key={c.id}
            label={c.name}
            size="small"
            color={selectedId === c.id ? 'primary' : 'default'}
            variant={selectedId === c.id ? 'filled' : 'outlined'}
            onClick={() => setSelectedId(c.id)}
            sx={{ cursor: 'pointer', fontWeight: selectedId === c.id ? 700 : 400 }}
          />
        ))}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <Stack alignItems="center" py={8}><CircularProgress /></Stack>}

      {!loading && data && (
        <Stack spacing={2}>

          {/* Contest + grading context */}
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography variant="h6" fontWeight={800}>{data.contest.name}</Typography>
                  <Chip label={CONTEST_TYPE_LABEL[data.contest.type] ?? data.contest.type}
                    size="small" variant="muted" color="default" />
                </Stack>

                <Stack direction="row" spacing={3}>
                  {[
                    { label: 'Entries',       val: data.entries.length },
                    { label: 'Weeks Graded',  val: `${gradedWeeks.length} / ${data.totalWeeks}` },
                    stats && { label: 'Leader',  val: `${isSurvivor ? stats.leader.wins : fmt(stats.leader.totalScore)} pts`,  color: 'warning.main' },
                    stats && { label: 'Avg Score', val: `${fmt(stats.avg)} pts` },
                  ].filter(Boolean).map(({ label, val, color }) => (
                    <Box key={label} textAlign="right">
                      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                      <Typography variant="body1" fontWeight={800} color={color || 'text.primary'}>
                        {val}
                      </Typography>
                    </Box>
                  ))}
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {gradedWeeks.length === 0 && (
            <Alert severity="info">
              No weeks have been graded for this contest yet. Grade picks on the Grade Picks page first.
            </Alert>
          )}

          {gradedWeeks.length > 0 && data.entries.length === 0 && (
            <Alert severity="info">No entries found for this contest.</Alert>
          )}

          {/* Main standings table */}
          {activeEntries.length > 0 && (
            <EntriesTable entries={activeEntries} />
          )}

          {/* Suspended entries */}
          {suspendedEntries.length > 0 && (
            <Box>
              <Typography variant="overline" color="text.secondary" fontWeight={700}
                display="block" mt={1} mb={1}>
                Suspended Entries
              </Typography>
              <EntriesTable entries={suspendedEntries} dimmed />
            </Box>
          )}

        </Stack>
      )}

      {/* Picks history drawer */}
      <PicksDrawer
        entry={picksEntry}
        onClose={() => setPicksEntry(null)}
      />
    </Box>
  );
}
