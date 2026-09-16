//+------------------------------------------------------------------+
//|                                      ProfessionalFXScalper.mq4   |
//|                        Fully Autonomous EURUSD M5 Scalping Robot |
//+------------------------------------------------------------------+
//
// PROFESSIONAL FX SCALPER - AUTONOMOUS TRADING ROBOT
// ===================================================
// This is a fully autonomous Expert Advisor (auto-trading robot), NOT an
// adviser, indicator, or signal/alert system. Once attached and enabled,
// it independently analyses the market, scores opportunities, decides
// whether to trade, sizes the position, opens the trade, protects it with
// a hard stop-loss and take-profit, manages it (break-even / trailing),
// closes it, and stops trading when risk limits are hit. No manual
// confirmation is required or supported.
//
// STRATEGY (see ProfessionalFXScalper_RESEARCH.md for full reasoning):
//   Multi-Filter Trend-Pullback Continuation on EURUSD M5, confirmed by
//   H1 structure/direction, filtered by market regime (ADX + ATR),
//   momentum (RSI), volatility, spread/cost, session liquidity quality,
//   and an independent-factor 0-100 confidence score. Liquidity-sweep
//   avoidance is used as a rejection filter (not a separate entry engine)
//   to reduce false continuation entries right after a stop-hunt spike.
//
// DESIGN PRINCIPLES:
//   - No martingale, no grid, no averaging down, no lot multiplication.
//   - Every trade has a hard broker-side stop-loss from the moment it is
//     protected (ECN-safe two-step execution: open at market, then attach
//     SL/TP immediately; if protection cannot be attached, the position is
//     closed immediately and a critical error is logged).
//   - Fixed-fractional position sizing from real SL distance and account
//     equity. Trades that would need a lot size below the broker minimum
//     are skipped rather than forced.
//   - Persistent, restart-safe risk locks (daily loss, drawdown,
//     consecutive losses) via terminal Global Variables.
//   - Only manages its own trades: filtered strictly by Symbol() AND
//     MagicNumber. Never touches manual trades or other EAs' positions.
//   - No repainting, no look-ahead: all signal analysis uses fully
//     completed candles (shift >= 1).
//
// This file is written for MetaEditor / MQL4 (build 600+, MT4 strict
// mode). No compiler was available in the authoring environment; the code
// has been carefully statically reviewed for syntax, types, and MQL4
// function signatures (verified against the official MQL4 reference at
// docs.mql4.com), but MUST be compiled once in MetaEditor before live use.
// See ProfessionalFXScalper_TESTING.md for the required validation steps.
//
#property copyright "Professional FX Scalper"
#property link      "https://www.mql4.com"
#property version   "2.00"
#property strict
#property description "Fully autonomous EURUSD M5 scalping robot. Not an adviser or signal tool."

//====================================================================
// ENUMS
//====================================================================
enum ENUM_REGIME
  {
   REGIME_TREND_UP,
   REGIME_TREND_DOWN,
   REGIME_RANGE,
   REGIME_UNSTABLE
  };

enum ENUM_LOCK_STATE
  {
   LOCK_NONE = 0,
   LOCK_DAILY_LOSS,
   LOCK_DRAWDOWN,
   LOCK_CONSECUTIVE_LOSSES,
   LOCK_MAX_TRADES,
   LOCK_EMERGENCY
  };

//====================================================================
// INPUTS
//====================================================================
input string Section_General = "==== GENERAL ====";                  // ----------------------------
input int    MagicNumber               = 20260916;                   // Unique magic number for this EA instance
input string TradeComment              = "PFXScalper";                // Order comment prefix
input bool   AllowNewTrades            = true;                        // Master switch - false = manage only, no new entries

input string Section_Account = "==== ACCOUNT SAFETY ====";           // ----------------------------
input bool   EnableRealAccountTrading  = false;                       // Must be explicitly set true to trade on a REAL account
input long   ConfirmedLiveAccountNumber= 0;                           // Real account number you have verified and approved
input double RealAccountMaxRiskPercent = 0.50;                        // Hard risk cap (% equity) applied only on REAL accounts

input string Section_Risk = "==== RISK MANAGEMENT ====";             // ----------------------------
input double RiskPercentPerTrade       = 0.25;                        // Default risk per trade (% of equity)
input double HardMaxRiskPercentPerTrade= 1.00;                        // Absolute ceiling, overrides any larger input above it
input double DailyLossLimitPercent     = 2.00;                        // Stop trading for the day after this % equity loss
input double MaxEquityDrawdownPercent  = 6.00;                        // Stop trading entirely after this % drawdown from peak equity
input int    MaxConsecutiveLosses      = 4;                           // Stop trading after this many losses in a row
input int    MaxTradesPerDay           = 3;                           // Maximum new trades opened per calendar day
input int    MaxOpenPositions          = 1;                           // Maximum simultaneous open positions for this EA
input bool   ResetConsecutiveLossesDaily = true;                      // Reset the consecutive-loss counter each new trading day
input bool   AcknowledgeAndResetDrawdownLock = false;                 // Set true once to manually clear a drawdown lock, then set back to false
input bool   EmergencyStop             = false;                       // Manual kill-switch: true blocks all new trades immediately

input string Section_Strategy = "==== STRATEGY / CONFIDENCE ====";   // ----------------------------
input int    MinConfidenceScore        = 70;                          // Minimum 0-100 confidence score required to trade
input double MinRewardToRisk           = 1.5;                         // Minimum acceptable reward:risk for a trade to be taken
input double RewardRiskMultiple        = 1.8;                         // Target reward:risk used to place take-profit
input int    HTF_EMA_Fast              = 50;                          // H1 fast EMA period (trend direction)
input int    HTF_EMA_Slow              = 200;                         // H1 slow EMA period (trend direction)
input int    Entry_EMA_Fast            = 20;                          // M5 fast EMA period (pullback zone)
input int    Entry_EMA_Slow            = 50;                          // M5 slow EMA period (pullback zone / trend filter)
input int    RSI_Period                = 14;                          // RSI period (momentum, M5)
input int    ADX_Period                = 14;                          // ADX period (trend strength, H1)
input double ADX_TrendingThreshold     = 25.0;                        // ADX above this = trending regime
input double ADX_RangingThreshold      = 18.0;                        // ADX below this = ranging regime
input int    ATR_Period                = 14;                          // ATR period (volatility, M5)
input int    ATR_MA_Period             = 50;                          // Moving average period of ATR (volatility baseline)
input double ATR_UnstableExpansionRatio= 2.2;                         // ATR/ATR-average ratio above which regime = unstable
input double ATR_MinRatio              = 0.55;                        // ATR/ATR-average ratio below which volatility is too low to trade
input int    SwingLookbackBars         = 30;                          // Bars scanned for swing high/low structure
input double ATR_SLBufferMultiple      = 0.30;                        // Extra ATR-based buffer added beyond structure for the stop-loss
input int    LiquiditySweepLookback    = 6;                           // Bars checked for a recent stop-hunt spike (rejection filter)

input string Section_Session = "==== SESSION / TIME FILTERS ====";   // ----------------------------
input int    BrokerToUTCOffsetHours    = 2;                           // Broker server time minus this = UTC. SET THIS FOR YOUR BROKER.
input bool   EnableWindow1             = true;                        // Enable trading window 1 (default: London)
input int    Window1StartHourUTC       = 7;                           // Window 1 start hour, UTC (0-23)
input int    Window1EndHourUTC         = 10;                          // Window 1 end hour, UTC (exclusive)
input bool   EnableWindow2             = true;                        // Enable trading window 2 (default: NY + overlap)
input int    Window2StartHourUTC       = 12;                          // Window 2 start hour, UTC (0-23)
input int    Window2EndHourUTC         = 15;                          // Window 2 end hour, UTC (exclusive)
input bool   EnableAsianSession        = false;                       // Allow trading during Asian session (low liquidity, off by default)
input bool   TradeMonday               = true;                        // Allow trading on Monday
input bool   TradeTuesday              = true;                        // Allow trading on Tuesday
input bool   TradeWednesday            = true;                        // Allow trading on Wednesday
input bool   TradeThursday             = true;                        // Allow trading on Thursday
input bool   TradeFriday               = true;                        // Allow trading on Friday
input int    NoNewTradesAfterFridayHourUTC = 17;                      // No new entries after this UTC hour on Friday
input bool   CloseAllPositionsFridayEnabled = true;                   // Force-close open positions before the weekend
input int    CloseAllPositionsFridayHourUTC = 20;                     // UTC hour on Friday to flatten all positions
input int    RolloverBlockStartHourBroker   = 23;                     // No new entries from this broker-time hour...
input int    RolloverBlockStartMinuteBroker = 45;                     // ...and minute...
input int    RolloverBlockEndHourBroker     = 0;                      // ...until this broker-time hour...
input int    RolloverBlockEndMinuteBroker   = 15;                     // ...and minute (swap / rollover spread-widening window)

