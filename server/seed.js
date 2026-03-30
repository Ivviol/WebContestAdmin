/**
 * Seed script — run once to populate MongoDB with initial data.
 * Safe to re-run: skips collections that already have data.
 *
 *   node server/seed.js
 */

import { connectDB } from './db.js';
import {
  User, Contest, Ticket, WeeklyCard, WeeklyPick,
  League, Proxy, ProxyAuditLog, AuditLog, Settings, Counter,
} from './models.js';

await connectDB();

async function seedIfEmpty(Model, name, docs) {
  const count = await Model.countDocuments();
  if (count > 0) { console.log(`  ${name}: already has ${count} docs — skipped`); return; }
  await Model.insertMany(docs);
  console.log(`  ${name}: seeded ${docs.length} docs`);
}

// ── Counters ──────────────────────────────────────────────────────────────────
await Counter.deleteMany({});
await Counter.insertMany([
  { _id: 'user',       seq: 20  },
  { _id: 'ticket',     seq: 500 },  // next will be T-30340
  { _id: 'receipt',    seq: 60  },
  { _id: 'game',       seq: 50  },
  { _id: 'proxy',      seq: 3   },
  { _id: 'proxyAudit', seq: 10  },
  { _id: 'auditLog',   seq: 30  },
  { _id: 'league',     seq: 1   },
  { _id: 'contest',    seq: 4   },
]);
console.log('  Counters: reset');

// ── Settings ──────────────────────────────────────────────────────────────────
await Settings.deleteMany({});
await Settings.create({
  _id: 'contest-type-defaults',
  sc:   { entryFee: 1500, ticketLimit: 5, picksPerWeek: 5, totalWeeks: 17, proxyAllowed: true,  geoRestricted: false },
  wta:  { entryFee: 500,  ticketLimit: 1, picksPerWeek: 5, totalWeeks: 17, proxyAllowed: false, geoRestricted: false },
  surv: { entryFee: 300,  ticketLimit: 1, picksPerWeek: 1, totalWeeks: 17, proxyAllowed: false, geoRestricted: true  },
});
console.log('  Settings: seeded');

// ── League ────────────────────────────────────────────────────────────────────
await seedIfEmpty(League, 'League', [
  {
    _id: 'nfl', name: 'NFL',
    teams: [
      'Arizona Cardinals','Atlanta Falcons','Baltimore Ravens','Buffalo Bills',
      'Carolina Panthers','Chicago Bears','Cincinnati Bengals','Cleveland Browns',
      'Dallas Cowboys','Denver Broncos','Detroit Lions','Green Bay Packers',
      'Houston Texans','Indianapolis Colts','Jacksonville Jaguars','Kansas City Chiefs',
      'Las Vegas Raiders','Los Angeles Chargers','Los Angeles Rams','Miami Dolphins',
      'Minnesota Vikings','New England Patriots','New Orleans Saints','New York Giants',
      'New York Jets','Philadelphia Eagles','Pittsburgh Steelers','San Francisco 49ers',
      'Seattle Seahawks','Tampa Bay Buccaneers','Tennessee Titans','Washington Commanders',
    ],
  },
]);

// ── Users (20) ────────────────────────────────────────────────────────────────
await seedIfEmpty(User, 'User', [
  { _id: 'U-001', name: 'John Smith',         email: 'john@example.com',    phone: '702-555-0001' },
  { _id: 'U-002', name: 'Maria Garcia',        email: 'maria@example.com',   phone: '702-555-0002' },
  { _id: 'U-003', name: 'James Wilson',        email: 'james@example.com',   phone: '702-555-0003' },
  { _id: 'U-004', name: 'Patricia Brown',      email: 'pat@example.com',     phone: '702-555-0004' },
  { _id: 'U-005', name: 'Robert Davis',        email: 'rob@example.com',     phone: '702-555-0005' },
  { _id: 'U-006', name: 'Linda Martinez',      email: 'linda@example.com',   phone: '702-555-0006' },
  { _id: 'U-007', name: 'Michael Taylor',      email: 'mike@example.com',    phone: '702-555-0007' },
  { _id: 'U-008', name: 'Barbara Anderson',    email: 'barb@example.com',    phone: '702-555-0008' },
  { _id: 'U-009', name: 'William Thomas',      email: 'will@example.com',    phone: '702-555-0009' },
  { _id: 'U-010', name: 'Elizabeth Jackson',   email: 'liz@example.com',     phone: '702-555-0010' },
  { _id: 'U-011', name: 'Kevin Johnson',       email: 'kevin@example.com',   phone: '702-555-0011' },
  { _id: 'U-012', name: 'Susan Williams',      email: 'susan@example.com',   phone: '702-555-0012' },
  { _id: 'U-013', name: 'Charles Brown',       email: 'charles@example.com', phone: '702-555-0013' },
  { _id: 'U-014', name: 'Margaret Jones',      email: 'margaret@example.com',phone: '702-555-0014' },
  { _id: 'U-015', name: 'Steven Miller',       email: 'steven@example.com',  phone: '702-555-0015' },
  { _id: 'U-016', name: 'Dorothy Wilson',      email: 'dorothy@example.com', phone: '702-555-0016' },
  { _id: 'U-017', name: 'Richard Moore',       email: 'richard@example.com', phone: '702-555-0017' },
  { _id: 'U-018', name: 'Lisa Harris',         email: 'lisa@example.com',    phone: '702-555-0018' },
  { _id: 'U-019', name: 'Joseph White',        email: 'joseph@example.com',  phone: '702-555-0019' },
  { _id: 'U-020', name: 'Nancy Martin',        email: 'nancy@example.com',   phone: '702-555-0020' },
]);

// ── Contests ──────────────────────────────────────────────────────────────────
const NOW = new Date();
const y = NOW.getFullYear();

