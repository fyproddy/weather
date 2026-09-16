# ProfessionalFXScalper v2.00 — Autonomous EURUSD M5 Trading Robot

## What this is

`ProfessionalFXScalper.mq4` is a **fully autonomous MetaTrader 4 Expert
Advisor**. It is not an indicator, adviser, or alert/signal tool. Once
attached to an EURUSD M5 chart and enabled, it independently:

1. Analyses the market (regime, higher-timeframe trend, price action,
   momentum, volatility, liquidity, spread/cost).
2. Scores each candidate setup on a 0–100 confidence scale built from
   independent factors.
3. Decides to buy, sell, or stand aside.
4. Calculates position size from real account risk.
5. Opens the trade, attaches a hard stop-loss and take-profit.
6. Manages the position (break-even, ATR trailing stop).
7. Closes the trade, records the outcome and R-multiple.
8. Stops trading when any configured risk limit is hit.

No manual confirmation step exists or is needed.

**Read `ProfessionalFXScalper_RESEARCH.md` for the strategy rationale**
and `ProfessionalFXScalper_TESTING.md` before risking any real capital.

---

## 1. Files in this package

| File | Purpose |
|---|---|
| `ProfessionalFXScalper.mq4` | The EA itself — the only file you compile. |
| `ProfessionalFXScalper_README.md` | This file. |
| `ProfessionalFXScalper_RESEARCH.md` | Strategy selection reasoning, session research, confidence-score design, independent researcher notes. |
| `ProfessionalFXScalper_TESTING.md` | Required validation protocol, and an honest statement of what has/has not actually been tested. |
| `EURUSD_M5_Conservative_Demo.set` | Ready-to-load input profile for demo/forward testing. |
| `EURUSD_M5_MinimumRisk_Live.set` | Ready-to-load input profile for a first real-money deployment, at reduced risk. |
| `ProfessionalFXScalper_CHANGELOG.md` | Version history. |

---

## 2. Installation

