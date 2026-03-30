import { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import MenuItem from '@mui/material/MenuItem';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Paper from '@mui/material/Paper';
import Tooltip from '@mui/material/Tooltip';
import IconButton from '@mui/material/IconButton';
import LinearProgress from '@mui/material/LinearProgress';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import AddIcon from '@mui/icons-material/Add';
import BlockIcon from '@mui/icons-material/Block';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';
import ShieldIcon from '@mui/icons-material/Shield';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import CloseIcon from '@mui/icons-material/Close';
import PrintIcon from '@mui/icons-material/Print';

const CONTEST_ICONS = {
  wta: <EmojiEventsIcon />,
  surv: <ShieldIcon />,
  sc: <SportsFootballIcon />,
};

const CONTEST_COLORS = {
  wta: 'warning',
  surv: 'info',
  sc: 'primary',
};

const PAYMENT_METHODS = ['Cash', 'Credit Card', 'Debit Card', 'Comp'];

function TicketStatusChip({ status }) {
  const map = { Active: 'success', Suspended: 'default', Voided: 'error', 'Eliminated (Survivor)': 'error' };
  return <Chip label={status} size="small" color={map[status] || 'default'} variant="muted" />;
}

function ContestCard({ summary, onAddTicket, onVoidTicket }) {
  const { contestId, contestName, ticketLimit, price, used, remaining, tickets } = summary;
  const isFull = remaining === 0;
  const activeTickets = tickets.filter((t) => t.status !== 'Voided');
  const pct = ticketLimit > 0 ? (used / ticketLimit) * 100 : 0;
  const color = CONTEST_COLORS[contestId] || 'primary';

  return (
    <Card variant="outlined" sx={{ flex: 1, minWidth: 240 }}>
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
          <Box sx={{ color: `${color}.main` }}>{CONTEST_ICONS[contestId]}</Box>
          <Box flex={1}>
            <Typography variant="subtitle2" fontWeight={700}>
              {contestName}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              ${price.toLocaleString()} per ticket
            </Typography>
          </Box>
          <Chip
            label={isFull ? 'Full' : `${remaining} left`}
            size="small"
            color={isFull ? 'error' : 'success'}
            variant="muted"
          />
        </Stack>

        <Box mb={1.5}>
          <Stack direction="row" justifyContent="space-between" mb={0.5}>
            <Typography variant="caption" color="text.secondary">
              Tickets used
            </Typography>
            <Typography variant="caption" fontWeight={700}>
              {used} / {ticketLimit}
            </Typography>
          </Stack>
          <LinearProgress
            variant="determinate"
            value={pct}
            color={isFull ? 'error' : color}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>

        {activeTickets.length > 0 && (
          <Box mb={1.5}>
            {activeTickets.map((t) => (
              <Stack
                key={t.id}
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{
                  py: 0.5,
                  px: 1,
                  mb: 0.5,
                  borderRadius: 1,
                  bgcolor: 'action.hover',
                  opacity: t.status === 'Voided' ? 0.5 : 1,
                }}
              >
                <Box>
                  <Typography variant="caption" fontWeight={700}>
                    {t.label}
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                    #{t.receiptNum}
                  </Typography>
                </Box>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <TicketStatusChip status={t.status} />
                  {t.status === 'Active' && (
                    <Tooltip title="Void ticket">
                      <IconButton size="small" color="error" onClick={() => onVoidTicket(t)}>
                        <CloseIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Tooltip>
                  )}
                </Stack>
              </Stack>
            ))}
          </Box>
        )}

        {tickets.some((t) => t.status === 'Voided') && (
          <Typography variant="caption" color="text.disabled" sx={{ display: 'block', mb: 1 }}>
            +{tickets.filter((t) => t.status === 'Voided').length} voided
          </Typography>
        )}

        <Button
          fullWidth
          variant={isFull ? 'outlined' : 'contained'}
          color={color}
          size="small"
          startIcon={<AddIcon />}
          disabled={isFull}
          onClick={() => onAddTicket(contestId)}
        >
          {isFull ? 'Limit reached' : `Add ticket — $${price.toLocaleString()}`}
        </Button>
      </CardContent>
    </Card>
  );
}

