import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardActionArea from '@mui/material/CardActionArea';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Grid from '@mui/material/Grid';
import ReceiptIcon from '@mui/icons-material/Receipt';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import PrintIcon from '@mui/icons-material/Print';
import PeopleIcon from '@mui/icons-material/People';

// ── CSV helpers ───────────────────────────────────────────────────────────────
function toCSV(headers, rows) {
  const escape = (v) => {
    const s = String(v ?? '');
    return s.includes(',') || s.includes('"') || s.includes('\n')
      ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [headers, ...rows].map((r) => r.map(escape).join(',')).join('\n');
}

function downloadCSV(filename, csv) {
  const blob = new Blob([csv], { type: 'text/csv' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

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

function fmtCurrency(n) { return '$' + (n ?? 0).toLocaleString(); }

// ── Receipt dialog ────────────────────────────────────────────────────────────
function ReceiptDialog({ open, ticket, onClose }) {
  if (!ticket) return null;

  function handlePrint() {
    const w = window.open('', '_blank', 'width=480,height=640');
    w.document.write(`
      <html><head><title>Receipt #${ticket.receiptNum}</title>
      <style>
        body { font-family: monospace; padding: 32px; max-width: 400px; margin: 0 auto; }
        h2 { margin: 0 0 4px; } .divider { border-top: 1px dashed #999; margin: 12px 0; }
        .row { display: flex; justify-content: space-between; margin: 6px 0; }
        .label { color: #666; } .bold { font-weight: bold; }
        .big { font-size: 1.4em; font-weight: bold; margin: 12px 0; }
        .footer { text-align: center; color: #999; font-size: 0.85em; margin-top: 24px; }
      </style></head><body>
      <h2>SuperContest</h2>
      <div class="label">ENTRY RECEIPT</div>
      <div class="divider"></div>
      <div class="row"><span class="label">Receipt #</span><span class="bold">${ticket.receiptNum}</span></div>
      <div class="row"><span class="label">Date</span><span>${fmtDateTime(ticket.createdAt)}</span></div>
      <div class="divider"></div>
      <div class="row"><span class="label">Contestant</span><span class="bold">${ticket.userName}</span></div>
      <div class="row"><span class="label">Email</span><span>${ticket.userEmail || '—'}</span></div>
      <div class="divider"></div>
      <div class="row"><span class="label">Contest</span><span>${ticket.contestName}</span></div>
      <div class="row"><span class="label">Entry Label</span><span>${ticket.label}</span></div>
      <div class="row"><span class="label">Ticket ID</span><span>${ticket.id}</span></div>
      ${ticket.proxyName ? `<div class="row"><span class="label">Proxy</span><span>${ticket.proxyName}</span></div>` : ''}
      <div class="divider"></div>
      <div class="row"><span class="label">Payment Method</span><span>${ticket.paymentMethod || '—'}</span></div>
      <div class="big">${fmtCurrency(ticket.entryFee)}</div>
      <div class="divider"></div>
      <div class="footer">Thank you for participating.<br/>Good luck!</div>
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" spacing={1}>
          <ReceiptIcon color="primary" />
          <Box>
            <Typography variant="h6" fontWeight={800}>Entry Receipt</Typography>
            {ticket.receiptNum && (
              <Typography variant="caption" color="text.secondary">#{ticket.receiptNum}</Typography>
            )}
          </Box>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={1.5}>
          {[
            { label: 'Ticket ID',      value: ticket.id,               mono: true },
            { label: 'Date Issued',    value: fmtDateTime(ticket.createdAt) },
            { label: 'Contestant',     value: ticket.userName,          bold: true },
            { label: 'Email',          value: ticket.userEmail || '—' },
            { label: 'Contest',        value: ticket.contestName },
            { label: 'Entry Label',    value: ticket.label },
            ticket.proxyName && { label: 'Proxy', value: ticket.proxyName },
            { label: 'Payment',        value: ticket.paymentMethod || '—' },
            { label: 'Amount',         value: fmtCurrency(ticket.entryFee), bold: true },
          ].filter(Boolean).map(({ label, value, mono, bold }) => (
            <Stack key={label} direction="row" justifyContent="space-between" alignItems="baseline">
              <Typography variant="caption" color="text.secondary">{label}</Typography>
              <Typography
                variant="body2"
                fontWeight={bold ? 800 : 400}
                fontFamily={mono ? 'monospace' : undefined}
              >
                {value}
              </Typography>
            </Stack>
          ))}
          <Divider />
          <Stack direction="row" alignItems="center" spacing={1}>
            <Typography variant="caption" color="text.secondary">Status</Typography>
            <Chip
              label={ticket.status}
              size="small"
              color={{ Active: 'success', 'Pending Payment': 'warning', Voided: 'error', Suspended: 'default', 'Eliminated (Survivor)': 'error' }[ticket.status] ?? 'default'}
              variant="muted"
              sx={{ ml: 'auto' }}
            />
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {ticket.receiptNum && (
          <Button variant="outlined" startIcon={<PrintIcon />} onClick={handlePrint}>
            Print
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}

// ── Export card ───────────────────────────────────────────────────────────────
function ExportCard({ icon, title, description, action, loading }) {
  return (
    <Card variant="outlined">
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        <Stack direction="row" alignItems="flex-start" spacing={2}>
          <Box sx={{ color: 'primary.main', mt: 0.5 }}>{icon}</Box>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="subtitle2" fontWeight={800}>{title}</Typography>
            <Typography variant="caption" color="text.secondary">{description}</Typography>
          </Box>
          <Button
            variant="outlined"
            size="small"
            startIcon={loading ? <CircularProgress size={14} /> : <FileDownloadIcon />}
            disabled={loading}
            onClick={action}
          >
            Export CSV
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function DocumentsPage() {
  const [entries, setEntries]         = useState([]);
  const [contests, setContests]       = useState([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [receiptTicket, setReceiptTicket]   = useState(null);
  const [searchQuery, setSearchQuery]       = useState('');
  const [contestFilter, setContestFilter]   = useState('All');
  const [exportingStandings, setExportingStandings] = useState(false);
  const [standingsContestId, setStandingsContestId] = useState('');
  const [error, setError]             = useState('');

  const load = useCallback(async () => {
    try {
      const [ticketData, contestData] = await Promise.all([
        fetch('/api/tickets').then((r) => r.json()),
        fetch('/api/contests').then((r) => r.json()),
      ]);
      setEntries(ticketData);
      setContests(contestData);
      const active = contestData.filter((c) => c.status === 'Active' || c.status === 'Registration Open');
      if (active.length > 0) setStandingsContestId(active[0].id);
    } catch (e) {
      setError('Could not load data: ' + e.message);
    } finally {
      setLoadingEntries(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filtered entries for receipt search
  const filteredEntries = entries.filter((e) => {
    const q = searchQuery.toLowerCase().trim();
    if (contestFilter !== 'All' && e.contestId !== contestFilter) return false;
    if (!q) return true;
    return e.userName.toLowerCase().includes(q)
      || e.userEmail.toLowerCase().includes(q)
      || e.id.toLowerCase().includes(q)
      || (e.receiptNum && e.receiptNum.includes(q));
  });

  // Export entries CSV
  function exportEntries() {
    const headers = ['Ticket ID', 'Receipt #', 'Contestant', 'Email', 'Contest', 'Entry', 'Status', 'Payment Method', 'Entry Fee', 'Proxy', 'Created At'];
    const rows = entries.map((e) => [
      e.id, e.receiptNum ?? '', e.userName, e.userEmail, e.contestName,
      e.label, e.status, e.paymentMethod ?? '', e.entryFee ?? '',
      e.proxyName ?? '', fmtDateTime(e.createdAt),
    ]);
    downloadCSV(`entries-${new Date().toISOString().slice(0,10)}.csv`, toCSV(headers, rows));
  }

  // Export standings CSV
  async function exportStandings() {
    if (!standingsContestId) return;
    setExportingStandings(true);
    try {
      const data = await fetch(`/api/standings?contestId=${standingsContestId}`).then((r) => r.json());
      const gradedWeeks = data.gradedWeeks ?? [];
      const headers = ['Rank', 'Contestant', 'Entry', 'Ticket ID', 'Total', 'W', 'L', 'P',
        ...gradedWeeks.map((wn) => `W${wn}`), 'Status'];
      const rows = data.entries.map((e) => [
        e.rank, e.userName, e.label, e.ticketId,
        e.totalScore, e.wins, e.losses, e.pushes,
        ...gradedWeeks.map((wn) => e.weekScores[wn] ?? ''),
        e.status,
      ]);
      const contest = contests.find((c) => c.id === standingsContestId);
      downloadCSV(`standings-${contest?.name?.replace(/\s+/g, '-') ?? standingsContestId}-${new Date().toISOString().slice(0,10)}.csv`,
        toCSV(headers, rows));
    } catch (e) {
      setError('Export failed: ' + e.message);
    } finally {
      setExportingStandings(false);
    }
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>Documents</Typography>
          <Typography variant="body2" color="text.secondary">
            Entry receipts and data exports.
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Grid container spacing={3}>

        {/* ── Left: Receipts ───────────────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 7 }}>
          <Typography variant="subtitle1" fontWeight={800} mb={1.5}>Entry Receipts</Typography>

          {/* Search */}
          <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
            <Stack direction="row" gap={2} flexWrap="wrap">
              <TextField
                placeholder="Search by name, email, ticket ID, receipt #…"
                size="small"
                sx={{ flexGrow: 1, minWidth: 200 }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <TextField
                select label="Contest" size="small" sx={{ minWidth: 200 }}
                value={contestFilter}
                onChange={(e) => setContestFilter(e.target.value)}
              >
                <MenuItem value="All">All Contests</MenuItem>
                {contests.map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
              </TextField>
            </Stack>
          </Paper>

          {loadingEntries && <Stack alignItems="center" py={4}><CircularProgress /></Stack>}

          {!loadingEntries && (
            <Paper variant="outlined">
              {filteredEntries.length === 0 && (
                <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
                  No entries match your search.
                </Typography>
              )}
              <Stack divider={<Divider />}>
                {filteredEntries.slice(0, 50).map((entry) => (
                  <CardActionArea key={entry.id} onClick={() => setReceiptTicket(entry)}
                    sx={{ px: 2, py: 1.25 }}>
                    <Stack direction="row" alignItems="center" justifyContent="space-between">
                      <Box>
                        <Typography variant="body2" fontWeight={700}>{entry.userName}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {entry.contestName} · {entry.label}
                          {entry.receiptNum && ` · Receipt #${entry.receiptNum}`}
                        </Typography>
                      </Box>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Typography variant="caption" fontFamily="monospace" color="primary.main">
                          {entry.id}
                        </Typography>
                        <Chip
                          label={entry.status}
                          size="small"
                          color={{ Active: 'success', 'Pending Payment': 'warning', Voided: 'error', Suspended: 'default', 'Eliminated (Survivor)': 'error' }[entry.status] ?? 'default'}
                          variant="muted"
                        />
                      </Stack>
                    </Stack>
                  </CardActionArea>
                ))}
              </Stack>
              {filteredEntries.length > 50 && (
                <Typography variant="caption" color="text.secondary" sx={{ p: 2, display: 'block' }}>
                  Showing first 50 of {filteredEntries.length} — refine your search.
                </Typography>
              )}
            </Paper>
          )}
        </Grid>

        {/* ── Right: Exports ───────────────────────────────────────────────── */}
        <Grid size={{ xs: 12, md: 5 }}>
          <Typography variant="subtitle1" fontWeight={800} mb={1.5}>Data Exports</Typography>
          <Stack spacing={2}>

            <ExportCard
              icon={<PeopleIcon />}
              title="All Entries"
              description="Full entry list with contestant info, payment status, and proxy assignments."
              action={exportEntries}
            />

            <Card variant="outlined">
              <CardContent sx={{ '&:last-child': { pb: 2 } }}>
                <Stack direction="row" alignItems="flex-start" spacing={2} mb={1.5}>
                  <Box sx={{ color: 'primary.main', mt: 0.5 }}><EmojiEventsIcon /></Box>
                  <Box>
                    <Typography variant="subtitle2" fontWeight={800}>Standings</Typography>
                    <Typography variant="caption" color="text.secondary">
                      Full rankings with per-week scores and W/L/P record.
                    </Typography>
                  </Box>
                </Stack>
                <Stack direction="row" gap={1.5} alignItems="center">
                  <TextField
                    select size="small" sx={{ flexGrow: 1 }}
                    value={standingsContestId}
                    onChange={(e) => setStandingsContestId(e.target.value)}
                    label="Contest"
                  >
                    {contests
                      .filter((c) => c.status === 'Active' || c.status === 'Registration Open')
                      .map((c) => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </TextField>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={exportingStandings ? <CircularProgress size={14} /> : <FileDownloadIcon />}
                    disabled={exportingStandings || !standingsContestId}
                    onClick={exportStandings}
                  >
                    Export
                  </Button>
                </Stack>
              </CardContent>
            </Card>

          </Stack>
        </Grid>
      </Grid>

      {/* Receipt dialog */}
      <ReceiptDialog
        open={Boolean(receiptTicket)}
        ticket={receiptTicket}
        onClose={() => setReceiptTicket(null)}
      />
    </Box>
  );
}
