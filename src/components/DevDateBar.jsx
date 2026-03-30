import { useState, useEffect } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ScheduleIcon from '@mui/icons-material/Schedule';

function fmt(iso) {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function DevDateBar() {
  const [mockNow, setMockNow]   = useState(null);
  const [realNow, setRealNow]   = useState(null);
  const [tick, setTick]         = useState(0);
  const [inputVal, setInputVal] = useState('');
  const [open, setOpen]         = useState(false);

  async function refresh() {
    const r = await fetch('/api/dev/mock-date');
    const j = await r.json();
    setMockNow(j.mockNow);
    setRealNow(j.realNow);
    if (j.mockNow) setInputVal(j.mockNow.slice(0, 16));
  }

  useEffect(() => { refresh(); }, []);

  // Tick every minute so the displayed real time stays current
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 60_000);
    return () => clearInterval(id);
  }, []);

  async function handleSet() {
    if (!inputVal) return;
    await fetch('/api/dev/mock-date', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ date: new Date(inputVal).toISOString() }),
    });
    await refresh();
  }

  async function handleClear() {
    await fetch('/api/dev/mock-date', { method: 'DELETE' });
    setInputVal('');
    await refresh();
  }

  const isMocked    = Boolean(mockNow);
  const displayTime = isMocked ? mockNow : (realNow ?? new Date().toISOString());

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        bgcolor: isMocked ? 'warning.dark' : 'background.paper',
        border: '1px solid',
        borderColor: isMocked ? 'warning.main' : 'divider',
        borderRadius: 2,
        boxShadow: 4,
        overflow: 'hidden',
      }}
    >
      {/* Always-visible header row */}
      <Stack
        direction="row"
        alignItems="center"
        spacing={1}
        px={1.5}
        py={0.75}
        onClick={() => setOpen((o) => !o)}
        sx={{ cursor: 'pointer', userSelect: 'none' }}
      >
        {isMocked
          ? <ScheduleIcon fontSize="small" sx={{ color: 'warning.light' }} />
          : <AccessTimeIcon fontSize="small" sx={{ color: 'text.disabled' }} />}

        <Box>
          <Typography variant="caption" fontWeight={700}
            color={isMocked ? 'warning.light' : 'text.primary'} lineHeight={1.2} display="block">
            {fmt(displayTime)}
          </Typography>
          <Typography variant="caption" color={isMocked ? 'warning.light' : 'text.disabled'}
            sx={{ opacity: 0.8 }} lineHeight={1.2} display="block">
            {isMocked ? 'server time overridden' : 'real server time'}
          </Typography>
        </Box>

        {isMocked && (
          <Chip label="MOCKED" size="small" color="warning"
            sx={{ height: 16, fontSize: 10, fontWeight: 700 }} />
        )}
      </Stack>

      {/* Expanded panel */}
      {open && (
        <Box px={1.5} pb={1.5} borderTop="1px solid" borderColor="divider">
          {isMocked && (
            <Box mt={1} mb={1.5}>
              <Typography variant="caption" color="text.secondary" display="block">
                Real time
              </Typography>
              <Typography variant="caption" fontWeight={600}>
                {realNow ? fmt(realNow) : '—'}
              </Typography>
            </Box>
          )}
          {isMocked && <Divider sx={{ mb: 1.5 }} />}
          <Typography variant="caption" color="text.secondary" display="block" mb={1} mt={isMocked ? 0 : 1}>
            Set mock date
          </Typography>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              type="datetime-local"
              size="small"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              slotProps={{ htmlInput: { style: { fontSize: 12, padding: '4px 8px' } } }}
              sx={{ flex: 1 }}
            />
            <Button size="small" variant="contained" color="warning" onClick={handleSet}
              sx={{ whiteSpace: 'nowrap', minWidth: 'auto', px: 1.5, fontSize: 11 }}>
              Set
            </Button>
            {isMocked && (
              <Button size="small" variant="outlined" onClick={handleClear}
                sx={{ whiteSpace: 'nowrap', minWidth: 'auto', px: 1.5, fontSize: 11 }}>
                Clear
              </Button>
            )}
          </Stack>
        </Box>
      )}
    </Box>
  );
}