input string Section_Execution = "==== SPREAD / EXECUTION ====";     // ----------------------------
input double MaxSpreadPoints           = 20.0;                        // Maximum allowed spread in broker points
input int    MaxSlippagePoints         = 15;                          // Maximum allowed slippage in broker points
input int    MaxOrderRetries           = 3;                           // Maximum retry attempts for a failed trade operation
input int    RetryDelayMs              = 300;                         // Delay between retry attempts (milliseconds)
input double MinFreeMarginBuffer       = 200.0;                       // Minimum required free margin (account currency) after the trade

input string Section_Management = "==== TRADE MANAGEMENT ====";      // ----------------------------
input bool   UseBreakEven              = true;                        // Move SL to break-even once triggered
input double BreakEvenTriggerR         = 1.0;                         // R-multiple of profit that triggers break-even
input double BreakEvenLockPoints       = 20.0;                        // Points locked in beyond entry when break-even triggers
input bool   UseTrailingStop           = true;                        // Trail the stop once in sufficient profit
input double TrailStartR               = 1.5;                         // R-multiple of profit that starts trailing
input double TrailATRMultiple          = 1.2;                         // ATR multiple used as the trailing distance

input string Section_News = "==== NEWS FILTER ====";                 // ----------------------------
input bool   EnableNewsFilter          = false;                       // Enable CSV-based news blackout filter (see README)
input string NewsCalendarFileName      = "PFXS_NewsCalendar.csv";     // File in MQL4\Files, format: yyyy.mm.dd,HH:MM,CUR,IMPACT,Event
input int    NewsBlackoutMinutesBefore = 30;                          // Minutes before a high-impact event to block new trades
input int    NewsBlackoutMinutesAfter  = 30;                          // Minutes after a high-impact event to block new trades

input string Section_UI = "==== LOGGING / DASHBOARD ====";           // ----------------------------
input bool   EnableDashboard           = true;                        // Show the on-chart dashboard
input bool   EnableCSVLogging          = true;                        // Enable CSV signal/trade logging
input int    DashboardFontSize         = 8;                           // Dashboard font size
input color  DashboardTextColor        = clrWhite;                    // Dashboard text colour
input color  DashboardBgColor          = clrDarkSlateGray;            // Dashboard background colour

//====================================================================
// GLOBAL STATE
//====================================================================
datetime g_lastBarTime          = 0;
bool     g_isDemo               = true;
bool     g_isReal               = false;
bool     g_tradingPermittedAcct = false;
string   g_acctBlockReason      = "";

double   g_dayStartEquity       = 0;
double   g_peakEquity           = 0;
datetime g_currentDay           = 0;
int      g_tradesToday          = 0;
int      g_consecutiveLosses    = 0;

ENUM_LOCK_STATE g_lockState     = LOCK_NONE;
string          g_lockReason    = "";

int      g_signalLogHandle      = INVALID_HANDLE;
int      g_tradeLogHandle       = INVALID_HANDLE;
string   g_lastSignalLogKey     = "";

// News calendar arrays (loaded once)
datetime g_newsTime[];
string   g_newsCurrency[];
string   g_newsImpact[];
string   g_newsEvent[];
int      g_newsCount            = 0;
bool     g_newsFileLoaded       = false;

// Cached last dashboard text (avoid redundant object churn)
double   g_lastConfidenceScore  = 0;
ENUM_REGIME g_lastRegime        = REGIME_RANGE;
int      g_lastHTFDir           = 0;

// Tracked tickets opened by THIS EA instance, used to detect broker-side
// closes (SL/TP hit) that disappear from the open-orders pool, so every
// exit still gets logged with its true reason and R-multiple. Rebuilt on
// OnInit from live open orders so a VPS/terminal restart never loses this.
int      g_trackedTickets[];
string   g_trackedReason[];

#define DASH_PREFIX "PFXS_DASH_"

//====================================================================
// SIGNAL STRUCT
//====================================================================
struct SignalInfo
  {
   bool        valid;
   int         direction;      // 1 = buy, -1 = sell
   double      entry;
   double      sl;
   double      tp;
   double      rr;
   double      score;
   double      scoreHTF;
   double      scoreRegime;
   double      scoreSetup;
   double      scoreMomentum;
   double      scoreVol;
   double      scoreSession;
   double      scoreCost;
   ENUM_REGIME regime;
   string      reason;
  };

//====================================================================
// UTILITY: KEYS FOR PERSISTENT GLOBAL VARIABLES
//====================================================================
string GVKey(string suffix)
  {
   return("PFXS_" + Symbol() + "_" + IntegerToString(MagicNumber) + "_" + suffix);
  }

//====================================================================
// ONINIT
//====================================================================
int OnInit()
  {
   if(Period() != PERIOD_M5)
      Print("WARNING: ProfessionalFXScalper is designed for the M5 chart. Current period differs; behaviour may be suboptimal.");

   if(MinConfidenceScore < 0 || MinConfidenceScore > 100)
     {
      Print("ERROR: MinConfidenceScore must be between 0 and 100.");
      return(INIT_PARAMETERS_INCORRECT);
     }
   if(RiskPercentPerTrade <= 0 || RiskPercentPerTrade > HardMaxRiskPercentPerTrade)
     {
      Print("ERROR: RiskPercentPerTrade invalid relative to HardMaxRiskPercentPerTrade.");
      return(INIT_PARAMETERS_INCORRECT);
     }

   DetectAccountType();
   LoadPersistedRiskState();
   CheckNewDayReset(true);

   if(AcknowledgeAndResetDrawdownLock)
     {
      GlobalVariableSet(GVKey("DrawdownLocked"), 0);
      GlobalVariableSave();
      Print("Drawdown lock manually acknowledged and cleared by operator.");
     }

   if(EnableNewsFilter)
      LoadNewsCalendar();

   if(EnableCSVLogging)
     {
      g_signalLogHandle = OpenLogFile("PFXS_SignalLog_" + Symbol() + ".csv",
         "BrokerTime,UTCTime,JHBTime,Type,Direction,Regime,Session,Confidence,MinConfidence,"
         "HTF_Score,Regime_Score,Setup_Score,Momentum_Score,Vol_Score,Session_Score,Cost_Score,"
         "Spread,ATR,RR,MinRR,Entry,SL,TP,LotSize,PlannedRiskPct,Reason,LockState");
      g_tradeLogHandle = OpenLogFile("PFXS_TradeLog_" + Symbol() + ".csv",
         "Ticket,BrokerTimeOpen,UTCTimeOpen,JHBTimeOpen,Direction,Entry,SL,TP,LotSize,PlannedRiskPct,"
         "BrokerTimeClose,ExitPrice,ExitReason,Profit,Commission,Swap,RMultiple,Slippage,OrderError");
     }

   if(EnableDashboard)
      BuildDashboardSkeleton();

   // Recover tracking of any positions this EA already has open (restart-safe).
   for(int i = 0; i < OrdersTotal(); i++)
     {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
        {
         if(OrderSymbol() == Symbol() && OrderMagicNumber() == MagicNumber &&
            (OrderType() == OP_BUY || OrderType() == OP_SELL))
            AddTrackedTicket(OrderTicket(), "");
        }
     }

   g_lastBarTime = iTime(Symbol(), PERIOD_M5, 0);

   Print("ProfessionalFXScalper v2.00 initialised. Magic=", MagicNumber,
         " Demo=", g_isDemo, " RealTradingEnabled=", EnableRealAccountTrading);
   return(INIT_SUCCEEDED);
  }

//====================================================================
// ONDEINIT
//====================================================================
void OnDeinit(const int reason)
  {
   if(g_signalLogHandle != INVALID_HANDLE)
      FileClose(g_signalLogHandle);
   if(g_tradeLogHandle != INVALID_HANDLE)
      FileClose(g_tradeLogHandle);

   ObjectsDeleteAll(0, DASH_PREFIX);
   Comment("");
  }

//====================================================================
// ONTICK - MAIN ORCHESTRATOR
//====================================================================
void OnTick()
  {
   DetectAccountType();
   CheckNewDayReset(false);
   UpdateRiskLocks();

   // Manage existing positions every tick (protection must never be skipped,
   // even while new-trade locks are active).
   ManageOpenPositions();
   DetectClosedTrades();
   CheckWeekendClose();

   bool isNewBar = IsNewBar();

   if(isNewBar)
     {
      SignalInfo sig = EvaluateSignal();
      g_lastConfidenceScore = sig.score;
      LogSignal(sig);

      if(sig.valid && CanOpenNewTrade())
        {
         OpenNewTrade(sig);
        }
     }

   if(EnableDashboard)
      UpdateDashboard();
  }

//====================================================================
// NEW BAR DETECTION (safe, no repaint)
//====================================================================
bool IsNewBar()
  {
   datetime t = iTime(Symbol(), PERIOD_M5, 0);
   if(t != g_lastBarTime)
     {
      g_lastBarTime = t;
      return(true);
     }
   return(false);
  }

