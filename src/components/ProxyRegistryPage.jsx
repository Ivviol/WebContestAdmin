import { useState, useEffect, useCallback, useMemo } from 'react';
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
import Drawer from '@mui/material/Drawer';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import PersonOffIcon from '@mui/icons-material/PersonOff';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import BlockIcon from '@mui/icons-material/Block';
import LinkOffIcon from '@mui/icons-material/LinkOff';
import HandshakeIcon from '@mui/icons-material/Handshake';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  });
}

const STATUS_COLOR = { Active: 'success', Suspended: 'warning', Revoked: 'error' };

const AUDIT_TYPE_LABEL = {
  assigned:       'Proxy assigned',
  removed:        'Proxy removed',
  status_changed: 'Status changed',
};

// ── Register dialog ───────────────────────────────────────────────────────────
function RegisterDialog({ open, onClose, onSave }) {
  const [form, setForm]   = useState({ name: '', email: '', phone: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError]  = useState('');

  useEffect(() => {
    if (open) { setForm({ name: '', email: '', phone: '', notes: '' }); setError(''); }
  }, [open]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.name.trim()) return setError('Name is required');
    setSaving(true); setError('');
    try { await onSave(form); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Register New Proxy</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField label="Full Name" value={form.name} onChange={(e) => set('name', e.target.value)}
            size="small" fullWidth required />
          <TextField label="Email" value={form.email} onChange={(e) => set('email', e.target.value)}
            size="small" fullWidth type="email" />
          <TextField label="Phone" value={form.phone} onChange={(e) => set('phone', e.target.value)}
            size="small" fullWidth />
          <TextField label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)}
            size="small" fullWidth multiline rows={2}
            placeholder="Internal notes about this proxy…" />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}>
          Register
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Assign dialog ─────────────────────────────────────────────────────────────
function AssignDialog({ open, proxyId, onClose, onSave }) {
  const [entries, setEntries] = useState([]);
  const [selected, setSelected] = useState('');
  const [note, setNote]       = useState('');
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState('');

  useEffect(() => {
    if (!open) return;
    setSelected(''); setNote(''); setError('');
    // Load entries that don't already have this proxy
    fetch('/api/tickets')
      .then((r) => r.json())
      .then((all) => setEntries(
        all.filter((t) => t.status !== 'Voided' && t.proxyId !== proxyId)
      ));
  }, [open, proxyId]);

  async function handleSave() {
    if (!selected) return setError('Select an entry');
    setSaving(true); setError('');
    try { await onSave(selected, note); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Assign Entry to Proxy</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField select label="Entry" value={selected}
            onChange={(e) => setSelected(e.target.value)} size="small" fullWidth>
            <MenuItem value="">— Select entry —</MenuItem>
            {entries.map((e) => (
              <MenuItem key={e.id} value={e.id}>
                {e.id} · {e.userName} · {e.label} · {e.contestName}
              </MenuItem>
            ))}
          </TextField>
          <TextField label="Note (optional)" value={note}
            onChange={(e) => setNote(e.target.value)} size="small" fullWidth
            placeholder="e.g. Registered in person at SuperBook" />
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving || !selected}
          startIcon={saving ? <CircularProgress size={14} color="inherit" /> : null}>
          Assign
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Proxy detail drawer ───────────────────────────────────────────────────────
function ProxyDrawer({ proxyId, onClose, onRefresh }) {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [assignOpen, setAssignOpen]     = useState(false);
  const [error, setError]               = useState('');

  const load = useCallback(async () => {
    if (!proxyId) return;
    setLoading(true);
    const d = await fetch(`/api/proxies/${proxyId}`).then((r) => r.json());
    setData(d);
    setLoading(false);
  }, [proxyId]);

  useEffect(() => { load(); }, [load]);

  async function handleStatusChange(status, note = '') {
    setStatusSaving(true); setError('');
    const r = await fetch(`/api/proxies/${proxyId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status, note }),
    });
    const j = await r.json();
    if (!r.ok) { setError(j.error); setStatusSaving(false); return; }
    await load();
    onRefresh();
    setStatusSaving(false);
  }

  async function handleRemove(ticketId) {
    await fetch(`/api/tickets/${ticketId}/proxy`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proxyId: null, note: 'Removed by admin' }),
    });
    await load();
    onRefresh();
  }

  async function handleAssign(ticketId, note) {
    const r = await fetch(`/api/tickets/${ticketId}/proxy`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proxyId, note }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    setAssignOpen(false);
    await load();
    onRefresh();
  }

  return (
    <Drawer anchor="right" open={Boolean(proxyId)} onClose={onClose}
      PaperProps={{ sx: { width: { xs: '100%', sm: 500 } } }}>
      {loading || !data ? (
        <Stack alignItems="center" justifyContent="center" height="100%">
          <CircularProgress />
        </Stack>
      ) : (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

          {/* Header */}
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between"
            sx={{ px: 3, py: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
            <Box>
              <Stack direction="row" alignItems="center" spacing={1.5} mb={0.25}>
                <Typography variant="h6" fontWeight={800}>{data.name}</Typography>
                <Chip label={data.id} size="small" variant="outlined" color="primary"
                  sx={{ fontFamily: 'monospace', fontWeight: 700 }} />
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1}>
                <Chip label={data.status} size="small"
                  color={STATUS_COLOR[data.status] || 'default'} variant="muted" />
                <Typography variant="caption" color="text.secondary">
                  Registered {fmtDate(data.registeredAt)}
                </Typography>
              </Stack>
            </Box>
            <IconButton onClick={onClose} size="small"><CloseIcon /></IconButton>
          </Stack>

          <Box sx={{ flex: 1, overflowY: 'auto', px: 3, py: 2 }}>
            <Stack spacing={3}>

              {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

              {/* Contact info */}
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
                  Contact
                </Typography>
                <Stack spacing={0.5}>
                  {[
                    { label: 'Email', val: data.email || '—' },
                    { label: 'Phone', val: data.phone || '—' },
                    { label: 'Notes', val: data.notes || '—' },
                  ].map(({ label, val }) => (
                    <Stack key={label} direction="row" justifyContent="space-between">
                      <Typography variant="body2" color="text.secondary">{label}</Typography>
                      <Typography variant="body2">{val}</Typography>
                    </Stack>
                  ))}
                </Stack>
              </Box>

              {/* Status actions */}
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
                  Status
                </Typography>
                <Stack direction="row" spacing={1}>
                  {data.status === 'Active' && (
                    <Button size="small" variant="outlined" color="warning"
                      startIcon={<BlockIcon />} disabled={statusSaving}
                      onClick={() => handleStatusChange('Suspended')}>
                      Suspend
                    </Button>
                  )}
                  {data.status === 'Suspended' && (
                    <Button size="small" variant="outlined" color="success"
                      startIcon={<CheckCircleIcon />} disabled={statusSaving}
                      onClick={() => handleStatusChange('Active')}>
                      Reinstate
                    </Button>
                  )}
                  {data.status !== 'Revoked' && (
                    <Button size="small" variant="outlined" color="error"
                      startIcon={<PersonOffIcon />} disabled={statusSaving}
                      onClick={() => handleStatusChange('Revoked')}>
                      Revoke
                    </Button>
                  )}
                </Stack>
              </Box>

              <Divider />

              {/* Assigned entries */}
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                  <Typography variant="overline" color="text.secondary" fontWeight={700}>
                    Assigned Entries ({data.assigned.length})
                  </Typography>
                  {data.status === 'Active' && (
                    <Button size="small" variant="outlined" startIcon={<AddIcon />}
                      onClick={() => setAssignOpen(true)}>
                      Assign Entry
                    </Button>
                  )}
                </Stack>

                {data.assigned.length === 0 ? (
                  <Typography variant="body2" color="text.disabled">No entries assigned.</Typography>
                ) : (
                  <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                      <TableHead>
                        <TableRow>
                          <TableCell sx={{ fontWeight: 700 }}>Ticket</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Contestant</TableCell>
                          <TableCell sx={{ fontWeight: 700 }}>Contest</TableCell>
                          <TableCell sx={{ fontWeight: 700, width: 40 }} />
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {data.assigned.map((a) => (
                          <TableRow key={a.ticketId} hover>
                            <TableCell>
                              <Typography variant="caption" fontFamily="monospace"
                                fontWeight={700} color="primary.main">{a.ticketId}</Typography>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {a.label}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">{a.userName}</Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="caption" color="text.secondary" noWrap>
                                {a.contestName}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Tooltip title="Remove assignment">
                                <IconButton size="small" color="error"
                                  onClick={() => handleRemove(a.ticketId)}>
                                  <LinkOffIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </Box>

              <Divider />

              {/* Audit log */}
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
                  Audit Log
                </Typography>
                {data.audit.length === 0 ? (
                  <Typography variant="body2" color="text.disabled">No activity yet.</Typography>
                ) : (
                  <Stack spacing={0}>
                    {data.audit.map((entry, i) => (
                      <Box key={entry.id} sx={{
                        px: 1.5, py: 0.75,
                        borderBottom: i < data.audit.length - 1 ? '1px solid' : 'none',
                        borderColor: 'divider',
                      }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="caption" fontWeight={700} color="text.primary">
                              {AUDIT_TYPE_LABEL[entry.type] ?? entry.type}
                            </Typography>
                            {entry.ticketId && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                                · {entry.ticketId}
                              </Typography>
                            )}
                            {entry.toStatus && (
                              <Typography variant="caption" color="text.secondary" sx={{ ml: 0.75 }}>
                                → {entry.toStatus}
                              </Typography>
                            )}
                            {entry.note && (
                              <Typography variant="caption" color="text.secondary" display="block">
                                {entry.note}
                              </Typography>
                            )}
                          </Box>
                          <Typography variant="caption" color="text.disabled" noWrap sx={{ ml: 1 }}>
                            {fmtDateTime(entry.changedAt)}
                          </Typography>
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                )}
              </Box>

            </Stack>
          </Box>
        </Box>
      )}

      <AssignDialog
        open={assignOpen}
        proxyId={proxyId}
        onClose={() => setAssignOpen(false)}
        onSave={handleAssign}
      />
    </Drawer>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProxyRegistryPage() {
  const [proxiesList, setProxiesList] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState('');
  const [search, setSearch]           = useState('');
  const [selectedId, setSelectedId]   = useState(null);
  const [registerOpen, setRegisterOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await fetch('/api/proxies').then((r) => r.json());
      setProxiesList(data);
    } catch (e) {
      setError('Failed to load proxies: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return proxiesList;
    return proxiesList.filter((p) =>
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.id.toLowerCase().includes(q) ||
      p.phone.includes(q)
    );
  }, [proxiesList, search]);

  const stats = useMemo(() => {
    const active      = proxiesList.filter((p) => p.status === 'Active').length;
    const assignments = proxiesList.reduce((s, p) => s + p.assignedCount, 0);
    return { total: proxiesList.length, active, assignments };
  }, [proxiesList]);

  async function handleRegister(form) {
    const r = await fetch('/api/proxies', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    setRegisterOpen(false);
    await load();
    setSelectedId(j.id);
  }

  if (loading) return <Stack alignItems="center" py={8}><CircularProgress /></Stack>;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>Proxy Registry</Typography>
          <Typography variant="body2" color="text.secondary">
            Registered proxies and their entry assignments. Proxy submission is permitted under Nevada Gaming Law.
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setRegisterOpen(true)}>
          Register Proxy
        </Button>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Stats */}
      <Stack direction="row" spacing={2} mb={3}>
        {[
          { label: 'Total Proxies',  val: stats.total },
          { label: 'Active',         val: stats.active,      color: 'success.main' },
          { label: 'Total Entries Managed', val: stats.assignments, color: 'primary.main' },
        ].map(({ label, val, color }) => (
          <Card key={label} variant="outlined" sx={{ minWidth: 140 }}>
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
              <Typography variant="h4" fontWeight={900} color={color || 'text.primary'} lineHeight={1.2}>
                {val}
              </Typography>
            </CardContent>
          </Card>
        ))}
      </Stack>

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
              <TableCell sx={{ fontWeight: 700, width: 90 }}>Proxy ID</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Name</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Email</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Phone</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 100 }} align="center">Status</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 80 }} align="center">Entries</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 120 }}>Registered</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 48 }} align="right" />
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} align="center" sx={{ py: 4, color: 'text.disabled' }}>
                  {proxiesList.length === 0 ? 'No proxies registered yet.' : 'No proxies match your search.'}
                </TableCell>
              </TableRow>
            )}
            {filtered.map((p) => (
              <TableRow key={p.id} hover onClick={() => setSelectedId(p.id)}
                selected={selectedId === p.id}
                sx={{ cursor: 'pointer', opacity: p.status === 'Revoked' ? 0.5 : 1 }}>
                <TableCell>
                  <Typography variant="caption" fontFamily="monospace" fontWeight={700} color="primary.main">
                    {p.id}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <HandshakeIcon sx={{ fontSize: 16, color: 'text.disabled' }} />
                    <Typography variant="body2" fontWeight={700}>{p.name}</Typography>
                  </Stack>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">{p.email || '—'}</Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">{p.phone || '—'}</Typography>
                </TableCell>
                <TableCell align="center">
                  <Chip label={p.status} size="small"
                    color={STATUS_COLOR[p.status] || 'default'} variant="muted" />
                </TableCell>
                <TableCell align="center">
                  <Typography variant="body2" fontWeight={700}
                    color={p.assignedCount > 0 ? 'primary.main' : 'text.disabled'}>
                    {p.assignedCount}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2" color="text.secondary">{fmtDate(p.registeredAt)}</Typography>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title="View details">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); setSelectedId(p.id); }}>
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
      <ProxyDrawer
        proxyId={selectedId}
        onClose={() => setSelectedId(null)}
        onRefresh={load}
      />

      {/* Register dialog */}
      <RegisterDialog
        open={registerOpen}
        onClose={() => setRegisterOpen(false)}
        onSave={handleRegister}
      />
    </Box>
  );
}
