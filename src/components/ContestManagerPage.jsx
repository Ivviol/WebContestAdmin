import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Chip from '@mui/material/Chip';
import Grid from '@mui/material/Grid';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Tooltip from '@mui/material/Tooltip';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import CloseIcon from '@mui/icons-material/Close';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ShieldIcon from '@mui/icons-material/Shield';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArchiveIcon from '@mui/icons-material/Archive';

// ── Constants ─────────────────────────────────────────────────────────────────
const TYPE_META = {
  wta:  { label: 'Winner Take All', icon: <EmojiEventsIcon />,    color: 'warning', description: 'Single entry per contestant. Winner takes the entire prize pool.' },
  surv: { label: 'Survivor',        icon: <ShieldIcon />,         color: 'info',    description: '1 pick/week, no spread, no team reuse. Last entry standing wins.' },
  sc:   { label: 'SuperContest',    icon: <SportsFootballIcon />, color: 'primary', description: '5 picks/week vs. static spread. 100% payback with tiered prizes.' },
};

const STATUS_COLOR = {
  Draft:               'default',
  'Registration Open': 'info',
  Active:              'success',
  Closed:              'warning',
  Archived:            'default',
};

const STATUS_TRANSITIONS = {
  Draft:               [{ label: 'Open Registration', next: 'Registration Open' }, { label: 'Archive', next: 'Archived' }],
  'Registration Open': [{ label: 'Activate',          next: 'Active' },           { label: 'Back to Draft', next: 'Draft' }],
  Active:              [{ label: 'Close Contest',      next: 'Closed' }],
  Closed:              [{ label: 'Archive',            next: 'Archived' }],
  Archived:            [],
};

const PRIZE_LABELS = {
  'winner-take-all': 'Winner Take All',
  'tiered-payback':  '100% Payback (Tiered)',
};

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmt(num) { return num?.toLocaleString() ?? '0'; }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'; }