//====================================================================
// TIME HELPERS
//====================================================================
datetime GetUTCTime()
  {
   return(TimeCurrent() - BrokerToUTCOffsetHours * 3600);
  }

datetime GetJHBTime()
  {
   // South Africa Standard Time is UTC+2 year-round (no daylight saving).
   return(GetUTCTime() + 2 * 3600);
  }

string TimeToStr2(datetime t)
  {
   return(TimeToString(t, TIME_DATE | TIME_MINUTES | TIME_SECONDS));
  }

//====================================================================
// SESSION / WINDOW FILTERS
//====================================================================
string GetSessionName(datetime utcTime)
  {
   int h = TimeHour(utcTime);
   if(h >= 0 && h < 7)   return("Asian");
   if(h >= 7 && h < 12)  return("London");
   if(h >= 12 && h < 16) return("London-NY Overlap");
   if(h >= 16 && h < 21) return("New York");
   return("Late NY / Pre-Asian");
  }

double GetSessionQualityScore(datetime utcTime)
  {
   int h = TimeHour(utcTime);
   // Highest liquidity: London-NY overlap. Then London morning / NY open.
   if(h >= 12 && h < 16) return(10.0);   // overlap
   if(h >= 7  && h < 11) return(8.0);    // London morning
   if(h >= 16 && h < 18) return(6.0);    // early NY afternoon (post overlap)
   if(h >= 11 && h < 12) return(4.0);    // pre-NY lull
   if(h >= 18 && h < 21) return(3.0);    // NY afternoon decay
   return(1.0);                         // Asian / dead hours
  }

bool IsWithinTradingWindow(datetime utcTime)
  {
   int h = TimeHour(utcTime);
   bool inWindow = false;

   if(EnableWindow1 && h >= Window1StartHourUTC && h < Window1EndHourUTC)
      inWindow = true;
   if(EnableWindow2 && h >= Window2StartHourUTC && h < Window2EndHourUTC)
      inWindow = true;
   if(EnableAsianSession && (h >= 0 && h < 7))
      inWindow = true;

   return(inWindow);
  }

bool IsWeekdayAllowed(datetime utcTime)
  {
   int dow = TimeDayOfWeek(utcTime);
   if(dow == 1) return(TradeMonday);
   if(dow == 2) return(TradeTuesday);
   if(dow == 3) return(TradeWednesday);
   if(dow == 4) return(TradeThursday);
   if(dow == 5) return(TradeFriday);
   return(false); // Saturday/Sunday - FX effectively closed anyway
  }

bool IsFridayEntryBlocked(datetime utcTime)
  {
   if(TimeDayOfWeek(utcTime) == 5 && TimeHour(utcTime) >= NoNewTradesAfterFridayHourUTC)
      return(true);
   return(false);
  }

bool IsRolloverBlock()
  {
   datetime bt = TimeCurrent();
   int h = TimeHour(bt);
   int m = TimeMinute(bt);
   int nowMinutes = h * 60 + m;
   int startMinutes = RolloverBlockStartHourBroker * 60 + RolloverBlockStartMinuteBroker;
   int endMinutes   = RolloverBlockEndHourBroker   * 60 + RolloverBlockEndMinuteBroker;

   if(startMinutes <= endMinutes)
      return(nowMinutes >= startMinutes && nowMinutes <= endMinutes);
   // window wraps midnight (e.g. 23:45 -> 00:15)
   return(nowMinutes >= startMinutes || nowMinutes <= endMinutes);
  }

void CheckWeekendClose()
  {
   if(!CloseAllPositionsFridayEnabled)
      return;
   datetime utcNow = GetUTCTime();
   if(TimeDayOfWeek(utcNow) == 5 && TimeHour(utcNow) >= CloseAllPositionsFridayHourUTC)
     {
      CloseAllEAPositions("Weekend protection - flattened before market close");
     }
  }

//====================================================================
// ACCOUNT SAFETY
//====================================================================
void DetectAccountType()
  {
   long tradeMode = AccountInfoInteger(ACCOUNT_TRADE_MODE);
   g_isDemo = (tradeMode == ACCOUNT_TRADE_MODE_DEMO);
   g_isReal = (tradeMode == ACCOUNT_TRADE_MODE_REAL);

   if(!g_isReal)
     {
      // Demo or contest account - always permitted.
      g_tradingPermittedAcct = true;
      g_acctBlockReason = "";
      return;
     }

   // Real account: require explicit opt-in AND a matching confirmed account number.
   if(!EnableRealAccountTrading)
     {
      g_tradingPermittedAcct = false;
      g_acctBlockReason = "REAL account detected but EnableRealAccountTrading=false.";
      return;
     }
   if(ConfirmedLiveAccountNumber != AccountNumber())
     {
      g_tradingPermittedAcct = false;
      g_acctBlockReason = StringConcatenate("REAL account #", AccountNumber(),
         " does not match ConfirmedLiveAccountNumber. Trading blocked for safety.");
      return;
     }

   g_tradingPermittedAcct = true;
   g_acctBlockReason = "";
  }

double GetEffectiveRiskPercent()
  {
   double risk = MathMin(RiskPercentPerTrade, HardMaxRiskPercentPerTrade);
   if(g_isReal)
      risk = MathMin(risk, RealAccountMaxRiskPercent);
   return(risk);
  }

//====================================================================
// PERSISTENT RISK STATE
//====================================================================
void LoadPersistedRiskState()
  {
   if(GlobalVariableCheck(GVKey("PeakEquity")))
      g_peakEquity = GlobalVariableGet(GVKey("PeakEquity"));
   else
      g_peakEquity = AccountEquity();

   if(GlobalVariableCheck(GVKey("DayStartEquity")))
      g_dayStartEquity = GlobalVariableGet(GVKey("DayStartEquity"));
   else
      g_dayStartEquity = AccountEquity();

   if(GlobalVariableCheck(GVKey("CurrentDay")))
      g_currentDay = (datetime)GlobalVariableGet(GVKey("CurrentDay"));
   else
      g_currentDay = 0;

   if(GlobalVariableCheck(GVKey("TradesToday")))
      g_tradesToday = (int)GlobalVariableGet(GVKey("TradesToday"));

   if(GlobalVariableCheck(GVKey("ConsecutiveLosses")))
      g_consecutiveLosses = (int)GlobalVariableGet(GVKey("ConsecutiveLosses"));
  }

void SavePersistedRiskState()
  {
   GlobalVariableSet(GVKey("PeakEquity"), g_peakEquity);
   GlobalVariableSet(GVKey("DayStartEquity"), g_dayStartEquity);
   GlobalVariableSet(GVKey("CurrentDay"), (double)g_currentDay);
   GlobalVariableSet(GVKey("TradesToday"), (double)g_tradesToday);
   GlobalVariableSet(GVKey("ConsecutiveLosses"), (double)g_consecutiveLosses);
   GlobalVariableSave();
  }

datetime DayStamp(datetime t)
  {
   return(t - (t % 86400));
  }

void CheckNewDayReset(bool isInit)
  {
   datetime today = DayStamp(TimeCurrent());
   if(today != g_currentDay)
     {
      g_currentDay      = today;
      g_dayStartEquity  = AccountEquity();
      g_tradesToday     = 0;

      if(ResetConsecutiveLossesDaily)
         g_consecutiveLosses = 0;

      if(GlobalVariableCheck(GVKey("DailyLossLocked")))
         GlobalVariableSet(GVKey("DailyLossLocked"), 0);

      SavePersistedRiskState();
      if(!isInit)
         Print("New trading day detected. Daily counters reset.");
     }
  }