await seedIfEmpty(Contest, 'Contest', [
  {
    _id: 'SC-2025', type: 'sc', name: 'SuperContest 2025', season: '2025',
    status: 'Active', entryFee: 1500, ticketLimit: 5, picksPerWeek: 5, totalWeeks: 17,
    proxyAllowed: true, geoRestricted: false,
    registrationOpen: new Date(`${y}-08-01`), registrationClose: new Date(`${y}-09-07`),
    contestStart: new Date(`${y}-09-07`), contestEnd: new Date(`${y}-12-31`),
    payoutTiers: [
      { rank: 1, label: '1st Place', percent: 40 },
      { rank: 2, label: '2nd Place', percent: 25 },
      { rank: 3, label: '3rd Place', percent: 15 },
      { rank: 4, label: '4th Place', percent: 10 },
      { rank: 5, label: '5th Place', percent: 10 },
    ],
    payoutsStatus: 'Draft',
  },
  {
    _id: 'WTA-2025', type: 'wta', name: 'Winner Take All 2025', season: '2025',
    status: 'Active', entryFee: 500, ticketLimit: 1, picksPerWeek: 5, totalWeeks: 17,
    proxyAllowed: false, geoRestricted: false,
    registrationOpen: new Date(`${y}-08-01`), registrationClose: new Date(`${y}-09-07`),
    contestStart: new Date(`${y}-09-07`), contestEnd: new Date(`${y}-12-31`),
    payoutTiers: [{ rank: 1, label: 'Winner', percent: 100 }],
    payoutsStatus: 'Draft',
  },
  {
    _id: 'SURV-2025', type: 'surv', name: 'Survivor 2025', season: '2025',
    status: 'Active', entryFee: 300, ticketLimit: 1, picksPerWeek: 1, totalWeeks: 17,
    proxyAllowed: false, geoRestricted: true,
    registrationOpen: new Date(`${y}-08-01`), registrationClose: new Date(`${y}-09-07`),
    contestStart: new Date(`${y}-09-07`), contestEnd: new Date(`${y}-12-31`),
    payoutTiers: [{ rank: 1, label: 'Winner', percent: 100 }],
    payoutsStatus: 'Draft',
  },
  {
    _id: 'SC-2026', type: 'sc', name: 'SuperContest 2026', season: '2026',
    status: 'Draft', entryFee: 1500, ticketLimit: 5, picksPerWeek: 5, totalWeeks: 17,
    proxyAllowed: true, geoRestricted: false,
    payoutTiers: [], payoutsStatus: 'Draft',
  },
]);

// ── Proxies ───────────────────────────────────────────────────────────────────
await seedIfEmpty(Proxy, 'Proxy', [
  { _id: 'PX-0041', name: 'Dave Martinez', email: 'dave@example.com',  phone: '702-555-0200', status: 'Active', registeredAt: new Date(`${y}-01-10`) },
  { _id: 'PX-0089', name: 'Sarah Lee',     email: 'sarah@example.com', phone: '702-555-0201', status: 'Active', registeredAt: new Date(`${y}-01-12`) },
  { _id: 'PX-0102', name: 'Mike Chen',     email: 'mike@example.com',  phone: '702-555-0202', status: 'Active', registeredAt: new Date(`${y}-01-15`) },
]);

