# ProfessionalFXScalper — Research & Strategy Rationale

This document explains *why* the bot trades the way it does. It is written
by the same process that built the EA: acting as trader, quant researcher,
risk manager, and MQL4 engineer at once, and being explicit about what is
evidence-based versus a design judgement call.

## 1. What this research is (and isn't)

No paid data vendor, proprietary backtest database, or academic paper
access was available while building this. The reasoning below draws on:

- Official MQL4 documentation (docs.mql4.com) for everything that touches
  execution, verified directly while writing the code.
- Well-established, non-controversial facts about FX market microstructure
  that are common ground across the retail and institutional trading
  literature (session liquidity patterns, the existence and behaviour of
  spread widening at rollover, the mechanics of stop-hunts around obvious
  liquidity pools, etc.).
- First-principles quantitative reasoning about signal independence,
  overfitting, and cost-adjusted expectancy.

It does **not** cite specific backtest statistics as if they were run,
because they were not (no historical tick data or MT4 terminal was
available in the authoring environment — see
`ProfessionalFXScalper_TESTING.md` for exactly what is still required
before this EA should risk real money). Every quantitative claim below is
qualified as "expected" or "typical," not "proven for this configuration."

## 2. Strategy families considered

| # | Family | Core idea | Fit for EURUSD M5 scalping |
|---|--------|-----------|------------------------------|
| 1 | **Trend & pullback continuation** | Trade in the direction of a higher-timeframe trend, entering on a shallow retracement with a rejection candle | High. Retail-accessible edge with a well-understood failure mode (chasing exhausted trends), which is filterable with regime + momentum checks. Works with tight, structure-based stops that suit M5 scalping. |
| 2 | **London-session breakout with false-breakout protection** | Trade the break of the Asian-session range at London open | Medium. Real edge exists around London open, but M5 breakout signals are extremely spread- and slippage-sensitive, and false breakouts are common in the first 15-30 minutes — the exact window with the widest spreads. Needs heavy filtering to be net-positive after costs. |
| 3 | **Short-term mean reversion** | Fade short-term extremes back toward a mean (e.g. Bollinger extremes, RSI extremes) | Low-Medium for M5 EURUSD specifically. Mean reversion works best in range-bound regimes and on instruments/timeframes with more noise-to-signal; on M5 EURUSD it is easy to be run over by a genuine trend day, and the R:R tends to be poor without wide stops. |
| 4 | **Liquidity-sweep reversal** | Enter against a stop-hunt spike through an obvious swing level, on the reclaim | Medium. Real, well-documented behaviour (stops cluster beyond swing highs/lows and get run before reversal), but reliably detecting genuine sweeps vs. genuine breakouts programmatically, in real time, on M5 noise is hard, and it needs its own tight risk control to avoid catching further breakouts. |
| 5 | **Momentum continuation during high-liquidity sessions** | Trade strong directional momentum bursts during London/NY overlap | Medium. Session timing is right, but momentum-only entries with no structure reference tend to have poor stop placement and lower quality-per-signal than pullback entries. |

## 3. Selected approach: Trend-Pullback Continuation, structurally filtered

**Primary strategy: Family 1 (trend & pullback continuation)**, run only
during London/NY liquidity windows, with:

- **Family 4's core insight used defensively, not as its own entry
  engine**: before taking a pullback-continuation trade, the EA checks
  that the entry isn't chasing a fresh stop-hunt spike against the trade
  direction (`IsRecentCounterSweep()`). This captures the most actionable
  part of liquidity-sweep theory — "don't buy right after someone just got
  swept the other way" — without taking on the much harder problem of
  timing sweep reversals as a standalone signal.
- **Family 2's session logic** (London open, NY open, overlap) supplies
  the time-of-day filter, because that is genuinely session-independent
  information: it tells you when liquidity is deep and spreads are tight,
  which pullback continuation also benefits from.
- Families 3 and 5 were **not selected** as the core engine:
  - Mean reversion (3) is directly contradictory to trend continuation —
    running both at once on the same instrument/timeframe would have the
    bot fighting itself, and mean reversion's edge on trending majors like
    EURUSD on M5 is the weakest of the five without a much longer research
    and calibration cycle than is honest to claim here.
  - Momentum continuation (5) is largely a weaker version of Family 1
    without the structural stop reference; keeping the structure-based
    stop from pullback-continuation gives a materially better R:R for the
    same directional idea.

### Why this fits EURUSD M5 specifically

- EURUSD has the deepest liquidity and tightest typical spread of any FX
  pair, which matters disproportionately at M5 hold times where costs are
  a larger fraction of the average trade's range than on H1+ timeframes.
