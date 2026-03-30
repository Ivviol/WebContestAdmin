import CssBaseline from '@mui/material/CssBaseline';
import { createTheme, ThemeProvider } from '@mui/material/styles';
import useMediaQuery from '@mui/material/useMediaQuery';
import { getMUIThemeOptions } from '@kambi/spark-design-tokens';
import { AppLayout } from '@kambi/spark-helpers';
import Grid from '@mui/material/Grid';
import { useState } from 'react';
import { NavigationContext } from './NavigationContext.js';
import { UserProvider } from './UserContext.jsx';
import NavigationList from './components/NavigationList.jsx';
import EntryManagementPage from './components/EntryManagementPage.jsx';
import CashierPage from './components/CashierPage.jsx';
import ContestManagerPage from './components/ContestManagerPage.jsx';
import WeeklyLinesPage from './components/WeeklyLinesPage.jsx';
import SchedulePage from './components/SchedulePage.jsx';
import ContestantsPage from './components/ContestantsPage.jsx';
import GradePicksPage from './components/GradePicksPage.jsx';
import StandingsPage from './components/StandingsPage.jsx';
import PayoutsPage from './components/PayoutsPage.jsx';
import ProxyRegistryPage from './components/ProxyRegistryPage.jsx';
import AuditLogPage from './components/AuditLogPage.jsx';
import DocumentsPage from './components/DocumentsPage.jsx';
import SettingsPage from './components/SettingsPage.jsx';
import UserSelectorPage from './components/UserSelectorPage.jsx';
import DashboardPage from './components/DashboardPage.jsx';
import MyLeaderboardPage from './components/MyLeaderboardPage.jsx';
import DevDateBar from './components/DevDateBar.jsx';

const theme = createTheme(getMUIThemeOptions());

const PAGES = {
  contests:    <ContestManagerPage />,
  lines:       <WeeklyLinesPage />,
  schedule:    <SchedulePage />,
  cashier:     <CashierPage />,
  entries:     <EntryManagementPage />,
  contestants: <ContestantsPage />,
  grade:       <GradePicksPage />,
  standings:   <StandingsPage />,
  payouts:     <PayoutsPage />,
  proxies:     <ProxyRegistryPage />,
  audit:       <AuditLogPage />,
  docs:        <DocumentsPage />,
  settings:    <SettingsPage />,
  user:          <UserSelectorPage />,
  dashboard:     <DashboardPage />,
  myleaderboard: <MyLeaderboardPage />,
};

// Pages that take over the full screen on mobile (no shell/sidebar)
const FULLSCREEN_MOBILE_PAGES = new Set(['user', 'dashboard', 'myleaderboard']);

function AppContent() {
  const isMobile = useMediaQuery('(max-width:600px)');
  const [page, setPage]           = useState('contests');
  const [pageState, setPageState] = useState(null);

  function handleNavigate(target, state = null) {
    setPage(target);
    setPageState(state);
  }

  const currentPage = PAGES[page] ?? <EntryManagementPage />;
  const fullScreen  = isMobile && FULLSCREEN_MOBILE_PAGES.has(page);

  return (
    <UserProvider>
      <NavigationContext.Provider value={{ activePage: page, pageState, onNavigate: handleNavigate }}>

        {fullScreen ? (
          // Mobile contestant pages — full screen, no shell or sidebar
          currentPage
        ) : (
          <AppLayout
            slots={{ NavigationList }}
            slotProps={{
              ApplicationName: { name: 'SuperContest Backoffice', url: '/' },
              UserProfile: {
                name: 'Admin User',
                email: 'admin@supercontest.com',
                extraText: 'Administrator',
              },
              AppInfo: {
                timeZoneShort: 'PT',
                timeZoneLong: 'Pacific Time',
                version: '1.0.0',
                copyright: '© 2025 SuperContest',
              },
              QuickLinksBar: {
                defaultLinks: {
                  themeMode: {
                    enabled: true,
                    labelDark: 'Dark mode',
                    labelLight: 'Light mode',
                    defaultMode: 'dark',
                  },
                  settings: { enabled: false },
                  docs: { enabled: false },
                  support: { enabled: false },
                },
              },
              ContainerProps: { maxWidth: false, sx: { px: 3 } },
            }}
          >
            <Grid size="grow" order={1} sx={{ py: 3 }}>
              {currentPage}
            </Grid>
          </AppLayout>
        )}

      </NavigationContext.Provider>
    </UserProvider>
  );
}

export default function App() {
  return (
    <ThemeProvider theme={theme} defaultMode="dark">
      <CssBaseline enableColorScheme />
      <AppContent />
      {import.meta.env.DEV && <DevDateBar />}
    </ThemeProvider>
  );
}