// ── Tickets ───────────────────────────────────────────────────────────────────
await seedIfEmpty(Ticket, 'Ticket', [
  // ── SC-2025 ────────────────────────────────────────────────────────────────
  // Original entries
  { _id: 'T-29841', userId: 'U-001', contestId: 'SC-2025', label: 'Smith Alpha',    status: 'Active',          paymentMethod: 'Cash', amountPaid: 1500, receiptNum: 'R-001', proxyId: 'PX-0041', createdAt: new Date(`${y}-09-01`) },
  { _id: 'T-29842', userId: 'U-001', contestId: 'SC-2025', label: 'Smith Beta',     status: 'Active',          paymentMethod: 'Cash', amountPaid: 1500, receiptNum: 'R-002', createdAt: new Date(`${y}-09-01`) },
  { _id: 'T-29843', userId: 'U-002', contestId: 'SC-2025', label: 'Garcia One',     status: 'Active',          paymentMethod: 'Card', amountPaid: 1500, receiptNum: 'R-003', proxyId: 'PX-0041', createdAt: new Date(`${y}-09-01`) },
  { _id: 'T-29844', userId: 'U-003', contestId: 'SC-2025', label: 'Wilson Main',    status: 'Active',          paymentMethod: 'Cash', amountPaid: 1500, receiptNum: 'R-004', createdAt: new Date(`${y}-09-01`) },
  { _id: 'T-29845', userId: 'U-004', contestId: 'SC-2025', label: 'Brown SC',       status: 'Suspended',       paymentMethod: 'Cash', amountPaid: 1500, receiptNum: 'R-005', createdAt: new Date(`${y}-09-01`) },
  { _id: 'T-29846', userId: 'U-005', contestId: 'SC-2025', label: 'Davis Alpha',    status: 'Active',          paymentMethod: 'Card', amountPaid: 1500, receiptNum: 'R-006', createdAt: new Date(`${y}-09-01`) },
  { _id: 'T-29847', userId: 'U-006', contestId: 'SC-2025', label: 'Martinez One',   status: 'Active',          paymentMethod: 'Cash', amountPaid: 1500, receiptNum: 'R-007', createdAt: new Date(`${y}-09-01`) },
  { _id: 'T-29848', userId: 'U-007', contestId: 'SC-2025', label: 'Taylor SC',      status: 'Active',          paymentMethod: 'Cash', amountPaid: 1500, receiptNum: 'R-008', createdAt: new Date(`${y}-09-01`) },
  { _id: 'T-29849', userId: 'U-008', contestId: 'SC-2025', label: 'Anderson Main',  status: 'Active',          paymentMethod: 'Card', amountPaid: 1500, receiptNum: 'R-009', createdAt: new Date(`${y}-09-01`) },
  { _id: 'T-29850', userId: 'U-009', contestId: 'SC-2025', label: 'Thomas One',     status: 'Active',          paymentMethod: 'Cash', amountPaid: 1500, receiptNum: 'R-010', proxyId: 'PX-0089', createdAt: new Date(`${y}-09-01`) },
  // Additional SC entries
  { _id: 'T-30101', userId: 'U-001', contestId: 'SC-2025', label: 'Smith Gamma',    status: 'Active',          paymentMethod: 'Cash', amountPaid: 1500, receiptNum: 'R-020', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30102', userId: 'U-001', contestId: 'SC-2025', label: 'Smith Delta',    status: 'Voided',          paymentMethod: 'Cash', amountPaid: 1500, receiptNum: 'R-021', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30103', userId: 'U-002', contestId: 'SC-2025', label: 'Garcia Two',     status: 'Active',          paymentMethod: 'Card', amountPaid: 1500, receiptNum: 'R-022', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30104', userId: 'U-002', contestId: 'SC-2025', label: 'Garcia Three',   status: 'Pending Payment',                                                                createdAt: new Date(`${y}-09-03`) },
  { _id: 'T-30105', userId: 'U-005', contestId: 'SC-2025', label: 'Davis Beta',     status: 'Active',          paymentMethod: 'Cash', amountPaid: 1500, receiptNum: 'R-023', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30106', userId: 'U-011', contestId: 'SC-2025', label: 'Johnson Alpha',  status: 'Active',          paymentMethod: 'Cash', amountPaid: 1500, receiptNum: 'R-024', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30107', userId: 'U-012', contestId: 'SC-2025', label: 'Williams SC',    status: 'Active',          paymentMethod: 'Card', amountPaid: 1500, receiptNum: 'R-025', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30108', userId: 'U-013', contestId: 'SC-2025', label: 'Brown Alpha',    status: 'Active',          paymentMethod: 'Cash', amountPaid: 1500, receiptNum: 'R-026', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30109', userId: 'U-013', contestId: 'SC-2025', label: 'Brown Beta',     status: 'Suspended',       paymentMethod: 'Cash', amountPaid: 1500, receiptNum: 'R-027', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30110', userId: 'U-014', contestId: 'SC-2025', label: 'Jones SC',       status: 'Active',          paymentMethod: 'Card', amountPaid: 1500, receiptNum: 'R-028', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30111', userId: 'U-015', contestId: 'SC-2025', label: 'Miller SC',      status: 'Active',          paymentMethod: 'Cash', amountPaid: 1500, receiptNum: 'R-029', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30112', userId: 'U-016', contestId: 'SC-2025', label: 'Wilson SC',      status: 'Pending Payment',                                                                createdAt: new Date(`${y}-09-04`) },
  { _id: 'T-30113', userId: 'U-017', contestId: 'SC-2025', label: 'Moore Alpha',    status: 'Active',          paymentMethod: 'Cash', amountPaid: 1500, receiptNum: 'R-030', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30114', userId: 'U-018', contestId: 'SC-2025', label: 'Harris SC',      status: 'Active',          paymentMethod: 'Card', amountPaid: 1500, receiptNum: 'R-031', createdAt: new Date(`${y}-09-02`) },
  // Pending (original)
  { _id: 'T-30100', userId: 'U-010', contestId: 'SC-2025', label: 'Jackson SC',     status: 'Pending Payment',                                                                createdAt: new Date(`${y}-09-05`) },

  // ── WTA-2025 ───────────────────────────────────────────────────────────────
  { _id: 'T-30001', userId: 'U-001', contestId: 'WTA-2025', label: 'Smith WTA',     status: 'Active',          paymentMethod: 'Cash', amountPaid: 500, receiptNum: 'R-011', proxyId: 'PX-0102', createdAt: new Date(`${y}-09-01`) },
  { _id: 'T-30002', userId: 'U-002', contestId: 'WTA-2025', label: 'Garcia WTA',    status: 'Active',          paymentMethod: 'Card', amountPaid: 500, receiptNum: 'R-012', createdAt: new Date(`${y}-09-01`) },
  { _id: 'T-30003', userId: 'U-003', contestId: 'WTA-2025', label: 'Wilson WTA',    status: 'Active',          paymentMethod: 'Cash', amountPaid: 500, receiptNum: 'R-013', createdAt: new Date(`${y}-09-01`) },
  { _id: 'T-30200', userId: 'U-004', contestId: 'WTA-2025', label: 'Brown WTA',     status: 'Active',          paymentMethod: 'Cash', amountPaid: 500, receiptNum: 'R-032', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30201', userId: 'U-005', contestId: 'WTA-2025', label: 'Davis WTA',     status: 'Active',          paymentMethod: 'Card', amountPaid: 500, receiptNum: 'R-033', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30202', userId: 'U-006', contestId: 'WTA-2025', label: 'Martinez WTA',  status: 'Voided',          paymentMethod: 'Cash', amountPaid: 500, receiptNum: 'R-034', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30203', userId: 'U-007', contestId: 'WTA-2025', label: 'Taylor WTA',    status: 'Active',          paymentMethod: 'Cash', amountPaid: 500, receiptNum: 'R-035', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30204', userId: 'U-008', contestId: 'WTA-2025', label: 'Anderson WTA',  status: 'Active',          paymentMethod: 'Card', amountPaid: 500, receiptNum: 'R-036', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30205', userId: 'U-009', contestId: 'WTA-2025', label: 'Thomas WTA',    status: 'Pending Payment',                                                               createdAt: new Date(`${y}-09-04`) },
  { _id: 'T-30206', userId: 'U-011', contestId: 'WTA-2025', label: 'Johnson WTA',   status: 'Active',          paymentMethod: 'Cash', amountPaid: 500, receiptNum: 'R-037', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30207', userId: 'U-012', contestId: 'WTA-2025', label: 'Williams WTA',  status: 'Active',          paymentMethod: 'Card', amountPaid: 500, receiptNum: 'R-038', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30208', userId: 'U-013', contestId: 'WTA-2025', label: 'Brown WTA',     status: 'Active',          paymentMethod: 'Cash', amountPaid: 500, receiptNum: 'R-039', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30209', userId: 'U-014', contestId: 'WTA-2025', label: 'Jones WTA',     status: 'Active',          paymentMethod: 'Card', amountPaid: 500, receiptNum: 'R-040', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30210', userId: 'U-015', contestId: 'WTA-2025', label: 'Miller WTA',    status: 'Active',          paymentMethod: 'Cash', amountPaid: 500, receiptNum: 'R-041', createdAt: new Date(`${y}-09-02`) },

  // ── SURV-2025 ──────────────────────────────────────────────────────────────
  // Active — survived wks 5 & 6
  { _id: 'T-30040', userId: 'U-001', contestId: 'SURV-2025', label: 'Smith Surv',    status: 'Active',                paymentMethod: 'Cash', amountPaid: 300, receiptNum: 'R-014', createdAt: new Date(`${y}-09-01`) },
  { _id: 'T-30300', userId: 'U-004', contestId: 'SURV-2025', label: 'Brown Surv',    status: 'Active',                paymentMethod: 'Cash', amountPaid: 300, receiptNum: 'R-042', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30302', userId: 'U-006', contestId: 'SURV-2025', label: 'Martinez Surv', status: 'Active',                paymentMethod: 'Cash', amountPaid: 300, receiptNum: 'R-043', createdAt: new Date(`${y}-09-02`) },
  { _id: 'T-30304', userId: 'U-008', contestId: 'SURV-2025', label: 'Anderson Surv', status: 'Active',                paymentMethod: 'Card', amountPaid: 300, receiptNum: 'R-044', createdAt: new Date(`${y}-09-02`) },
  // Eliminated — missed wk 6
  { _id: 'T-30041', userId: 'U-002', contestId: 'SURV-2025', label: 'Garcia Surv',   status: 'Eliminated (Survivor)', paymentMethod: 'Card', amountPaid: 300, receiptNum: 'R-015', createdAt: new Date(`${y}-09-01`) },
  { _id: 'T-30042', userId: 'U-003', contestId: 'SURV-2025', label: 'Wilson Surv',   status: 'Eliminated (Survivor)', paymentMethod: 'Cash', amountPaid: 300, receiptNum: 'R-016', createdAt: new Date(`${y}-09-01`) },
  { _id: 'T-30303', userId: 'U-007', contestId: 'SURV-2025', label: 'Taylor Surv',   status: 'Eliminated (Survivor)', paymentMethod: 'Cash', amountPaid: 300, receiptNum: 'R-045', createdAt: new Date(`${y}-09-02`) },
  // Eliminated — lost a pick in wk6
  { _id: 'T-30301', userId: 'U-005', contestId: 'SURV-2025', label: 'Davis Surv',    status: 'Eliminated (Survivor)', paymentMethod: 'Card', amountPaid: 300, receiptNum: 'R-046', createdAt: new Date(`${y}-09-02`) },
  // Voided (admin refunded before season start)
  { _id: 'T-30305', userId: 'U-009', contestId: 'SURV-2025', label: 'Thomas Surv',   status: 'Voided',                paymentMethod: 'Cash', amountPaid: 300, receiptNum: 'R-047', createdAt: new Date(`${y}-09-01`) },
]);

// ── Weekly Cards ──────────────────────────────────────────────────────────────
const CONTEST_IDS = ['SC-2025', 'WTA-2025', 'SURV-2025'];

await seedIfEmpty(WeeklyCard, 'WeeklyCard', [
  {
    _id: 'wc-2025-5', season: '2025', weekNum: 5, leagueId: 'nfl', contestIds: CONTEST_IDS,
    status: 'Locked', picksDeadline: new Date(`${y}-10-05`), publishedAt: new Date(`${y}-10-02`), lockedAt: new Date(`${y}-10-05`),
    games: [
      { id: 'g-501', awayTeam: 'Kansas City Chiefs',  homeTeam: 'Las Vegas Raiders',    homeSpread: -7.5, gameDate: new Date(`${y}-10-06`), onCard: true,  status: 'Final', awayScore: 30, homeScore: 29 },
      { id: 'g-502', awayTeam: 'Dallas Cowboys',       homeTeam: 'San Francisco 49ers',  homeSpread: -3,   gameDate: new Date(`${y}-10-06`), onCard: true,  status: 'Final', awayScore: 17, homeScore: 42 },
      { id: 'g-503', awayTeam: 'Buffalo Bills',        homeTeam: 'Miami Dolphins',       homeSpread: 2.5,  gameDate: new Date(`${y}-10-06`), onCard: true,  status: 'Final', awayScore: 31, homeScore: 10 },
      { id: 'g-504', awayTeam: 'Green Bay Packers',    homeTeam: 'Detroit Lions',        homeSpread: -4,   gameDate: new Date(`${y}-10-06`), onCard: true,  status: 'Final', awayScore: 24, homeScore: 27 },
      { id: 'g-505', awayTeam: 'Philadelphia Eagles',  homeTeam: 'New York Giants',      homeSpread: 6,    gameDate: new Date(`${y}-10-06`), onCard: true,  status: 'Final', awayScore: 21, homeScore: 7  },
      { id: 'g-506', awayTeam: 'Los Angeles Rams',     homeTeam: 'Seattle Seahawks',     homeSpread: -1.5, gameDate: new Date(`${y}-10-07`), onCard: true,  status: 'Final', awayScore: 26, homeScore: 20 },
      { id: 'g-507', awayTeam: 'Pittsburgh Steelers',  homeTeam: 'Baltimore Ravens',     homeSpread: -6,   gameDate: new Date(`${y}-10-07`), onCard: false, status: 'Final', awayScore: 18, homeScore: 28 },
    ],
  },
  {
    _id: 'wc-2025-6', season: '2025', weekNum: 6, leagueId: 'nfl', contestIds: CONTEST_IDS,
    status: 'Locked', picksDeadline: new Date(`${y}-10-12`), publishedAt: new Date(`${y}-10-09`), lockedAt: new Date(`${y}-10-12`),
    games: [
      { id: 'g-601', awayTeam: 'Buffalo Bills',         homeTeam: 'Kansas City Chiefs',   homeSpread: -3,   gameDate: new Date(`${y}-10-13`), onCard: true,  status: 'Final', awayScore: 20, homeScore: 23 },
      { id: 'g-602', awayTeam: 'San Francisco 49ers',   homeTeam: 'Los Angeles Rams',     homeSpread: -2.5, gameDate: new Date(`${y}-10-13`), onCard: true,  status: 'Final', awayScore: 24, homeScore: 14 },
      { id: 'g-603', awayTeam: 'Dallas Cowboys',        homeTeam: 'Detroit Lions',        homeSpread: -4,   gameDate: new Date(`${y}-10-13`), onCard: true,  status: 'Final', awayScore: 28, homeScore: 23 },
      { id: 'g-604', awayTeam: 'New York Jets',         homeTeam: 'Philadelphia Eagles',  homeSpread: -5,   gameDate: new Date(`${y}-10-13`), onCard: true,  status: 'Final', awayScore: 14, homeScore: 20 },
      { id: 'g-605', awayTeam: 'Atlanta Falcons',       homeTeam: 'Tampa Bay Buccaneers', homeSpread: -1,   gameDate: new Date(`${y}-10-13`), onCard: true,  status: 'Final', awayScore: 31, homeScore: 28 },
    ],
  },
  {
    _id: 'wc-2025-7', season: '2025', weekNum: 7, leagueId: 'nfl', contestIds: CONTEST_IDS,
    status: 'Published', picksDeadline: new Date(`${y + 1}-10-19`), publishedAt: new Date(`${y}-10-16`), lockedAt: null,
    games: [
      { id: 'g-701', awayTeam: 'Kansas City Chiefs',   homeTeam: 'Las Vegas Raiders',    homeSpread: -9,   gameDate: new Date(`${y + 1}-10-20`), onCard: true,  status: 'Scheduled' },
      { id: 'g-702', awayTeam: 'Philadelphia Eagles',  homeTeam: 'Cincinnati Bengals',   homeSpread: -2,   gameDate: new Date(`${y + 1}-10-20`), onCard: true,  status: 'Scheduled' },
      { id: 'g-703', awayTeam: 'Green Bay Packers',    homeTeam: 'Minnesota Vikings',    homeSpread: -3.5, gameDate: new Date(`${y + 1}-10-20`), onCard: true,  status: 'Scheduled' },
      { id: 'g-704', awayTeam: 'Seattle Seahawks',     homeTeam: 'San Francisco 49ers',  homeSpread: -7,   gameDate: new Date(`${y + 1}-10-20`), onCard: true,  status: 'Scheduled' },
      { id: 'g-705', awayTeam: 'New England Patriots', homeTeam: 'Buffalo Bills',        homeSpread: -13,  gameDate: new Date(`${y + 1}-10-20`), onCard: true,  status: 'Scheduled' },
      { id: 'g-706', awayTeam: 'Atlanta Falcons',      homeTeam: 'Dallas Cowboys',       homeSpread: -4.5, gameDate: new Date(`${y + 1}-10-21`), onCard: false, status: 'Scheduled' },
    ],
  },
  {
    _id: 'wc-2025-8', season: '2025', weekNum: 8, leagueId: 'nfl', contestIds: CONTEST_IDS,
    status: 'Draft', picksDeadline: null, publishedAt: null, lockedAt: null,
    games: [],
  },
]);

// ── Weekly Picks ──────────────────────────────────────────────────────────────
// Week 5 ATS results: Chiefs-W, 49ers-W, Bills-W, Packers-W, Eagles-W, Rams-W
// Week 6 ATS results: Push(Chiefs/Bills), 49ers-W, Cowboys-W, Eagles-W, Falcons-W
// Week 5 Survivor SU: Chiefs-W, 49ers-W, Bills-W, Lions-W, Eagles-W, Rams-W
// Week 6 Survivor SU: Chiefs-W, 49ers-W, Cowboys-W, Eagles-W, Falcons-W

await seedIfEmpty(WeeklyPick, 'WeeklyPick', [

  // ── SC-2025 Week 5 ─────────────────────────────────────────────────────────
  { _id: 'wp-T-29841-5', ticketId: 'T-29841', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-29842-5', ticketId: 'T-29842', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Las Vegas Raiders',   result: 'Loss' },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Detroit Lions',       result: 'Loss' },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-29843-5', ticketId: 'T-29843', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'Dallas Cowboys',      result: 'Loss' },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Detroit Lions',       result: 'Loss' },
    { gameId: 'g-505', pickedTeam: 'New York Giants',     result: 'Loss' },
  ]},
  { _id: 'wp-T-29844-5', ticketId: 'T-29844', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-29845-5', ticketId: 'T-29845', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Detroit Lions',       result: 'Loss' },
    { gameId: 'g-506', pickedTeam: 'Los Angeles Rams',    result: 'Win'  },
  ]},
  { _id: 'wp-T-29846-5', ticketId: 'T-29846', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'Dallas Cowboys',      result: 'Loss' },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Detroit Lions',       result: 'Loss' },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-29847-5', ticketId: 'T-29847', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Las Vegas Raiders',   result: 'Loss' },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-29848-5', ticketId: 'T-29848', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'Dallas Cowboys',      result: 'Loss' },
    { gameId: 'g-503', pickedTeam: 'Miami Dolphins',      result: 'Loss' },
    { gameId: 'g-504', pickedTeam: 'Detroit Lions',       result: 'Loss' },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-29849-5', ticketId: 'T-29849', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Miami Dolphins',      result: 'Loss' },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-29850-5', ticketId: 'T-29850', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-30101-5', ticketId: 'T-30101', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-506', pickedTeam: 'Los Angeles Rams',    result: 'Win'  },
  ]},
  { _id: 'wp-T-30103-5', ticketId: 'T-30103', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
    { gameId: 'g-506', pickedTeam: 'Los Angeles Rams',    result: 'Win'  },
  ]},
  { _id: 'wp-T-30105-5', ticketId: 'T-30105', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'Dallas Cowboys',      result: 'Loss' },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Detroit Lions',       result: 'Loss' },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-30106-5', ticketId: 'T-30106', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Miami Dolphins',      result: 'Loss' },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-30107-5', ticketId: 'T-30107', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Las Vegas Raiders',   result: 'Loss' },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-30108-5', ticketId: 'T-30108', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Detroit Lions',       result: 'Loss' },
    { gameId: 'g-505', pickedTeam: 'New York Giants',     result: 'Loss' },
  ]},
  { _id: 'wp-T-30109-5', ticketId: 'T-30109', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'Dallas Cowboys',      result: 'Loss' },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Detroit Lions',       result: 'Loss' },
    { gameId: 'g-505', pickedTeam: 'New York Giants',     result: 'Loss' },
  ]},
  { _id: 'wp-T-30110-5', ticketId: 'T-30110', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
    { gameId: 'g-506', pickedTeam: 'Los Angeles Rams',    result: 'Win'  },
  ]},
  { _id: 'wp-T-30111-5', ticketId: 'T-30111', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Detroit Lions',       result: 'Loss' },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-30113-5', ticketId: 'T-30113', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'New York Giants',     result: 'Loss' },
  ]},
  { _id: 'wp-T-30114-5', ticketId: 'T-30114', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Las Vegas Raiders',   result: 'Loss' },
    { gameId: 'g-502', pickedTeam: 'Dallas Cowboys',      result: 'Loss' },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},

  // ── SC-2025 Week 6 ─────────────────────────────────────────────────────────
  // T-29848 and T-30114 missed week 6
  { _id: 'wp-T-29841-6', ticketId: 'T-29841', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-29842-6', ticketId: 'T-29842', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Buffalo Bills',        result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Detroit Lions',        result: 'Loss' },
    { gameId: 'g-604', pickedTeam: 'New York Jets',        result: 'Loss' },
    { gameId: 'g-605', pickedTeam: 'Tampa Bay Buccaneers', result: 'Loss' },
  ]},
  { _id: 'wp-T-29843-6', ticketId: 'T-29843', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'New York Jets',        result: 'Loss' },
    { gameId: 'g-605', pickedTeam: 'Tampa Bay Buccaneers', result: 'Loss' },
  ]},
  { _id: 'wp-T-29844-6', ticketId: 'T-29844', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-29846-6', ticketId: 'T-29846', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Buffalo Bills',        result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-29847-6', ticketId: 'T-29847', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'Los Angeles Rams',     result: 'Loss' },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-29849-6', ticketId: 'T-29849', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'New York Jets',        result: 'Loss' },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-29850-6', ticketId: 'T-29850', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30101-6', ticketId: 'T-30101', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Tampa Bay Buccaneers', result: 'Loss' },
  ]},
  { _id: 'wp-T-30103-6', ticketId: 'T-30103', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Buffalo Bills',        result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30105-6', ticketId: 'T-30105', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'Los Angeles Rams',     result: 'Loss' },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30106-6', ticketId: 'T-30106', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Detroit Lions',        result: 'Loss' },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30107-6', ticketId: 'T-30107', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Buffalo Bills',        result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30108-6', ticketId: 'T-30108', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'Los Angeles Rams',     result: 'Loss' },
    { gameId: 'g-603', pickedTeam: 'Detroit Lions',        result: 'Loss' },
    { gameId: 'g-604', pickedTeam: 'New York Jets',        result: 'Loss' },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30110-6', ticketId: 'T-30110', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30111-6', ticketId: 'T-30111', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'New York Jets',        result: 'Loss' },
    { gameId: 'g-605', pickedTeam: 'Tampa Bay Buccaneers', result: 'Loss' },
  ]},
  { _id: 'wp-T-30113-6', ticketId: 'T-30113', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Buffalo Bills',        result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},

  // ── WTA-2025 Week 5 ────────────────────────────────────────────────────────
  { _id: 'wp-T-30001-5', ticketId: 'T-30001', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-30002-5', ticketId: 'T-30002', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'Dallas Cowboys',      result: 'Loss' },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Detroit Lions',       result: 'Loss' },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-30003-5', ticketId: 'T-30003', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Las Vegas Raiders',   result: 'Loss' },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Miami Dolphins',      result: 'Loss' },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-30200-5', ticketId: 'T-30200', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-506', pickedTeam: 'Los Angeles Rams',    result: 'Win'  },
  ]},
  { _id: 'wp-T-30201-5', ticketId: 'T-30201', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Detroit Lions',       result: 'Loss' },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-30203-5', ticketId: 'T-30203', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Miami Dolphins',      result: 'Loss' },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-30204-5', ticketId: 'T-30204', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Las Vegas Raiders',   result: 'Loss' },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-30206-5', ticketId: 'T-30206', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-30207-5', ticketId: 'T-30207', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'Dallas Cowboys',      result: 'Loss' },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-30208-5', ticketId: 'T-30208', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Green Bay Packers',   result: 'Win'  },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
    { gameId: 'g-506', pickedTeam: 'Los Angeles Rams',    result: 'Win'  },
  ]},
  { _id: 'wp-T-30209-5', ticketId: 'T-30209', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Miami Dolphins',      result: 'Loss' },
    { gameId: 'g-504', pickedTeam: 'Detroit Lions',       result: 'Loss' },
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win'  },
  ]},
  { _id: 'wp-T-30210-5', ticketId: 'T-30210', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win'  },
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win'  },
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win'  },
    { gameId: 'g-504', pickedTeam: 'Detroit Lions',       result: 'Loss' },
    { gameId: 'g-506', pickedTeam: 'Los Angeles Rams',    result: 'Win'  },
  ]},

  // ── WTA-2025 Week 6 ────────────────────────────────────────────────────────
  { _id: 'wp-T-30001-6', ticketId: 'T-30001', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30002-6', ticketId: 'T-30002', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Tampa Bay Buccaneers', result: 'Loss' },
  ]},
  { _id: 'wp-T-30003-6', ticketId: 'T-30003', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Buffalo Bills',        result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'Los Angeles Rams',     result: 'Loss' },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'New York Jets',        result: 'Loss' },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30200-6', ticketId: 'T-30200', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30201-6', ticketId: 'T-30201', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Buffalo Bills',        result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30203-6', ticketId: 'T-30203', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'Los Angeles Rams',     result: 'Loss' },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30204-6', ticketId: 'T-30204', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Detroit Lions',        result: 'Loss' },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30206-6', ticketId: 'T-30206', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30207-6', ticketId: 'T-30207', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Buffalo Bills',        result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'New York Jets',        result: 'Loss' },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30208-6', ticketId: 'T-30208', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},
  { _id: 'wp-T-30209-6', ticketId: 'T-30209', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Buffalo Bills',        result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'New York Jets',        result: 'Loss' },
    { gameId: 'g-605', pickedTeam: 'Tampa Bay Buccaneers', result: 'Loss' },
  ]},
  { _id: 'wp-T-30210-6', ticketId: 'T-30210', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',   result: 'Push' },
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers',  result: 'Win'  },
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',       result: 'Win'  },
    { gameId: 'g-604', pickedTeam: 'Philadelphia Eagles',  result: 'Win'  },
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',      result: 'Win'  },
  ]},

  // ── SURV-2025 Week 5 ───────────────────────────────────────────────────────
  { _id: 'wp-T-30040-5', ticketId: 'T-30040', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win' },
  ]},
  { _id: 'wp-T-30041-5', ticketId: 'T-30041', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win' },
  ]},
  { _id: 'wp-T-30042-5', ticketId: 'T-30042', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-502', pickedTeam: 'San Francisco 49ers', result: 'Win' },
  ]},
  { _id: 'wp-T-30300-5', ticketId: 'T-30300', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-504', pickedTeam: 'Detroit Lions',       result: 'Win' },   // Lions win SU (27-24)
  ]},
  { _id: 'wp-T-30301-5', ticketId: 'T-30301', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-505', pickedTeam: 'Philadelphia Eagles', result: 'Win' },
  ]},
  { _id: 'wp-T-30302-5', ticketId: 'T-30302', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-506', pickedTeam: 'Los Angeles Rams',    result: 'Win' },
  ]},
  { _id: 'wp-T-30303-5', ticketId: 'T-30303', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-501', pickedTeam: 'Kansas City Chiefs',  result: 'Win' },
  ]},
  { _id: 'wp-T-30304-5', ticketId: 'T-30304', weekCardId: 'wc-2025-5', weekNum: 5, submittedAt: new Date(`${y}-10-04`), picks: [
    { gameId: 'g-503', pickedTeam: 'Buffalo Bills',       result: 'Win' },
  ]},

  // ── SURV-2025 Week 6 ───────────────────────────────────────────────────────
  // T-30040 fixed: Cowboys not Chiefs (no team reuse)
  { _id: 'wp-T-30040-6', ticketId: 'T-30040', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-603', pickedTeam: 'Dallas Cowboys',      result: 'Win' },
  ]},
  { _id: 'wp-T-30300-6', ticketId: 'T-30300', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-601', pickedTeam: 'Kansas City Chiefs',  result: 'Win' },  // not Lions (used wk5)
  ]},
  { _id: 'wp-T-30301-6', ticketId: 'T-30301', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-602', pickedTeam: 'Los Angeles Rams',    result: 'Loss' }, // Loss → eliminated
  ]},
  { _id: 'wp-T-30302-6', ticketId: 'T-30302', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-602', pickedTeam: 'San Francisco 49ers', result: 'Win' },  // not Rams (used wk5)
  ]},
  { _id: 'wp-T-30304-6', ticketId: 'T-30304', weekCardId: 'wc-2025-6', weekNum: 6, submittedAt: new Date(`${y}-10-11`), picks: [
    { gameId: 'g-605', pickedTeam: 'Atlanta Falcons',     result: 'Win' },  // not Bills (used wk5)
  ]},
  // T-30041, T-30042, T-30303 missed wk6 — no pick records (eliminated)
]);