function AddTicketDialog({ open, contestId, contests, user, onClose, onConfirm }) {
  const contest = contests.find((c) => c.id === contestId);
  const [label, setLabel] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setLabel('');
      setPaymentMethod('Cash');
      setError('');
    }
  }, [open]);

  async function handleConfirm() {
    setLoading(true);
    setError('');
    try {
      await onConfirm({ contestId, label, paymentMethod });
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  if (!contest || !user) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>Add Ticket</Typography>
          <Typography variant="caption" color="text.secondary">{contest.name}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={2}>
          <Card variant="outlined">
            <CardContent sx={{ py: '12px !important' }}>
              <Stack direction="row" spacing={1.5} alignItems="center">
                <PersonIcon color="action" />
                <Box>
                  <Typography variant="body2" fontWeight={700}>{user.name}</Typography>
                  <Typography variant="caption" color="text.secondary">{user.id} · {user.email}</Typography>
                </Box>
              </Stack>
            </CardContent>
          </Card>

          <TextField
            label="Entry Label"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            size="small"
            fullWidth
            placeholder="e.g. Entry A, Sharp Picks…"
          />

          <TextField
            select
            label="Payment Method"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            size="small"
            fullWidth
          >
            {PAYMENT_METHODS.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </TextField>

          <Paper variant="outlined" sx={{ p: 1.5 }}>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="body2" color="text.secondary">Amount due</Typography>
              <Typography variant="body2" fontWeight={700} color="primary.main">
                ${contest.entryFee.toLocaleString()}
              </Typography>
            </Stack>
          </Paper>

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={loading}>Cancel</Button>
        <Button
          onClick={handleConfirm}
          variant="contained"
          color="primary"
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} /> : <CheckCircleIcon />}
        >
          Confirm & Issue
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function ReceiptDialog({ open, receipt, onClose }) {
  if (!receipt) return null;
  const { ticket, contest, user } = receipt;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <CheckCircleIcon color="success" />
          <Typography variant="h6" fontWeight={700}>Ticket Issued</Typography>
        </Stack>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={1.5}>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Receipt #</Typography>
            <Typography variant="body2" fontWeight={700} fontFamily="monospace">{ticket.receiptNum}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Ticket ID</Typography>
            <Typography variant="body2" fontFamily="monospace">{ticket.id}</Typography>
          </Stack>
          <Divider />
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Contestant</Typography>
            <Typography variant="body2" fontWeight={700}>{user.name}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Contest</Typography>
            <Typography variant="body2">{contest.name}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Entry Label</Typography>
            <Typography variant="body2">{ticket.label}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Payment</Typography>
            <Typography variant="body2">{ticket.paymentMethod} — ${contest.entryFee.toLocaleString()}</Typography>
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">Issued at</Typography>
            <Typography variant="body2">{new Date(ticket.createdAt).toLocaleString()}</Typography>
          </Stack>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button startIcon={<PrintIcon />} variant="outlined" onClick={onClose}>Print Receipt</Button>
        <Button variant="contained" onClick={onClose}>Done</Button>
      </DialogActions>
    </Dialog>
  );
}

