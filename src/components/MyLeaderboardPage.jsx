import { useState, useEffect, useMemo } from 'react';
import { useUser } from '../UserContext.jsx';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Paper from '@mui/material/Paper';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Tooltip from '@mui/material/Tooltip';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import LeaderboardIcon from '@mui/icons-material/Leaderboard';

const CONTEST_TYPE_LABEL = { sc: 'SuperContest', wta: 'Winner Take All', surv: 'Survivor' };
const RANK_COLOR = { 1: '#FFD700', 2: '#B0BEC5', 3: '#CD7F32' };
const safeBottom = 'max(env(safe-area-inset-bottom, 0px), 16px)';

function fmt(score) {
  if (score == null) return '—';
  return score % 1 === 0 ? String(score) : score.toFixed(1);
}

function RankCell({ rank }) {
  const medal = rank <= 3 ? ['🥇', '🥈', '🥉'][rank - 1] : null;
  return (
    <Typography variant="body2" fontWeight={900}
      sx={{ color: RANK_COLOR[rank] ?? 'text.secondary', minWidth: 28 }}>
      {medal ?? `#${rank}`}
    </Typography>
  );
}

function WeekCell({ score, isSurvivor }) {
  if (score == null) return <Typography variant="body2" color="text.disabled" align="center">—</Typography>;
  const label = isSurvivor ? (score > 0 ? 'W' : 'L') : fmt(score);
  const color = isSurvivor
    ? (score > 0 ? 'success.main' : 'error.main')
    : score >= 4.5 ? 'success.main' : score >= 3.5 ? 'success.light'
    : score >= 2.5 ? 'text.primary' : score >= 1.5 ? 'warning.main' : 'error.main';
  return (
    <Typography variant="body2" fontWeight={700} align="center" color={color}>{label}</Typography>
  );
}

