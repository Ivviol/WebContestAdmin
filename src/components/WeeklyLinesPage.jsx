import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
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
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Autocomplete from '@mui/material/Autocomplete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import CloseIcon from '@mui/icons-material/Close';
import PublishIcon from '@mui/icons-material/Publish';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import SportsFootballIcon from '@mui/icons-material/SportsFootball';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';


// ── Constants ─────────────────────────────────────────────────────────────────
const STATUS_COLOR  = { Draft: 'default', Published: 'info', Locked: 'success' };
const STATUS_ICON   = { Draft: <LockOpenIcon fontSize="small" />, Published: <PublishIcon fontSize="small" />, Locked: <LockIcon fontSize="small" /> };
const GAME_STATUS_COLOR = { Scheduled: 'default', Final: 'success', Postponed: 'warning', Cancelled: 'error' };

// ── Helpers ───────────────────────────────────────────────────────────────────
function fmtDeadline(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZoneName: 'short' });
}
function fmtGameDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}
function fmtSpread(homeTeam, homeSpread) {
  if (homeSpread === 0) return 'PK';
  const favored = homeSpread < 0 ? homeTeam : null;
  const dog     = homeSpread > 0 ? homeTeam : null;
  const shortHome = homeTeam.split(' ').pop(); // last word = team nickname
  if (homeSpread < 0) return `${shortHome} ${homeSpread}`;
  return `${shortHome} +${homeSpread}`;
}
function spreadColor(homeSpread) {
  if (homeSpread === 0) return 'text.secondary';
  return 'text.primary';
}

// ── Week selector ─────────────────────────────────────────────────────────────
function WeekSelector({ weeks, selectedId, onSelect, onCreateWeek }) {
  // Show W1–W17; highlight existing ones, show gaps too
  const existingNums = new Set(weeks.map((w) => w.weekNum));
  const maxWeek = Math.max(17, ...weeks.map((w) => w.weekNum));

  return (
    <Box sx={{ mb: 3 }}>
      <Stack direction="row" alignItems="center" spacing={1} mb={1}>
        <Typography variant="overline" color="text.secondary" fontWeight={700}>Season 2025</Typography>
      </Stack>
      <Box sx={{ display: 'flex', gap: 0.75, flexWrap: 'wrap' }}>
        {Array.from({ length: maxWeek }, (_, i) => i + 1).map((n) => {
          const week = weeks.find((w) => w.weekNum === n);
          const isSelected = week?.id === selectedId;
          const color = week ? STATUS_COLOR[week.status] : 'default';
          return week ? (
            <Chip
              key={n}
              label={`W${n}`}
              size="small"
              color={isSelected ? 'primary' : color === 'default' ? 'default' : color}
              variant={isSelected ? 'filled' : 'outlined'}
              onClick={() => onSelect(week.id)}
              sx={{ cursor: 'pointer', fontWeight: isSelected ? 700 : 400 }}
            />
          ) : (
            <Chip
              key={n}
              label={`W${n}`}
              size="small"
              variant="outlined"
              onClick={() => onCreateWeek(n)}
              sx={{ cursor: 'pointer', opacity: 0.4, '&:hover': { opacity: 0.8 } }}
            />
          );
        })}
        <Chip
          label="+ Week"
          size="small"
          color="primary"
          variant="outlined"
          onClick={() => onCreateWeek(null)}
          icon={<AddIcon />}
        />
      </Box>
    </Box>
  );
}

// ── Add/Edit game dialog ──────────────────────────────────────────────────────
const EMPTY_GAME = { awayTeam: '', homeTeam: '', homeSpread: '', gameDate: '', onCard: true };