1. Open MetaTrader 4 → **File → Open Data Folder**.
2. Copy `ProfessionalFXScalper.mq4` into `MQL4\Experts\`.
3. (Optional, for the news filter) copy your own news calendar CSV into
   `MQL4\Files\` — see §7.
4. In MetaTrader, open **MetaEditor** (F4), locate the EA under
   `Experts`, and press **Compile** (F7). Confirm **0 errors**. Warnings
   are expected on some brokers (e.g. about `MODE_MARGINREQUIRED`
   returning 0) and are handled defensively in code — read them, but they
   are not blocking. See `ProfessionalFXScalper_TESTING.md` for the exact
   compilation status from this build.
5. Restart or refresh the **Navigator** panel in MT4 so the EA appears
   under **Expert Advisors**.
6. Open an **EURUSD, M5** chart.
7. Drag the EA onto the chart.
8. In the **Common** tab of the EA properties dialog, ensure **"Allow
   live trading"** (algo trading) is checked. In **Options → Expert
   Advisors**, ensure global "Allow automated trading" is enabled.
9. In the **Inputs** tab, click **Load** and select one of the two
   `.set` files, or configure inputs manually (see §4).
10. Click OK. A smiley face in the top-right of the chart confirms the
    EA is running.

**Points vs. pips:** all point-based inputs (`MaxSpreadPoints`,
`BreakEvenLockPoints`, etc.) are in raw MT4 **points**, not pips. On a
5-digit/3-digit broker, 1 pip = 10 points. Adjust these inputs for your
broker's quoting convention if it differs from the common EURUSD 5-digit
convention the defaults assume.

---

## 3. How the bot decides to trade (summary)

Full detail in `ProfessionalFXScalper_RESEARCH.md`. In short: **trend-
pullback continuation**, confirmed by H1 direction, filtered by a
regime detector (trending / ranging / unstable — only trending regimes
are traded), an M5 rejection-candle setup at a pullback into the EMA
zone, momentum confirmation (RSI), a liquidity-sweep avoidance check,
volatility adequacy, session-quality weighting, and a spread/cost check —
combined into a 0–100 confidence score. Trades are only taken above
`MinConfidenceScore` and only inside configured session windows.

---

## 4. Key inputs you should actually look at

The EA has ~55 configurable inputs grouped into sections (General,
Account Safety, Risk Management, Strategy/Confidence, Session/Time,
Execution, Trade Management, News, Logging/Dashboard). The two provided
`.set` files are ready-made starting points; the ones most worth
understanding before you touch anything are:

- **`EnableRealAccountTrading`** — stays `false` until you deliberately
  turn it on. See §6.
- **`RiskPercentPerTrade` / `HardMaxRiskPercentPerTrade` /
  `RealAccountMaxRiskPercent`** — risk sizing. Defaults are conservative
  (0.25% default risk, 1% hard ceiling, 0.5% additional real-account
  cap). The bot always uses the *smallest* of whichever of these apply.
- **`MinConfidenceScore`** — the trade threshold. Default 70/100. Treat
  changes to this as something to A/B test (see
  `ProfessionalFXScalper_TESTING.md`), not something to just raise
  and assume it helps.
- **`BrokerToUTCOffsetHours`** — **you must set this for your broker.**
  MQL4 cannot auto-detect it. See §5's table for common values, and
  re-check it around EU/US daylight-saving changes.
- **`MaxSpreadPoints`** — check this against your broker's typical
  EURUSD M5 spread before going live; too tight and the EA will rarely
  trade, too loose and costs erode the edge.

---

## 5. Time zones and trading windows

`BrokerToUTCOffsetHours` is the number of hours to *subtract* from your
broker's server time to get UTC. Most MT4 brokers run server time at
UTC+2 or UTC+3 (UTC+3/+4 during northern-hemisphere DST) — **check your
broker's own documentation**; it is not standardised.

Johannesburg / South Africa is **UTC+2 year-round** (no daylight saving),
so it stays a fixed 2-hour offset from UTC at all times, unlike London
or New York server-time offsets which shift with DST.

Default trading windows (fully adjustable via inputs):

| Window | UTC | Johannesburg | Notes |
|---|---|---|---|
| Window 1 (London) | 07:00–10:00 | 09:00–12:00 | Enabled by default |
| Window 2 (NY + overlap) | 12:00–15:00 | 14:00–17:00 | Enabled by default |
| Asian session | 21:00–07:00 | 23:00–09:00 | **Disabled** by default (`EnableAsianSession=false`) |
| Rollover block | ~21:45–22:15 UTC (broker-dependent) | ~23:45–00:15 broker-local | No new entries; see `RolloverBlockStart/EndHourBroker` inputs (these are in **broker time**, not UTC, since rollover is tied to the broker's own day boundary) |

The on-chart dashboard always shows broker time, UTC, and Johannesburg
time simultaneously so you can sanity-check your offset input live.

---

## 6. Demo vs. real account operation

The EA detects account type via `AccountInfoInteger(ACCOUNT_TRADE_MODE)`.

- **Demo or contest accounts:** trade freely as soon as the EA is
  enabled, no extra configuration needed.
- **Real accounts:** blocked by default. To enable:
  1. Set `EnableRealAccountTrading = true`.
  2. Set `ConfirmedLiveAccountNumber` to the **exact account number**
     shown in your MT4 terminal (Account menu / top of Navigator).
  3. Both conditions must hold, on every EA restart, or the dashboard
     will show **"Trading: BLOCKED"** with the exact reason (mismatched
     account number, or the switch left off).
  4. `RealAccountMaxRiskPercent` applies an *additional* hard cap on top
     of `RiskPercentPerTrade`/`HardMaxRiskPercentPerTrade` specifically
     for real accounts — the EA always uses the smallest of the three.

This design means copying a `.set` file between a demo and a different
real account can never silently start real trading on the wrong account:
the number must match exactly.

### Risk locks (all restart-safe, stored via terminal Global Variables)

- **Daily loss lock** — stops new trades for the rest of the calendar
  day once `DailyLossLimitPercent` of the day's starting equity is lost.
  Resets automatically at the next new trading day.
- **Drawdown lock** — stops new trades entirely once
  `MaxEquityDrawdownPercent` from the account's peak equity is lost.
  **Does not auto-reset.** To clear it after a deliberate review, set
  `AcknowledgeAndResetDrawdownLock = true` once (then set it back to
  `false`).
- **Consecutive-loss lock** — stops new trades after
  `MaxConsecutiveLosses` losses in a row. Resets daily by default
  (`ResetConsecutiveLossesDaily`).
- **Max trades/day lock** — stops new trades after `MaxTradesPerDay`.
- **`EmergencyStop` input** — manual kill switch; set `true` to block
  all new trades immediately (existing positions are still managed and
  protected, never abandoned).

All locks stop **new** trades only; open positions are always still
monitored, protected, and can still hit their break-even/trailing/SL/TP
logic — the bot never abandons a live position because a lock engaged.

---

## 7. News filter (honest behaviour)

`EnableNewsFilter` defaults to `false`. If you enable it, the EA looks
for `MQL4\Files\PFXS_NewsCalendar.csv` (filename configurable) in this
format, one high/medium/low-impact event per line:

```
2026.09.19,12:30,USD,High,Non-Farm Payrolls
2026.09.19,08:00,EUR,High,German Ifo Business Climate
```

If the file is missing, empty, or fails to parse, **the filter is
disabled and this is logged clearly** — it never silently pretends to
work. You are responsible for sourcing and refreshing this file (e.g.
exported from your own calendar provider); no live news feed is queried
from inside MT4 Strategy Tester or from a live chart, because MT4
Strategy Tester has no reliable network access and faking a "live" feed
inside the EA would violate the "no hidden external service" requirement.
For genuinely live news blocking in real trading, refresh this CSV file
on a schedule (e.g. a script or VPS task that re-exports it) — the EA
re-reads it once at `OnInit`, so re-attaching the EA (or a full terminal
restart) picks up an updated file.

---

## 8. Logging

Two CSV files are written to `MQL4\Files\` (created automatically):

- **`PFXS_SignalLog_<SYMBOL>.csv`** — every signal evaluation, accepted
  or rejected, with the full confidence-score breakdown, regime,
  session, spread, ATR, and rejection reason. Duplicate consecutive
  identical rejections on the same bar are not re-written.
- **`PFXS_TradeLog_<SYMBOL>.csv`** — every trade this EA opened and
  closed, with entry/exit price, lot size, planned risk %, exit reason
  (take-profit / stop-loss / manual/weekend/critical), profit,
  commission, swap, and R-multiple. Broker-side SL/TP fills are
  detected and logged automatically, not just EA-initiated closes.

---

## 9. Dashboard

The on-chart panel (top-left) shows: bot name/version, demo/real status,
real-trading enabled flag, symbol/timeframe, broker/UTC/Johannesburg
time, current session, market regime, HTF direction, confidence score vs.
threshold, spread, ATR, risk %, trades today, daily P/L, floating P/L,
drawdown from peak, consecutive losses, open positions, and — critically
— whether trading is currently **ALLOWED** or **BLOCKED**, with the exact
reason if blocked, and a description of the next trading window.

---

## 10. Extending to other pairs

The EA already uses `Symbol()` everywhere rather than a hardcoded
`"EURUSD"`, so it can be attached to another major's chart with its own
magic number and it will trade that pair using the same logic. **This is
deliberately not recommended without re-validating the strategy's
assumptions per-pair first** (different pairs have different volatility
regimes, spread characteristics, and session behaviour), and running
multiple correlated pairs simultaneously needs a portfolio-level risk cap
this version does not implement — see §5 of
`ProfessionalFXScalper_RESEARCH.md` ("Independent Quant Researcher
Thoughts," point 5) before doing this with real money.

---

## 11. What this bot will never do

No martingale, no grid/recovery trading, no lot multiplication after a
loss, no averaging down, no removal of a stop-loss once placed, no
unlimited entries, and no automatic risk increase after a losing streak.
If the calculated position size for a trade would fall below the
broker's minimum lot, the trade is **skipped**, never rounded up to an
oversized position.

---

## 12. Broker information still needed from you

Before going live, confirm and configure:

- Your broker's current server-time offset from UTC (`BrokerToUTCOffsetHours`).
- Your broker's typical EURUSD spread at the sessions you intend to trade
  (to set a sane `MaxSpreadPoints`).
- Your broker's minimum lot size, lot step, and margin requirements (the
  EA reads these live via `MarketInfo`, but you should sanity-check them
  against your account type, e.g. cent vs. standard accounts).
- Whether your broker is ECN/no-dealing-desk (affects nothing
  functionally here, since the EA already uses the ECN-safe two-step
  execution model for every broker) but is useful to know when
  interpreting slippage in your logs.
- Your exact live account number, only when and if you decide to enable
  real trading.