- The pair's intraday moves are heavily session-driven (thin Asian range,
  expansion at London, a second expansion/overlap at NY), which is exactly
  the structure a session-filtered trend-pullback system is built to
  exploit and exactly where a regime filter earns its keep (it stands
  aside during the Asian chop this strategy is not designed for).
- A single, clearly-specified entry model (one pullback-continuation
  engine, not five blended systems) keeps the parameter count and
  degrees of freedom low relative to a five-day, single-pair scalping
  system — directly reducing overfitting risk versus combining every
  family's indicators into one score.

## 4. Why these specific indicators, and not more

The brief warns against stacking indicators that measure the same thing.
The chosen set was picked for **independence**, each answering a different
question:

| Factor | Measures | Why not redundant with the others |
|---|---|---|
| H1 EMA(50/200) separation in ATR units | Direction *and* strength of the higher-timeframe trend | Distinct from ADX: two markets can have the same ADX with very different EMA separation |
| H1 ADX(14) | Trend strength / regime | Distinct from EMA separation: ADX reacts to the *rate* of directional movement, not price distance |
| M5 rejection-candle quality (body %, close position in range) | Entry-timeframe price action conviction | Not derivable from any indicator above — pure price action |
| M5 RSI(14) | Momentum, and whether the entry-timeframe move is exhausted | Distinct from ADX (H1, trend strength) and from the candle-quality score (single-candle vs. multi-bar oscillator) |
| ATR ratio vs its own 50-bar average | Volatility regime (too quiet / normal / spiking) | Distinct from ADX: a market can trend calmly (low ATR ratio, high ADX) or trend violently (both high) — this catches the "unstable" case ADX alone misses |
| Session quality score | Liquidity/time-of-day | Purely a calendar fact, independent of any price-derived indicator |
| Spread-to-ATR cost ratio | Expected transaction cost relative to the move being traded | The only factor that is broker/liquidity-condition specific rather than derived from price history |

This is 7 independent factors, not 15+ correlated ones. Adding, say, MACD
alongside RSI would have inflated the score's apparent conviction without
adding real information, since both largely measure the same underlying
momentum.

## 5. Confidence score design (0–100)

Weights: HTF trend clarity 20, regime/ADX strength 15, entry setup
quality 20, momentum 15, volatility adequacy 10, session quality 10, cost
efficiency 10 (sums to 100). Setup quality and HTF clarity are weighted
highest deliberately — they are the two factors most directly tied to
"is there actually a trade here," whereas session and cost act more as
modifiers.

`MinConfidenceScore` (default 70) is a **configurable input specifically
so the threshold's effect can be tested empirically** rather than assumed
useful the higher it is — see `ProfessionalFXScalper_TESTING.md` for the
required threshold sensitivity test. A threshold that is too high can
simply reduce sample size until statistics become unreliable, without
improving real edge; that must be checked with data, not assumed.

## 6. Session research and suggested trading windows

FX turnover is heavily concentrated in the London and New York trading
day, with the London/New York overlap the single deepest-liquidity window
globally (this is a long-standing, uncontroversial feature of FX market
structure, consistent with BIS Triennial Central Bank Survey data on
where reported FX turnover originates). Asian-session EURUSD trading is
comparatively thin and range-bound, which is a poor fit for a trend-
continuation engine.

Default configured windows (all inputs, fully adjustable):

| Window | UTC | Typical broker time (UTC+2/+3) | Johannesburg (UTC+2, no DST) | Character |
|---|---|---|---|---|
| Window 1 — London | 07:00–10:00 | 09:00–12:00 / 10:00–13:00 | 09:00–12:00 | Range expansion at/after London open, generally the best trend-pullback conditions of the day |
| (avoided) London lunch lull | 10:00–12:00 | 12:00–14:00 / 13:00–15:00 | 12:00–14:00 | Historically the weakest liquidity of the European day session — deliberately left out of the default windows |
| Window 2 — NY + overlap | 12:00–15:00 | 14:00–17:00 / 15:00–18:00 | 14:00–17:00 | Deepest combined liquidity of the day (London still open, NY active) |
| (avoided) NY afternoon decay | 15:00–21:00 | 17:00–23:00 / 18:00–00:00 | 17:00–23:00 | Liquidity fades through the NY afternoon; off by default |
| (off by default) Asian session | 21:00–07:00 | 23:00–09:00 / 00:00–10:00 | 23:00–09:00 | Thinnest liquidity, tightest ranges; `EnableAsianSession=false` by default |
| Rollover block | ~21:45–22:15 UTC broker-dependent | broker-local ~23:45–00:15 | ~23:45–00:15 | Swap calculation window; spreads typically widen. No new entries. |