void UpdateRiskLocks()
  {
   double equity = AccountEquity();
   bool peakChanged = false;
   if(equity > g_peakEquity)
     {
      g_peakEquity = equity;
      peakChanged = true;
     }

   g_lockState  = LOCK_NONE;
   g_lockReason = "";

   if(EmergencyStop)
     {
      g_lockState  = LOCK_EMERGENCY;
      g_lockReason = "Emergency stop engaged by operator (EmergencyStop=true).";
      if(peakChanged) SavePersistedRiskState();
      return;
     }

   bool drawdownLocked = GlobalVariableCheck(GVKey("DrawdownLocked")) &&
                          GlobalVariableGet(GVKey("DrawdownLocked")) > 0.5;
   double ddPct = (g_peakEquity > 0) ? (g_peakEquity - equity) / g_peakEquity * 100.0 : 0.0;
   if(drawdownLocked || ddPct >= MaxEquityDrawdownPercent)
     {
      if(!drawdownLocked)
        {
         GlobalVariableSet(GVKey("DrawdownLocked"), 1);
         GlobalVariableSave();
        }
      g_lockState  = LOCK_DRAWDOWN;
      g_lockReason = StringConcatenate("Max equity drawdown reached (", DoubleToString(ddPct, 2),
         "% >= ", DoubleToString(MaxEquityDrawdownPercent, 2), "%). Manual review required.");
      if(peakChanged) SavePersistedRiskState();
      return;
     }

   double dayLossPct = (g_dayStartEquity > 0) ? (g_dayStartEquity - equity) / g_dayStartEquity * 100.0 : 0.0;
   if(dayLossPct >= DailyLossLimitPercent)
     {
      g_lockState  = LOCK_DAILY_LOSS;
      g_lockReason = StringConcatenate("Daily loss limit reached (", DoubleToString(dayLossPct, 2),
         "% >= ", DoubleToString(DailyLossLimitPercent, 2), "%). Resumes next trading day.");
      if(peakChanged) SavePersistedRiskState();
      return;
     }

   if(g_consecutiveLosses >= MaxConsecutiveLosses)
     {
      g_lockState  = LOCK_CONSECUTIVE_LOSSES;
      g_lockReason = StringConcatenate("Max consecutive losses reached (", g_consecutiveLosses, ").");
      if(peakChanged) SavePersistedRiskState();
      return;
     }

   if(g_tradesToday >= MaxTradesPerDay)
     {
      g_lockState  = LOCK_MAX_TRADES;
      g_lockReason = StringConcatenate("Max trades per day reached (", g_tradesToday, "/", MaxTradesPerDay, ").");
      if(peakChanged) SavePersistedRiskState();
      return;
     }

   if(peakChanged) SavePersistedRiskState();
  }

bool CanOpenNewTrade()
  {
   if(!AllowNewTrades)
      return(false);
   if(!g_tradingPermittedAcct)
      return(false);
   if(g_lockState != LOCK_NONE)
      return(false);
   if(CountEAPositions() >= MaxOpenPositions)
      return(false);
   if(!IsWeekdayAllowed(GetUTCTime()))
      return(false);
   if(IsFridayEntryBlocked(GetUTCTime()))
      return(false);
   if(IsRolloverBlock())
      return(false);
   if(!SpreadOK())
      return(false);
   if(EnableNewsFilter && IsNewsBlackout(GetUTCTime()))
      return(false);
   return(true);
  }

//====================================================================
// SPREAD / MARGIN CHECKS
//====================================================================
bool SpreadOK()
  {
   double spread = MarketInfo(Symbol(), MODE_SPREAD);
   return(spread <= MaxSpreadPoints && spread > 0);
  }

bool MarginOK(double lots, int cmd, double price)
  {
   double marginRequired = 0;
   if(!OrderCalcMarginCompat(cmd, lots, price, marginRequired))
      return(false);
   double freeAfter = AccountFreeMargin() - marginRequired;
   return(freeAfter >= MinFreeMarginBuffer);
  }

bool OrderCalcMarginCompat(int cmd, double lots, double price, double &marginOut)
  {
   double marginPerLot = MarketInfo(Symbol(), MODE_MARGINREQUIRED);
   if(marginPerLot <= 0)
     {
      // Fallback estimate if broker does not report MODE_MARGINREQUIRED reliably.
      double contractSize = MarketInfo(Symbol(), MODE_LOTSIZE);
      double leverage = (double)AccountLeverage();
      if(leverage <= 0) leverage = 100;
      marginPerLot = (contractSize * price) / leverage;
     }
   marginOut = marginPerLot * lots;
   return(true);
  }

//====================================================================
// REGIME DETECTION
//====================================================================
ENUM_REGIME DetectRegime()
  {
   double adxH1 = iADX(Symbol(), PERIOD_H1, ADX_Period, PRICE_CLOSE, MODE_MAIN, 1);
   double atr   = iATR(Symbol(), PERIOD_M5, ATR_Period, 1);
   double atrSum = 0;
   int atrCount = 0;
   for(int i = 1; i <= ATR_MA_Period; i++)
     {
      atrSum += iATR(Symbol(), PERIOD_M5, ATR_Period, i);
      atrCount++;
     }
   double atrAvg = (atrCount > 0) ? atrSum / atrCount : atr;
   double atrRatio = (atrAvg > 0) ? atr / atrAvg : 1.0;

   if(atrRatio >= ATR_UnstableExpansionRatio)
      return(REGIME_UNSTABLE);

   if(adxH1 >= ADX_TrendingThreshold)
     {
      double emaFastH1 = iMA(Symbol(), PERIOD_H1, HTF_EMA_Fast, 0, MODE_EMA, PRICE_CLOSE, 1);
      double emaSlowH1 = iMA(Symbol(), PERIOD_H1, HTF_EMA_Slow, 0, MODE_EMA, PRICE_CLOSE, 1);
      return(emaFastH1 >= emaSlowH1 ? REGIME_TREND_UP : REGIME_TREND_DOWN);
     }

   if(adxH1 <= ADX_RangingThreshold)
      return(REGIME_RANGE);

   // Transitional ADX zone: treat as unstable (no genuine edge either way).
   return(REGIME_UNSTABLE);
  }

//====================================================================
// HTF DIRECTION (structure + EMA alignment)
//====================================================================
int GetHTFDirection()
  {
   double emaFastH1 = iMA(Symbol(), PERIOD_H1, HTF_EMA_Fast, 0, MODE_EMA, PRICE_CLOSE, 1);
   double emaSlowH1 = iMA(Symbol(), PERIOD_H1, HTF_EMA_Slow, 0, MODE_EMA, PRICE_CLOSE, 1);
   double emaFastPrev = iMA(Symbol(), PERIOD_H1, HTF_EMA_Fast, 0, MODE_EMA, PRICE_CLOSE, 6);

   bool bullSlope = emaFastH1 > emaFastPrev;
   bool bearSlope = emaFastH1 < emaFastPrev;

   if(emaFastH1 > emaSlowH1 && bullSlope)
      return(1);
   if(emaFastH1 < emaSlowH1 && bearSlope)
      return(-1);
   return(0);
  }

//====================================================================
// SWING STRUCTURE (for SL placement and liquidity sweep detection)
//====================================================================
bool FindRecentSwingHigh(int lookback, double &price, int &barShift)
  {
   for(int s = 2; s <= lookback; s++)
     {
      double h  = iHigh(Symbol(), PERIOD_M5, s);
      double hL = iHigh(Symbol(), PERIOD_M5, s - 1);
      double hR = iHigh(Symbol(), PERIOD_M5, s + 1);
      if(h > hL && h > hR)
        {
         price = h;
         barShift = s;
         return(true);
        }
     }
   return(false);
  }

bool FindRecentSwingLow(int lookback, double &price, int &barShift)
  {
   for(int s = 2; s <= lookback; s++)
     {
      double l  = iLow(Symbol(), PERIOD_M5, s);
      double lL = iLow(Symbol(), PERIOD_M5, s - 1);
      double lR = iLow(Symbol(), PERIOD_M5, s + 1);
      if(l < lL && l < lR)
        {
         price = l;
         barShift = s;
         return(true);
        }
     }
   return(false);
  }

// Rejects entries that would chase a very recent stop-hunt spike against the
// intended trade direction (liquidity sweep avoidance filter).
bool IsRecentCounterSweep(int direction)
  {
   double swingHigh, swingLow;
   int shiftH, shiftL;
   bool hasHigh = FindRecentSwingHigh(SwingLookbackBars, swingHigh, shiftH);
   bool hasLow  = FindRecentSwingLow(SwingLookbackBars, swingLow, shiftL);

   for(int i = 1; i <= LiquiditySweepLookback; i++)
     {
      double hi = iHigh(Symbol(), PERIOD_M5, i);
      double lo = iLow(Symbol(), PERIOD_M5, i);
      double cl = iClose(Symbol(), PERIOD_M5, i);

      if(direction == 1 && hasHigh && hi > swingHigh && cl < swingHigh)
         return(true);  // fresh upside sweep and rejection -> risky to buy breakout right now
      if(direction == -1 && hasLow && lo < swingLow && cl > swingLow)
         return(true);  // fresh downside sweep and rejection -> risky to sell breakout right now
     }
   return(false);
  }