// ── Type selector used in create dialog ───────────────────────────────────────
function TypeSelector({ value, onChange }) {
  return (
    <Stack direction="row" spacing={2}>
      {Object.entries(TYPE_META).map(([key, meta]) => (
        <Card
          key={key}
          variant="outlined"
          onClick={() => onChange(key)}
          sx={{
            flex: 1,
            cursor: 'pointer',
            borderColor: value === key ? `${meta.color}.main` : 'divider',
            borderWidth: value === key ? 2 : 1,
            transition: 'border-color 0.15s',
            '&:hover': { borderColor: `${meta.color}.main` },
          }}
        >
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Box sx={{ color: `${meta.color}.main`, mb: 0.5 }}>{meta.icon}</Box>
            <Typography variant="subtitle2" fontWeight={700}>{meta.label}</Typography>
            <Typography variant="caption" color="text.secondary">{meta.description}</Typography>
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

// ── Contest form (create & edit) ──────────────────────────────────────────────
const EMPTY_FORM = {
  type: '', name: '', season: '2025',
  entryFee: '', ticketLimit: '', picksPerWeek: '', totalWeeks: '',
  prizeStructure: '', proxyAllowed: true, geoRestricted: true,
  registrationOpen: '', registrationClose: '',
  contestStart: '', contestEnd: '',
  notes: '',
};

function applyTypeDefaults(form, type, defaults) {
  if (!type || !defaults[type]) return form;
  const d = defaults[type];
  const season = form.season || '2025';
  return {
    ...form,
    type,
    name:          form.name || `${d.label} ${season}`,
    entryFee:      String(d.entryFee),
    ticketLimit:   String(d.ticketLimit),
    picksPerWeek:  String(d.picksPerWeek),
    totalWeeks:    String(d.totalWeeks),
    prizeStructure: d.prizeStructure,
    proxyAllowed:  d.proxyAllowed,
    geoRestricted: d.geoRestricted,
  };
}

function ContestFormDialog({ open, contest, typeDefaults, onClose, onSave }) {
  const isEdit = Boolean(contest);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError('');
    if (isEdit) {
      setForm({
        type:              contest.type,
        name:              contest.name,
        season:            contest.season,
        entryFee:          String(contest.entryFee),
        ticketLimit:       String(contest.ticketLimit),
        picksPerWeek:      String(contest.picksPerWeek),
        totalWeeks:        String(contest.totalWeeks),
        prizeStructure:    contest.prizeStructure,
        proxyAllowed:      contest.proxyAllowed,
        geoRestricted:     contest.geoRestricted,
        registrationOpen:  contest.registrationOpen  || '',
        registrationClose: contest.registrationClose || '',
        contestStart:      contest.contestStart      || '',
        contestEnd:        contest.contestEnd        || '',
        notes:             contest.notes             || '',
      });
    } else {
      setForm(EMPTY_FORM);
    }
  }, [open, contest]);

  function set(field, val) { setForm((f) => ({ ...f, [field]: val })); }

  function handleTypeChange(type) {
    setForm((f) => applyTypeDefaults({ ...f, type }, type, typeDefaults));
  }

  async function handleSave() {
    if (!form.type)  return setError('Select a contest type.');
    if (!form.name)  return setError('Contest name is required.');
    if (!form.season) return setError('Season is required.');
    setSaving(true);
    setError('');
    try {
      await onSave({
        ...form,
        entryFee:     Number(form.entryFee),
        ticketLimit:  Number(form.ticketLimit),
        picksPerWeek: Number(form.picksPerWeek),
        totalWeeks:   Number(form.totalWeeks),
      });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const isSurvivor = form.type === 'surv';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>{isEdit ? 'Edit Contest' : 'New Contest'}</Typography>
          {isEdit && (
            <Chip
              label={TYPE_META[contest.type]?.label}
              size="small"
              color={TYPE_META[contest.type]?.color}
              variant="muted"
              sx={{ ml: 1 }}
            />
          )}
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>

          {/* Type (create only) */}
          {!isEdit && (
            <Box>
              <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 1, display: 'block' }}>
                Contest Type
              </Typography>
              <TypeSelector value={form.type} onChange={handleTypeChange} />
            </Box>
          )}

          {/* Basic info */}
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 1.5, display: 'block' }}>
              Basic Info
            </Typography>
            <Grid container spacing={2}>
              <Grid size={8}>
                <TextField label="Contest Name" value={form.name} onChange={(e) => set('name', e.target.value)} size="small" fullWidth required />
              </Grid>
              <Grid size={4}>
                <TextField label="Season / Year" value={form.season} onChange={(e) => set('season', e.target.value)} size="small" fullWidth required />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Financial & limits */}
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 1.5, display: 'block' }}>
              Financial & Limits
            </Typography>
            <Grid container spacing={2}>
              <Grid size={3}>
                <TextField
                  label="Entry Fee ($)"
                  value={form.entryFee}
                  onChange={(e) => set('entryFee', e.target.value)}
                  size="small" fullWidth type="number"
                  slotProps={{ htmlInput: { min: 1 } }}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="Max Tickets/User"
                  value={form.ticketLimit}
                  onChange={(e) => set('ticketLimit', e.target.value)}
                  size="small" fullWidth type="number"
                  slotProps={{ htmlInput: { min: 1 } }}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label={isSurvivor ? 'Picks/Week (1)' : 'Picks / Week'}
                  value={form.picksPerWeek}
                  onChange={(e) => set('picksPerWeek', e.target.value)}
                  size="small" fullWidth type="number"
                  disabled={isSurvivor}
                  slotProps={{ htmlInput: { min: 1 } }}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="Total Weeks"
                  value={form.totalWeeks}
                  onChange={(e) => set('totalWeeks', e.target.value)}
                  size="small" fullWidth type="number"
                  slotProps={{ htmlInput: { min: 1 } }}
                />
              </Grid>
              <Grid size={6}>
                <TextField
                  select label="Prize Structure"
                  value={form.prizeStructure}
                  onChange={(e) => set('prizeStructure', e.target.value)}
                  size="small" fullWidth
                >
                  <MenuItem value="winner-take-all">Winner Take All</MenuItem>
                  <MenuItem value="tiered-payback">100% Payback (Tiered)</MenuItem>
                </TextField>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Schedule */}
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 1.5, display: 'block' }}>
              Schedule
            </Typography>
            <Grid container spacing={2}>
              <Grid size={3}>
                <TextField
                  label="Registration Opens"
                  value={form.registrationOpen}
                  onChange={(e) => set('registrationOpen', e.target.value)}
                  size="small" fullWidth type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="Registration Closes"
                  value={form.registrationClose}
                  onChange={(e) => set('registrationClose', e.target.value)}
                  size="small" fullWidth type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="Contest Start"
                  value={form.contestStart}
                  onChange={(e) => set('contestStart', e.target.value)}
                  size="small" fullWidth type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
              <Grid size={3}>
                <TextField
                  label="Contest End"
                  value={form.contestEnd}
                  onChange={(e) => set('contestEnd', e.target.value)}
                  size="small" fullWidth type="date"
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Rules & toggles */}
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 1, display: 'block' }}>
              Rules
            </Typography>
            <Stack direction="row" spacing={3}>
              <FormControlLabel
                control={<Switch checked={form.geoRestricted} onChange={(e) => set('geoRestricted', e.target.checked)} />}
                label={<Box><Typography variant="body2" fontWeight={600}>Geo-restriction</Typography><Typography variant="caption" color="text.secondary">Nevada only (app picks)</Typography></Box>}
              />
              <FormControlLabel
                control={<Switch checked={form.proxyAllowed} onChange={(e) => set('proxyAllowed', e.target.checked)} />}
                label={<Box><Typography variant="body2" fontWeight={600}>Proxy Allowed</Typography><Typography variant="caption" color="text.secondary">In-person proxy registration</Typography></Box>}
              />
            </Stack>
          </Box>

          <Divider />

          {/* Notes */}
          <Box>
            <TextField
              label="Admin Notes"
              value={form.notes}
              onChange={(e) => set('notes', e.target.value)}
              multiline rows={2} fullWidth size="small"
              placeholder="Internal notes about this contest…"
            />
          </Box>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={saving}>Cancel</Button>
        <Button
          onClick={handleSave}
          variant="contained"
          disabled={saving}
          startIcon={saving ? <CircularProgress size={14} /> : null}
        >
          {isEdit ? 'Save Changes' : 'Create Contest'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Status transition confirm dialog ─────────────────────────────────────────
function StatusDialog({ open, contest, transition, onClose, onConfirm }) {
  const [loading, setLoading] = useState(false);
  if (!contest || !transition) return null;

  async function go() {
    setLoading(true);
    try { await onConfirm(contest.id, transition.next); }
    finally { setLoading(false); }
  }

  const isDestructive = transition.next === 'Archived' || transition.next === 'Closed';

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{transition.label}?</DialogTitle>
      <DialogContent>
        <Typography variant="body2">
          Move <strong>{contest.name}</strong> from{' '}
          <strong>{contest.status}</strong> → <strong>{transition.next}</strong>.
          {transition.next === 'Active' && ' Cashier will be able to sell tickets once the contest is active.'}
          {transition.next === 'Closed' && ' No new tickets can be sold after closing.'}
          {transition.next === 'Archived' && ' Archived contests are hidden from all operational views.'}
        </Typography>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}>Cancel</Button>
        <Button
          onClick={go}
          variant="contained"
          color={isDestructive ? 'error' : 'primary'}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} /> : <ArrowForwardIcon />}
        >
          {transition.label}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Contest card ──────────────────────────────────────────────────────────────
