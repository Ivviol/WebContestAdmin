import { useState, useEffect, useCallback } from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Paper from '@mui/material/Paper';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemText from '@mui/material/ListItemText';
import ListItemSecondaryAction from '@mui/material/ListItemSecondaryAction';
import Tooltip from '@mui/material/Tooltip';
import Avatar from '@mui/material/Avatar';
import SaveIcon from '@mui/icons-material/Save';
import RestoreIcon from '@mui/icons-material/Restore';
import AddIcon from '@mui/icons-material/Add';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import EditIcon from '@mui/icons-material/Edit';
import CheckIcon from '@mui/icons-material/Check';
import CloseIcon from '@mui/icons-material/Close';
import SportsSoccerIcon from '@mui/icons-material/SportsSoccer';

const TYPE_META = {
  sc:   { label: 'SuperContest',     color: 'primary' },
  wta:  { label: 'Winner Take All',  color: 'secondary' },
  surv: { label: 'Survivor',         color: 'success' },
};

const FIELD_META = [
  { key: 'entryFee',      label: 'Entry Fee ($)',       type: 'number', min: 0 },
  { key: 'ticketLimit',   label: 'Max Entries / Player', type: 'number', min: 1 },
  { key: 'picksPerWeek',  label: 'Picks per Week',      type: 'number', min: 1, max: 16 },
  { key: 'totalWeeks',    label: 'Total Weeks',         type: 'number', min: 1, max: 22 },
];

const BOOL_FIELDS = [
  { key: 'proxyAllowed',  label: 'Proxy submissions allowed' },
  { key: 'geoRestricted', label: 'Geographic restriction enforced' },
];