**Important caveat:** `BrokerToUTCOffsetHours` is a manual input, not
auto-detected — MQL4 has no reliable built-in way to read a broker's
timezone or DST state. You must set it for your broker and re-check it
around EU/US daylight-saving transitions (broker server offsets from UTC
typically shift by an hour during DST changes, while South Africa's
UTC+2 never changes). The dashboard always shows broker time, UTC, and
Johannesburg time side by side so this can be sanity-checked at a glance.

**Time is a filter, not a signal.** All of the above windows only make a
trade *eligible* for the confidence score to be evaluated on the entry
setup — they do not by themselves generate or justify a trade, exactly as
required.

## 7. Independent Quant Researcher Thoughts

This section is deliberately candid about the strategy's own weak points
and about ideas beyond what the brief explicitly asked for.

1. **The single biggest honest risk is regime misclassification, not the
   entry logic.** ADX-based regime detection lags genuine turning points
   by design — it is a trailing measure. The EA accepts this trade-off
   (patience over false starts) but it means the strategy will
   systematically miss the first leg of new trends. That is an acceptable
   and intentional cost for a *scalper* whose job is capital preservation
   and consistency, not catching every move.

2. **Fixed R:R take-profits are a simplification I would revisit before
   scaling risk up.** The current design (`RewardRiskMultiple`,
   independent of the entry's actual distance to the next real
   opposing-structure level) is easy to reason about, test, and keep
   honest, but a more sophisticated version would cap the take-profit at
   the nearest real opposing swing level when that level implies a lower
   R:R than the fixed multiple, and extend it (via the existing ATR
   trailing stop) when price runs cleanly past it. The trailing stop
   partially compensates for this already, but a structure-aware TP is
   the most promising *near-term* upgrade for this codebase, not a
   ground-up rewrite.

3. **I would not trust the confidence-score weights as final.** They are
   a reasoned starting point, not a fitted result — no optimizer or
   historical data touched them. Section 5's weights should be treated as
   a hypothesis to be walk-forward tested, exactly as
   `ProfessionalFXScalper_TESTING.md` specifies, and adjusted only with
   out-of-sample evidence, never by fitting to one in-sample run.

4. **A genuine edge a future version should add: intraday volatility
   term-structure, not just a single ATR ratio.** Right now "unstable"
   regime detection is a single scalar (current ATR vs its 50-bar
   average). A more discriminating version would separately track
   whether volatility is expanding smoothly (tradeable trend day) or
   spiking discontinuously (news/illiquidity gap) using bar-to-bar ATR
   *acceleration*, not just its level. This is flagged as future work
   rather than implemented now, to avoid adding an untested, unweighted
   eighth "independent" factor without evidence it earns its place.

5. **Correlation risk becomes real the moment a second pair is added.**
   The architecture (symbol passed via `Symbol()`, no hardcoded
   "EURUSD") already supports running one instance per chart/pair with
   distinct magic numbers. But two EURUSD-correlated pairs (e.g. GBPUSD)
   both signaling and sizing risk independently can silently double the
   *effective* portfolio risk on a single macro move. If/when a second
   pair is added, the honest fix is a portfolio-level risk cap shared
   across instances (e.g. a shared Global Variable tracking combined open
   risk), not just per-instance limits. This is called out explicitly so
   it isn't forgotten when the bot is extended.

6. **I would treat "approaching 99% accuracy" as the wrong target for
   this strategy shape, and I want to say so plainly rather than imply
   otherwise.** A structurally honest scalper with real stop-losses,
   sensible R:R, and no martingale should be evaluated on expectancy,
   profit factor, and drawdown-adjusted return, not raw win rate. A high
   win rate is easy to manufacture dishonestly (tiny TP, huge SL); this
   EA deliberately refuses that shape (`MinRewardToRisk` floor, hard
   structure-based SL). Expect a win rate more in the 45-60% range typical
   of positive-expectancy trend-pullback systems with R:R around 1.5-2,
   not 99%, and judge it on net expectancy after costs instead.

## 8. Known limitations (see also `_TESTING.md` and the final report)

- No walk-forward, Monte Carlo, or out-of-sample backtest has actually
  been executed against this specific parameter set — there was no MT4
  terminal or historical price data available while building it. The
  strategy logic is grounded in the reasoning above, not in a verified
  historical track record.
- The news filter is fully implemented but ships **disabled by default**
  and stays disabled unless you supply your own reliable CSV calendar —
  see the README. No live news feed is faked.
- Swing-high/low detection uses a simple single-bar-each-side pivot
  definition. It is intentionally simple (and documented as such) rather
  than a more elaborate fractal model that would add parameters without
  proven benefit.
- Session windows and the broker-UTC offset are static, manually
  configured values, not derived from the broker's actual timezone
  metadata (MQL4 has no reliable API for that).