function GameDialog({ open, game, onClose, onSave, teams = [] }) {
  const isEdit = Boolean(game?.id);
  const [form, setForm] = useState(EMPTY_GAME);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setError('');
    setForm(game?.id ? {
      awayTeam:   game.awayTeam,
      homeTeam:   game.homeTeam,
      homeSpread: String(game.homeSpread),
      gameDate:   game.gameDate ? game.gameDate.slice(0, 16) : '',
      onCard:     game.onCard,
    } : EMPTY_GAME);
  }, [open, game]);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function handleSave() {
    if (!form.awayTeam || !form.homeTeam) return setError('Both teams are required');
    setSaving(true); setError('');
    try {
      await onSave({
        awayTeam:   form.awayTeam,
        homeTeam:   form.homeTeam,
        homeSpread: Number(form.homeSpread) || 0,
        gameDate:   form.gameDate ? new Date(form.gameDate).toISOString() : null,
        onCard:     form.onCard,
      });
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>{isEdit ? 'Edit Game' : 'Add Game'}</Typography>
        <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Autocomplete
            options={teams}
            value={form.awayTeam}
            onChange={(_, v) => set('awayTeam', v || '')}
            renderInput={(params) => <TextField {...params} label="Away Team" size="small" required />}
            freeSolo
          />
          <Autocomplete
            options={teams}
            value={form.homeTeam}
            onChange={(_, v) => set('homeTeam', v || '')}
            renderInput={(params) => <TextField {...params} label="Home Team" size="small" required />}
            freeSolo
          />
          <TextField
            label="Home Spread"
            value={form.homeSpread}
            onChange={(e) => set('homeSpread', e.target.value)}
            size="small" fullWidth type="number"
            helperText="Negative = home favored (e.g. -3.5). 0 = pick 'em."
            slotProps={{ htmlInput: { step: 0.5 } }}
          />
          <TextField
            label="Game Date & Time (local)"
            value={form.gameDate}
            onChange={(e) => set('gameDate', e.target.value)}
            size="small" fullWidth type="datetime-local"
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Box>
              <Typography variant="body2" fontWeight={600}>Include on pick card</Typography>
              <Typography variant="caption" color="text.secondary">Contestants can pick this game</Typography>
            </Box>
            <Switch checked={form.onCard} onChange={(e) => set('onCard', e.target.checked)} />
          </Stack>
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}
          startIcon={saving ? <CircularProgress size={14} /> : null}>
          {isEdit ? 'Save' : 'Add Game'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Create week dialog ────────────────────────────────────────────────────────
function CreateWeekDialog({ open, prefillWeek, onClose, onSave, leagues = [] }) {
  const [weekNum, setWeekNum] = useState('');
  const [deadline, setDeadline] = useState('');
  const [leagueId, setLeagueId] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setWeekNum(prefillWeek ? String(prefillWeek) : '');
    setDeadline('');
    setLeagueId(leagues[0]?.id ?? '');
    setError('');
  }, [open, prefillWeek, leagues]);

  async function handleSave() {
    if (!weekNum) return setError('Week number is required');
    setSaving(true); setError('');
    try { await onSave({ weekNum: Number(weekNum), picksDeadline: deadline || null, leagueId: leagueId || null }); }
    catch (e) { setError(e.message); }
    finally { setSaving(false); }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Create Week</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <TextField label="Week Number" value={weekNum} onChange={(e) => setWeekNum(e.target.value)}
            size="small" fullWidth type="number" slotProps={{ htmlInput: { min: 1, max: 20 } }} />
          <TextField label="Picks Deadline" value={deadline} onChange={(e) => setDeadline(e.target.value)}
            size="small" fullWidth type="datetime-local" slotProps={{ inputLabel: { shrink: true } }}
            helperText="Typically Saturday 5:00 PM Pacific" />
          {leagues.length > 0 && (
            <TextField
              select label="League" size="small" fullWidth
              value={leagueId}
              onChange={(e) => setLeagueId(e.target.value)}
            >
              {leagues.map((l) => (
                <MenuItem key={l.id} value={l.id}>{l.name} ({l.teamCount} teams)</MenuItem>
              ))}
            </TextField>
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={onClose} variant="outlined" disabled={saving}>Cancel</Button>
        <Button onClick={handleSave} variant="contained" disabled={saving}>Create</Button>
      </DialogActions>
    </Dialog>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function WeeklyLinesPage() {
  const [weeks, setWeeks]               = useState([]);
  const [selectedId, setSelectedId]     = useState(null);
  const [card, setCard]                 = useState(null);
  const [loadingList, setLoadingList]   = useState(true);
  const [loadingCard, setLoadingCard]   = useState(false);
  const [gameDialog, setGameDialog]     = useState({ open: false, game: null });
  const [createWeekDlg, setCreateWeekDlg] = useState({ open: false, prefill: null });
  const [statusConfirm, setStatusConfirm] = useState(null);
  const [error, setError]               = useState('');
  const [leagues, setLeagues]           = useState([]);
  const [cardTeams, setCardTeams]       = useState([]);

  // Load week list
  const loadWeeks = useCallback(async () => {
    const data = await fetch('/api/weekly-cards?season=2025').then((r) => r.json());
    setWeeks(data);
    setLoadingList(false);
    // Auto-select most recent published/draft week
    if (!selectedId && data.length > 0) {
      const current = data.find((w) => w.status === 'Published') ||
                      data.find((w) => w.status === 'Draft') ||
                      data[data.length - 1];
      if (current) setSelectedId(current.id);
    }
  }, [selectedId]);

  // Load selected week detail
  const loadCard = useCallback(async (id) => {
    if (!id) return;
    setLoadingCard(true);
    try {
      const data = await fetch(`/api/weekly-cards/${id}`).then((r) => r.json());
      setCard(data);
      if (data.leagueId) {
        const teams = await fetch(`/api/leagues/${data.leagueId}/teams`).then((r) => r.json());
        setCardTeams(teams);
      } else {
        setCardTeams([]);
      }
    } finally { setLoadingCard(false); }
  }, []);

  useEffect(() => {
    loadWeeks();
    fetch('/api/leagues').then((r) => r.json()).then(setLeagues);
  }, []);
  useEffect(() => { loadCard(selectedId); }, [selectedId]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  async function handleCreateWeek({ weekNum, picksDeadline }) {
    const r = await fetch('/api/weekly-cards', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ season: '2025', weekNum, picksDeadline }),
    });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    setCreateWeekDlg({ open: false, prefill: null });
    await loadWeeks();
    setSelectedId(j.id);
  }

  async function handleSaveGame(data) {
    if (gameDialog.game?.id) {
      // Edit
      const r = await fetch(`/api/weekly-cards/${card.id}/games/${gameDialog.game.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
    } else {
      // Add
      const r = await fetch(`/api/weekly-cards/${card.id}/games`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
    }
    setGameDialog({ open: false, game: null });
    await loadCard(card.id);
    await loadWeeks();
  }

  async function handleDeleteGame(gameId) {
    await fetch(`/api/weekly-cards/${card.id}/games/${gameId}`, { method: 'DELETE' });
    await loadCard(card.id);
    await loadWeeks();
  }

  async function handleToggleOnCard(game) {
    const r = await fetch(`/api/weekly-cards/${card.id}/games/${game.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ onCard: !game.onCard }),
    });
    const j = await r.json();
    if (!r.ok) { setError(j.error); return; }
    await loadCard(card.id);
  }

  async function handleStatusChange(newStatus) {
    const r = await fetch(`/api/weekly-cards/${card.id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    const j = await r.json();
    if (!r.ok) { setError(j.error); return; }
    setStatusConfirm(null);
    await loadCard(card.id);
    await loadWeeks();
  }

  const isDraft     = card?.status === 'Draft';
  const isPublished = card?.status === 'Published';
  const isLocked    = card?.status === 'Locked';
  const onCardGames = card?.games.filter((g) => g.onCard) || [];

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>Weekly Card / Lines</Typography>
          <Typography variant="body2" color="text.secondary">
            Manage static pick lines per week. Lines are frozen on publish — they do not move.
          </Typography>
        </Box>
      </Stack>

      {/* Week selector */}
      {loadingList ? (
        <CircularProgress size={20} sx={{ mb: 3 }} />
      ) : (
        <WeekSelector
          weeks={weeks}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onCreateWeek={(n) => setCreateWeekDlg({ open: true, prefill: n })}
        />
      )}

      {/* Selected week content */}
      {loadingCard ? (
        <Stack alignItems="center" py={8}><CircularProgress /></Stack>
      ) : card ? (
        <Stack spacing={2}>
          {/* Week header card */}
          <Card variant="outlined">
            <CardContent>
              <Stack direction="row" alignItems="flex-start" justifyContent="space-between" flexWrap="wrap" gap={2}>
                <Box>
                  <Stack direction="row" alignItems="center" spacing={1.5} mb={0.5}>
                    <Typography variant="h6" fontWeight={800}>Week {card.weekNum}</Typography>
                    <Chip
                      label={card.status}
                      size="small"
                      color={STATUS_COLOR[card.status]}
                      icon={STATUS_ICON[card.status]}
                      variant="muted"
                    />
                    <Typography variant="body2" color="text.secondary">Season {card.season}</Typography>
                    {card.leagueName && (
                      <Chip label={card.leagueName} size="small" variant="outlined" />
                    )}
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Picks deadline: <strong>{fmtDeadline(card.picksDeadline)}</strong>
                  </Typography>
                  {card.applicableContests?.length > 0 && (
                    <Stack direction="row" spacing={0.75} mt={1} flexWrap="wrap">
                      <Typography variant="caption" color="text.secondary" sx={{ alignSelf: 'center' }}>Applies to:</Typography>
                      {card.applicableContests.map((c) => (
                        <Chip key={c.id} label={c.name} size="small" variant="outlined" />
                      ))}
                    </Stack>
                  )}
                </Box>
                <Stack direction="row" spacing={1}>
                  {isDraft && (
                    <Button
                      variant="contained" color="info" startIcon={<PublishIcon />}
                      onClick={() => setStatusConfirm('Published')}
                    >
                      Publish Lines
                    </Button>
                  )}
                  {isPublished && (
                    <>
                      <Button
                        variant="outlined" startIcon={<LockOpenIcon />}
                        onClick={() => setStatusConfirm('Draft')}
                      >
                        Back to Draft
                      </Button>
                      <Button
                        variant="contained" color="success" startIcon={<LockIcon />}
                        onClick={() => setStatusConfirm('Locked')}
                      >
                        Lock Card
                      </Button>
                    </>
                  )}
                  {isLocked && (
                    <Chip label="Card Locked" color="success" icon={<LockIcon />} />
                  )}
                </Stack>
              </Stack>

              {/* Stats row */}
              <Stack direction="row" spacing={3} mt={2}>
                {[
                  { label: 'Total Games',     val: card.games.length },
                  { label: 'On Pick Card',    val: onCardGames.length, color: 'primary.main' },
                  { label: 'Off Card',        val: card.games.length - onCardGames.length },
                  { label: 'Results In',      val: card.games.filter((g) => g.status === 'Final').length },
                ].map(({ label, val, color }) => (
                  <Box key={label}>
                    <Typography variant="caption" color="text.secondary" display="block">{label}</Typography>
                    <Typography variant="h6" fontWeight={800} color={color || 'text.primary'} lineHeight={1}>{val}</Typography>
                  </Box>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {error && <Alert severity="error" onClose={() => setError('')}>{error}</Alert>}

          {/* Games table */}
          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell sx={{ fontWeight: 700, width: 32 }}>#</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Matchup</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Spread</TableCell>
                  <TableCell sx={{ fontWeight: 700 }}>Date / Time</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">On Card</TableCell>
                  <TableCell sx={{ fontWeight: 700 }} align="center">Result</TableCell>
                  {isDraft && <TableCell sx={{ fontWeight: 700 }} align="right">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {card.games.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: 'text.disabled' }}>
                      No games yet — add the first game
                    </TableCell>
                  </TableRow>
                )}
                {card.games.map((game, i) => (
                  <TableRow
                    key={game.id}
                    hover
                    sx={{ opacity: game.onCard ? 1 : 0.5 }}
                  >
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{i + 1}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {game.awayTeam.split(' ').pop()}
                      </Typography>
                      <Typography variant="body2" fontWeight={600}>
                        @ {game.homeTeam.split(' ').pop()}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700} color={game.homeSpread < 0 ? 'primary.main' : game.homeSpread > 0 ? 'warning.main' : 'text.secondary'}>
                        {fmtSpread(game.homeTeam, game.homeSpread)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {fmtGameDate(game.gameDate)}
                      </Typography>
                    </TableCell>
                    <TableCell align="center">
                      <Switch
                        size="small"
                        checked={game.onCard}
                        onChange={() => handleToggleOnCard(game)}
                        disabled={isLocked}
                        color="primary"
                      />
                    </TableCell>
                    <TableCell align="center">
                      {game.status === 'Final' ? (
                        <Stack alignItems="center" spacing={0.25}>
                          <Chip label="Final" size="small" color="success" variant="muted" />
                          <Typography variant="caption" fontWeight={700}>
                            {game.awayScore} – {game.homeScore}
                          </Typography>
                        </Stack>
                      ) : (
                        <Chip label={game.status} size="small" color={GAME_STATUS_COLOR[game.status]} variant="muted" />
                      )}
                    </TableCell>
                    {isDraft && (
                      <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="Edit game">
                          <IconButton size="small" onClick={() => setGameDialog({ open: true, game })}>
                            <EditIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Remove game">
                          <IconButton size="small" color="error" onClick={() => handleDeleteGame(game.id)}>
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </TableCell>
                    )}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Add game button */}
          {isDraft && (
            <Box>
              <Button
                variant="outlined" startIcon={<AddIcon />}
                onClick={() => setGameDialog({ open: true, game: null })}
              >
                Add Game
              </Button>
            </Box>
          )}
        </Stack>
      ) : (
        !loadingList && (
          <Stack alignItems="center" py={8} spacing={2} sx={{ opacity: 0.4 }}>
            <SportsFootballIcon sx={{ fontSize: 56 }} />
            <Typography variant="body1">Select a week to view its lines</Typography>
          </Stack>
        )
      )}

      {/* Add/Edit game dialog */}
      <GameDialog
        open={gameDialog.open}
        game={gameDialog.game}
        onClose={() => setGameDialog({ open: false, game: null })}
        onSave={handleSaveGame}
        teams={cardTeams}
      />

      {/* Create week dialog */}
      <CreateWeekDialog
        open={createWeekDlg.open}
        prefillWeek={createWeekDlg.prefill}
        onClose={() => setCreateWeekDlg({ open: false, prefill: null })}
        onSave={handleCreateWeek}
        leagues={leagues}
      />

      {/* Status confirm dialog */}
      <Dialog open={Boolean(statusConfirm)} onClose={() => setStatusConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle>
          {statusConfirm === 'Published' ? 'Publish Lines?' : statusConfirm === 'Locked' ? 'Lock Card?' : 'Revert to Draft?'}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            {statusConfirm === 'Published' && `Publish Week ${card?.weekNum} lines? Contestants will be able to see the matchups and spreads. Lines are frozen — they cannot be changed after publishing.`}
            {statusConfirm === 'Locked' && `Lock Week ${card?.weekNum} card? The pick deadline has passed. No new picks can be submitted.`}
            {statusConfirm === 'Draft' && `Revert Week ${card?.weekNum} to Draft? Lines will no longer be visible to contestants.`}
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setStatusConfirm(null)} variant="outlined">Cancel</Button>
          <Button
            onClick={() => handleStatusChange(statusConfirm)}
            variant="contained"
            color={statusConfirm === 'Draft' ? 'warning' : 'primary'}
            startIcon={statusConfirm === 'Locked' ? <LockIcon /> : statusConfirm === 'Published' ? <PublishIcon /> : null}
          >
            Confirm
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