//====================================================================
// ENTRY SETUP + CONFIDENCE SCORING
//====================================================================
SignalInfo EvaluateSignal()
  {
   SignalInfo sig;
   sig.valid = false;
   sig.direction = 0;
   sig.entry = 0; sig.sl = 0; sig.tp = 0; sig.rr = 0; sig.score = 0;
   sig.scoreHTF = 0; sig.scoreRegime = 0; sig.scoreSetup = 0; sig.scoreMomentum = 0;
   sig.scoreVol = 0; sig.scoreSession = 0; sig.scoreCost = 0;
   sig.reason = "";

   ENUM_REGIME regime = DetectRegime();
   sig.regime = regime;
   g_lastRegime = regime;

   int htfDir = GetHTFDirection();
   g_lastHTFDir = htfDir;

   if(regime == REGIME_UNSTABLE)
     {
      sig.reason = "Market regime unstable (volatility spike or transitional ADX) - no edge.";
      return(sig);
     }
   if(regime == REGIME_RANGE)
     {
      sig.reason = "Market regime ranging - trend-pullback strategy stands aside.";
      return(sig);
     }
   if(htfDir == 0)
     {
      sig.reason = "No clear H1 trend direction / EMA alignment.";
      return(sig);
     }
   if((regime == REGIME_TREND_UP && htfDir != 1) || (regime == REGIME_TREND_DOWN && htfDir != -1))
     {
      sig.reason = "H1 regime and HTF EMA direction disagree - contradictory setup.";
      return(sig);
     }

   int direction = htfDir; // 1 = look for buys, -1 = look for sells

   datetime utcNow = GetUTCTime();
   if(!IsWithinTradingWindow(utcNow))
     {
      sig.reason = "Outside configured trading session window.";
      return(sig);
     }

   // ---- Entry-timeframe pullback + rejection setup on the last CLOSED M5 bar ----
   double emaFastM5 = iMA(Symbol(), PERIOD_M5, Entry_EMA_Fast, 0, MODE_EMA, PRICE_CLOSE, 1);
   double emaSlowM5 = iMA(Symbol(), PERIOD_M5, Entry_EMA_Slow, 0, MODE_EMA, PRICE_CLOSE, 1);

   double open1  = iOpen(Symbol(), PERIOD_M5, 1);
   double close1 = iClose(Symbol(), PERIOD_M5, 1);
   double high1  = iHigh(Symbol(), PERIOD_M5, 1);
   double low1   = iLow(Symbol(), PERIOD_M5, 1);
   double range1 = high1 - low1;
   if(range1 <= 0)
     {
      sig.reason = "Degenerate candle range - skipped.";
      return(sig);
     }

   bool trendAlignM5 = (direction == 1) ? (emaFastM5 > emaSlowM5) : (emaFastM5 < emaSlowM5);
   if(!trendAlignM5)
     {
      sig.reason = "M5 entry-timeframe EMA not aligned with H1 direction.";
      return(sig);
     }

   // Pullback proximity: setup candle must trade into the fast/slow EMA zone.
   double emaZoneHi = MathMax(emaFastM5, emaSlowM5);
   double emaZoneLo = MathMin(emaFastM5, emaSlowM5);
   bool touchedZone = (low1 <= emaZoneHi && high1 >= emaZoneLo);
   if(!touchedZone)
     {
      sig.reason = "No pullback into the EMA zone on the last completed candle.";
      return(sig);
     }

   // Rejection candle quality: close in the favourable third of the range,
   // with a body that shows genuine rejection (not a doji).
   double bodyPct = MathAbs(close1 - open1) / range1;
   bool bullishRejection = (direction == 1) && (close1 > open1) &&
                            ((close1 - low1) / range1 >= 0.60) && (bodyPct >= 0.25);
   bool bearishRejection = (direction == -1) && (close1 < open1) &&
                            ((high1 - close1) / range1 >= 0.60) && (bodyPct >= 0.25);
   if(!bullishRejection && !bearishRejection)
     {
      sig.reason = "No qualifying rejection candle at the pullback zone.";
      return(sig);
     }

   if(IsRecentCounterSweep(direction))
     {
      sig.reason = "Recent liquidity sweep against trade direction - stand aside (false-breakout protection).";
      return(sig);
     }

   // ---- Momentum (RSI) ----
   double rsi      = iRSI(Symbol(), PERIOD_M5, RSI_Period, PRICE_CLOSE, 1);
   double rsiPrev   = iRSI(Symbol(), PERIOD_M5, RSI_Period, PRICE_CLOSE, 4);
   bool momentumOK;
   if(direction == 1)
      momentumOK = (rsi > 45 && rsi < 75 && rsi >= rsiPrev);
   else
      momentumOK = (rsi < 55 && rsi > 25 && rsi <= rsiPrev);
   if(!momentumOK)
     {
      sig.reason = "Momentum (RSI) does not confirm the pullback entry.";
      return(sig);
     }

   // ---- Volatility adequacy ----
   double atr = iATR(Symbol(), PERIOD_M5, ATR_Period, 1);
   double atrSum = 0;
   for(int i = 1; i <= ATR_MA_Period; i++)
      atrSum += iATR(Symbol(), PERIOD_M5, ATR_Period, i);
   double atrAvg = atrSum / ATR_MA_Period;
   double atrRatio = (atrAvg > 0) ? atr / atrAvg : 1.0;
   if(atrRatio < ATR_MinRatio)
     {
      sig.reason = "Volatility too low relative to average - spread/cost would dominate.";
      return(sig);
     }

   // ---- Structure-based stop-loss and take-profit ----
   double swingPrice; int swingShift;
   double slPrice;
   if(direction == 1)
     {
      bool found = FindRecentSwingLow(SwingLookbackBars, swingPrice, swingShift);
      double structureLow = found ? swingPrice : low1;
      slPrice = MathMin(low1, structureLow) - atr * ATR_SLBufferMultiple;
     }
   else
     {
      bool found = FindRecentSwingHigh(SwingLookbackBars, swingPrice, swingShift);
      double structureHigh = found ? swingPrice : high1;
      slPrice = MathMax(high1, structureHigh) + atr * ATR_SLBufferMultiple;
     }

   double entryPrice = (direction == 1) ? Ask : Bid;
   double slDistance = MathAbs(entryPrice - slPrice);
   if(slDistance <= 0)
     {
      sig.reason = "Invalid stop-loss distance computed.";
      return(sig);
     }

   double stopLevelPoints = MarketInfo(Symbol(), MODE_STOPLEVEL) * Point;
   if(slDistance < stopLevelPoints)
     {
      sig.reason = "Structure-based SL closer than broker minimum stop level.";
      return(sig);
     }

   double tpPrice = (direction == 1)
                     ? entryPrice + slDistance * RewardRiskMultiple
                     : entryPrice - slDistance * RewardRiskMultiple;
   double rr = RewardRiskMultiple;
   if(rr < MinRewardToRisk)
     {
      sig.reason = "Reward:risk below minimum threshold.";
      return(sig);
     }

   // ---- Confidence scoring (independent, non-redundant factors) ----
   double emaFastH1 = iMA(Symbol(), PERIOD_H1, HTF_EMA_Fast, 0, MODE_EMA, PRICE_CLOSE, 1);
   double emaSlowH1 = iMA(Symbol(), PERIOD_H1, HTF_EMA_Slow, 0, MODE_EMA, PRICE_CLOSE, 1);
   double h1AtR = iATR(Symbol(), PERIOD_H1, ATR_Period, 1);
   double sepInATR = (h1AtR > 0) ? MathAbs(emaFastH1 - emaSlowH1) / h1AtR : 0;
   double scoreHTF = MathMin(20.0, sepInATR * 8.0);

   double adxH1 = iADX(Symbol(), PERIOD_H1, ADX_Period, PRICE_CLOSE, MODE_MAIN, 1);
   double scoreRegime = MathMin(15.0, MathMax(0.0, (adxH1 - ADX_RangingThreshold) / 30.0 * 15.0));

   double closePos = (direction == 1) ? (close1 - low1) / range1 : (high1 - close1) / range1;
   double scoreSetup = MathMin(20.0, (bodyPct * 10.0) + (closePos * 10.0));

   double rsiDistFrom50 = MathAbs(rsi - 50.0);
   double scoreMomentum = MathMin(15.0, (rsiDistFrom50 / 25.0) * 15.0);

   double scoreVol = MathMin(10.0, ((atrRatio - ATR_MinRatio) / (ATR_UnstableExpansionRatio - ATR_MinRatio)) * 10.0);
   scoreVol = MathMax(0.0, scoreVol);

   double scoreSession = GetSessionQualityScore(utcNow);

   double spread = MarketInfo(Symbol(), MODE_SPREAD) * Point;
   double costRatio = (atr > 0) ? spread / atr : 1.0;
   double scoreCost = MathMax(0.0, MathMin(10.0, (1.0 - costRatio) * 10.0));

   double total = scoreHTF + scoreRegime + scoreSetup + scoreMomentum + scoreVol + scoreSession + scoreCost;

   sig.scoreHTF = scoreHTF; sig.scoreRegime = scoreRegime; sig.scoreSetup = scoreSetup;
   sig.scoreMomentum = scoreMomentum; sig.scoreVol = scoreVol; sig.scoreSession = scoreSession;
   sig.scoreCost = scoreCost; sig.score = total;
   sig.direction = direction; sig.entry = entryPrice; sig.sl = slPrice; sig.tp = tpPrice; sig.rr = rr;

   if(total < MinConfidenceScore)
     {
      sig.reason = StringConcatenate("Confidence score ", DoubleToString(total, 1),
         " below threshold ", IntegerToString(MinConfidenceScore), ".");
      return(sig);
     }

   sig.valid = true;
   sig.reason = "Valid signal - all filters passed.";
   return(sig);
  }

