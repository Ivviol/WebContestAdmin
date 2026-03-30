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
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Tooltip from '@mui/material/Tooltip';
import LinearProgress from '@mui/material/LinearProgress';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SaveIcon from '@mui/icons-material/Save';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtCurrency(n) {
  return '$' + Math.round(n).toLocaleString();
}
function fmtScore(s) {
  if (s == null) return '—';
  return s % 1 === 0 ? String(s) : s.toFixed(1);
}

const RANK_MEDAL = { 1: '🥇', 2: '🥈', 3: '🥉' };
const CONTEST_TYPE_LABEL = { sc: 'SuperContest', wta: 'Winner Take All', surv: 'Survivor' };

// ── Tiers editor ──────────────────────────────────────────────────────────────
function TiersEditor({ tiers, prizePool, finalized, onSave }) {
  const [rows, setRows]   = useState(tiers.map((t) => ({ ...t })));
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty]  = useState(false);

  useEffect(() => {
    setRows(tiers.map((t) => ({ ...t })));
    setDirty(false);
  }, [tiers]);

  function update(i, field, value) {
    setRows((prev) => prev.map((r, idx) => idx === i ? { ...r, [field]: value } : r));
    setDirty(true);
  }
  function addRow() {
    setRows((prev) => [...prev, { rank: prev.length + 1, label: `${prev.length + 1}th Place`, percent: 0 }]);
    setDirty(true);
  }
  function removeRow(i) {
    setRows((prev) => prev.filter((_, idx) => idx !== i).map((r, idx) => ({ ...r, rank: idx + 1 })));
    setDirty(true);
  }

  const totalPct = rows.reduce((s, r) => s + (Number(r.percent) || 0), 0);
  const totalAmt = rows.reduce((s, r) => s + Math.round(prizePool * (Number(r.percent) || 0) / 100), 0);
  const pctOk    = Math.abs(totalPct - 100) < 0.01;

  async function handleSave() {
    setSaving(true);
    await onSave(rows.map((r) => ({ label: r.label, percent: Number(r.percent) || 0 })));
    setDirty(false);
    setSaving(false);
  }

  return (
    <Stack spacing={1.5}>
      <TableContainer component={Paper} variant="outlined">
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell sx={{ fontWeight: 700, width: 48 }}>#</TableCell>
              <TableCell sx={{ fontWeight: 700 }}>Label</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 100 }} align="right">% of Pool</TableCell>
              <TableCell sx={{ fontWeight: 700, width: 120 }} align="right">Prize Amount</TableCell>
              {!finalized && <TableCell sx={{ width: 40 }} />}
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row, i) => (
              <TableRow key={i}>
                <TableCell>
                  <Typography variant="body2" fontWeight={700} color="text.secondary">
                    {RANK_MEDAL[i + 1] ?? `#${i + 1}`}
                  </Typography>
                </TableCell>
                <TableCell>
                  {finalized ? (
                    <Typography variant="body2">{row.label}</Typography>
                  ) : (
                    <TextField
                      value={row.label}
                      onChange={(e) => update(i, 'label', e.target.value)}
                      size="small"
                      fullWidth
                      variant="standard"
                    />
                  )}
                </TableCell>
                <TableCell align="right">
                  {finalized ? (
                    <Typography variant="body2">{row.percent}%</Typography>
                  ) : (
                    <TextField
                      value={row.percent}
                      onChange={(e) => update(i, 'percent', e.target.value)}
                      size="small"
                      type="number"
                      variant="standard"
                      slotProps={{ htmlInput: { min: 0, max: 100, step: 0.5, style: { textAlign: 'right', width: 60 } } }}
                    />
                  )}
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" fontWeight={700} color="success.main">
                    {fmtCurrency(prizePool * (Number(row.percent) || 0) / 100)}
                  </Typography>
                </TableCell>
                {!finalized && (
                  <TableCell align="center">
                    <IconButton size="small" color="error" onClick={() => removeRow(i)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </TableCell>
                )}
              </TableRow>
            ))}

            {/* Total row */}
            <TableRow sx={{ bgcolor: 'action.hover' }}>
              <TableCell colSpan={2}>
                <Typography variant="body2" fontWeight={700}>Total</Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={700} color={pctOk ? 'success.main' : 'error.main'}>
                  {totalPct.toFixed(totalPct % 1 === 0 ? 0 : 1)}%
                </Typography>
              </TableCell>
              <TableCell align="right">
                <Typography variant="body2" fontWeight={700} color="success.main">
                  {fmtCurrency(totalAmt)}
                </Typography>
              </TableCell>
              {!finalized && <TableCell />}
            </TableRow>
          </TableBody>
        </Table>
      </TableContainer>

      {!pctOk && !finalized && (
        <Alert severity="warning" sx={{ py: 0.5 }}>
          Tiers total {totalPct.toFixed(1)}% — must equal 100% before finalizing.
        </Alert>
      )}

      {!finalized && (
        <Stack direction="row" spacing={1}>
          <Button size="small" variant="outlined" startIcon={<AddIcon />} onClick={addRow}>
            Add Tier
          </Button>
          <Button
            size="small"
            variant="contained"
            startIcon={saving ? <CircularProgress size={14} color="inherit" /> : <SaveIcon />}
            disabled={saving || !dirty}
            onClick={handleSave}
          >
            Save Tiers
          </Button>
        </Stack>
      )}
    </Stack>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function PayoutsPage() {
  const [contestsList, setContestsList] = useState([]);
  const [selectedId, setSelectedId]     = useState(null);
  const [data, setData]                 = useState(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const [confirmFinalize, setConfirmFinalize] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);

  useEffect(() => {
    fetch('/api/contests')
      .then((r) => r.json())
      .then((list) => {
        const relevant = list.filter((c) => ['Active', 'Registration Open', 'Closed'].includes(c.status));
        setContestsList(relevant);
        if (relevant.length > 0) setSelectedId(relevant[0].id);
      });
  }, []);

  const loadData = useCallback(async (id) => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const d = await fetch(`/api/contests/${id}/payouts`).then((r) => r.json());
      if (d.error) throw new Error(d.error);
      setData(d);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(selectedId); }, [selectedId]);

  async function handleSaveTiers(tiers) {
    await fetch(`/api/contests/${selectedId}/payout-tiers`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tiers }),
    });
    await loadData(selectedId);
  }

  async function handleStatusChange(status) {
    setStatusSaving(true);
    setConfirmFinalize(false);
    await fetch(`/api/contests/${selectedId}/payouts-status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    await loadData(selectedId);
    setStatusSaving(false);
  }

  const finalized = data?.payoutsStatus === 'Finalized';
  const totalPct  = data?.tiers.reduce((s, t) => s + t.percent, 0) ?? 0;
  const pctOk     = Math.abs(totalPct - 100) < 0.01;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>Prize Payouts</Typography>
          <Typography variant="body2" color="text.secondary">
            Configure payout tiers and preview prize distribution based on current standings.
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

      {error  && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <Stack alignItems="center" py={8}><CircularProgress /></Stack>}

      {!loading && data && (
        <Stack spacing={3}>

          {/* Prize pool summary */}
          <Card variant="outlined">
            <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
              <Stack direction="row" alignItems="center" justifyContent="space-between" flexWrap="wrap" gap={2}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <EmojiEventsIcon color="warning" />
                  <Box>
                    <Typography variant="h6" fontWeight={800}>
                      {contestsList.find((c) => c.id === selectedId)?.name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {CONTEST_TYPE_LABEL[data.prizeStructure?.split('-')[0]] ?? data.prizeStructure}
                    </Typography>
                  </Box>
                  <Chip
                    label={finalized ? 'Finalized' : 'Draft'}
                    size="small"
                    color={finalized ? 'success' : 'warning'}
                    icon={finalized ? <LockIcon /> : <LockOpenIcon />}
                    variant="muted"
                  />
                </Stack>

                <Stack direction="row" spacing={3} alignItems="flex-end">
                  {[
                    { label: 'Entry Fee',    val: fmtCurrency(data.entryFee) },
                    { label: 'Paid Entries', val: data.paidEntries,
                      sub: data.totalEntries > data.paidEntries ? `${data.totalEntries - data.paidEntries} unpaid` : null },
                    { label: 'Prize Pool',   val: fmtCurrency(data.prizePool), color: 'warning.main' },
                    { label: 'To Pay Out',   val: fmtCurrency(data.totalPayout),
                      color: pctOk ? 'success.main' : 'error.main' },
                  ].map(({ label, val, sub, color }) => (
                    <Box key={label} textAlign="right">
                      <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                      <Typography variant="body1" fontWeight={800} color={color || 'text.primary'}>{val}</Typography>
                      {sub && <Typography variant="caption" color="warning.main">{sub}</Typography>}
                    </Box>
                  ))}
                </Stack>
              </Stack>

              {/* Pool progress bar */}
              <Box mt={1.5}>
                <LinearProgress
                  variant="determinate"
                  value={Math.min(100, totalPct)}
                  color={pctOk ? 'success' : 'warning'}
                  sx={{ height: 6, borderRadius: 3 }}
                />
                <Typography variant="caption" color="text.secondary" display="block" mt={0.5}>
                  {totalPct.toFixed(totalPct % 1 === 0 ? 0 : 1)}% of prize pool allocated
                  {!pctOk && ' — adjust tiers to reach 100%'}
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Tiers editor */}
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
              Payout Tiers
            </Typography>
            <TiersEditor
              tiers={data.tiers}
              prizePool={data.prizePool}
              finalized={finalized}
              onSave={handleSaveTiers}
            />
          </Box>

          <Divider />

          {/* Payout preview */}
          <Box>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
              <Box>
                <Typography variant="overline" color="text.secondary" fontWeight={700}>
                  {finalized ? 'Final Payouts' : 'Payout Preview'}
                </Typography>
                {!finalized && (
                  <Typography variant="caption" color="text.secondary" display="block">
                    Based on current standings — updates as picks are graded.
                  </Typography>
                )}
              </Box>

              {/* Finalize / Reopen button */}
              {finalized ? (
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={statusSaving ? <CircularProgress size={14} /> : <LockOpenIcon />}
                  disabled={statusSaving}
                  onClick={() => handleStatusChange('Draft')}
                >
                  Reopen
                </Button>
              ) : (
                <Tooltip title={!pctOk ? 'Tiers must total 100% before finalizing' : ''}>
                  <span>
                    <Button
                      variant="contained"
                      size="small"
                      color="success"
                      startIcon={statusSaving ? <CircularProgress size={14} color="inherit" /> : <LockIcon />}
                      disabled={statusSaving || !pctOk || data.payoutList.length === 0}
                      onClick={() => setConfirmFinalize(true)}
                    >
                      Finalize Payouts
                    </Button>
                  </span>
                </Tooltip>
              )}
            </Stack>

            {data.payoutList.length === 0 ? (
              <Alert severity="info">No entries found for this contest.</Alert>
            ) : (
              <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 700, width: 56 }}>Rank</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Contestant</TableCell>
                      <TableCell sx={{ fontWeight: 700 }}>Entry</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Score</TableCell>
                      <TableCell sx={{ fontWeight: 700 }} align="right">Prize</TableCell>
                      <TableCell sx={{ fontWeight: 700, width: 130 }}>Tier</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {data.payoutList.map((entry) => (
                      <TableRow
                        key={entry.ticketId}
                        hover
                        sx={{
                          opacity: entry.status === 'Suspended' ? 0.6 : 1,
                          bgcolor: entry.prize > 0 && entry.rank <= 3
                            ? 'rgba(255,215,0,0.04)' : undefined,
                        }}
                      >
                        <TableCell>
                          <Typography variant="body2" fontWeight={900}
                            sx={{ color: { 1: '#FFD700', 2: '#B0BEC5', 3: '#CD7F32' }[entry.rank] ?? 'text.secondary' }}>
                            {RANK_MEDAL[entry.rank] ?? `#${entry.rank}`}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2" fontWeight={700}>{entry.userName}</Typography>
                          <Typography variant="caption" color="text.secondary" fontFamily="monospace">
                            {entry.ticketId}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">{entry.label}</Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2" fontWeight={700}>
                            {fmtScore(entry.totalScore)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          {entry.prize > 0 ? (
                            <Typography variant="body2" fontWeight={800} color="success.main">
                              {fmtCurrency(entry.prize)}
                            </Typography>
                          ) : (
                            <Typography variant="body2" color="text.disabled">—</Typography>
                          )}
                        </TableCell>
                        <TableCell>
                          {entry.tierLabel ? (
                            <Chip label={entry.tierLabel} size="small" color="warning" variant="muted" />
                          ) : (
                            <Typography variant="caption" color="text.disabled">No prize</Typography>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        </Stack>
      )}

      {/* Finalize confirm dialog */}
      <Dialog open={confirmFinalize} onClose={() => setConfirmFinalize(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Finalize Payouts?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" gutterBottom>
            This will lock the payout configuration. Prize amounts will no longer update as standings change.
          </Typography>
          {data && (
            <Stack spacing={0.5} mt={1.5}>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Prize pool</Typography>
                <Typography variant="body2" fontWeight={700}>{fmtCurrency(data.prizePool)}</Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Total payout</Typography>
                <Typography variant="body2" fontWeight={700} color="success.main">
                  {fmtCurrency(data.totalPayout)}
                </Typography>
              </Stack>
              <Stack direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">Winners paid</Typography>
                <Typography variant="body2" fontWeight={700}>
                  {data.payoutList.filter((e) => e.prize > 0).length}
                </Typography>
              </Stack>
            </Stack>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmFinalize(false)} variant="outlined">Cancel</Button>
          <Button onClick={() => handleStatusChange('Finalized')} variant="contained"
            color="success" startIcon={<LockIcon />}>
            Finalize
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
