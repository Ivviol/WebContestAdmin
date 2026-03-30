import { useState, useEffect, useCallback, useMemo } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import Checkbox from '@mui/material/Checkbox';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Paper from '@mui/material/Paper';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import EditIcon from '@mui/icons-material/Edit';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import PeopleIcon from '@mui/icons-material/People';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import HourglassEmptyIcon from '@mui/icons-material/HourglassEmpty';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditEntryModal from './EditEntryModal.jsx';
import PicksDrawer from './PicksDrawer.jsx';
import RecordPicksDialog from './RecordPicksDialog.jsx';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import AssignmentIcon from '@mui/icons-material/Assignment';
import { useNavigation } from '../NavigationContext.js';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtCurrency(n) {
  return '$' + n.toLocaleString();
}

function StatusChip({ status }) {
  const map = {
    Active:                  'success',
    'Pending Payment':       'warning',
    Suspended:               'default',
    Voided:                  'error',
    'Eliminated (Survivor)': 'error',
  };
  return <Chip label={status} size="small" color={map[status] || 'default'} variant="muted" />;
}

function PaymentChip({ entry }) {
  if (entry.status === 'Voided')                  return <Chip label="Refunded"    size="small" color="default" variant="muted" />;
  if (entry.status === 'Eliminated (Survivor)')   return <Chip label="Eliminated"  size="small" color="error"   variant="muted" />;
  if (entry.status === 'Pending Payment')   return <Chip label="Unpaid"    size="small" color="error"   variant="muted" />;
  if (!entry.paymentMethod)                 return <Chip label="—"         size="small" color="default" variant="muted" />;
  const label = `Paid — ${fmtCurrency(entry.entryFee)}`;
  return <Chip label={label} size="small" color="success" variant="muted" />;
}