//====================================================================
// NEWS FILTER
//====================================================================
void LoadNewsCalendar()
  {
   g_newsCount = 0;
   g_newsFileLoaded = false;

   if(!FileIsExist(NewsCalendarFileName))
     {
      Print("News filter enabled but calendar file '", NewsCalendarFileName,
            "' was not found in MQL4\\Files. News filter DISABLED.");
      return;
     }

   int handle = FileOpen(NewsCalendarFileName, FILE_READ | FILE_CSV | FILE_ANSI, ',');
   if(handle == INVALID_HANDLE)
     {
      Print("Failed to open news calendar file. News filter DISABLED.");
      return;
     }

   ArrayResize(g_newsTime, 500);
   ArrayResize(g_newsCurrency, 500);
   ArrayResize(g_newsImpact, 500);
   ArrayResize(g_newsEvent, 500);

   while(!FileIsEnding(handle) && g_newsCount < 500)
     {
      string dateStr = FileReadString(handle);
      string timeStr = FileReadString(handle);
      string curr    = FileReadString(handle);
      string impact  = FileReadString(handle);
      string evt     = FileReadString(handle);
      if(dateStr == "")
         break;

      datetime dt = StringToTime(dateStr + " " + timeStr);
      if(dt <= 0)
         continue;

      g_newsTime[g_newsCount]     = dt;
      g_newsCurrency[g_newsCount] = curr;
      g_newsImpact[g_newsCount]   = impact;
      g_newsEvent[g_newsCount]    = evt;
      g_newsCount++;
     }
   FileClose(handle);
   g_newsFileLoaded = (g_newsCount > 0);
   Print("News calendar loaded: ", g_newsCount, " events.");
  }

bool IsNewsBlackout(datetime utcTime)
  {
   if(!g_newsFileLoaded)
      return(false); // filter explicitly disabled when no reliable data - never fake it

   for(int i = 0; i < g_newsCount; i++)
     {
      if(g_newsCurrency[i] != "USD" && g_newsCurrency[i] != "EUR" && g_newsCurrency[i] != "ALL")
         continue;
      if(StringFind(g_newsImpact[i], "High") < 0 && StringFind(g_newsImpact[i], "HIGH") < 0)
         continue;

      long diffSec = (long)utcTime - (long)g_newsTime[i];
      long beforeSec = (long)NewsBlackoutMinutesBefore * 60;
      long afterSec  = (long)NewsBlackoutMinutesAfter * 60;
      if(diffSec >= -beforeSec && diffSec <= afterSec)
         return(true);
     }
   return(false);
  }

//====================================================================
// LOT SIZE CALCULATION
//====================================================================
double CalcLotSize(double entryPrice, double slPrice, double riskPercent, bool &belowMin)
  {
   belowMin = false;
   double slDistance = MathAbs(entryPrice - slPrice);
   double tickSize  = MarketInfo(Symbol(), MODE_TICKSIZE);
   double tickValue = MarketInfo(Symbol(), MODE_TICKVALUE);
   if(tickSize <= 0 || tickValue <= 0 || slDistance <= 0)
      return(0);

   double valuePerLot = (slDistance / tickSize) * tickValue;
   if(valuePerLot <= 0)
      return(0);

   double riskAmount = AccountEquity() * riskPercent / 100.0;
   double lots = riskAmount / valuePerLot;

   double lotStep = MarketInfo(Symbol(), MODE_LOTSTEP);
   double minLot  = MarketInfo(Symbol(), MODE_MINLOT);
   double maxLot  = MarketInfo(Symbol(), MODE_MAXLOT);

   lots = MathFloor(lots / lotStep) * lotStep;

   if(lots < minLot)
     {
      belowMin = true;
      return(0);
     }
   if(lots > maxLot)
      lots = maxLot;

   return(NormalizeDouble(lots, 2));
  }

//====================================================================
// CLOSED-TRADE DETECTION (catches broker-side SL/TP fills)
//====================================================================
void AddTrackedTicket(int ticket, string reasonOverride)
  {
   int n = ArraySize(g_trackedTickets);
   for(int i = 0; i < n; i++)
      if(g_trackedTickets[i] == ticket)
         return; // already tracked

   ArrayResize(g_trackedTickets, n + 1);
   ArrayResize(g_trackedReason, n + 1);
   g_trackedTickets[n] = ticket;
   g_trackedReason[n]  = reasonOverride;
  }

void SetReasonForTicket(int ticket, string reason)
  {
   int n = ArraySize(g_trackedTickets);
   for(int i = 0; i < n; i++)
      if(g_trackedTickets[i] == ticket)
        {
         g_trackedReason[i] = reason;
         return;
        }
   AddTrackedTicket(ticket, reason);
  }

void RemoveTrackedIndex(int index)
  {
   int n = ArraySize(g_trackedTickets);
   for(int i = index; i < n - 1; i++)
     {
      g_trackedTickets[i] = g_trackedTickets[i + 1];
      g_trackedReason[i]  = g_trackedReason[i + 1];
     }
   ArrayResize(g_trackedTickets, n - 1);
   ArrayResize(g_trackedReason, n - 1);
  }

string DetermineExitReason(int ticket)
  {
   double closePrice = OrderClosePrice();
   double sl = OrderStopLoss();
   double tp = OrderTakeProfit();
   double tolerance = MarketInfo(Symbol(), MODE_POINT) * 5;

   if(tp != 0 && MathAbs(closePrice - tp) <= tolerance)
      return("Take-profit hit");
   if(sl != 0 && MathAbs(closePrice - sl) <= tolerance)
      return("Stop-loss hit (incl. break-even/trailing)");
   return("Closed by broker/other (manual close, margin call, or platform action)");
  }

void DetectClosedTrades()
  {
   for(int i = ArraySize(g_trackedTickets) - 1; i >= 0; i--)
     {
      int ticket = g_trackedTickets[i];
      if(!OrderSelect(ticket, SELECT_BY_TICKET))
        {
         RemoveTrackedIndex(i);
         continue;
        }
      if(OrderCloseTime() == 0)
         continue; // still open

      string reason = (g_trackedReason[i] != "") ? g_trackedReason[i] : DetermineExitReason(ticket);

      SignalInfo s;
      s.direction = (OrderType() == OP_BUY) ? 1 : -1;
      s.entry = OrderOpenPrice();
      s.sl    = OrderStopLoss();
      s.tp    = OrderTakeProfit();

      double netResult = OrderProfit() + OrderSwap() + OrderCommission();
      WriteTradeLogRow(ticket, s, OrderLots(), 0, OrderClosePrice(), reason, OrderProfit(), OrderCommission());

      if(netResult < 0)
         g_consecutiveLosses++;
      else if(netResult > 0)
         g_consecutiveLosses = 0;
      SavePersistedRiskState();

      RemoveTrackedIndex(i);
     }
  }

//====================================================================
// TRADE EXECUTION (ECN-safe two-step: market order, then attach SL/TP)
//====================================================================
void OpenNewTrade(SignalInfo &sig)
  {
   double riskPercent = GetEffectiveRiskPercent();
   bool belowMin = false;
   double lots = CalcLotSize(sig.entry, sig.sl, riskPercent, belowMin);

   if(belowMin || lots <= 0)
     {
      LogRejection(sig, "Calculated lot size below broker minimum - trade skipped rather than over-risking.");
      return;
     }

   int cmd = (sig.direction == 1) ? OP_BUY : OP_SELL;
   double refPrice = (sig.direction == 1) ? Ask : Bid;

   if(!MarginOK(lots, cmd, refPrice))
     {
      LogRejection(sig, "Insufficient free margin after buffer - trade skipped.");
      return;
     }

   int ticket = -1;
   if(!RobustOrderSend(cmd, lots, sig.direction, ticket))
     {
      LogRejection(sig, "OrderSend failed after retries - see terminal log for error codes.");
      return;
     }

   // Track this ticket immediately so a broker-side close is never missed,
   // even if the protection step below fails.
   AddTrackedTicket(ticket, "");

   // Immediately attach protection (ECN-safe two-step execution).
   if(!OrderSelect(ticket, SELECT_BY_TICKET))
     {
      Print("CRITICAL: could not select just-opened ticket ", ticket, " to attach protection.");
      return;
     }

   double openPrice = OrderOpenPrice();
   double newSL = sig.sl;
   double newTP = sig.tp;

   if(!RobustOrderModify(ticket, openPrice, newSL, newTP))
     {
      Print("CRITICAL: failed to attach SL/TP to ticket ", ticket, " - closing position immediately for safety.");
      SetReasonForTicket(ticket, "CRITICAL: protection (SL/TP) could not be attached - emergency close");
      double closePrice = (sig.direction == 1) ? Bid : Ask;
      RobustOrderClose(ticket, lots, closePrice);
      DetectClosedTrades();
      return;
     }

   g_tradesToday++;
   SavePersistedRiskState();

   Print("Trade opened. Ticket=", ticket, " Dir=", sig.direction, " Lots=", lots,
         " Entry=", openPrice, " SL=", newSL, " TP=", newTP, " Confidence=", sig.score);
  }

