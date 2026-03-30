import mongoose from 'mongoose';

const { Schema } = mongoose;

// ── toJSON transform: expose _id as id, remove __v ────────────────────────────
const jsonOpts = {
  toJSON: {
    transform: (_, ret) => {
      ret.id = ret._id;
      delete ret._id;
      delete ret.__v;
      return ret;
    },
  },
};

// ── Counter (auto-increment IDs) ──────────────────────────────────────────────
const CounterSchema = new Schema({ _id: String, seq: { type: Number, default: 0 } });
export const Counter = mongoose.model('Counter', CounterSchema);

export async function nextSeq(name) {
  const doc = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return doc.seq;
}

export async function nextUserId()     { return `U-${String(await nextSeq('user')).padStart(3, '0')}`; }
export async function nextTicketId()   { const s = await nextSeq('ticket');  return `T-${29840 + s}`; }
export async function nextReceiptNum() { const s = await nextSeq('receipt'); return `R-${String(s).padStart(3, '0')}`; }
export async function nextGameId()     { const s = await nextSeq('game');    return `g-${String(s).padStart(3, '0')}`; }
export async function nextProxyId()    { const s = await nextSeq('proxy');   return `PX-${String(40 + s).padStart(4, '0')}`; }
export async function nextAuditId()    { const s = await nextSeq('proxyAudit'); return `pa-${s}`; }
export async function nextAuditLogId() { const s = await nextSeq('auditLog');   return `al-${s}`; }
export async function nextLeagueId()   { const s = await nextSeq('league');  return `lg-${s}`; }
export async function nextContestSeq() { return nextSeq('contest'); }

// ── User ──────────────────────────────────────────────────────────────────────
export const User = mongoose.model('User', new Schema({
  _id:       String,
  name:      { type: String, required: true },
  email:     { type: String, default: '' },
  phone:     { type: String, default: '' },
  role:      { type: String, default: 'contestant' },
  createdAt: { type: Date, default: Date.now },
}, jsonOpts));

// ── Contest ───────────────────────────────────────────────────────────────────
export const Contest = mongoose.model('Contest', new Schema({
  _id:               String,
  type:              String,
  name:              String,
  season:            String,
  status:            { type: String, default: 'Draft' },
  entryFee:          Number,
  ticketLimit:       Number,
  picksPerWeek:      Number,
  totalWeeks:        Number,
  prizeStructure:    String,
  proxyAllowed:      Boolean,
  geoRestricted:     Boolean,
  registrationOpen:  Date,
  registrationClose: Date,
  contestStart:      Date,
  contestEnd:        Date,
  notes:             { type: String, default: '' },
  payoutTiers:       [{ rank: Number, label: String, percent: Number }],
  payoutsStatus:     { type: String, default: 'Draft' },
  createdAt:         { type: Date, default: Date.now },
}, jsonOpts));

// ── Ticket ────────────────────────────────────────────────────────────────────
export const Ticket = mongoose.model('Ticket', new Schema({
  _id:           String,
  userId:        String,
  contestId:     String,
  label:         String,
  status:        { type: String, default: 'Active' },
  paymentMethod: String,
  amountPaid:    Number,
  receiptNum:    String,
  proxyId:       { type: String, default: null },
  createdAt:     { type: Date, default: Date.now },
}, jsonOpts));

// ── WeeklyCard ────────────────────────────────────────────────────────────────
const GameSchema = new Schema({
  id:         { type: String, required: true },
  awayTeam:   String,
  homeTeam:   String,
  homeSpread: { type: Number, default: 0 },
  gameDate:   Date,
  onCard:     { type: Boolean, default: true },
  status:     { type: String, default: 'Scheduled' },
  awayScore:  { type: Number, default: null },
  homeScore:  { type: Number, default: null },
}, { _id: false });

export const WeeklyCard = mongoose.model('WeeklyCard', new Schema({
  _id:          String,
  season:       String,
  weekNum:      Number,
  leagueId:     { type: String, default: null },
  contestIds:   [String],
  status:       { type: String, default: 'Draft' },
  picksDeadline: Date,
  publishedAt:  { type: Date, default: null },
  lockedAt:     { type: Date, default: null },
  games:        [GameSchema],
}, jsonOpts));

// ── WeeklyPick ────────────────────────────────────────────────────────────────
const PickSchema = new Schema({
  gameId:     String,
  pickedTeam: String,
  result:     { type: String, default: null },
}, { _id: false });

export const WeeklyPick = mongoose.model('WeeklyPick', new Schema({
  _id:         String,
  ticketId:    String,
  weekCardId:  String,
  weekNum:     Number,
  submittedAt: { type: Date, default: Date.now },
  submittedBy: { type: String, default: 'admin' },
  picks:       [PickSchema],
}, jsonOpts));

// ── League ────────────────────────────────────────────────────────────────────
export const League = mongoose.model('League', new Schema({
  _id:   String,
  name:  String,
  teams: [String],
}, jsonOpts));

// ── Proxy ─────────────────────────────────────────────────────────────────────
export const Proxy = mongoose.model('Proxy', new Schema({
  _id:          String,
  name:         String,
  email:        { type: String, default: '' },
  phone:        { type: String, default: '' },
  status:       { type: String, default: 'Active' },
  notes:        { type: String, default: '' },
  registeredAt: { type: Date, default: Date.now },
}, jsonOpts));

// ── ProxyAuditLog ─────────────────────────────────────────────────────────────
export const ProxyAuditLog = mongoose.model('ProxyAuditLog', new Schema({
  _id:             String,
  type:            String,
  proxyId:         String,
  ticketId:        { type: String, default: null },
  previousProxyId: { type: String, default: null },
  fromStatus:      { type: String, default: null },
  toStatus:        { type: String, default: null },
  changedAt:       { type: Date, default: Date.now },
  changedBy:       String,
  note:            { type: String, default: '' },
}, jsonOpts));

// ── AuditLog ──────────────────────────────────────────────────────────────────
export const AuditLog = mongoose.model('AuditLog', new Schema({
  _id:         String,
  type:        String,
  entity:      String,
  description: String,
  performedBy: String,
  timestamp:   { type: Date, default: Date.now },
}, jsonOpts));

// ── Settings (contest type defaults — single document) ────────────────────────
export const Settings = mongoose.model('Settings', new Schema({
  _id: String,
  sc:   Schema.Types.Mixed,
  wta:  Schema.Types.Mixed,
  surv: Schema.Types.Mixed,
}, jsonOpts));

// ── Helper: write audit log entry ─────────────────────────────────────────────
export async function audit(type, entity, description, performedBy = 'admin') {
  await new AuditLog({
    _id: await nextAuditLogId(),
    type, entity, description, performedBy,
    timestamp: new Date(),
  }).save();
}
