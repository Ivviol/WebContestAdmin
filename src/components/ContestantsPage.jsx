import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigation } from '../NavigationContext.js';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Paper from '@mui/material/Paper';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ManageSearchIcon from '@mui/icons-material/ManageSearch';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import PeopleIcon from '@mui/icons-material/People';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

// ── Add Contestant Dialog ─────────────────────────────────────────────────────
function AddContestantDialog({ open, onClose, onSaved }) {
  const [form, setForm]   = useState({ name: '', email: '', phone: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');

  function handleClose() { setForm({ name: '', email: '', phone: '' }); setError(''); onClose(); }

  async function handleSave() {
    if (!form.name.trim()) { setError('Name is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create contestant');
      onSaved(data);
      handleClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="xs" fullWidth>
      <DialogTitle>Add Contestant</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 1 }}>
          {error && <Alert severity="error">{error}</Alert>}
          <TextField label="Full Name" size="small" fullWidth required
            value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} />
          <TextField label="Email" size="small" fullWidth type="email"
            value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))} />
          <TextField label="Phone" size="small" fullWidth
            value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))} />
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Add Contestant'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtCurrency(n) {
  return '$' + n.toLocaleString();
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

const TICKET_STATUS_COLOR = {
  Active:                  'success',
  'Pending Payment':       'warning',
  Suspended:               'default',
  Voided:                  'error',
  'Eliminated (Survivor)': 'error',
};

const CONTEST_TYPE_LABEL = { sc: 'SuperContest', wta: 'Winner Take All', surv: 'Survivor' };

// ── User detail drawer ────────────────────────────────────────────────────────
const DRAWER_MIN = 380;
const DRAWER_MAX = 1100;
const DRAWER_DEFAULT = 480;

