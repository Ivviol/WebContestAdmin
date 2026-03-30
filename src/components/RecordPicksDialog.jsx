import { useState, useEffect } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Divider from '@mui/material/Divider';
import Tooltip from '@mui/material/Tooltip';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';

function fmtSpread(spread) {
  if (spread === 0) return 'PK';
  return spread > 0 ? `+${spread}` : String(spread);
}

function fmtGameTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  });
}

// ── Single game row (SC / WTA) ────────────────────────────────────────────────
function GamePickRow({ game, picked, onPick }) {
  return (
    <Box sx={{ py: 1 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1}>
        <Typography variant="caption" color="text.secondary" sx={{ minWidth: 180 }}>
          {fmtGameTime(game.gameDate)}
        </Typography>
        <ToggleButtonGroup
          exclusive
          size="small"
          value={picked ?? null}
          onChange={(_, val) => { if (val !== null) onPick(val); }}
          sx={{ ml: 'auto' }}
        >
          <ToggleButton value={game.awayTeam} sx={{ px: 1.5, textTransform: 'none', fontSize: '0.8rem' }}>
            {game.awayTeam.split(' ').pop()}
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              {fmtSpread(-game.homeSpread)}
            </Typography>
          </ToggleButton>
          <ToggleButton value={game.homeTeam} sx={{ px: 1.5, textTransform: 'none', fontSize: '0.8rem' }}>
            {game.homeTeam.split(' ').pop()}
            <Typography component="span" variant="caption" color="text.secondary" sx={{ ml: 0.5 }}>
              {fmtSpread(game.homeSpread)}
            </Typography>
          </ToggleButton>
        </ToggleButtonGroup>
      </Stack>
    </Box>
  );
}

// ── Survivor: single pick from all teams ──────────────────────────────────────
function SurvivorPicker({ games, picked, usedTeams, onPick }) {
  const allTeams = games.flatMap((g) => [
    { team: g.awayTeam, opponent: g.homeTeam, gameId: g.id },
    { team: g.homeTeam, opponent: g.awayTeam, gameId: g.id },
  ]).sort((a, b) => a.team.localeCompare(b.team));

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" mb={1} display="block">
        Pick one team. Greyed teams have been used this season.
      </Typography>
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
        {allTeams.map(({ team, opponent, gameId }) => {
          const used = usedTeams.includes(team);
          const isPicked = picked === team;
          return (
            <Tooltip key={team} title={used ? `Already used this season` : `vs ${opponent.split(' ').pop()}`}>
              <span>
                <Chip
                  label={team.split(' ').pop()}
                  size="small"
                  variant={isPicked ? 'filled' : 'outlined'}
                  color={isPicked ? 'primary' : 'default'}
                  disabled={used}
                  onClick={() => !used && onPick(team, gameId)}
                  sx={{ cursor: used ? 'not-allowed' : 'pointer', opacity: used ? 0.4 : 1 }}
                />
              </span>
            </Tooltip>
          );
        })}
      </Box>
    </Box>
  );
}

