import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';

const statusOptions = ['Active', 'Pending Payment', 'Suspended', 'Voided', 'Eliminated (Survivor)'];
const proxyOptions = ['— No proxy (self-submitting) —', 'Dave Martinez (PX-0041)', 'Sarah Lee (PX-0089)', 'Mike Chen (PX-0102)'];
const submissionOptions = ['App (geo-locked)', 'In-person kiosk', 'Proxy — in-person', 'Proxy — app'];

function derivedPaymentLabel(entry) {
  if (entry.status === 'Voided') return 'Refunded';
  if (entry.status === 'Pending Payment' || !entry.paymentMethod) return 'Unpaid';
  return `Paid — $${(entry.entryFee || 0).toLocaleString()}`;
}

export default function EditEntryModal({ open, onClose, entry, contests = [] }) {
  if (!entry) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Typography variant="h6" component="span" fontWeight={700}>
            Edit Entry
          </Typography>
          <Chip
            label={entry.id}
            size="small"
            variant="outlined"
            color="primary"
            sx={{ ml: 1.5, fontFamily: 'monospace', fontWeight: 700 }}
          />
        </Box>
        <IconButton onClick={onClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers>
        <Stack spacing={3}>
          {/* Entry Details */}
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              Entry Details
            </Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={6}>
                <TextField
                  label="Entry ID"
                  defaultValue={entry.id}
                  size="small"
                  fullWidth
                  slotProps={{ input: { readOnly: true } }}
                  sx={{ '& .MuiInputBase-root': { fontFamily: 'monospace' } }}
                />
              </Grid>
              <Grid size={6}>
                <TextField label="Entry Label" defaultValue={entry.label} size="small" fullWidth />
              </Grid>
              <Grid size={6}>
                <TextField label="Contest" defaultValue={entry.contestId} size="small" fullWidth select
                  slotProps={{ input: { readOnly: true } }}>
                  {contests.map((c) => (
                    <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>
                  ))}
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField label="Entry Number" defaultValue={entry.entryNum} size="small" fullWidth
                  slotProps={{ input: { readOnly: true } }} />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Status & Payment */}
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              Status &amp; Payment
            </Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={6}>
                <TextField label="Entry Status" defaultValue={entry.status} size="small" fullWidth select>
                  {statusOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField label="Payment Status" defaultValue={derivedPaymentLabel(entry)} size="small" fullWidth
                  slotProps={{ input: { readOnly: true } }} />
              </Grid>
              <Grid size={6}>
                <TextField label="Registration Date" defaultValue="2025-07-14" size="small" fullWidth type="date" slotProps={{ inputLabel: { shrink: true } }} />
              </Grid>
              <Grid size={6}>
                <TextField label="Payment Receipt #" defaultValue={entry.receiptNum || ''} size="small" fullWidth />
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Proxy */}
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              Proxy Assignment
            </Typography>
            <Grid container spacing={2} sx={{ mt: 0.5 }}>
              <Grid size={6}>
                <TextField label="Assigned Proxy" defaultValue={entry.proxy || proxyOptions[0]} size="small" fullWidth select>
                  {proxyOptions.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                </TextField>
              </Grid>
              <Grid size={6}>
                <TextField label="Submission Method" defaultValue={submissionOptions[0]} size="small" fullWidth select>
                  {submissionOptions.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </TextField>
              </Grid>
            </Grid>
          </Box>

          <Divider />

          {/* Notes */}
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              Admin Notes
            </Typography>
            <TextField
              multiline
              rows={2}
              fullWidth
              size="small"
              placeholder="Internal notes (not visible to contestant)…"
              sx={{ mt: 1 }}
            />
          </Box>

          <Divider />

          {/* Audit Log */}
          <Box>
            <Typography variant="overline" color="text.secondary" fontWeight={700}>
              Audit Log
            </Typography>
            <Box
              sx={{
                mt: 1,
                border: '1px solid',
                borderColor: 'divider',
                borderRadius: 1,
                maxHeight: 160,
                overflowY: 'auto',
                bgcolor: 'background.default',
              }}
            >
              <Box sx={{ px: 1.5, py: 0.75, borderBottom: '1px solid', borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary">
                  {new Date(entry.createdAt).toLocaleString()} ·{' '}
                  <Typography component="span" variant="caption" fontWeight={700} color="text.primary">
                    Entry created
                  </Typography>{' '}
                  {entry.paymentMethod ? `· ${entry.paymentMethod}` : ''} — <em>system</em>
                </Typography>
              </Box>
              {entry.receiptNum && (
                <Box sx={{ px: 1.5, py: 0.75 }}>
                  <Typography variant="caption" color="text.secondary">
                    {new Date(entry.createdAt).toLocaleString()} ·{' '}
                    <Typography component="span" variant="caption" fontWeight={700} color="text.primary">
                      Payment confirmed
                    </Typography>{' '}
                    · Receipt #{entry.receiptNum} — <em>cashier</em>
                  </Typography>
                </Box>
              )}
            </Box>
          </Box>
        </Stack>
      </DialogContent>

      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button color="error" variant="outlined" sx={{ mr: 'auto' }}>
          Void Entry
        </Button>
        <Button onClick={onClose} variant="outlined">
          Cancel
        </Button>
        <Button variant="contained" color="primary">
          Save Changes
        </Button>
      </DialogActions>
    </Dialog>
  );
}