export default function CashierPage() {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingUser, setLoadingUser] = useState(false);
  const [contests, setContests] = useState([]);
  const [addDialog, setAddDialog] = useState({ open: false, contestId: null });
  const [receipt, setReceipt] = useState(null);
  const [voidConfirm, setVoidConfirm] = useState(null);
  const searchTimer = useRef(null);

  useEffect(() => {
    fetch('/api/contests?cashier=true').then((r) => r.json()).then(setContests);
  }, []);

  useEffect(() => {
    clearTimeout(searchTimer.current);
    if (!query.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/users/search?q=${encodeURIComponent(query)}`);
        setSearchResults(await r.json());
      } finally {
        setSearching(false);
      }
    }, 300);
  }, [query]);

  async function selectUser(user) {
    setQuery(user.name);
    setSearchResults([]);
    setLoadingUser(true);
    try {
      const r = await fetch(`/api/users/${user.id}`);
      setSelectedUser(await r.json());
    } finally {
      setLoadingUser(false);
    }
  }

  async function reloadUser() {
    if (!selectedUser) return;
    const r = await fetch(`/api/users/${selectedUser.id}`);
    setSelectedUser(await r.json());
  }

  async function handleAddTicket({ contestId, label, paymentMethod }) {
    const r = await fetch('/api/tickets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: selectedUser.id, contestId, label, paymentMethod }),
    });
    const data = await r.json();
    if (!r.ok) throw new Error(data.error);
    setAddDialog({ open: false, contestId: null });
    setReceipt(data);
    await reloadUser();
  }

  async function handleVoidTicket() {
    if (!voidConfirm) return;
    await fetch(`/api/tickets/${voidConfirm.id}/void`, { method: 'PATCH' });
    setVoidConfirm(null);
    await reloadUser();
  }

  function clearUser() {
    setSelectedUser(null);
    setQuery('');
    setSearchResults([]);
  }

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>
            Cashier
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Look up a contestant and issue tickets for any contest
          </Typography>
        </Box>
        {selectedUser && (
          <Button variant="outlined" size="small" onClick={clearUser}>
            New transaction
          </Button>
        )}
      </Stack>

      {/* Search */}
      <Box sx={{ position: 'relative', maxWidth: 520, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search by name, email, ID, or phone…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          size="small"
          slotProps={{
            input: {
              startAdornment: searching
                ? <CircularProgress size={16} sx={{ mr: 1 }} />
                : <SearchIcon color="action" sx={{ mr: 1 }} />,
            },
          }}
          disabled={!!selectedUser}
        />
        {searchResults.length > 0 && (
          <Paper
            elevation={4}
            sx={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              mt: 0.5,
              zIndex: 10,
              maxHeight: 300,
              overflowY: 'auto',
            }}
          >
            <List dense disablePadding>
              {searchResults.map((u) => (
                <ListItemButton key={u.id} onClick={() => selectUser(u)}>
                  <ListItemText
                    primary={u.name}
                    secondary={`${u.id} · ${u.email} · ${u.phone}`}
                  />
                </ListItemButton>
              ))}
            </List>
          </Paper>
        )}
      </Box>

      {/* Loading */}
      {loadingUser && (
        <Stack alignItems="center" py={6}>
          <CircularProgress />
        </Stack>
      )}

      {/* User panel */}
      {selectedUser && !loadingUser && (
        <Stack spacing={3}>
          {/* User card */}
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2}>
                <Box
                  sx={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    backgroundImage: 'var(--spark-palette-background-primaryGradient)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  <PersonIcon sx={{ color: '#fff' }} />
                </Box>
                <Box flex={1}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="h6" fontWeight={700}>{selectedUser.name}</Typography>
                    <Chip label={selectedUser.id} size="small" variant="outlined" sx={{ fontFamily: 'monospace' }} />
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    {selectedUser.email} · {selectedUser.phone}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={1} alignItems="center">
                  <ConfirmationNumberIcon color="action" fontSize="small" />
                  <Typography variant="body2" color="text.secondary">
                    {selectedUser.contestSummary.reduce((sum, s) => sum + s.used, 0)} total tickets
                  </Typography>
                </Stack>
              </Stack>
            </CardContent>
          </Card>

          {/* Contest cards */}
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700} sx={{ mb: 1.5, display: 'block' }}>
              Contest Tickets
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
              {selectedUser.contestSummary.map((summary) => (
                <ContestCard
                  key={summary.contestId}
                  summary={summary}
                  onAddTicket={(cid) => setAddDialog({ open: true, contestId: cid })}
                  onVoidTicket={(t) => setVoidConfirm(t)}
                />
              ))}
            </Stack>
          </Box>
        </Stack>
      )}

      {/* Empty state */}
      {!selectedUser && !loadingUser && (
        <Stack alignItems="center" py={8} spacing={2} sx={{ opacity: 0.4 }}>
          <SearchIcon sx={{ fontSize: 56 }} />
          <Typography variant="body1">Search for a contestant to get started</Typography>
        </Stack>
      )}

      {/* Add ticket dialog */}
      <AddTicketDialog
        open={addDialog.open}
        contestId={addDialog.contestId}
        contests={contests}
        user={selectedUser}
        onClose={() => setAddDialog({ open: false, contestId: null })}
        onConfirm={handleAddTicket}
      />

      {/* Receipt dialog */}
      <ReceiptDialog
        open={Boolean(receipt)}
        receipt={receipt}
        onClose={() => setReceipt(null)}
      />

      {/* Void confirm dialog */}
      <Dialog open={Boolean(voidConfirm)} onClose={() => setVoidConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Void Ticket?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Void <strong>{voidConfirm?.label}</strong> (#{voidConfirm?.receiptNum})? This cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setVoidConfirm(null)} variant="outlined">Cancel</Button>
          <Button onClick={handleVoidTicket} variant="contained" color="error" startIcon={<BlockIcon />}>
            Void Ticket
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
