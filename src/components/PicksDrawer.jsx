import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import CloseIcon from '@mui/icons-material/Close';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtSpread(pickedTeam, homeTeam, homeSpread) {
  if (homeSpread === 0) return 'PK';
  const pickedIsHome = pickedTeam === homeTeam;
  const spread = pickedIsHome ? homeSpread : -homeSpread;
  return spread > 0 ? `+${spread}` : String(spread);
}

function fmtScore(game) {
  if (game.awayScore == null) return null;
  return `${game.awayTeam.split(' ').pop()} ${game.awayScore} – ${game.homeScore} ${game.homeTeam.split(' ').pop()}`;
}

function fmtSubmitted(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

const RESULT_COLOR  = { Win: 'success', Loss: 'error', Push: 'info' };
const SUB_STATUS_COLOR = { Graded: 'success', Submitted: 'warning', Missed: 'error', Open: 'default' };

// ── Single pick row ───────────────────────────────────────────────────────────
function PickRow({ pick, isSurvivor }) {
  const opponent = pick.pickedTeam === pick.homeTeam ? pick.awayTeam : pick.homeTeam;
  const spread   = isSurvivor ? null : fmtSpread(pick.pickedTeam, pick.homeTeam, pick.homeSpread);
  const score    = fmtScore(pick);

  return (
    <Stack direction="row" alignItems="center" justifyContent="space-between"
      sx={{ py: 0.75, px: 1, borderRadius: 1, '&:hover': { bgcolor: 'action.hover' } }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ minWidth: 0 }}>
        <SportsFootballIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
        <Box sx={{ minWidth: 0 }}>
          <Typography variant="body2" fontWeight={700} noWrap>
            {pick.pickedTeam.split(' ').slice(-1)[0]}
            {spread && (
              <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                {spread}
              </Typography>
            )}
          </Typography>
          <Typography variant="caption" color="text.secondary" noWrap>
            vs {opponent.split(' ').slice(-1)[0]}
            {score && ` · ${score}`}
          </Typography>
        </Box>
      </Stack>

      {pick.result ? (
        <Chip label={pick.result} size="small" color={RESULT_COLOR[pick.result]} variant="muted"
          sx={{ fontWeight: 700, minWidth: 52, flexShrink: 0 }} />
      ) : (
        <Chip label="Pending" size="small" color="default" variant="muted"
          sx={{ minWidth: 52, flexShrink: 0 }} />
      )}
    </Stack>
  );
}

// ── Week section ──────────────────────────────────────────────────────────────
function WeekSection({ week, isSurvivor }) {
  const wins   = week.picks.filter((p) => p.result === 'Win').length;
  const pushes = week.picks.filter((p) => p.result === 'Push').length;
  const losses = week.picks.filter((p) => p.result === 'Loss').length;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={0.5}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Typography variant="body2" fontWeight={800}>Week {week.weekNum}</Typography>
          <Chip
            label={week.submissionStatus}
            size="small"
            color={SUB_STATUS_COLOR[week.submissionStatus] || 'default'}
            variant="muted"
          />
        </Stack>
        {week.submissionStatus !== 'Missed' && week.submissionStatus !== 'Open' && (
          <Stack direction="row" alignItems="center" spacing={0.5}>
            {week.submissionStatus === 'Graded' ? (
              <>
                <Typography variant="body2" fontWeight={800} color="success.main">{wins}W</Typography>
                {pushes > 0 && <Typography variant="body2" color="info.main">{pushes}P</Typography>}
                <Typography variant="body2" color="error.main">{losses}L</Typography>
                <Typography variant="body2" fontWeight={800} color="text.secondary" sx={{ ml: 0.5 }}>
                  {week.weekScore % 1 === 0 ? week.weekScore.toFixed(0) : week.weekScore.toFixed(1)} pts
                </Typography>
              </>
            ) : (
              <Typography variant="caption" color="text.secondary">
                Submitted {fmtSubmitted(week.submittedAt)}
              </Typography>
            )}
          </Stack>
        )}
      </Stack>

      {week.submissionStatus === 'Missed' && (
        <Typography variant="caption" color="text.disabled" sx={{ pl: 1 }}>
          No picks submitted — 0 pts
        </Typography>
      )}
      {week.submissionStatus === 'Open' && (
        <Typography variant="caption" color="text.disabled" sx={{ pl: 1 }}>
          Deadline not yet passed
        </Typography>
      )}
      {week.picks.length > 0 && (
        <Box sx={{ mt: 0.5 }}>
          {week.picks.map((pick) => (
            <PickRow key={pick.gameId} pick={pick} isSurvivor={isSurvivor} />
          ))}
        </Box>
      )}
    </Box>
  );
}

// ── Main drawer ───────────────────────────────────────────────────────────────
export default function PicksDrawer({ entry, onClose }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!entry) { setData(null); return; }
    setLoading(true);
    fetch(`/api/tickets/${entry.id}/picks`)
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, [entry?.id]);

  const isSurvivor = entry?.contestType === 'surv';

  return (
    <Drawer
      anchor="right"
      open={Boolean(entry)}
      onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 440 } } }}
    >
      {!entry ? null : (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Header */}
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between"
            sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1} mb={0.25}>
                <Typography variant="h6" fontWeight={800}>{entry.userName}</Typography>
                <Chip label={entry.id} size="small" variant="outlined" color="primary"
                  sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                {entry.contestName} · {entry.label}
              </Typography>
            </Box>
            <IconButton onClick={onClose} size="small" sx={{ mt: 0.5 }}>
              <CloseIcon />
            </IconButton>
          </Stack>

          {/* Score summary */}
          {data && !loading && (
            <Stack direction="row" spacing={3} sx={{ px: 3, py: 1.5, borderBottom: '1px solid', borderColor: 'divider' }}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Season Score</Typography>
                <Typography variant="h5" fontWeight={900} color="primary.main" lineHeight={1}>
                  {data.totalScore % 1 === 0 ? data.totalScore.toFixed(0) : data.totalScore.toFixed(1)}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>pts</Typography>
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Weeks Graded</Typography>
                <Typography variant="h5" fontWeight={900} lineHeight={1}>
                  {data.weeksGraded}
                  <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
                    / {data.weeks.length}
                  </Typography>
                </Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">Missed</Typography>
                <Typography variant="h5" fontWeight={900} color="error.main" lineHeight={1}>
                  {data.weeks.filter((w) => w.submissionStatus === 'Missed').length}
                </Typography>
              </Box>
            </Stack>
          )}

          {/* Weeks */}
          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
            {loading && (
              <Stack alignItems="center" py={6}><CircularProgress /></Stack>
            )}
            {!loading && data?.weeks.length === 0 && (
              <Stack alignItems="center" py={6} spacing={1} sx={{ opacity: 0.4 }}>
                <SportsFootballIcon sx={{ fontSize: 40 }} />
                <Typography variant="body2">No picks yet for this entry</Typography>
              </Stack>
            )}
            {!loading && data && (
              <Stack spacing={2} divider={<Divider />}>
                {data.weeks.map((week) => (
                  <WeekSection key={week.weekNum} week={week} isSurvivor={isSurvivor} />
                ))}
              </Stack>
            )}
          </Box>
        </Box>
      )}
    </Drawer>
  );
}
