import Icon from '@mui/material/Icon';
import ListItem from '@mui/material/ListItem';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import { useNavigation } from '../NavigationContext.js';

const sections = [
  {
    label: 'Contest',
    items: [
      { id: 'contests',  icon: 'emoji_events',    label: 'Contest Manager' },
      { id: 'lines',     icon: 'sports_football', label: 'Weekly Card / Lines' },
      { id: 'schedule',  icon: 'calendar_month',  label: 'Schedule & Deadlines' },
    ],
  },
  {
    label: 'Entries',
    items: [
      { id: 'cashier',  icon: 'point_of_sale',        label: 'Cashier' },
      { id: 'entries',  icon: 'confirmation_number',   label: 'Entry Management' },
      { id: 'contestants', icon: 'group',              label: 'Contestants' },
      { id: 'proxies',  icon: 'handshake',             label: 'Proxy Registry' },
    ],
  },
  {
    label: 'Scoring',
    items: [
      { id: 'grade',    icon: 'task_alt',      label: 'Grade Picks' },
      { id: 'standings',icon: 'emoji_events',  label: 'Standings' },
      { id: 'payouts',  icon: 'payments',      label: 'Prize Payouts' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'docs',     icon: 'description',   label: 'Documents' },
      { id: 'audit',    icon: 'receipt_long',  label: 'Audit Log' },
      { id: 'settings', icon: 'settings',      label: 'Settings' },
      { id: 'user',      icon: 'account_circle', label: 'User Login' },
      { id: 'dashboard', icon: 'dashboard',       label: 'My Picks' },
    ],
  },
];

export default function NavigationList({ expanded }) {
  const { activePage, onNavigate } = useNavigation();
  return (
    <>
      {sections.map((section) => (
        <Box key={section.label}>
          {expanded && (
            <Typography
              variant="caption"
              sx={{
                px: 2,
                pt: 2,
                pb: 0.5,
                display: 'block',
                fontWeight: 700,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                opacity: 0.5,
              }}
            >
              {section.label}
            </Typography>
          )}
          {!expanded && <Divider sx={{ mx: 1, my: 1 }} />}
          {section.items.map((item) => (
            <ListItem key={item.id} disablePadding>
              <ListItemButton
                selected={activePage === item.id}
                onClick={() => onNavigate?.(item.id)}
              >
                <ListItemIcon>
                  <Icon>{item.icon}</Icon>
                </ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          ))}
        </Box>
      ))}
    </>
  );
}
