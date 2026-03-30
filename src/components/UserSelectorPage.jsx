import { useState, useEffect } from 'react';
import { useUser } from '../UserContext.jsx';
import { useNavigation } from '../NavigationContext.js';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Autocomplete from '@mui/material/Autocomplete';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents';

export default function UserSelectorPage() {
  const { login } = useUser();
  const { onNavigate } = useNavigation();

  const [users, setUsers]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);
  const [inputValue, setInputValue] = useState('');
  const [error, setError]           = useState('');

  useEffect(() => {
    fetch('/api/users')
      .then((r) => r.json())
      .then((data) => setUsers(data))
      .catch(() => setError('Could not load users — is the server running?'))
      .finally(() => setLoading(false));
  }, []);

  function handleContinue() {
    if (!selected) return;
    login(selected);
    onNavigate('dashboard');
  }

  return (
    <Box
      sx={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        px: 2,
        pt: 4,
        pb: 'max(env(safe-area-inset-bottom, 0px), 24px)',
      }}
    >
      <Box sx={{ width: '100%', maxWidth: 420 }}>
        {/* Logo */}
        <Stack alignItems="center" spacing={1} mb={4}>
          <EmojiEventsIcon sx={{ fontSize: 56, color: 'warning.main' }} />
          <Typography variant="h5" fontWeight={900} align="center">SuperContest</Typography>
          <Typography variant="body2" color="text.secondary" align="center">
            Choose your account to continue
          </Typography>
        </Stack>

        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

        {loading ? (
          <Stack alignItems="center" py={4}><CircularProgress /></Stack>
        ) : (
          <Stack spacing={2}>
            <Autocomplete
              options={users}
              getOptionLabel={(u) => u.name}
              value={selected}
              onChange={(_, val) => setSelected(val)}
              inputValue={inputValue}
              onInputChange={(_, val) => setInputValue(val)}
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Select or search your name"
                  size="medium"
                  fullWidth
                />
              )}
              renderOption={(props, option) => (
                <Box component="li" {...props} key={option.id} sx={{ py: 1.5 }}>
                  <Stack>
                    <Typography variant="body2" fontWeight={700}>{option.name}</Typography>
                    <Typography variant="caption" color="text.secondary">{option.email}</Typography>
                  </Stack>
                </Box>
              )}
              noOptionsText="No matching contestants found"
              isOptionEqualToValue={(o, v) => o.id === v.id}
            />

            <Button
              variant="contained"
              size="large"
              fullWidth
              disabled={!selected}
              onClick={handleContinue}
              sx={{ minHeight: 48 }}
            >
              Continue as {selected?.name ?? '…'}
            </Button>

            <Divider>
              <Typography variant="caption" color="text.secondary">or</Typography>
            </Divider>

            <Button
              variant="outlined"
              size="large"
              fullWidth
              onClick={() => onNavigate('standings')}
              sx={{ minHeight: 48 }}
            >
              View Standings
            </Button>
          </Stack>
        )}
      </Box>
    </Box>
  );
}
