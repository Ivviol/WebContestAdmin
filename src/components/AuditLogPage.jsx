import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Paper from '@mui/material/Paper';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Button from '@mui/material/Button';
import RefreshIcon from '@mui/icons-material/Refresh';

// ── Type config ───────────────────────────────────────────────────────────────
const TYPE_META = {
  contest_status:   { label: 'Contest Status',   color: 'primary'  },
  week_status:      { label: 'Week Card',         color: 'info'     },
  picks_graded:     { label: 'Grading',           color: 'success'  },
  entry_sold:       { label: 'Entry Sold',        color: 'success'  },
  entry_status:     { label: 'Entry Status',      color: 'warning'  },
  payout_finalized: { label: 'Payout Finalized',  color: 'success'  },
  payout_reopened:  { label: 'Payout Reopened',   color: 'warning'  },
  proxy_registered: { label: 'Proxy Registered',  color: 'info'     },
  proxy_status:     { label: 'Proxy Status',      color: 'warning'  },
  picks_submitted:  { label: 'Picks Submitted',   color: 'info'     },
  contestant_added: { label: 'Contestant Added',  color: 'primary'  },
  settings_changed: { label: 'Settings',          color: 'default'  },
};

const ALL_TYPES = [
  { value: '', label: 'All Types' },
  ...Object.entries(TYPE_META).map(([value, { label }]) => ({ value, label })),
];

function fmtTimestamp(iso) {
  return new Date(iso).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function TypeChip({ type }) {
  const meta = TYPE_META[type] ?? { label: type, color: 'default' };
  return <Chip label={meta.label} size="small" color={meta.color} variant="muted" />;
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function AuditLogPage() {
  const [rows, setRows]       = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [page, setPage]       = useState(0);
  const [rowsPerPage]         = useState(25);

  // Filters (local — applied client-side after fetch)
  const [typeFilter, setTypeFilter]     = useState('');
  const [searchQuery, setSearchQuery]   = useState('');
  const [dateFrom, setDateFrom]         = useState('');
  const [dateTo, setDateTo]             = useState('');

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    const params = new URLSearchParams();
    if (typeFilter) params.set('type', typeFilter);
    if (dateFrom)   params.set('from', dateFrom);
    if (dateTo)     params.set('to',   dateTo);
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    fetch(`/api/audit-log?${params}`)
      .then((r) => r.json())
      .then((data) => { setRows(data); setPage(0); })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [typeFilter, dateFrom, dateTo, searchQuery]);

  // Auto-load on filter change
  useEffect(() => { load(); }, [load]);

  const pageRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>Audit Log</Typography>
          <Typography variant="body2" color="text.secondary">
            System-wide record of all administrative actions.
          </Typography>
        </Box>
        <Button variant="outlined" size="small" startIcon={<RefreshIcon />} onClick={load}>
          Refresh
        </Button>
      </Stack>

      {/* Filters */}
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" gap={2} flexWrap="wrap" alignItems="center">
          <TextField
            placeholder="Search description or entity…"
            size="small"
            sx={{ minWidth: 260 }}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <TextField
            select
            label="Type"
            size="small"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            sx={{ minWidth: 180 }}
          >
            {ALL_TYPES.map((t) => (
              <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
            ))}
          </TextField>
          <TextField
            label="From date"
            type="date"
            size="small"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <TextField
            label="To date"
            type="date"
            size="small"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          {(typeFilter || searchQuery || dateFrom || dateTo) && (
            <Button size="small" onClick={() => {
              setTypeFilter(''); setSearchQuery(''); setDateFrom(''); setDateTo('');
            }}>
              Clear
            </Button>
          )}
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <Stack alignItems="center" py={8}><CircularProgress /></Stack>}

      {!loading && (
        <>
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 170 }}>Timestamp</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 160 }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Description</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 110 }}>Entity</TableCell>
                  <TableCell sx={{ fontWeight: 700, width: 90 }}>Performed By</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                      <Typography color="text.secondary">No log entries match your filters.</Typography>
                    </TableCell>
                  </TableRow>
                )}
                {pageRows.map((entry) => (
                  <TableRow key={entry.id} hover>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {fmtTimestamp(entry.timestamp)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <TypeChip type={entry.type} />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{entry.description}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" fontFamily="monospace" color="primary.main">
                        {entry.entity}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">
                        {entry.performedBy}
                      </Typography>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <TablePagination
              component="div"
              count={rows.length}
              page={page}
              rowsPerPage={rowsPerPage}
              rowsPerPageOptions={[25]}
              onPageChange={(_, p) => setPage(p)}
            />
          </TableContainer>

          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
            {rows.length} entr{rows.length === 1 ? 'y' : 'ies'} — newest first
          </Typography>
        </>
      )}
    </Box>
  );
}
