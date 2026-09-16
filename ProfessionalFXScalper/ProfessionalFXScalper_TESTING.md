# ProfessionalFXScalper — Testing Status and Required Validation Protocol

## Honest status of this build

**No MetaTrader 4 terminal, MetaEditor compiler, or historical price data
was available in the environment that authored this EA.** That means, as
of this delivery:

- The `.mq4` file has **not** been compiled by MetaEditor.
- **No backtest, walk-forward test, Monte Carlo test, or out-of-sample
  test has actually been run.**
- No win rate, profit factor, expectancy, or drawdown figure exists for
  this strategy yet. Any such numbers would be fabricated if stated here,
  which the task explicitly and correctly prohibits.

What *was* done instead, and can be relied on:

- A structured static review of the full source: brace/parenthesis
  balance verified programmatically, every MQL4 function call checked
  against the official reference at docs.mql4.com (OrderSend,
  OrderModify, OrderClose, MarketInfo modes, AccountInfoInteger/
  ACCOUNT_TRADE_MODE constants, GlobalVariable persistence semantics,
  File I/O functions, iMA/iATR/iADX/iRSI signatures), and a full manual
  read-through for logic bugs (three were found and fixed during this
  process: closed-trade detection for broker-side SL/TP fills was
  missing entirely, the dashboard confidence score was never being
  assigned, and free-text log fields could contain commas and corrupt
  CSV column alignment — all three are fixed in the current file).
- CSV column-count cross-checks between every header and its
  corresponding `FileWrite` call, done by hand.

**Do not deploy this EA to a real account, or trust it on a demo account
unattended, until you have completed at least Phase 1 and Phase 2 below
yourself in MetaEditor / Strategy Tester.**

---

## Phase 1 — Compilation (required, ~5 minutes)

1. Open the file in MetaEditor and press **Compile (F7)**.
2. Confirm **0 errors**.
3. Read every warning. Expected/benign warnings you may see on some
   broker symbol specifications:
   - A possible "implicit conversion" note around `ulong size =
     FileSize(handle);` — harmless (widening conversion).
   - Nothing else is anticipated, but if MetaEditor reports anything
     else, **fix it before proceeding** — do not silence or ignore
     warnings about type mismatches, unused return values from
     `OrderSelect`/`OrderModify`/`OrderClose`, or possible array
     out-of-bounds.
4. If compilation fails, the error/line number will point at exactly
   what needs fixing; nothing in this codebase relies on obscure or
   version-specific MQL4 behaviour, so any failure is most likely a
   MetaEditor build-version quirk (build 600+ assumed) rather than a
   deep design issue.

## Phase 2 — Strategy Tester validation (required before any live use)

Use MT4's built-in Strategy Tester, EURUSD, M5, **"Every tick"** modeling
quality (the only mode that realistically simulates spread/slippage
interaction with SL/TP for a scalping EA — "Open prices only" or "Control
points" will give meaningless results for this strategy).

1. **Data quality first.** Import real broker tick/history data if
   possible (via a history-data provider or your own broker's history
   center) rather than relying on MetaTrader's default (often low
   quality for older dates) history. Record the tick data source/quality
   used, since result validity depends on it.
2. **Multi-year run with realistic costs.** At minimum 2–3 years of
   EURUSD M5 data. Set the Tester's spread to your broker's realistic
   average (not zero), and separately test with a stressed spread
   (e.g. 2x average) to see sensitivity. Add commission via the Tester's
   account settings if your broker charges it.
3. **Split the data before looking at results:**
   - **In-sample / development window** — the period you're allowed to
     look at while iterating on inputs.
   - **Out-of-sample window** — a held-out period you do **not** touch
     until the in-sample configuration is finalized. Run it exactly once
     with the in-sample-selected inputs and report the degradation
     honestly (some performance drop from in-sample to out-of-sample is
     normal and expected; a large collapse means overfitting occurred).
4. **Walk-forward.** Roll the in-sample/out-of-sample split forward
   across the full data range (e.g. 6-month in-sample windows, 2-month
   out-of-sample windows, rolled monthly) and check that performance is
   reasonably stable window-to-window, not dependent on one lucky period.