// ── Confirm dialog ─────────────────────────────────────────────────────────────
function ConfirmDialog({ open, title, body, confirmLabel = 'Confirm', confirmColor = 'primary', onConfirm, onClose }) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{body}</DialogContentText>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color={confirmColor} onClick={() => { onConfirm(); onClose(); }}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function EntryManagementPage() {
  const { pageState, onNavigate } = useNavigation();

  const [entries, setEntries]         = useState([]);
  const [contestsList, setContestsList] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [selected, setSelected]       = useState([]);
  const [editEntry, setEditEntry]       = useState(null);
  const [picksEntry, setPicksEntry]     = useState(null);
  const [recordEntry, setRecordEntry]   = useState(null);
  const [page, setPage]               = useState(0);
  const [rowsPerPage]                 = useState(10);
  const [contestFilter, setContestFilter] = useState('All');
  const [statusFilter, setStatusFilter]   = useState('All');
  const [searchQuery, setSearchQuery]     = useState(() => pageState?.search ?? '');
  const [confirm, setConfirm]         = useState(null); // { title, body, onConfirm, color, label }

  // Consume incoming navigation state once then clear it
  useEffect(() => {
    if (pageState?.search != null) {
      setSearchQuery(pageState.search);
      setPage(0);
      onNavigate('entries', null);
    }
  }, [pageState]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const [ticketRes, contestRes] = await Promise.all([
        fetch('/api/tickets'),
        fetch('/api/contests'),
      ]);
      if (!ticketRes.ok || !contestRes.ok) throw new Error('API error');
      const [ticketData, contestData] = await Promise.all([
        ticketRes.json(),
        contestRes.json(),
      ]);
      setEntries(ticketData);
      setContestsList(contestData);
    } catch (err) {
      setError('Could not reach API server: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Computed stats ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const active    = entries.filter((e) => e.status === 'Active');
    const pending   = entries.filter((e) => e.status === 'Pending Payment');
    const paid      = entries.filter((e) => e.paymentMethod != null && e.status !== 'Voided');
    const revenue   = paid.reduce((sum, e) => sum + (e.entryFee || 0), 0);
    return [
      { label: 'Total Entries',    value: entries.length,  sub: `across all contests`,           icon: <ConfirmationNumberIcon />, color: 'primary' },
      { label: 'Active',           value: active.length,   sub: entries.length ? `${Math.round(active.length / entries.length * 100)}% of total` : '—', icon: <CheckCircleOutlineIcon />, color: 'success' },
      { label: 'Pending Payment',  value: pending.length,  sub: pending.length ? 'awaiting payment' : 'all clear', icon: <HourglassEmptyIcon />, color: pending.length ? 'warning' : 'success' },
      { label: 'Revenue',          value: fmtCurrency(revenue), sub: `${paid.length} paid entries`,  icon: <AttachMoneyIcon />, color: 'success' },
    ];
  }, [entries]);

  // ── Filtering ───────────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return entries.filter((e) => {
      if (q && !e.userName.toLowerCase().includes(q) && !e.userEmail.toLowerCase().includes(q) && !e.id.toLowerCase().includes(q)) return false;
      if (contestFilter !== 'All' && e.contestId !== contestFilter) return false;
      if (statusFilter  !== 'All' && e.status    !== statusFilter)  return false;
      return true;
    });
  }, [entries, searchQuery, contestFilter, statusFilter]);

  const pageRows = filtered.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  // ── Selection ───────────────────────────────────────────────────────────────
  const toggleSelect = (id) =>
    setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleAll = () =>
    setSelected(selected.length === filtered.length ? [] : filtered.map((e) => e.id));

  // ── Status change ────────────────────────────────────────────────────────────
  const changeStatus = async (ticketId, newStatus) => {
    await fetch(`/api/tickets/${ticketId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    load();
    setSelected([]);
  };

  const bulkSuspend = () => {
    const ids = selected.filter((id) => {
      const e = entries.find((x) => x.id === id);
      return e && e.status === 'Active';
    });
    if (!ids.length) return;
    setConfirm({
      title: `Suspend ${ids.length} entr${ids.length === 1 ? 'y' : 'ies'}?`,
      body: 'Suspended entries cannot submit picks until reinstated.',
      confirmLabel: 'Suspend',
      color: 'warning',
      onConfirm: () => Promise.all(ids.map((id) => changeStatus(id, 'Suspended'))).then(() => load()),
    });
  };

  const bulkVoid = () => {
    const ids = selected.filter((id) => {
      const e = entries.find((x) => x.id === id);
      return e && e.status !== 'Voided';
    });
    if (!ids.length) return;
    setConfirm({
      title: `Void ${ids.length} entr${ids.length === 1 ? 'y' : 'ies'}?`,
      body: 'Voided entries are permanently removed from competition. This cannot be undone.',
      confirmLabel: 'Void',
      color: 'error',
      onConfirm: () => Promise.all(ids.map((id) => changeStatus(id, 'Voided'))).then(() => load()),
    });
  };

  // ── Render ───────────────────────────────────────────────────────────────────
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}><CircularProgress /></Box>;

  return (
    <Box>
      {/* Page header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Entry Management
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All entries across all contests
          </Typography>
        </Box>
        <Button variant="outlined" startIcon={<FileDownloadIcon />} size="small">
          Export CSV
        </Button>
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} action={<Button size="small" color="inherit" onClick={load}>Retry</Button>}>
          {error}
        </Alert>
      )}

      {/* Stats strip */}
      <Grid container spacing={2} mb={3}>
        {stats.map((s) => (
          <Grid size={{ xs: 12, sm: 6, md: 'grow' }} key={s.label}>
            <Card variant="outlined">
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                  <Box>
                    <Typography variant="caption" color="text.secondary" fontWeight={700} textTransform="uppercase" letterSpacing="0.06em">
                      {s.label}
                    </Typography>
                    <Typography variant="h4" fontWeight={900} color={`${s.color}.main`} lineHeight={1.2} mt={0.5}>
                      {s.value}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {s.sub}
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

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
          <TextField
            placeholder="Search by name, email, ticket ID…"
            size="small"
            sx={{ minWidth: 240 }}
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(0); }}
          />
          <TextField
            select
            label="Contest"
            size="small"
            value={contestFilter}
            onChange={(e) => { setContestFilter(e.target.value); setPage(0); }}
            sx={{ minWidth: 220 }}
          >
            <MenuItem value="All">All Contests</MenuItem>
            {contestsList.map((c) => (
              <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            size="small"
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(0); }}
            sx={{ minWidth: 180 }}
          >
            {['All', 'Active', 'Pending Payment', 'Suspended', 'Voided'].map((s) => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>

          {selected.length > 0 && (
            <>
              <Divider orientation="vertical" flexItem />
              <Typography variant="body2" color="text.secondary">
                {selected.length} selected:
              </Typography>
              <Button size="small" variant="outlined" color="warning" startIcon={<BlockIcon />} onClick={bulkSuspend}>
                Suspend
              </Button>
              <Button size="small" variant="outlined" startIcon={<PeopleIcon />}>
                Assign Proxy
              </Button>
              <Button size="small" variant="outlined" color="error" startIcon={<DeleteOutlineIcon />} onClick={bulkVoid}>
                Void
              </Button>
            </>
          )}
        </Stack>
      </Paper>

      {/* Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell padding="checkbox">
                <Checkbox
                  indeterminate={selected.length > 0 && selected.length < filtered.length}
                  checked={selected.length === filtered.length && filtered.length > 0}
                  onChange={toggleAll}
                  size="small"
                />
              </TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Ticket ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Contestant</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Entry</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Contest</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Proxy</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Payment</TableCell>
              <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {pageRows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No entries match your filters.</Typography>
                </TableCell>
              </TableRow>
            )}
            {pageRows.map((entry) => (
              <TableRow
                key={entry.id}
                selected={selected.includes(entry.id)}
                hover
                sx={{ opacity: entry.status === 'Voided' ? 0.55 : 1 }}
              >
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={selected.includes(entry.id)}
                    onChange={() => toggleSelect(entry.id)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title={entry.receiptNum ? `Receipt #${entry.receiptNum}` : ''} placement="right">
                    <Typography variant="body2" fontFamily="monospace" fontWeight={700} color="primary.main" noWrap>
                      {entry.id}
                    </Typography>
                  </Tooltip>
                </TableCell>
                <TableCell sx={{ maxWidth: 180 }}>
                  <Typography variant="body2" fontWeight={700} noWrap>{entry.userName}</Typography>
                  <Typography variant="caption" color="text.secondary" noWrap display="block">{entry.userEmail}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{entry.entryNum}</Typography>
                  <Typography variant="caption" color="text.secondary">{entry.label}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="caption" color="text.secondary" noWrap>
                    {entry.contestName}
                  </Typography>
                </TableCell>
                <TableCell>
                  {entry.proxyName ? (
                    <Chip
                      label={entry.proxyName}
                      size="small"
                      variant="outlined"
                      color="info"
                    />
                  ) : (
                    <Typography variant="caption" color="text.disabled">—</Typography>
                  )}
                </TableCell>
                <TableCell>
                  <StatusChip status={entry.status} />
                </TableCell>
                <TableCell>
                  <PaymentChip entry={entry} />
                </TableCell>
                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                  <Tooltip title="View picks history">
                    <IconButton size="small" color="primary" onClick={() => setPicksEntry(entry)}>
                      <SportsFootballIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {entry.status === 'Active' && (
                    <Tooltip title="Record picks">
                      <IconButton size="small" color="secondary" onClick={() => setRecordEntry(entry)}>
                        <AssignmentIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                  <Tooltip title="Edit entry">
                    <IconButton size="small" onClick={() => setEditEntry(entry)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  {entry.status === 'Suspended' ? (
                    <Tooltip title="Reinstate">
                      <IconButton size="small" color="success" onClick={() => changeStatus(entry.id, 'Active')}>
                        <CheckCircleOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : entry.status === 'Active' ? (
                    <Tooltip title="Suspend entry">
                      <IconButton size="small" color="warning"
                        onClick={() => setConfirm({
                          title: 'Suspend entry?',
                          body: `Suspend ${entry.label} for ${entry.userName}? They won't be able to submit picks until reinstated.`,
                          confirmLabel: 'Suspend',
                          color: 'warning',
                          onConfirm: () => changeStatus(entry.id, 'Suspended'),
                        })}
                      >
                        <BlockIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  ) : null}
                  {entry.status !== 'Voided' && (
                    <Tooltip title="Void entry">
                      <IconButton size="small" color="error"
                        onClick={() => setConfirm({
                          title: 'Void entry?',
                          body: `Permanently void ${entry.label} for ${entry.userName}? This cannot be undone.`,
                          confirmLabel: 'Void',
                          color: 'error',
                          onConfirm: () => changeStatus(entry.id, 'Voided'),
                        })}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          rowsPerPageOptions={[10]}
          onPageChange={(_, p) => setPage(p)}
        />
      </TableContainer>

      {/* Picks drawer */}
      <PicksDrawer
        entry={picksEntry}
        onClose={() => setPicksEntry(null)}
      />

      {/* Record picks dialog */}
      <RecordPicksDialog
        open={Boolean(recordEntry)}
        entry={recordEntry}
        onClose={() => setRecordEntry(null)}
        onSaved={load}
      />

      {/* Edit modal */}
      <EditEntryModal
        open={Boolean(editEntry)}
        onClose={() => setEditEntry(null)}
        entry={editEntry}
        contests={contestsList}
      />

      {/* Confirm dialog */}
      {confirm && (
        <ConfirmDialog
          open
          title={confirm.title}
          body={confirm.body}
          confirmLabel={confirm.confirmLabel}
          confirmColor={confirm.color}
          onConfirm={confirm.onConfirm}
          onClose={() => setConfirm(null)}
        />
      )}
    </Box>
  );
}