// ── Main dialog ───────────────────────────────────────────────────────────────
export default function RecordPicksDialog({ open, entry, onClose, onSaved }) {
  const [openWeeks, setOpenWeeks]       = useState([]);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [card, setCard]                 = useState(null);
  const [existing, setExisting]         = useState(null); // existing submission
  const [usedTeams, setUsedTeams]       = useState([]);   // Survivor used teams
  const [picks, setPicks]               = useState({});   // gameId → pickedTeam (SC/WTA) OR 'survivor' → team
  const [loadingCard, setLoadingCard]   = useState(false);
  const [saving, setSaving]             = useState(false);
  const [error, setError]               = useState('');

  const isSurvivor = entry?.contestType === 'surv';
  const picksPerWeek = entry?.picksPerWeek ?? 5;

  // Load open weeks when dialog opens
  useEffect(() => {
    if (!open || !entry) return;
    setError('');
    fetch('/api/weekly-cards')
      .then((r) => r.json())
      .then((cards) => {
        const relevant = cards.filter(
          (c) => c.status === 'Published' && (c.contestIds || []).includes(entry.contestId)
        );
        setOpenWeeks(relevant);
        if (relevant.length > 0) setSelectedWeekId(relevant[relevant.length - 1].id);
        else setSelectedWeekId('');
      });
  }, [open, entry]);

  // Load card details + existing submission when week changes
  useEffect(() => {
    if (!selectedWeekId || !entry) return;
    setLoadingCard(true);
    setCard(null);
    setExisting(null);
    setPicks({});

    Promise.all([
      fetch(`/api/weekly-cards/${selectedWeekId}`).then((r) => r.json()),
      fetch(`/api/weekly-picks?ticketId=${entry.id}&weekCardId=${selectedWeekId}`).then((r) => r.json()),
      fetch(`/api/tickets/${entry.id}/picks`).then((r) => r.json()),
    ]).then(([cardData, existingSub, allPicks]) => {
      setCard(cardData);
      setExisting(existingSub);

      // Pre-fill picks from existing submission
      if (existingSub?.picks) {
        if (isSurvivor) {
          const p = existingSub.picks[0];
          if (p) setPicks({ survivor: p.pickedTeam, gameId: p.gameId });
        } else {
          const filled = {};
          existingSub.picks.forEach((p) => { filled[p.gameId] = p.pickedTeam; });
          setPicks(filled);
        }
      }

      // Used teams for Survivor (all weeks except current)
      if (isSurvivor && allPicks?.weeks) {
        const used = allPicks.weeks
          .filter((w) => w.weekCardId !== selectedWeekId && w.status !== 'Missed')
          .flatMap((w) => (w.picks || []).map((p) => p.pickedTeam));
        setUsedTeams(used);
      }
    }).finally(() => setLoadingCard(false));
  }, [selectedWeekId, entry, isSurvivor]);

  const onCardGames = card?.games?.filter((g) => g.onCard) ?? [];

  // Count valid picks
  const pickCount = isSurvivor
    ? (picks.survivor ? 1 : 0)
    : Object.keys(picks).length;
  const isComplete = pickCount === picksPerWeek;

  async function handleSave() {
    setError('');
    setSaving(true);

    let payload;
    if (isSurvivor) {
      payload = [{ gameId: picks.gameId, pickedTeam: picks.survivor }];
    } else {
      payload = Object.entries(picks).map(([gameId, pickedTeam]) => ({ gameId, pickedTeam }));
    }

    try {
      const res = await fetch('/api/weekly-picks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticketId: entry.id, weekCardId: selectedWeekId, picks: payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to save picks');
      onSaved?.();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setCard(null); setExisting(null); setPicks({}); setError(''); setOpenWeeks([]);
    onClose();
  }

  if (!entry) return null;

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        <Stack direction="row" alignItems="center" justifyContent="space-between">
          <Box>
            <Typography variant="h6" fontWeight={800}>Record Picks</Typography>
            <Typography variant="body2" color="text.secondary">
              {entry.userName} — {entry.label}
            </Typography>
          </Box>
          <Chip label={entry.contestName} size="small" variant="muted" color="default" />
        </Stack>
      </DialogTitle>

      <DialogContent dividers>
        {/* Week selector */}
        {openWeeks.length === 0 ? (
          <Alert severity="info">No weeks are currently open for pick submission.</Alert>
        ) : (
          <>
            {openWeeks.length > 1 && (
              <TextField
                select label="Week" size="small" fullWidth
                value={selectedWeekId}
                onChange={(e) => setSelectedWeekId(e.target.value)}
                sx={{ mb: 2 }}
              >
                {openWeeks.map((w) => (
                  <MenuItem key={w.id} value={w.id}>Week {w.weekNum}</MenuItem>
                ))}
              </TextField>
            )}
            {openWeeks.length === 1 && (
              <Typography variant="body2" color="text.secondary" mb={2}>
                Week {openWeeks[0].weekNum}
                {existing && (
                  <Chip label="Updating existing submission" size="small" color="warning"
                    variant="muted" sx={{ ml: 1 }} />
                )}
              </Typography>
            )}

            {loadingCard && <Stack alignItems="center" py={4}><CircularProgress size={28} /></Stack>}

            {!loadingCard && card && (
              <>
                {existing && openWeeks.length > 1 && (
                  <Alert severity="warning" sx={{ mb: 2 }}>Picks already recorded — saving will overwrite them.</Alert>
                )}

                <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
                  <Typography variant="subtitle2" fontWeight={700}>
                    {isSurvivor ? 'Pick one team' : `Pick ${picksPerWeek} teams`}
                  </Typography>
                  {!isSurvivor && (
                    <Chip
                      label={`${pickCount} / ${picksPerWeek}`}
                      size="small"
                      color={isComplete ? 'success' : 'default'}
                      variant={isComplete ? 'filled' : 'outlined'}
                    />
                  )}
                </Stack>

                {isSurvivor ? (
                  <SurvivorPicker
                    games={onCardGames}
                    picked={picks.survivor}
                    usedTeams={usedTeams}
                    onPick={(team, gameId) => setPicks({ survivor: team, gameId })}
                  />
                ) : (
                  <Stack divider={<Divider />}>
                    {onCardGames.map((game) => (
                      <GamePickRow
                        key={game.id}
                        game={game}
                        picked={picks[game.id] ?? null}
                        onPick={(team) => {
                          setPicks((prev) => {
                            const next = { ...prev };
                            if (next[game.id] === team) delete next[game.id];
                            else next[game.id] = team;
                            return next;
                          });
                        }}
                      />
                    ))}
                  </Stack>
                )}
              </>
            )}

            {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
          </>
        )}
      </DialogContent>

      <DialogActions>
        <Button onClick={handleClose} disabled={saving}>Cancel</Button>
        <Button
          variant="contained"
          disabled={!isComplete || saving || openWeeks.length === 0}
          onClick={handleSave}
        >
          {saving ? 'Saving…' : existing ? 'Update Picks' : 'Save Picks'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