// ── Audit Log ─────────────────────────────────────────────────────────────────
await seedIfEmpty(AuditLog, 'AuditLog', [
  { _id: 'al-01', type: 'contest_status',      entity: 'SC-2025',   description: 'SuperContest 2025 status changed: Draft → Registration Open',     performedBy: 'admin', timestamp: new Date(`${y}-08-01`) },
  { _id: 'al-02', type: 'contest_status',      entity: 'SC-2025',   description: 'SuperContest 2025 status changed: Registration Open → Active',    performedBy: 'admin', timestamp: new Date(`${y}-09-07`) },
  { _id: 'al-03', type: 'contest_status',      entity: 'WTA-2025',  description: 'Winner Take All 2025 status changed: Draft → Registration Open',  performedBy: 'admin', timestamp: new Date(`${y}-08-01`) },
  { _id: 'al-04', type: 'contest_status',      entity: 'WTA-2025',  description: 'Winner Take All 2025 status changed: Registration Open → Active', performedBy: 'admin', timestamp: new Date(`${y}-09-07`) },
  { _id: 'al-05', type: 'contest_status',      entity: 'SURV-2025', description: 'Survivor 2025 status changed: Draft → Registration Open',         performedBy: 'admin', timestamp: new Date(`${y}-08-01`) },
  { _id: 'al-06', type: 'contest_status',      entity: 'SURV-2025', description: 'Survivor 2025 status changed: Registration Open → Active',        performedBy: 'admin', timestamp: new Date(`${y}-09-07`) },
  { _id: 'al-07', type: 'week_status',         entity: 'wc-2025-5', description: 'Week 5 card published',                                            performedBy: 'admin', timestamp: new Date(`${y}-10-02`) },
  { _id: 'al-08', type: 'week_status',         entity: 'wc-2025-5', description: 'Week 5 card locked',                                               performedBy: 'admin', timestamp: new Date(`${y}-10-05`) },
  { _id: 'al-09', type: 'picks_graded',        entity: 'wc-2025-5', description: 'Week 5 picks graded: 6 games scored, 78W / 22L / 0P',              performedBy: 'admin', timestamp: new Date(`${y}-10-08`) },
  { _id: 'al-10', type: 'survivor_eliminated', entity: 'T-30041',   description: 'Survivor eliminated (no picks): Maria Garcia — Week 6',           performedBy: 'admin', timestamp: new Date(`${y}-10-15`) },
  { _id: 'al-11', type: 'survivor_eliminated', entity: 'T-30042',   description: 'Survivor eliminated (no picks): James Wilson — Week 6',           performedBy: 'admin', timestamp: new Date(`${y}-10-15`) },
  { _id: 'al-12', type: 'survivor_eliminated', entity: 'T-30303',   description: 'Survivor eliminated (no picks): Michael Taylor — Week 6',         performedBy: 'admin', timestamp: new Date(`${y}-10-15`) },
  { _id: 'al-13', type: 'survivor_eliminated', entity: 'T-30301',   description: 'Survivor eliminated: Robert Davis — Week 6',                      performedBy: 'admin', timestamp: new Date(`${y}-10-15`) },
  { _id: 'al-14', type: 'week_status',         entity: 'wc-2025-6', description: 'Week 6 card published',                                            performedBy: 'admin', timestamp: new Date(`${y}-10-09`) },
  { _id: 'al-15', type: 'week_status',         entity: 'wc-2025-6', description: 'Week 6 card locked',                                               performedBy: 'admin', timestamp: new Date(`${y}-10-12`) },
  { _id: 'al-16', type: 'picks_graded',        entity: 'wc-2025-6', description: 'Week 6 picks graded: 5 games scored, 65W / 18L / 17P',             performedBy: 'admin', timestamp: new Date(`${y}-10-15`) },
  { _id: 'al-17', type: 'week_status',         entity: 'wc-2025-7', description: 'Week 7 card published',                                            performedBy: 'admin', timestamp: new Date(`${y}-10-16`) },
  { _id: 'al-18', type: 'entry_sold',          entity: 'T-29841',   description: 'Entry sold: John Smith — SuperContest 2025, Smith Alpha (Cash)',   performedBy: 'admin', timestamp: new Date(`${y}-09-01`) },
  { _id: 'al-19', type: 'entry_status',        entity: 'T-29845',   description: 'Entry T-29845 status changed: Active → Suspended (Patricia Brown)',performedBy: 'admin', timestamp: new Date(`${y}-10-10`) },
  { _id: 'al-20', type: 'entry_status',        entity: 'T-30109',   description: 'Entry T-30109 status changed: Active → Suspended (Charles Brown)', performedBy: 'admin', timestamp: new Date(`${y}-10-10`) },
  { _id: 'al-21', type: 'entry_sold',          entity: 'T-30102',   description: 'Entry voided/refunded: John Smith — Smith Delta',                  performedBy: 'admin', timestamp: new Date(`${y}-09-15`) },
  { _id: 'al-22', type: 'proxy_registered',    entity: 'PX-0041',   description: 'Proxy registered: Dave Martinez (dave@example.com)',               performedBy: 'admin', timestamp: new Date(`${y}-01-10`) },
]);

// ── Proxy Audit Log ───────────────────────────────────────────────────────────
await seedIfEmpty(ProxyAuditLog, 'ProxyAuditLog', [
  { _id: 'pa-01', type: 'assigned', proxyId: 'PX-0041', ticketId: 'T-29841', previousProxyId: null, changedAt: new Date(`${y}-09-02`), changedBy: 'admin', note: 'Proxy assigned at registration' },
  { _id: 'pa-02', type: 'assigned', proxyId: 'PX-0041', ticketId: 'T-29843', previousProxyId: null, changedAt: new Date(`${y}-09-02`), changedBy: 'admin', note: '' },
  { _id: 'pa-03', type: 'assigned', proxyId: 'PX-0089', ticketId: 'T-29850', previousProxyId: null, changedAt: new Date(`${y}-09-02`), changedBy: 'admin', note: '' },
  { _id: 'pa-04', type: 'assigned', proxyId: 'PX-0102', ticketId: 'T-30001', previousProxyId: null, changedAt: new Date(`${y}-09-02`), changedBy: 'admin', note: '' },
]);

console.log('\nSeed complete.');
process.exit(0);