bool RobustOrderSend(int cmd, double lots, int direction, int &ticketOut)
  {
   for(int attempt = 1; attempt <= MaxOrderRetries; attempt++)
     {
      RefreshRates();
      double price = (direction == 1) ? Ask : Bid;
      // Open at market WITHOUT SL/TP first (ECN-compatible); protection is
      // attached immediately afterwards via RobustOrderModify.
      int ticket = OrderSend(Symbol(), cmd, lots, price, MaxSlippagePoints, 0, 0,
                              TradeComment, MagicNumber, 0, (direction == 1) ? clrBlue : clrRed);
      if(ticket > 0)
        {
         ticketOut = ticket;
         return(true);
        }

      int err = GetLastError();
      Print("OrderSend attempt ", attempt, " failed. Error ", err, " - ", ErrorDescription(err));

      if(err == 146) // ERR_TRADE_CONTEXT_BUSY
        {
         Sleep(RetryDelayMs);
         continue;
        }
      if(err == 138 || err == 136 || err == 135 || err == 129) // requote / off-quotes / price changed / invalid price
        {
         Sleep(RetryDelayMs);
         continue;
        }
      if(err == 134) // not enough money
        {
         Print("Not enough money for this trade - aborting, no further retries.");
         return(false);
        }
      // Unknown/non-retryable error - bounded retries only, never loop forever.
      Sleep(RetryDelayMs);
     }
   return(false);
  }

bool RobustOrderModify(int ticket, double price, double sl, double tp)
  {
   for(int attempt = 1; attempt <= MaxOrderRetries; attempt++)
     {
      RefreshRates();
      if(!OrderSelect(ticket, SELECT_BY_TICKET))
         return(false);
      if(OrderModify(ticket, OrderOpenPrice(), sl, tp, 0, clrYellow))
         return(true);

      int err = GetLastError();
      Print("OrderModify attempt ", attempt, " failed for ticket ", ticket, ". Error ", err,
            " - ", ErrorDescription(err));
      if(err == 1) // ERR_NO_RESULT (already at that level)
         return(true);
      Sleep(RetryDelayMs);
     }
   return(false);
  }

bool RobustOrderClose(int ticket, double lots, double price)
  {
   for(int attempt = 1; attempt <= MaxOrderRetries; attempt++)
     {
      RefreshRates();
      if(!OrderSelect(ticket, SELECT_BY_TICKET))
         return(false);
      double closePrice = (OrderType() == OP_BUY) ? Bid : Ask;
      if(OrderClose(ticket, lots, closePrice, MaxSlippagePoints, clrOrange))
         return(true);

      int err = GetLastError();
      Print("OrderClose attempt ", attempt, " failed for ticket ", ticket, ". Error ", err,
            " - ", ErrorDescription(err));
      Sleep(RetryDelayMs);
     }
   return(false);
  }

void CloseAllEAPositions(string reasonText)
  {
   for(int i = OrdersTotal() - 1; i >= 0; i--)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
         continue;
      if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber)
         continue;
      if(OrderType() != OP_BUY && OrderType() != OP_SELL)
         continue;

      int ticket = OrderTicket();
      double lots = OrderLots();
      double closePrice = (OrderType() == OP_BUY) ? Bid : Ask;

      SetReasonForTicket(ticket, reasonText);
      RobustOrderClose(ticket, lots, closePrice);
     }
   DetectClosedTrades();
  }