// ── Single contest type editor card ───────────────────────────────────────────
function ContestTypeCard({ typeKey, original, onSaved }) {
  const [form, setForm]     = useState({ ...original });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved]   = useState(false);
  const [error, setError]   = useState('');

  const isDirty = FIELD_META.some((f) => String(form[f.key]) !== String(original[f.key]))
    || BOOL_FIELDS.some((f) => form[f.key] !== original[f.key]);

  function reset() { setForm({ ...original }); setSaved(false); setError(''); }

  async function save() {
    setSaving(true); setError('');
    try {
      const body = {};
      FIELD_META.forEach((f) => { body[f.key] = Number(form[f.key]); });
      BOOL_FIELDS.forEach((f) => { body[f.key] = form[f.key]; });
      const res = await fetch(`/api/contest-types/${typeKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      onSaved(typeKey, data);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const meta = TYPE_META[typeKey];

  return (
    <Card variant="outlined">
      <CardContent>
        <Stack direction="row" alignItems="center" spacing={1} mb={2}>
          <Typography variant="subtitle1" fontWeight={800}>{meta.label}</Typography>
          <Chip label={typeKey.toUpperCase()} size="small" color={meta.color} variant="muted" />
        </Stack>

        <Grid container spacing={2} mb={2}>
          {FIELD_META.map((f) => (
            <Grid key={f.key} size={{ xs: 6 }}>
              <TextField
                label={f.label}
                size="small"
                fullWidth
                type="number"
                value={form[f.key]}
                inputProps={{ min: f.min, max: f.max }}
                onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.value }))}
              />
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ mb: 1.5 }} />

        <Stack spacing={0.5} mb={2}>
          {BOOL_FIELDS.map((f) => (
            <FormControlLabel
              key={f.key}
              control={
                <Switch
                  size="small"
                  checked={Boolean(form[f.key])}
                  onChange={(e) => setForm((p) => ({ ...p, [f.key]: e.target.checked }))}
                />
              }
              label={<Typography variant="body2">{f.label}</Typography>}
            />
          ))}
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
        {saved && <Alert severity="success" sx={{ mb: 1.5 }}>Saved successfully.</Alert>}

        <Stack direction="row" spacing={1}>
          <Button
            variant="contained"
            size="small"
            startIcon={saving ? <CircularProgress size={14} /> : <SaveIcon />}
            disabled={!isDirty || saving}
            onClick={save}
          >
            Save
          </Button>
          <Button
            size="small"
            startIcon={<RestoreIcon />}
            disabled={!isDirty || saving}
            onClick={reset}
          >
            Reset
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}

// ── League teams editor (right panel) ─────────────────────────────────────────
function TeamAvatar({ abbr }) {
  return (
    <Avatar sx={{ width: 28, height: 28, fontSize: 10, fontWeight: 700, bgcolor: 'primary.main', flexShrink: 0 }}>
      {abbr || '?'}
    </Avatar>
  );
}

function LeagueTeamsEditor({ league, onTeamCountChange }) {
  const [teams, setTeams]       = useState([]);
  const [original, setOriginal] = useState([]);
  const [newName, setNewName]   = useState('');
  const [newAbbr, setNewAbbr]   = useState('');
  const [editingIdx, setEditingIdx] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAbbr, setEditAbbr] = useState('');
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [saved, setSaved]       = useState(false);
  const [error, setError]       = useState('');

  const isDirty = JSON.stringify(teams) !== JSON.stringify(original);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch(`/api/leagues/${league.id}/teams`).then((r) => r.json());
      setTeams(data);
      setOriginal(data);
    } finally {
      setLoading(false);
    }
  }, [league.id]);

  useEffect(() => { load(); }, [load]);

  function addTeam() {
    const name = newName.trim();
    const abbr = newAbbr.trim().toUpperCase();
    if (!name || teams.some((t) => t.name === name)) return;
    setTeams((prev) => [...prev, { name, abbr }].sort((a, b) => a.name.localeCompare(b.name)));
    setNewName('');
    setNewAbbr('');
  }

  function removeTeam(idx) {
    setTeams((prev) => prev.filter((_, i) => i !== idx));
    if (editingIdx === idx) setEditingIdx(null);
  }

  function startEdit(idx) {
    setEditingIdx(idx);
    setEditName(teams[idx].name);
    setEditAbbr(teams[idx].abbr);
  }

  function cancelEdit() { setEditingIdx(null); }

  function saveEdit(idx) {
    const name = editName.trim();
    const abbr = editAbbr.trim().toUpperCase();
    if (!name) return;
    setTeams((prev) => {
      const next = [...prev];
      next[idx] = { name, abbr };
      return next.sort((a, b) => a.name.localeCompare(b.name));
    });
    setEditingIdx(null);
  }

  function reset() { setTeams([...original]); setNewName(''); setNewAbbr(''); setEditingIdx(null); setSaved(false); setError(''); }

  async function save() {
    setSaving(true); setError('');
    try {
      const res = await fetch(`/api/leagues/${league.id}/teams`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Save failed');
      setOriginal(data);
      setTeams(data);
      onTeamCountChange(league.id, data.length);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <Stack alignItems="center" py={4}><CircularProgress size={24} /></Stack>;

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1.5}>
        <Typography variant="subtitle2" fontWeight={700} color="text.secondary">
          {teams.length} teams
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button size="small" startIcon={<RestoreIcon />} disabled={!isDirty || saving} onClick={reset}>
            Reset
          </Button>
          <Button variant="contained" size="small"
            startIcon={saving ? <CircularProgress size={14} /> : <SaveIcon />}
            disabled={!isDirty || saving} onClick={save}>
            Save
          </Button>
        </Stack>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 1.5 }}>{error}</Alert>}
      {saved  && <Alert severity="success" sx={{ mb: 1.5 }}>Team list saved.</Alert>}

      {/* Add new team */}
      <Stack direction="row" spacing={1} mb={2}>
        <TextField
          size="small" label="Abbr" sx={{ width: 80 }}
          value={newAbbr}
          onChange={(e) => setNewAbbr(e.target.value.slice(0, 4))}
          onKeyDown={(e) => { if (e.key === 'Enter') addTeam(); }}
          inputProps={{ style: { textTransform: 'uppercase' } }}
        />
        <TextField
          size="small" placeholder="Team name…" sx={{ flexGrow: 1 }}
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addTeam(); }}
        />
        <Button variant="outlined" size="small" startIcon={<AddIcon />}
          disabled={!newName.trim() || teams.some((t) => t.name === newName.trim())}
          onClick={addTeam}>
          Add
        </Button>
      </Stack>

      <Paper variant="outlined" sx={{ maxHeight: 380, overflowY: 'auto' }}>
        {teams.length === 0 ? (
          <Typography variant="body2" color="text.disabled" sx={{ textAlign: 'center', py: 2 }}>
            No teams yet
          </Typography>
        ) : (
          <List dense disablePadding>
            {teams.map((team, idx) => (
              <ListItem key={`${team.name}-${idx}`} disablePadding divider
                secondaryAction={
                  editingIdx === idx ? (
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" color="primary" onClick={() => saveEdit(idx)}><CheckIcon fontSize="small" /></IconButton>
                      <IconButton size="small" onClick={cancelEdit}><CloseIcon fontSize="small" /></IconButton>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={0.5}>
                      <Tooltip title="Edit"><IconButton size="small" onClick={() => startEdit(idx)}><EditIcon fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="Remove"><IconButton size="small" color="error" onClick={() => removeTeam(idx)}><DeleteOutlineIcon fontSize="small" /></IconButton></Tooltip>
                    </Stack>
                  )
                }
              >
                <ListItemButton disableRipple sx={{ pr: 10, py: 0.5 }}>
                  {editingIdx === idx ? (
                    <Stack direction="row" spacing={1} alignItems="center" sx={{ width: '100%' }}>
                      <TeamAvatar abbr={editAbbr || team.abbr} />
                      <TextField
                        size="small" label="Abbr" sx={{ width: 80 }}
                        value={editAbbr}
                        onChange={(e) => setEditAbbr(e.target.value.slice(0, 4))}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(idx); if (e.key === 'Escape') cancelEdit(); }}
                        inputProps={{ style: { textTransform: 'uppercase' } }}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <TextField
                        size="small" label="Name" sx={{ flexGrow: 1 }}
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') saveEdit(idx); if (e.key === 'Escape') cancelEdit(); }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={1.5} alignItems="center">
                      <TeamAvatar abbr={team.abbr} />
                      <ListItemText
                        primary={team.name}
                        primaryTypographyProps={{ variant: 'body2' }}
                      />
                    </Stack>
                  )}
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
}

// ── Leagues editor ─────────────────────────────────────────────────────────────
function LeaguesEditor() {
  const [leagues, setLeagues]           = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState('');
  const [selectedId, setSelectedId]     = useState(null);
  const [newLeagueName, setNewLeagueName] = useState('');
  const [adding, setAdding]             = useState(false);
  const [editingId, setEditingId]       = useState(null);
  const [editName, setEditName]         = useState('');
  const [deleteError, setDeleteError]   = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetch('/api/leagues').then((r) => r.json());
      setLeagues(data);
      if (!selectedId && data.length > 0) setSelectedId(data[0].id);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function addLeague() {
    const name = newLeagueName.trim();
    if (!name) return;
    setAdding(true);
    try {
      const res = await fetch('/api/leagues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setLeagues((prev) => [...prev, data]);
      setSelectedId(data.id);
      setNewLeagueName('');
    } catch (e) {
      setError(e.message);
    } finally {
      setAdding(false);
    }
  }

  async function saveRename(id) {
    const name = editName.trim();
    if (!name) return;
    try {
      const res = await fetch(`/api/leagues/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setLeagues((prev) => prev.map((l) => l.id === id ? { ...l, name: data.name } : l));
      setEditingId(null);
    } catch (e) {
      setError(e.message);
    }
  }

  async function deleteLeague(id) {
    setDeleteError('');
    try {
      const res = await fetch(`/api/leagues/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed');
      setLeagues((prev) => prev.filter((l) => l.id !== id));
      if (selectedId === id) setSelectedId(leagues.find((l) => l.id !== id)?.id ?? null);
    } catch (e) {
      setDeleteError(e.message);
    }
  }

  function handleTeamCountChange(id, count) {
    setLeagues((prev) => prev.map((l) => l.id === id ? { ...l, teamCount: count } : l));
  }

  const selectedLeague = leagues.find((l) => l.id === selectedId);

  if (loading) return <Stack alignItems="center" py={4}><CircularProgress size={24} /></Stack>;

  return (
    <Card variant="outlined">
      <CardContent>
        <Typography variant="subtitle1" fontWeight={800} mb={2}>Leagues & Team Lists</Typography>

        {(error || deleteError) && (
          <Alert severity="error" sx={{ mb: 1.5 }} onClose={() => { setError(''); setDeleteError(''); }}>
            {error || deleteError}
          </Alert>
        )}

        <Grid container spacing={2}>
          {/* Left: league list */}
          <Grid size={{ xs: 12, md: 4 }}>
            <Paper variant="outlined" sx={{ mb: 1.5 }}>
              <List dense disablePadding>
                {leagues.length === 0 && (
                  <Box sx={{ px: 2, py: 2, textAlign: 'center' }}>
                    <Typography variant="body2" color="text.disabled">No leagues yet</Typography>
                  </Box>
                )}
                {leagues.map((league) => (
                  <ListItemButton
                    key={league.id}
                    selected={selectedId === league.id}
                    onClick={() => { setSelectedId(league.id); setEditingId(null); }}
                    sx={{ pr: 10 }}
                  >
                    {editingId === league.id ? (
                      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ width: '100%' }}>
                        <TextField
                          size="small"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => { if (e.key === 'Enter') saveRename(league.id); if (e.key === 'Escape') setEditingId(null); }}
                          autoFocus
                          sx={{ flexGrow: 1 }}
                          onClick={(e) => e.stopPropagation()}
                        />
                        <IconButton size="small" color="primary" onClick={(e) => { e.stopPropagation(); saveRename(league.id); }}>
                          <CheckIcon fontSize="small" />
                        </IconButton>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingId(null); }}>
                          <CloseIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    ) : (
                      <>
                        <ListItemText
                          primary={league.name}
                          secondary={`${league.teamCount} teams`}
                          primaryTypographyProps={{ variant: 'body2', fontWeight: selectedId === league.id ? 700 : 400 }}
                          secondaryTypographyProps={{ variant: 'caption' }}
                        />
                        <ListItemSecondaryAction>
                          <Tooltip title="Rename">
                            <IconButton size="small" onClick={(e) => { e.stopPropagation(); setEditingId(league.id); setEditName(league.name); }}>
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete league">
                            <IconButton size="small" color="error" onClick={(e) => { e.stopPropagation(); deleteLeague(league.id); }}>
                              <DeleteOutlineIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </ListItemSecondaryAction>
                      </>
                    )}
                  </ListItemButton>
                ))}
              </List>
            </Paper>

            {/* Add new league */}
            <Stack direction="row" spacing={1}>
              <TextField
                size="small" placeholder="New league name…" sx={{ flexGrow: 1 }}
                value={newLeagueName}
                onChange={(e) => setNewLeagueName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addLeague(); }}
              />
              <Button variant="outlined" size="small" startIcon={adding ? <CircularProgress size={14} /> : <AddIcon />}
                disabled={!newLeagueName.trim() || adding}
                onClick={addLeague}>
                Add
              </Button>
            </Stack>
          </Grid>

          {/* Right: team editor for selected league */}
          <Grid size={{ xs: 12, md: 8 }}>
            {selectedLeague ? (
              <Box>
                <Stack direction="row" alignItems="center" spacing={1} mb={2}>
                  <SportsSoccerIcon fontSize="small" color="primary" />
                  <Typography variant="subtitle2" fontWeight={700}>{selectedLeague.name} — Teams</Typography>
                </Stack>
                <LeagueTeamsEditor
                  key={selectedLeague.id}
                  league={selectedLeague}
                  onTeamCountChange={handleTeamCountChange}
                />
              </Box>
            ) : (
              <Stack alignItems="center" justifyContent="center" height="100%" py={6} sx={{ opacity: 0.35 }}>
                <SportsSoccerIcon sx={{ fontSize: 48 }} />
                <Typography variant="body2" mt={1}>Select a league to manage its teams</Typography>
              </Stack>
            )}
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function SettingsPage() {
  const [defaults, setDefaults] = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');

  const load = useCallback(() => {
    setLoading(true);
    fetch('/api/contest-types').then((r) => r.json())
      .then(setDefaults)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  function handleSaved(typeKey, updated) {
    setDefaults((prev) => ({ ...prev, [typeKey]: { ...prev[typeKey], ...updated } }));
  }

  return (
    <Box>
      <Stack direction="row" alignItems="flex-start" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h5" fontWeight={800} gutterBottom>Settings</Typography>
          <Typography variant="body2" color="text.secondary">
            Contest type defaults and system configuration.
          </Typography>
        </Box>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <Stack alignItems="center" py={8}><CircularProgress /></Stack>}

      {!loading && defaults && (
        <Stack spacing={4}>
          {/* Contest type defaults */}
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
              Contest Type Defaults
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              These defaults pre-fill new contest forms. Changing them does not affect existing contests.
            </Alert>
            <Grid container spacing={2}>
              {Object.keys(TYPE_META).map((typeKey) => (
                <Grid key={typeKey} size={{ xs: 12, md: 4 }}>
                  <ContestTypeCard typeKey={typeKey} original={defaults[typeKey]} onSaved={handleSaved} />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Divider />

          {/* Leagues & teams */}
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700} display="block" mb={1}>
              Leagues & Teams
            </Typography>
            <Alert severity="info" sx={{ mb: 2 }}>
              Leagues define the set of teams available when creating weekly cards. Each weekly card is linked to one league.
            </Alert>
            <LeaguesEditor />
          </Box>
        </Stack>
      )}
    </Box>
  );
}
