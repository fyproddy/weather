# ProfessionalFXScalper — Changelog

## v2.00 — Initial autonomous release (2026-09-16)

No `ProfessionalFXScalper_v1.mq4` or its README were available/attached
in this session, so this build is written from scratch rather than
audited/upgraded from a prior version — versioning starts at 2.00 to
leave room for a documented v1 baseline if one is supplied later.

### Added
- Full autonomous trade lifecycle: multi-timeframe regime detection (H1
  ADX + ATR), HTF direction (H1 EMA 50/200), M5 trend-pullback entry
  setup with rejection-candle price action, RSI momentum confirmation,
  liquidity-sweep avoidance filter, structure-based stop-loss, fixed-R:R
  take-profit, and an independent-factor 0–100 confidence scoring
  system.
- Session/time filters: two configurable UTC trading windows (default
  London + NY/overlap), optional Asian session, per-weekday enable
  flags, Friday cutoff and forced weekend flatten, broker-time rollover
  block.
- Risk management: fixed-fractional position sizing from real SL
  distance, hard risk ceilings (per-trade, real-account-specific),
  daily loss lock, equity drawdown lock, consecutive-loss lock, max
  trades/day lock, manual emergency stop — all persisted across restarts
  via terminal Global Variables.
- Real-account safety gate: account-type detection, explicit
  `EnableRealAccountTrading` + `ConfirmedLiveAccountNumber` double-check
  before any real-money order is placed.
- ECN-safe two-step execution engine (market order, then immediate
  SL/TP attachment; automatic emergency close if protection cannot be
  attached), bounded-retry order send/modify/close wrappers with
  broker-error-code handling.
- Break-even and ATR-based trailing stop management, both configurable
  and gated by an R-multiple trigger.
- Closed-trade detection for broker-side SL/TP fills (including
  recovery of already-open positions after a terminal/VPS restart), so
  every exit is logged with its true reason and R-multiple even when
  the EA didn't initiate the close.
- Optional CSV news-calendar blackout filter that disables itself
  cleanly (and says so) when no calendar file is present, instead of
  faking a live feed.
- Full on-chart dashboard and dual CSV logging (signal-level and
  trade-level), deduplicated so identical rejections aren't rewritten
  every tick.
- Supporting documents: research/strategy rationale, testing protocol,
  README, and two ready-to-load `.set` profiles (conservative demo,
  minimum-risk live).

### Fixed during authoring (pre-first-compile static review)
- Closed positions that hit their broker-side SL/TP were not being
  detected or logged at all in an earlier draft of `OnTick()` — added
  `DetectClosedTrades()` with restart-safe ticket tracking.
- The dashboard's confidence-score line was never actually assigned
  from `EvaluateSignal()`'s result.
- Free-text log fields (rejection reasons, exit reasons) could contain
  commas and silently shift subsequent CSV columns out of alignment —
  added `CsvSafe()` sanitisation before every free-text CSV write.
- `UpdateRiskLocks()` was persisting Global Variables to disk on every
  single tick regardless of whether anything changed; throttled to only
  persist when peak equity actually changes (lock-state transitions
  already persist explicitly at the point they occur).

### Known limitations at this version
See `ProfessionalFXScalper_RESEARCH.md` §8 and
`ProfessionalFXScalper_TESTING.md` in full. In short: not yet compiled
in MetaEditor, not yet backtested, walk-forward tested, or forward
tested on demo — all required before real-money use.
