import { useState, useEffect, useCallback } from 'react';
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
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import EditIcon from '@mui/icons-material/Edit';
import LockIcon from '@mui/icons-material/Lock';
import PublishIcon from '@mui/icons-material/Publish';
import LockOpenIcon from '@mui/icons-material/LockOpen';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function fmtDeadline(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

function toDatetimeLocal(iso) {
  if (!iso) return '';
  // Convert to local datetime-local input value (strips TZ)
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

const CONTEST_STATUS_COLOR = {
  Draft: 'default',
  'Registration Open': 'info',
  Active: 'success',
  Closed: 'warning',
  Archived: 'default',
};

const CARD_STATUS_COLOR = { Draft: 'default', Published: 'info', Locked: 'success' };
const CARD_STATUS_ICON  = {
  Draft:     <LockOpenIcon fontSize="small" />,
  Published: <PublishIcon fontSize="small" />,
  Locked:    <LockIcon fontSize="small" />,
};

// ── Edit deadline dialog ──────────────────────────────────────────────────────
function EditDeadlineDialog({ open, week, onClose, onSave }) {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setValue(toDatetimeLocal(week?.picksDeadline));
    setError('');
  }, [open, week]);

  async function handleSave() {
    setSaving(true); setError('');
    try {
      await onSave(week.id, value ? new Date(value).toISOString() : null);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Edit Picks Deadline — Week {week?.weekNum}</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField
            label="Picks Deadline"
            type="datetime-local"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            size="small"
            fullWidth
            slotProps={{ inputLabel: { shrink: true } }}
            helperText="Typically Saturday 5:00 PM Pacific"
          />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}
          startIcon={saving ? <CircularProgress size={14} /> : null}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SchedulePage() {
  const [contests, setContests]   = useState([]);
  const [weeks, setWeeks]         = useState([]);
  const [loading, setLoading]     = useState(true);
  const [deadlineDlg, setDeadlineDlg] = useState({ open: false, week: null });
  const [error, setError]         = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const [c, w] = await Promise.all([
      fetch('/api/contests').then((r) => r.json()),
      fetch('/api/weekly-cards?season=2025').then((r) => r.json()),
    ]);
    setContests(c);
    setWeeks(w.sort((a, b) => a.weekNum - b.weekNum));
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, []);

  async function handleSaveDeadline(cardId, picksDeadline) {
    const r = await fetch(`/api/weekly-cards/${cardId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ picksDeadline }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    setDeadlineDlg({ open: false, week: null });
    setWeeks((prev) => prev.map((w) => w.id === cardId ? { ...w, picksDeadline: j.picksDeadline } : w));
  }

  if (loading) {
    return <Stack alignItems="center" py={8}><CircularProgress /></Stack>;
  }

  // Group contests by season for display
  const activeContests = contests.filter((c) => c.status !== 'Archived');

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>Schedule & Deadlines</Typography>
          <Typography variant="body2" color="text.secondary">
            Contest season dates and weekly picks deadlines.
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Contest schedule */}
      <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
        Contest Schedule
      </Typography>
      <Stack spacing={1.5} mb={4}>
        {activeContests.map((c) => (
          <Card key={c.id} variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={1.5}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Typography variant="body1" fontWeight={700}>{c.name}</Typography>
                  <Chip
                    label={c.status}
                    size="small"
                    color={CONTEST_STATUS_COLOR[c.status] || 'default'}
                    variant="muted"
                  />
                </Stack>
                <Stack direction="row" spacing={3} flexWrap="wrap">
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Registration Opens</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmtDate(c.registrationOpen)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Registration Closes</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmtDate(c.registrationClose)}</Typography>
                  </Box>
                  <Divider orientation="vertical" flexItem />
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Season Start</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmtDate(c.contestStart)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Season End</Typography>
                    <Typography variant="body2" fontWeight={600}>{fmtDate(c.contestEnd)}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="caption" color="text.secondary" display="block">Weeks</Typography>
                    <Typography variant="body2" fontWeight={600}>{c.totalWeeks}</Typography>
                  </Box>
                </Stack>
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>

      {/* Weekly deadlines */}
      <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
        Weekly Picks Deadlines — Season 2025
      </Typography>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 80 }}>Week</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 120 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Picks Deadline</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 60 }} align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {weeks.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4, color: 'text.disabled' }}>
                  No weeks created yet
                </TableCell>
              </TableRow>
            )}
            {weeks.map((w) => (
              <TableRow key={w.id} hover>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>W{w.weekNum}</Typography>
                </TableCell>
                <TableCell>
                  <Chip
                    label={w.status}
                    size="small"
                    color={CARD_STATUS_COLOR[w.status]}
                    icon={CARD_STATUS_ICON[w.status]}
                    variant="muted"
                  />
                </TableCell>
                <TableCell>
                  <Typography
                    variant="body2"
                    color={w.picksDeadline ? 'text.primary' : 'text.disabled'}
                  >
                    {fmtDeadline(w.picksDeadline)}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  {w.status !== 'Locked' && (
                    <Tooltip title="Edit deadline">
                      <IconButton size="small" onClick={() => setDeadlineDlg({ open: true, week: w })}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <EditDeadlineDialog
        open={deadlineDlg.open}
        week={deadlineDlg.week}
        onClose={() => setDeadlineDlg({ open: false, week: null })}
        onSave={handleSaveDeadline}
      />
    </Box>
  );
}