5. **Parameter sensitivity.** Perturb each of the following by ±20-30%
   individually (not all at once) and confirm performance degrades
   gracefully rather than falling off a cliff, which would indicate a
   fragile, overfit setting: `MinConfidenceScore`, `RewardRiskMultiple`,
   `ADX_TrendingThreshold`, `ATR_UnstableExpansionRatio`,
   `SwingLookbackBars`.
6. **Confidence-threshold A/B test (explicitly required by design).**
   Run the same period at `MinConfidenceScore` = 60, 65, 70, 75, 80, 85
   and compare trade count, win rate, profit factor, expectancy, and max
   drawdown side by side. Pick the threshold with the best evidence, not
   the assumption that "higher is always better" — a too-high threshold
   can simply starve the system of trades until statistics become
   unreliable, per the research document.
7. **Regime/session/hour/weekday breakdown.** Use the Tester's report
   plus the EA's own `PFXS_SignalLog_EURUSD.csv` /
   `PFXS_TradeLog_EURUSD.csv` output (Strategy Tester writes files to
   `MQL4\Files\` and Tester Agents' equivalent folder — check "Enable"
   under Tester Journal for file output, and confirm the CSVs were
   produced) to break results down by: hour of day, weekday, session
   (Asian/London/Overlap/NY), and market regime. Confirm the
   London/overlap windows are actually where the edge concentrates
   before trusting the default window configuration; adjust
   `Window1/2StartHourUTC/EndHourUTC` from evidence if not.
8. **Monte Carlo stress test.** Take the resulting trade list (R-multiples
   from the trade log) and run a simple Monte Carlo resampling
   (shuffle trade order, or bootstrap resample with replacement,
   thousands of iterations) to estimate a realistic distribution of
   max drawdown and worst losing streak, not just the single historical
   path's numbers. This can be done in a spreadsheet or a short external
   script fed by `PFXS_TradeLog_EURUSD.csv`'s R-multiple column — it does
   not require MQL4.
9. **Different broker data, if available.** Re-run at least the
   out-of-sample window against a second broker's EURUSD price history if
   you have access to one, to sanity-check that results aren't an
   artifact of one broker's specific spread/data quirks.

## Phase 3 — Demo forward testing (required before real money)

1. Run on a demo account, VPS-hosted for uptime, for a minimum of 4–6
   weeks of live market conditions before considering real money.
2. Compare forward-test statistics against the backtest's out-of-sample
   window. Large divergence (e.g. backtest profit factor 1.6, forward
   test well below 1.0) means something in the backtest wasn't realistic
   (data quality, spread assumptions, execution assumptions) and must be
   investigated before going live, not explained away.
3. Verify the dashboard, both CSV logs, break-even, and trailing logic
   all behave as expected against real live ticks (not just Tester
   simulation) — in particular, confirm at least one live trade closes
   organically via broker-side SL/TP and is correctly picked up by
   `DetectClosedTrades()` in the trade log with the right exit reason.
4. Deliberately test the risk locks on demo: temporarily lower
   `MaxConsecutiveLosses`/`DailyLossLimitPercent` to values you expect to
   hit soon, confirm the dashboard correctly reports "BLOCKED" with the
   right reason, and confirm existing positions are still managed while
   locked.
5. Restart the terminal (or VPS) while a demo position is open and
   confirm the EA recovers tracking of it (`OnInit`'s restart-recovery
   loop) and that risk-lock state (peak equity, day counters) persisted
   correctly across the restart.

## Phase 4 — Minimum-risk live (only after Phases 1–3 pass)

Use `EURUSD_M5_MinimumRisk_Live.set` as the starting point, not the
Conservative Demo profile, and follow the README's real-account
activation steps precisely. Scale risk up gradually and only with real
forward-test evidence, never on the strength of a backtest alone.

---

## What "genuinely done" vs. "still required" looks like, summarised

| Item | Status |
|---|---|
| MQL4 syntax/logic static review | Done |
| MetaEditor compilation | **Not done — required, Phase 1** |
| Backtest (any period) | **Not done — required, Phase 2** |
| Out-of-sample test | **Not done — required, Phase 2** |
| Walk-forward test | **Not done — required, Phase 2** |
| Parameter sensitivity test | **Not done — required, Phase 2** |
| Confidence-threshold A/B test | **Not done — required, Phase 2** |
| Monte Carlo stress test | **Not done — required, Phase 2** |
| Demo forward test | **Not done — required, Phase 3** |
| Real-account trading | **Not recommended until Phases 1–3 pass** |