function ContestCard({ contest, onEdit, onStatusChange }) {
  const meta  = TYPE_META[contest.type]  || {};
  const color = meta.color || 'primary';
  const transitions = STATUS_TRANSITIONS[contest.status] || [];

  return (
    <Card variant="outlined" sx={{ display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flex: 1 }}>
        {/* Header */}
        <Stack direction="row" alignItems="flex-start" spacing={1.5} mb={1.5}>
          <Box sx={{ color: `${color}.main`, mt: 0.25, flexShrink: 0 }}>{meta.icon}</Box>
          <Box flex={1} minWidth={0}>
            <Typography variant="subtitle1" fontWeight={700} noWrap>{contest.name}</Typography>
            <Stack direction="row" spacing={0.75} mt={0.5} flexWrap="wrap">
              <Chip label={meta.label}       size="small" color={color}                             variant="muted" />
              <Chip label={contest.status}   size="small" color={STATUS_COLOR[contest.status]}      variant="muted" />
              <Chip label={`S${contest.season}`} size="small" variant="outlined" />
            </Stack>
          </Box>
        </Stack>

        {/* Key stats row */}
        <Grid container spacing={1} mb={1.5}>
          {[
            { icon: <AttachMoneyIcon fontSize="small" />,      label: 'Entry Fee',    val: `$${fmt(contest.entryFee)}` },
            { icon: <ConfirmationNumberIcon fontSize="small" />, label: 'Ticket Limit', val: `${contest.ticketLimit}/user` },
            { icon: <SportsFootballIcon fontSize="small" />,   label: 'Picks/Week',   val: contest.type === 'surv' ? '1 (no spread)' : `${contest.picksPerWeek}` },
          ].map(({ icon, label, val }) => (
            <Grid size={4} key={label}>
              <Box sx={{ bgcolor: 'action.hover', borderRadius: 1, p: 1, textAlign: 'center' }}>
                <Box sx={{ color: 'text.secondary' }}>{icon}</Box>
                <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                <Typography variant="body2" fontWeight={700}>{val}</Typography>
              </Box>
            </Grid>
          ))}
        </Grid>

        {/* Tickets sold & revenue */}
        <Stack direction="row" justifyContent="space-between" sx={{ bgcolor: 'action.hover', borderRadius: 1, px: 1.5, py: 1, mb: 1.5 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">Tickets sold</Typography>
            <Typography variant="body2" fontWeight={700}>{fmt(contest.totalTickets)}</Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="caption" color="text.secondary">Revenue</Typography>
            <Typography variant="body2" fontWeight={700} color="success.main">${fmt(contest.revenue)}</Typography>
          </Box>
          <Box textAlign="right">
            <Typography variant="caption" color="text.secondary">Prize Structure</Typography>
            <Typography variant="body2" fontWeight={700}>{PRIZE_LABELS[contest.prizeStructure]}</Typography>
          </Box>
        </Stack>

        {/* Dates */}
        <Stack spacing={0.25}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Registration</Typography>
            <Typography variant="caption">{fmtDate(contest.registrationOpen)} – {fmtDate(contest.registrationClose)}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Contest window</Typography>
            <Typography variant="caption">{fmtDate(contest.contestStart)} – {fmtDate(contest.contestEnd)}</Typography>
          </Stack>
        </Stack>

        {contest.notes && (
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, fontStyle: 'italic' }}>
            {contest.notes}
          </Typography>
        )}
      </CardContent>

      <CardActions sx={{ px: 2, pb: 2, pt: 0, gap: 1, flexWrap: 'wrap' }}>
        <Tooltip title="Edit contest settings">
          <IconButton size="small" onClick={() => onEdit(contest)} disabled={contest.status === 'Archived'}>
            <EditIcon fontSize="small" />
          </IconButton>
        </Tooltip>

        {transitions.map((t) => (
          <Button
            key={t.next}
            size="small"
            variant={t.next === 'Archived' || t.next === 'Closed' ? 'outlined' : 'contained'}
            color={t.next === 'Archived' ? 'error' : t.next === 'Closed' ? 'warning' : 'primary'}
            startIcon={t.next === 'Archived' ? <ArchiveIcon /> : <ArrowForwardIcon />}
            onClick={() => onStatusChange(contest, t)}
            sx={{ ml: 'auto' }}
          >
            {t.label}
          </Button>
        ))}
      </CardActions>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ContestManagerPage() {
  const [contests, setContests]         = useState([]);
  const [typeDefaults, setTypeDefaults] = useState({});
  const [loading, setLoading]           = useState(true);
  const [tab, setTab]                   = useState('all');
  const [formDialog, setFormDialog]     = useState({ open: false, contest: null });
  const [statusDialog, setStatusDialog] = useState({ open: false, contest: null, transition: null });
  const [apiError, setApiError]         = useState('');

  const load = useCallback(async () => {
    setApiError('');
    try {
      const [c, td] = await Promise.all([
        fetch('/api/contests').then((r) => r.json()),
        fetch('/api/contest-types').then((r) => r.json()),
      ]);
      setContests(c);
      setTypeDefaults(td);
    } catch (e) {
      setApiError(`Could not reach API server: ${e.message}`);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const active   = contests.filter((c) => c.status === 'Active').length;
  const regOpen  = contests.filter((c) => c.status === 'Registration Open').length;
  const totalRev = contests.reduce((s, c) => s + (c.revenue || 0), 0);
  const totalTix = contests.reduce((s, c) => s + (c.totalTickets || 0), 0);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const tabStatuses = {
    all:      null,
    active:   ['Registration Open', 'Active'],
    upcoming: ['Draft'],
    closed:   ['Closed', 'Archived'],
  };
  const filtered = tabStatuses[tab]
    ? contests.filter((c) => tabStatuses[tab].includes(c.status))
    : contests;

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleSave(data) {
    if (formDialog.contest) {
      const r = await fetch(`/api/contests/${formDialog.contest.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
    } else {
      const r = await fetch('/api/contests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
    }
    setFormDialog({ open: false, contest: null });
    await load();
  }

  async function handleStatusChange(contestId, newStatus) {
    const r = await fetch(`/api/contests/${contestId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    setStatusDialog({ open: false, contest: null, transition: null });
    await load();
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>Contest Manager</Typography>
          <Typography variant="body2" color="text.secondary">
            Configure and manage all contest seasons. Cashier can only sell tickets for Active or Registration Open contests.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setFormDialog({ open: true, contest: null })}>
          New Contest
        </Button>
      </Stack>

      {/* Stats strip */}
      <Grid container spacing={2} mb={3}>
        {[
          { label: 'Total Contests',      value: contests.length,  color: 'primary' },
          { label: 'Active / Reg. Open',  value: `${active} / ${regOpen}`, color: 'success' },
          { label: 'Total Tickets Sold',  value: fmt(totalTix),    color: 'info' },
          { label: 'Total Revenue',       value: `$${fmt(totalRev)}`, color: 'success' },
        ].map((s) => (
          <Grid size={{ xs: 6, md: 3 }} key={s.label}>
            <Card variant="outlined">
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing="0.06em" display="block">
                  {s.label}
                </Typography>
                <Typography variant="h5" fontWeight={900} color={`${s.color}.main`} lineHeight={1.2} mt={0.5}>
                  {s.value}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
        <Tab label="All" value="all" />
        <Tab label={`Active / Open (${active + regOpen})`} value="active" />
        <Tab label="Draft" value="upcoming" />
        <Tab label="Closed / Archived" value="closed" />
      </Tabs>

      {/* Contest grid */}
      {loading ? (
        <Stack alignItems="center" py={8}><CircularProgress /></Stack>
      ) : apiError ? (
        <Alert severity="error" sx={{ mt: 2 }}>{apiError}</Alert>
      ) : filtered.length === 0 ? (
        <Stack alignItems="center" py={8} spacing={1} sx={{ opacity: 0.4 }}>
          <EmojiEventsIcon sx={{ fontSize: 48 }} />
          <Typography variant="body1">No contests in this category</Typography>
        </Stack>
      ) : (
        <Grid container spacing={2}>
          {filtered.map((c) => (
            <Grid size={{ xs: 12, md: 6, lg: 4 }} key={c.id}>
              <ContestCard
                contest={c}
                onEdit={(c) => setFormDialog({ open: true, contest: c })}
                onStatusChange={(c, t) => setStatusDialog({ open: true, contest: c, transition: t })}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create / Edit dialog */}
      <ContestFormDialog
        open={formDialog.open}
        contest={formDialog.contest}
        typeDefaults={typeDefaults}
        onClose={() => setFormDialog({ open: false, contest: null })}
        onSave={handleSave}
      />

      {/* Status transition dialog */}
      <StatusDialog
        open={statusDialog.open}
        contest={statusDialog.contest}
        transition={statusDialog.transition}
        onClose={() => setStatusDialog({ open: false, contest: null, transition: null })}
        onConfirm={handleStatusChange}
      />
    </Box>
  );
}