// ── Per-contest leaderboard block ─────────────────────────────────────────────
function ContestLeaderboard({ contestId, myTicketIds, myOnly }) {
  const [data, setData]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    fetch(`/api/standings?contestId=${contestId}`)
      .then((r) => r.json())
      .then((d) => { if (d.error) throw new Error(d.error); setData(d); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [contestId]);

  const isSurvivor  = data?.contest?.type === 'surv';
  const gradedWeeks = data?.gradedWeeks ?? [];

  const entries = useMemo(() => {
    if (!data) return [];
    const all = data.entries;
    return myOnly ? all.filter((e) => myTicketIds.has(e.ticketId)) : all;
  }, [data, myOnly, myTicketIds]);

  if (loading) return <Stack alignItems="center" py={4}><CircularProgress size={24} /></Stack>;
  if (error)   return <Alert severity="error">{error}</Alert>;
  if (!data)   return null;

  return (
    <Box>
      {/* Contest header */}
      <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
        <EmojiEventsIcon fontSize="small" color="warning" />
        <Typography variant="subtitle1" fontWeight={800}>{data.contest.name}</Typography>
        <Chip label={CONTEST_TYPE_LABEL[data.contest.type] ?? data.contest.type}
          size="small" variant="outlined" color="default" />
        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto !important' }}>
          {gradedWeeks.length} / {data.totalWeeks} weeks graded
        </Typography>
      </Stack>

      {gradedWeeks.length === 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>No weeks graded yet.</Alert>
      )}

      {entries.length === 0 && gradedWeeks.length > 0 && (
        <Alert severity="info" sx={{ mb: 2 }}>No entries to show.</Alert>
      )}

      {entries.length > 0 && (
        <TableContainer component={Paper} variant="outlined" sx={{ mb: 0 }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell sx={{ fontWeight: 700, width: 48 }}>Rank</TableCell>
                <TableCell sx={{ fontWeight: 700 }}>Entry</TableCell>
                {gradedWeeks.map((wn) => (
                  <TableCell key={wn} align="center" sx={{ fontWeight: 700, width: 48 }}>W{wn}</TableCell>
                ))}
                <TableCell align="right" sx={{ fontWeight: 700, width: 64 }}>Total</TableCell>
                <TableCell align="center" sx={{ fontWeight: 700, width: 80 }}>Record</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {entries.map((entry) => {
                const isMine = myTicketIds.has(entry.ticketId);
                return (
                  <TableRow
                    key={entry.ticketId}
                    sx={{
                      bgcolor: isMine ? 'primary.main' : undefined,
                      opacity: entry.status === 'Suspended' ? 0.55 : 1,
                      '& .MuiTableCell-root': isMine
                        ? { color: 'primary.contrastText', fontWeight: 700 }
                        : undefined,
                    }}
                  >
                    <TableCell><RankCell rank={entry.rank} /></TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={isMine ? 900 : 400}>{entry.label}</Typography>
                      <Typography variant="caption" fontFamily="monospace"
                        sx={{ opacity: 0.7 }}>{entry.ticketId}</Typography>
                    </TableCell>
                    {gradedWeeks.map((wn) => (
                      <TableCell key={wn} align="center">
                        <WeekCell score={entry.weekScores[wn] ?? null} isSurvivor={isSurvivor} />
                      </TableCell>
                    ))}
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={900}
                        color={entry.rank === 1 ? 'warning.main' : undefined}>
                        {isSurvivor ? entry.wins : fmt(entry.totalScore)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Typography variant="caption">
                        {isSurvivor
                          ? `${entry.wins}W–${entry.losses + entry.missed}L`
                          : `${entry.wins}–${entry.losses}${entry.pushes > 0 ? `–${entry.pushes}` : ''}`}
                      </Typography>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}

// ── Root page ─────────────────────────────────────────────────────────────────
export default function MyLeaderboardPage() {
  const { currentUser } = useUser();
  const [tickets, setTickets]     = useState([]);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState('');
  const [myOnly, setMyOnly]       = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    fetch(`/api/tickets?userId=${currentUser.id}`)
      .then((r) => r.json())
      .then(setTickets)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [currentUser?.id]);

  // Unique active contest IDs from user's tickets
  const contestIds = useMemo(() => {
    const active = tickets.filter((t) => t.status === 'Active' || t.status === 'Suspended');
    return [...new Set(active.map((t) => t.contestId))];
  }, [tickets]);

  // Set of this user's ticket IDs for highlighting
  const myTicketIds = useMemo(() => new Set(tickets.map((t) => t.id)), [tickets]);

  if (!currentUser) {
    return (
      <Box sx={{ maxWidth: 480, mx: 'auto', py: 8, px: 2 }}>
        <Alert severity="info">
          No user selected. Go to <strong>User Login</strong> to choose a contestant.
        </Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', bgcolor: 'background.default' }}>
      {/* Sticky header */}
      <AppBar position="sticky" color="default" elevation={0}
        sx={{ borderBottom: '1px solid', borderColor: 'divider', backdropFilter: 'blur(8px)' }}>
        <Toolbar sx={{ gap: 1 }}>
          <LeaderboardIcon sx={{ color: 'primary.main', flexShrink: 0 }} />
          <Box sx={{ flexGrow: 1, minWidth: 0 }}>
            <Typography variant="subtitle1" fontWeight={900} lineHeight={1.2} noWrap>My Leaderboard</Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {currentUser.name}
            </Typography>
          </Box>
          <Tooltip title="Show only my tickets in the table">
            <FormControlLabel
              control={
                <Switch size="small" checked={myOnly} onChange={(e) => setMyOnly(e.target.checked)} />
              }
              label={<Typography variant="caption">My tickets only</Typography>}
              labelPlacement="start"
              sx={{ mr: 0 }}
            />
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Box sx={{ flex: 1, overflowY: 'auto', px: 2, pt: 2, pb: safeBottom }}>
        {error   && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {loading && <Stack alignItems="center" py={8}><CircularProgress /></Stack>}

        {!loading && contestIds.length === 0 && (
          <Alert severity="info">You have no active contest entries.</Alert>
        )}

        {!loading && contestIds.length > 0 && (
          <Stack spacing={3}>
            {contestIds.map((contestId) => (
              <Card key={contestId} variant="outlined">
                <CardContent>
                  <ContestLeaderboard
                    contestId={contestId}
                    myTicketIds={myTicketIds}
                    myOnly={myOnly}
                  />
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
      </Box>
    </Box>
  );
}