//====================================================================
// POSITION MANAGEMENT (break-even, trailing, invalidation)
//====================================================================
int CountEAPositions()
  {
   int count = 0;
   for(int i = 0; i < OrdersTotal(); i++)
     {
      if(OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
        {
         if(OrderSymbol() == Symbol() && OrderMagicNumber() == MagicNumber &&
            (OrderType() == OP_BUY || OrderType() == OP_SELL))
            count++;
        }
     }
   return(count);
  }

void ManageOpenPositions()
  {
   for(int i = OrdersTotal() - 1; i >= 0; i--)
     {
      if(!OrderSelect(i, SELECT_BY_POS, MODE_TRADES))
         continue;
      if(OrderSymbol() != Symbol() || OrderMagicNumber() != MagicNumber)
         continue;
      if(OrderType() != OP_BUY && OrderType() != OP_SELL)
         continue;

      int ticket = OrderTicket();
      bool isBuy = (OrderType() == OP_BUY);
      double entry = OrderOpenPrice();
      double sl = OrderStopLoss();
      double tp = OrderTakeProfit();
      if(sl == 0)
        {
         Print("WARNING: ticket ", ticket, " has no stop-loss. This should never happen - attempting emergency close.");
         double emergencyPrice = isBuy ? Bid : Ask;
         RobustOrderClose(ticket, OrderLots(), emergencyPrice);
         continue;
        }

      double initialRiskDistance = MathAbs(entry - sl);
      if(initialRiskDistance <= 0)
         continue;

      double currentPrice = isBuy ? Bid : Ask;
      double profitDistance = isBuy ? (currentPrice - entry) : (entry - currentPrice);
      double rMultiple = profitDistance / initialRiskDistance;

      // --- Break-even ---
      if(UseBreakEven && rMultiple >= BreakEvenTriggerR)
        {
         double beLevel = isBuy ? entry + BreakEvenLockPoints * Point : entry - BreakEvenLockPoints * Point;
         bool needsUpdate = isBuy ? (sl < beLevel) : (sl > beLevel || sl == 0);
         if(needsUpdate)
            RobustOrderModify(ticket, entry, beLevel, tp);
        }

      // --- Trailing stop (ATR based, only tightens) ---
      if(UseTrailingStop && rMultiple >= TrailStartR)
        {
         double atr = iATR(Symbol(), PERIOD_M5, ATR_Period, 1);
         double trailDistance = atr * TrailATRMultiple;
         double newSL = isBuy ? currentPrice - trailDistance : currentPrice + trailDistance;

         if(OrderSelect(ticket, SELECT_BY_TICKET))
           {
            double liveSL = OrderStopLoss();
            bool improves = isBuy ? (newSL > liveSL) : (newSL < liveSL || liveSL == 0);
            if(improves)
               RobustOrderModify(ticket, entry, newSL, tp);
           }
        }
     }
  }

//====================================================================
// LOGGING
//====================================================================
// FileWrite() in CSV mode does not quote fields, so any free-text value
// that could contain a comma must be sanitised before it is written,
// otherwise it silently shifts every later column out of alignment.
string CsvSafe(string text)
  {
   string result = text;
   StringReplace(result, ",", ";");
   return(result);
  }

int OpenLogFile(string filename, string header)
  {
   int handle = FileOpen(filename, FILE_READ | FILE_WRITE | FILE_CSV | FILE_ANSI, ',');
   if(handle == INVALID_HANDLE)
     {
      Print("Failed to open log file: ", filename, " error ", GetLastError());
      return(INVALID_HANDLE);
     }
   ulong size = FileSize(handle);
   FileSeek(handle, 0, SEEK_END);
   if(size == 0)
     {
      FileWrite(handle, header);
      FileFlush(handle);
     }
   return(handle);
  }

void LogSignal(SignalInfo &sig)
  {
   if(!EnableCSVLogging || g_signalLogHandle == INVALID_HANDLE)
      return;

   // Avoid writing an identical rejection reason on every consecutive bar.
   string key = sig.reason + "_" + IntegerToString((int)g_lastBarTime);
   if(key == g_lastSignalLogKey)
      return;
   g_lastSignalLogKey = key;

   datetime utcNow = GetUTCTime();
   FileSeek(g_signalLogHandle, 0, SEEK_END);
   FileWrite(g_signalLogHandle,
      TimeToStr2(TimeCurrent()), TimeToStr2(utcNow), TimeToStr2(GetJHBTime()),
      sig.valid ? "SIGNAL" : "REJECTED",
      sig.direction, EnumToString(sig.regime), GetSessionName(utcNow),
      DoubleToString(sig.score, 1), MinConfidenceScore,
      DoubleToString(sig.scoreHTF, 1), DoubleToString(sig.scoreRegime, 1),
      DoubleToString(sig.scoreSetup, 1), DoubleToString(sig.scoreMomentum, 1),
      DoubleToString(sig.scoreVol, 1), DoubleToString(sig.scoreSession, 1),
      DoubleToString(sig.scoreCost, 1),
      DoubleToString(MarketInfo(Symbol(), MODE_SPREAD), 1),
      DoubleToString(iATR(Symbol(), PERIOD_M5, ATR_Period, 1), 5),
      DoubleToString(sig.rr, 2), MinRewardToRisk,
      DoubleToString(sig.entry, Digits), DoubleToString(sig.sl, Digits), DoubleToString(sig.tp, Digits),
      "", DoubleToString(GetEffectiveRiskPercent(), 2),
      CsvSafe(sig.reason), EnumToString(g_lockState));
   FileFlush(g_signalLogHandle);
  }

void LogRejection(SignalInfo &sig, string reason)
  {
   sig.reason = reason;
   LogSignal(sig);
}

void WriteTradeLogRow(int ticket, SignalInfo &sig, double lots, double riskPercent,
                       double exitPrice, string exitReason, double profit, double commission)
  {
   if(!EnableCSVLogging || g_tradeLogHandle == INVALID_HANDLE)
      return;

   double slDistance = MathAbs(sig.entry - sig.sl);
   double rMultiple = 0;
   if(slDistance > 0)
     {
      double moveAchieved = (sig.direction == 1) ? (exitPrice - sig.entry) : (sig.entry - exitPrice);
      rMultiple = moveAchieved / slDistance;
     }

   double swap = 0;
   if(OrderSelect(ticket, SELECT_BY_TICKET))
      swap = OrderSwap();

   FileSeek(g_tradeLogHandle, 0, SEEK_END);
   FileWrite(g_tradeLogHandle,
      ticket, TimeToStr2(TimeCurrent()), TimeToStr2(GetUTCTime()), TimeToStr2(GetJHBTime()),
      sig.direction, DoubleToString(sig.entry, Digits), DoubleToString(sig.sl, Digits),
      DoubleToString(sig.tp, Digits), DoubleToString(lots, 2), DoubleToString(riskPercent, 2),
      TimeToStr2(TimeCurrent()), DoubleToString(exitPrice, Digits), CsvSafe(exitReason),
      DoubleToString(profit, 2), DoubleToString(commission, 2), DoubleToString(swap, 2),
      DoubleToString(rMultiple, 2), MaxSlippagePoints, GetLastError());
   FileFlush(g_tradeLogHandle);
  }

//====================================================================
// DASHBOARD
//====================================================================
void BuildDashboardSkeleton()
  {
   ObjectCreate(0, DASH_PREFIX + "BG", OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, DASH_PREFIX + "BG", OBJPROP_CORNER, CORNER_LEFT_UPPER);
   ObjectSetInteger(0, DASH_PREFIX + "BG", OBJPROP_XDISTANCE, 5);
   ObjectSetInteger(0, DASH_PREFIX + "BG", OBJPROP_YDISTANCE, 15);
   ObjectSetInteger(0, DASH_PREFIX + "BG", OBJPROP_XSIZE, 320);
   ObjectSetInteger(0, DASH_PREFIX + "BG", OBJPROP_YSIZE, 430);
   ObjectSetInteger(0, DASH_PREFIX + "BG", OBJPROP_BGCOLOR, DashboardBgColor);
   ObjectSetInteger(0, DASH_PREFIX + "BG", OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, DASH_PREFIX + "BG", OBJPROP_BACK, false);
   ObjectSetInteger(0, DASH_PREFIX + "BG", OBJPROP_SELECTABLE, false);
  }

void SetDashLine(int lineIndex, string text)
  {
   string name = DASH_PREFIX + "L" + IntegerToString(lineIndex);
   if(ObjectFind(0, name) < 0)
     {
      ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
      ObjectSetInteger(0, name, OBJPROP_CORNER, CORNER_LEFT_UPPER);
      ObjectSetInteger(0, name, OBJPROP_XDISTANCE, 12);
      ObjectSetInteger(0, name, OBJPROP_YDISTANCE, 22 + lineIndex * 14);
      ObjectSetInteger(0, name, OBJPROP_FONTSIZE, DashboardFontSize);
      ObjectSetString(0, name, OBJPROP_FONT, "Consolas");
      ObjectSetInteger(0, name, OBJPROP_COLOR, DashboardTextColor);
      ObjectSetInteger(0, name, OBJPROP_SELECTABLE, false);
     }
   ObjectSetString(0, name, OBJPROP_TEXT, text);
  }

void UpdateDashboard()
  {
   int L = 0;
   SetDashLine(L++, "ProfessionalFXScalper v2.00");
   SetDashLine(L++, "Account: " + (g_isReal ? "REAL" : (g_isDemo ? "DEMO" : "CONTEST")) +
                     "  |  Real trading enabled: " + (EnableRealAccountTrading ? "YES" : "NO"));
   SetDashLine(L++, "Symbol: " + Symbol() + "  TF: " + EnumToString((ENUM_TIMEFRAMES)Period()));
   SetDashLine(L++, "Broker time: " + TimeToStr2(TimeCurrent()));
   SetDashLine(L++, "UTC time:    " + TimeToStr2(GetUTCTime()));
   SetDashLine(L++, "JHB time:    " + TimeToStr2(GetJHBTime()));
   SetDashLine(L++, "Session: " + GetSessionName(GetUTCTime()));
   SetDashLine(L++, "Regime: " + EnumToString(g_lastRegime) + "  HTF dir: " +
                     (g_lastHTFDir == 1 ? "UP" : (g_lastHTFDir == -1 ? "DOWN" : "NONE")));
   SetDashLine(L++, "Confidence: " + DoubleToString(g_lastConfidenceScore, 1) +
                     " / min " + IntegerToString(MinConfidenceScore));
   SetDashLine(L++, "Spread: " + DoubleToString(MarketInfo(Symbol(), MODE_SPREAD), 1) + " pts (max " +
                     DoubleToString(MaxSpreadPoints, 1) + ")");
   SetDashLine(L++, "ATR(M5): " + DoubleToString(iATR(Symbol(), PERIOD_M5, ATR_Period, 1), 5));
   SetDashLine(L++, "Risk/trade: " + DoubleToString(GetEffectiveRiskPercent(), 2) + "%");
   SetDashLine(L++, "Trades today: " + IntegerToString(g_tradesToday) + " / " + IntegerToString(MaxTradesPerDay));
   double dayPL = AccountEquity() - g_dayStartEquity;
   SetDashLine(L++, "Daily P/L: " + DoubleToString(dayPL, 2) + " " + AccountCurrency());
   SetDashLine(L++, "Floating P/L: " + DoubleToString(AccountProfit(), 2) + " " + AccountCurrency());
   double dd = (g_peakEquity > 0) ? (g_peakEquity - AccountEquity()) / g_peakEquity * 100.0 : 0;
   SetDashLine(L++, "Drawdown from peak: " + DoubleToString(dd, 2) + "%");
   SetDashLine(L++, "Consecutive losses: " + IntegerToString(g_consecutiveLosses) + " / " +
                     IntegerToString(MaxConsecutiveLosses));
   SetDashLine(L++, "Open positions: " + IntegerToString(CountEAPositions()) + " / " + IntegerToString(MaxOpenPositions));

   bool allowed = (g_lockState == LOCK_NONE) && g_tradingPermittedAcct && AllowNewTrades;
   string reason = allowed ? "-" : (g_lockState != LOCK_NONE ? g_lockReason :
                    (!g_tradingPermittedAcct ? g_acctBlockReason : "AllowNewTrades=false"));
   SetDashLine(L++, "Trading: " + (allowed ? "ALLOWED" : "BLOCKED"));
   SetDashLine(L++, "Reason: " + reason);
   SetDashLine(L++, "Next window: " + GetNextWindowDescription());
  }

string GetNextWindowDescription()
  {
   datetime utcNow = GetUTCTime();
   if(IsWithinTradingWindow(utcNow))
      return("Currently inside an active window.");
   int h = TimeHour(utcNow);
   if(h < Window1StartHourUTC)
      return(StringConcatenate("Window 1 opens at ", Window1StartHourUTC, ":00 UTC"));
   if(h < Window2StartHourUTC)
      return(StringConcatenate("Window 2 opens at ", Window2StartHourUTC, ":00 UTC"));
   return(StringConcatenate("Next window: ", Window1StartHourUTC, ":00 UTC tomorrow"));
  }

//====================================================================
// ERROR DESCRIPTION HELPER (subset of common trade errors)
//====================================================================
string ErrorDescription(int code)
  {
   switch(code)
     {
      case 129: return("Invalid price");
      case 130: return("Invalid stops");
      case 131: return("Invalid trade volume");
      case 132: return("Market closed");
      case 133: return("Trade disabled");
      case 134: return("Not enough money");
      case 135: return("Price changed");
      case 136: return("Off quotes");
      case 137: return("Broker busy");
      case 138: return("Requote");
      case 141: return("Too many requests");
      case 145: return("Modification denied - order too close to market");
      case 146: return("Trade context busy");
      case 147: return("Expiration denied by broker");
      default:  return(StringConcatenate("Error code ", code));
     }
  }
//+------------------------------------------------------------------+