function UserDrawer({ userId, onClose }) {
  const { onNavigate } = useNavigation();
  const [user, setUser]         = useState(null);
  const [entries, setEntries]   = useState([]);
  const [loading, setLoading]   = useState(false);
  const [width, setWidth]       = useState(DRAWER_DEFAULT);
  const [dragging, setDragging] = useState(false);

  function goToEntries(search) { onClose(); onNavigate('entries', { search }); }

  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/users/${userId}`).then((r) => r.json()),
      fetch(`/api/tickets?userId=${userId}`).then((r) => r.json()),
    ]).then(([u, t]) => {
      setUser(u);
      setEntries(t);
    }).finally(() => setLoading(false));
  }, [userId]);

  function handleResizeStart(e) {
    e.preventDefault();
    const startX = e.clientX;
    const startW = width;
    setDragging(true);

    function onMove(e) {
      const next = Math.max(DRAWER_MIN, startW + (startX - e.clientX));
      setWidth(next);
    }
    function onUp() {
      setDragging(false);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
  }

  const open = Boolean(userId);

  return (
    <>
      {/* Full-screen cursor overlay while dragging to prevent flicker */}
      {dragging && (
        <Box sx={{ position: 'fixed', inset: 0, cursor: 'col-resize', zIndex: 9999, userSelect: 'none' }} />
      )}

    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      PaperProps={{
        style: { width: window.innerWidth < 600 ? '100%' : `${width}px` },
        sx: { maxWidth: '100vw !important', p: 0, overflow: 'visible' },
      }}
    >
      {/* Drag handle on left edge */}
      <Box
        onMouseDown={handleResizeStart}
        sx={{
          position: 'absolute', left: -4, top: 0, bottom: 0, width: 8,
          cursor: 'col-resize',
          display: { xs: 'none', sm: 'flex' },
          alignItems: 'center', justifyContent: 'center',
          zIndex: 10,
          '&:hover > div': { opacity: 1 },
        }}
      >
        <Box sx={{
          width: 4, height: 40, borderRadius: 2,
          bgcolor: dragging ? 'primary.main' : 'action.disabled',
          opacity: dragging ? 1 : 0,
          transition: 'opacity 0.15s, background-color 0.15s',
        }} />
      </Box>

      {loading || !user ? (
        <Stack alignItems="center" justifyContent="center" height="100%">
          <CircularProgress />
        </Stack>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Drawer header */}
          <Stack direction="row" alignItems="center" justifyContent="space-between"
            sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box>
              <Typography variant="h6" fontWeight={800}>{user.name}</Typography>
              <Typography variant="caption" color="text.secondary" fontFamily="monospace">{user.id}</Typography>
            </Box>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <Tooltip title="Find all entries in Entry Management">
                <IconButton size="small" onClick={() => goToEntries(user.name)}>
                  <ManageSearchIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
            </Stack>
          </Stack>

          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
            <Stack spacing={3}>
              {/* Contact info */}
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
                  Contact
                </Typography>
                <Stack spacing={0.75}>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Email</Typography>
                    <Typography variant="body2">{user.email}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Phone</Typography>
                    <Typography variant="body2">{user.phone}</Typography>
                  </Stack>
                  <Stack direction="row" justifyContent="space-between">
                    <Typography variant="body2" color="text.secondary">Contestant ID</Typography>
                    <Typography variant="body2" fontFamily="monospace" fontWeight={700}>{user.id}</Typography>
                  </Stack>
                </Stack>
              </Box>

              <Divider />

              {/* Contest participation */}
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
                  Contest Participation
                </Typography>
                {user.contestSummary?.length > 0 ? (
                  <Stack spacing={1}>
                    {user.contestSummary.map((c) => (
                      <Card key={c.contestId} variant="outlined">
                        <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                          <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={0.75}>
                            <Box>
                              <Typography variant="body2" fontWeight={700}>{c.contestName}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {CONTEST_TYPE_LABEL[c.contestType] || c.contestType}
                              </Typography>
                            </Box>
                            <Typography variant="body2" fontWeight={700} color={c.used > 0 ? 'primary.main' : 'text.disabled'}>
                              {c.used} / {c.ticketLimit}
                            </Typography>
                          </Stack>
                          <LinearProgress
                            variant="determinate"
                            value={c.ticketLimit > 0 ? (c.used / c.ticketLimit) * 100 : 0}
                            sx={{ height: 4, borderRadius: 2 }}
                            color={c.used >= c.ticketLimit ? 'warning' : 'primary'}
                          />
                          <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                            {c.remaining} slot{c.remaining !== 1 ? 's' : ''} remaining · {fmtCurrency(c.price)} each
                          </Typography>
                        </CardContent>
                      </Card>
                    ))}
                  </Stack>
                ) : (
                  <Typography variant="body2" color="text.disabled">No active contest participation.</Typography>
                )}
              </Box>

              <Divider />

              {/* Entry history */}
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
                  All Entries ({entries.length})
                </Typography>
                {entries.length === 0 ? (
                  <Typography variant="body2" color="text.disabled">No entries found.</Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Ticket</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Contest</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Label</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {entries.map((e) => (
                          <TableRow key={e.id} sx={{ opacity: e.status === 'Voided' ? 0.5 : 1 }}>
                            <TableCell>
                              <Tooltip title="Open in Entry Management">
                                <Typography
                                  variant="caption" fontFamily="monospace" fontWeight={700} color="primary.main"
                                  sx={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                                  onClick={() => goToEntries(e.id)}
                                >
                                  {e.id}
                                </Typography>
                              </Tooltip>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" noWrap>{e.contestName}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption">{e.label}</Typography>
                            </TableCell>
                            <TableCell>
                              <Chip label={e.status} size="small"
                                color={TICKET_STATUS_COLOR[e.status] || 'default'} variant="muted" />
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {fmtDate(e.createdAt)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>
            </Stack>
          </Box>
        </Box>
      )}
    </Drawer>
    </>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ContestantsPage() {
  const { onNavigate } = useNavigation();

  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [search, setSearch]         = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [addOpen, setAddOpen]       = useState(false);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetch('/api/users').then((r) => r.json());
      setUsers(data);
    } catch (e) {
      setError('Could not load contestants: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return users;
    return users.filter((u) =>
      u.name.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      u.id.toLowerCase().includes(q) ||
      u.phone.includes(q)
    );
  }, [users, search]);

  const stats = useMemo(() => {
    const active   = users.filter((u) => u.activeEntries > 0);
    const revenue  = users.reduce((s, u) => s + u.revenue, 0);
    const entries  = users.reduce((s, u) => s + u.totalEntries, 0);
    return [
      { label: 'Total Contestants', value: users.length,       icon: <PeopleIcon />,             color: 'primary' },
      { label: 'In Active Contest', value: active.length,      icon: <EmojiEventsIcon />,         color: 'success' },
      { label: 'Total Entries',     value: entries,            icon: <ConfirmationNumberIcon />,  color: 'primary' },
      { label: 'Total Revenue',     value: fmtCurrency(revenue), icon: <AttachMoneyIcon />,       color: 'success' },
    ];
  }, [users]);

  if (loading) return <Stack alignItems="center" py={8}><CircularProgress /></Stack>;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>Contestants</Typography>
          <Typography variant="body2" color="text.secondary">
            All registered contestants and their entry history.
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<PersonAddIcon />} size="small" onClick={() => setAddOpen(true)}>
          Add Contestant
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Stats strip */}
      <Grid container spacing={2} mb={3}>
        {stats.map((s) => (
          <Grid size={{ xs: 12, sm: 6, md: 'grow' }} key={s.label}>
            <Card variant="outlined">
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}
                      textTransform="uppercase" letterSpacing="0.06em">
                      {s.label}
                    </Typography>
                    <Typography variant="h4" fontWeight={900} color={`${s.color}.main`} lineHeight={1.2} mt={0.5}>
                      {s.value}
                    </Typography>
                  </Box>
                  <Box sx={{ color: `${s.color}.main`, opacity: 0.4, mt: 0.5 }}>
                    {s.icon}
                  </Box>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Search */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <TextField
          placeholder="Search by name, email, phone, or ID…"
          size="small"
          sx={{ minWidth: 300 }}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 90 }}>ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Contests</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="center">Entries</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Revenue</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.disabled' }}>
                  No contestants found.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((u) => (
              <TableRow
                key={u.id}
                hover
                onClick={() => setSelectedId(u.id)}
                sx={{ cursor: 'pointer' }}
                selected={selectedId === u.id}
              >
                <TableCell>
                  <Typography variant="caption" fontFamily="monospace" fontWeight={700} color="primary.main">
                    {u.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" fontWeight={700}>{u.name}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">{u.email}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">{u.phone}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight={700} color={u.contestCount > 0 ? 'primary.main' : 'text.disabled'}>
                    {u.contestCount}
                  </Typography>
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight={700}>
                    {u.activeEntries}
                    {u.totalEntries > u.activeEntries && (
                      <Typography component="span" variant="caption" color="text.secondary">
                        {' '}/ {u.totalEntries}
                      </Typography>
                    )}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} color={u.revenue > 0 ? 'success.main' : 'text.disabled'}>
                    {u.revenue > 0 ? fmtCurrency(u.revenue) : '—'}
                  </Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View profile">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedId(u.id); }}>
                      <OpenInNewIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Detail drawer */}
      <UserDrawer
        userId={selectedId}
        onClose={() => setSelectedId(null)}
      />

      {/* Add contestant dialog */}
      <AddContestantDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSaved={(newUser) => {
          setUsers((prev) => [...prev, { ...newUser, totalEntries: 0, activeEntries: 0, contestCount: 0, revenue: 0 }]);
          onNavigate('entries', { search: newUser.name });
        }}
      />
    </Box>
  );
}
