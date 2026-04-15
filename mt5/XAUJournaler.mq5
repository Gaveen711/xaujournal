//+------------------------------------------------------------------+
//|                                              XAUJournaler.mq5    |
//|                                  Copyright 2024, Gaveen Perera   |
//|                          https://trading-journal-khaki-five.vercel.app |
//+------------------------------------------------------------------+
#property copyright   "Copyright 2024, Gaveen Perera"
#property link        "https://trading-journal-khaki-five.vercel.app"
#property version     "2.10"
#property strict
#property description "XAUUSD Auto-Sync for XAU Trading Journal"

//+------------------------------------------------------------------+
//| INPUT PARAMETERS                                                 |
//+------------------------------------------------------------------+

input group "=== Journal Connection ==="
input string   InpUserId    = "";        // Firebase User ID (from journal)
input string   InpApiKey    = "";        // API Key (MT5_SYNC_KEY from journal settings)
input string   InpApiUrl    = "https://trading-journal-khaki-five.vercel.app/api/log-trade";
input int      InpCheckSecs = 30;        // Sync check interval (seconds)

input group "=== Setup Tagging ==="
input string   InpDefaultSetup = "A+ Setup";   // Default setup if no tag in comment
// --- Write hashtags in your MT5 order comment:
// #aplus or #a+   → A+ Setup
// #breakout #bo   → Breakout
// #reversal #rev  → Reversal
// #news           → News
// #trend          → Trend

input group "=== Session Times (all in GMT) ==="
input int      InpGmtOffset   = 3;      // Broker Server GMT Offset (e.g. 3 = EET)
input int      InpAsianOpen   = 2;      // Asian open (GMT)
input int      InpAsianClose  = 9;      // Asian close (GMT)
input int      InpLondonOpen  = 8;      // London open (GMT)
input int      InpLondonClose = 16;     // London close (GMT)
input int      InpNYOpen      = 13;     // New York open (GMT)
input int      InpNYClose     = 21;     // New York close (GMT)

input group "=== Display ==="
input bool     InpShowPanel   = true;            // Show status panel on chart
input color    InpPanelColor  = clrMidnightBlue; // Panel background color

//+------------------------------------------------------------------+
//| GLOBALS                                                          |
//+------------------------------------------------------------------+
datetime last_sync_time = 0;
int      total_synced   = 0;
string   last_sync_msg  = "Waiting for first sync...";
ulong    synced_tickets[];
int      retry_count    = 0;

//+------------------------------------------------------------------+
//| ON INIT                                                          |
//+------------------------------------------------------------------+
int OnInit()
{
   if(InpUserId == "" || InpApiKey == "")
   {
      Alert("XAU Journaler: Enter your User ID and API Key in EA inputs!");
      return(INIT_FAILED);
   }
   
   last_sync_time = TimeCurrent() - 3600; // Look back 1 hour on start
   ArrayResize(synced_tickets, 0);
   EventSetTimer(InpCheckSecs);
   
   Print("XAU Journaler v2.10 started — XAUUSD only mode.");
   DrawPanel();
   return(INIT_SUCCEEDED);
}

//+------------------------------------------------------------------+
//| ON DEINIT                                                        |
//+------------------------------------------------------------------+
void OnDeinit(const int reason)
{
   EventKillTimer();
   ObjectsDeleteAll(0, "XAU_");
}

//+------------------------------------------------------------------+
//| ON TIMER                                                         |
//+------------------------------------------------------------------+
void OnTimer()
{
   SyncNewTrades();
   if(InpShowPanel) DrawPanel();
}

//+------------------------------------------------------------------+
//| MAIN SYNC ENGINE                                                 |
//+------------------------------------------------------------------+
void SyncNewTrades()
{
   datetime from = last_sync_time - 7200; // 2hr lookback to catch missed trades
   datetime to   = TimeCurrent();
   
   if(!HistorySelect(from, to)) return;

   int  total     = HistoryDealsTotal();
   bool synced_any = false;

   for(int i = 0; i < total; i++)
   {
      ulong ticket = HistoryDealGetTicket(i);
      if(ticket == 0)                   continue;
      if(IsAlreadySynced(ticket))       continue;

      // Only closing deals
      long entry_type = HistoryDealGetInteger(ticket, DEAL_ENTRY);
      if(entry_type != DEAL_ENTRY_OUT)  continue;
      
      long deal_type = HistoryDealGetInteger(ticket, DEAL_TYPE);
      if(deal_type != DEAL_TYPE_BUY && deal_type != DEAL_TYPE_SELL) continue;

      // --- Only process XAUUSD ---
      string symbol = HistoryDealGetString(ticket, DEAL_SYMBOL);
      if(StringFind(symbol, "XAU") < 0 && StringFind(symbol, "GOLD") < 0)
      {
         // Skip non-XAUUSD deals silently
         continue;
      }

      // --- Extract deal data ---
      double pnl        = HistoryDealGetDouble(ticket, DEAL_PROFIT);
      double swap       = HistoryDealGetDouble(ticket, DEAL_SWAP);
      double commission = HistoryDealGetDouble(ticket, DEAL_COMMISSION);
      double lots       = HistoryDealGetDouble(ticket, DEAL_VOLUME);
      double exit_price = HistoryDealGetDouble(ticket, DEAL_PRICE);
      datetime deal_time = (datetime)HistoryDealGetInteger(ticket, DEAL_TIME);
      string  comment    = HistoryDealGetString(ticket, DEAL_COMMENT);
      ulong   pos_id     = HistoryDealGetInteger(ticket, DEAL_POSITION_ID);

      // --- Get entry details from opening deal ---
      double entry_price = 0;
      double sl = 0, tp = 0;
      GetEntryData(pos_id, entry_price, sl, tp, comment);

      // OUT deal type is opposite of the position:
      // DEAL_TYPE_SELL OUT = was a BUY position
      // DEAL_TYPE_BUY  OUT = was a SELL position
      string direction = (deal_type == DEAL_TYPE_SELL) ? "BUY" : "SELL";

      // --- XAUUSD calculations (1 pip = 0.01, contract = 100) ---
      double pips = 0;
      if(entry_price > 0 && exit_price > 0)
         pips = NormalizeDouble(MathAbs(exit_price - entry_price) / 0.01, 1);

      double rr = 0;
      if(sl > 0 && entry_price > 0)
      {
         double risk   = MathAbs(entry_price - sl);
         double reward = MathAbs(exit_price - entry_price);
         if(risk > 0) rr = NormalizeDouble(reward / risk, 2);
      }

      // --- Session detection ---
      string session = DetectSession(deal_time);
      
      // --- Setup from comment ---
      string setup = ParseSetup(comment);

      // --- Net P&L ---
      double net_pnl = pnl + swap + commission;

      bool success = SendTradeToJournal(
         net_pnl, swap, commission, lots,
         entry_price, exit_price, pips, rr,
         direction, session, setup,
         deal_time, comment
      );

      if(success)
      {
         int sz = ArraySize(synced_tickets);
         ArrayResize(synced_tickets, sz + 1);
         synced_tickets[sz] = ticket;
         total_synced++;
         synced_any = true;
         
         string outcome = (net_pnl > 0.01 ? "WIN" : (net_pnl < -0.01 ? "LOSS" : "BE"));
         last_sync_msg = StringFormat("%s %s | P&L: $%.2f | %s | %s",
            direction, "XAUUSD", net_pnl,
            session, TimeToString(deal_time, TIME_DATE|TIME_MINUTES));
         
         Print("✅ [XAU Journal] Synced XAUUSD ", direction,
               " | PnL: $", DoubleToString(net_pnl, 2),
               " | Pips: ", DoubleToString(pips, 1),
               " | R:R: ", DoubleToString(rr, 2),
               " | Session: ", session,
               " | Setup: ", setup);
      }
   }

   if(synced_any) last_sync_time = TimeCurrent();
}

//+------------------------------------------------------------------+
//| Read entry price, SL, TP from the opening deal of a position     |
//+------------------------------------------------------------------+
void GetEntryData(ulong pos_id, double &entry_price, double &sl, double &tp, string &comment)
{
   if(!HistorySelectByPosition(pos_id)) return;
   int total = HistoryDealsTotal();
   for(int i = 0; i < total; i++)
   {
      ulong t = HistoryDealGetTicket(i);
      if(HistoryDealGetInteger(t, DEAL_ENTRY) == DEAL_ENTRY_IN)
      {
         entry_price = HistoryDealGetDouble(t, DEAL_PRICE);
         ulong ord   = HistoryDealGetInteger(t, DEAL_ORDER);
         if(HistoryOrderSelect(ord))
         {
            sl = HistoryOrderGetDouble(ord, ORDER_SL);
            tp = HistoryOrderGetDouble(ord, ORDER_TP);
            string oc = HistoryOrderGetString(ord, ORDER_COMMENT);
            if(oc != "") comment = oc;
         }
         break;
      }
   }
}

//+------------------------------------------------------------------+
//| Detect session from deal close time                              |
//+------------------------------------------------------------------+
string DetectSession(datetime t)
{
   int gmt = (int)(TimeHour(t) - InpGmtOffset);
   if(gmt < 0)   gmt += 24;
   if(gmt >= 24) gmt -= 24;

   bool asian  = (gmt >= InpAsianOpen  && gmt < InpAsianClose);
   bool london = (gmt >= InpLondonOpen && gmt < InpLondonClose);
   bool ny     = (gmt >= InpNYOpen     && gmt < InpNYClose);

   if(london && ny) return "LN-NY";
   if(ny)           return "NY";
   if(london)       return "London";
   if(asian)        return "Asian";
   return "Off-Session";
}

//+------------------------------------------------------------------+
//| Parse setup tag from order comment                               |
//| Tags: #aplus #a+ #breakout #bo #reversal #rev #news #trend       |
//+------------------------------------------------------------------+
string ParseSetup(string comment)
{
   string c = comment;
   StringToLower(c);
   if(StringFind(c, "#aplus")    >= 0 || StringFind(c, "#a+")    >= 0) return "A+ Setup";
   if(StringFind(c, "#breakout") >= 0 || StringFind(c, "#bo")    >= 0) return "Breakout";
   if(StringFind(c, "#reversal") >= 0 || StringFind(c, "#rev")   >= 0) return "Reversal";
   if(StringFind(c, "#news")     >= 0)                                  return "News";
   if(StringFind(c, "#trend")    >= 0)                                  return "Trend";
   if(InpDefaultSetup != "") return InpDefaultSetup;
   return "Direct Execution";
}

//+------------------------------------------------------------------+
//| Duplicate guard                                                  |
//+------------------------------------------------------------------+
bool IsAlreadySynced(ulong ticket)
{
   int sz = ArraySize(synced_tickets);
   for(int i = 0; i < sz; i++)
      if(synced_tickets[i] == ticket) return true;
   return false;
}

//+------------------------------------------------------------------+
//| HTTP POST to Vercel /api/log-trade                               |
//+------------------------------------------------------------------+
bool SendTradeToJournal(
   double pnl, double swap, double commission, double lots,
   double entry, double exit_p, double pips, double rr,
   string direction, string session, string setup,
   datetime deal_time, string raw_comment)
{
   string outcome = (pnl > 0.01 ? "WIN" : (pnl < -0.01 ? "LOSS" : "BE"));

   // Strip setup tags from note
   string note = raw_comment;
   StringReplace(note, "#aplus", ""); StringReplace(note, "#a+", "");
   StringReplace(note, "#breakout", ""); StringReplace(note, "#bo", "");
   StringReplace(note, "#reversal", ""); StringReplace(note, "#rev", "");
   StringReplace(note, "#news", ""); StringReplace(note, "#trend", "");
   note = StringTrimLeft(StringTrimRight(note));
   if(note == "") note = "XAUUSD Auto-Synced";

   string json = StringFormat(
      "{"
        "\"userId\":\"%s\","
        "\"apiKey\":\"%s\","
        "\"trade\":{"
          "\"date\":\"%s\","
          "\"market\":\"GOLD\","
          "\"symbol\":\"XAUUSD\","
          "\"direction\":\"%s\","
          "\"entry\":%.2f,"
          "\"exit\":%.2f,"
          "\"lots\":%.2f,"
          "\"pnl\":%.2f,"
          "\"swap\":%.2f,"
          "\"commission\":%.2f,"
          "\"pips\":%.1f,"
          "\"rr\":%.2f,"
          "\"session\":\"%s\","
          "\"setup\":\"%s\","
          "\"outcome\":\"%s\","
          "\"note\":\"%s\""
        "}"
      "}",
      InpUserId, InpApiKey,
      TimeToString(deal_time, TIME_DATE),
      direction, entry, exit_p, lots,
      pnl, swap, commission,
      pips, rr,
      session, setup, outcome, note
   );

   char   post_data[];
   char   result[];
   string result_headers;
   StringToCharArray(json, post_data, 0, StringLen(json), CP_UTF8);
   string headers = "Content-Type: application/json\r\nAccept: application/json\r\n";

   int http_code = WebRequest("POST", InpApiUrl, headers, 15000, post_data, result, result_headers);

   if(http_code == 200)
   {
      retry_count = 0;
      return true;
   }
   else
   {
      retry_count++;
      string response = CharArrayToString(result, 0, WHOLE_ARRAY, CP_UTF8);
      Print("❌ [XAU Journal] Sync failed | HTTP: ", http_code, " | ", response);
      last_sync_msg = "❌ Error HTTP " + IntegerToString(http_code);
      return false;
   }
}

//+------------------------------------------------------------------+
//| On-Chart Status Panel                                            |
//+------------------------------------------------------------------+
void DrawPanel()
{
   int    x = 10, y = 30;
   int    width = 330;
   string p = "XAU_";
   color  purple = C'147,112,219';
   color  ok_col = clrMediumSeaGreen;
   color  err_col = clrTomato;

   DrawRect(p+"bg", x, y, width, 110, InpPanelColor, 190);
   DrawText(p+"title",  "⚡ XAU JOURNALER  ·  XAUUSD ONLY",     x+8, y+6,  purple,          9, true);
   DrawText(p+"url",    "trading-journal-khaki-five.vercel.app", x+8, y+20, clrGray,          7, false);
   
   color status_col = (retry_count > 2) ? err_col : ok_col;
   string status = (retry_count > 2) ? "⚠ CONNECTION ERROR" : "● LIVE — XAUUSD SYNC ACTIVE";
   DrawText(p+"status", status,                                  x+8, y+38, status_col,       8, false);
   DrawText(p+"synced", "Trades Synced: " + IntegerToString(total_synced),
                                                                 x+8, y+56, clrWhite,         8, false);
   DrawText(p+"intv",   "Check: " + IntegerToString(InpCheckSecs) + "s",
                                                                 x+185, y+56, clrGray,        8, false);
   DrawText(p+"last",   last_sync_msg,                           x+8, y+74, clrSilver,        7, false);
   DrawText(p+"hint",   "Tag: #aplus  #breakout  #reversal  #news  #trend",
                                                                 x+8, y+92, C'100,100,150',   7, false);
   ChartRedraw();
}

void DrawRect(string name, int x, int y, int w, int h, color bg, int alpha)
{
   if(ObjectFind(0, name) < 0)
      ObjectCreate(0, name, OBJ_RECTANGLE_LABEL, 0, 0, 0);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE,   x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE,   y);
   ObjectSetInteger(0, name, OBJPROP_XSIZE,       w);
   ObjectSetInteger(0, name, OBJPROP_YSIZE,       h);
   ObjectSetInteger(0, name, OBJPROP_BGCOLOR,     bg);
   ObjectSetInteger(0, name, OBJPROP_BORDER_TYPE, BORDER_FLAT);
   ObjectSetInteger(0, name, OBJPROP_CORNER,      CORNER_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_BACK,        false);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE,  false);
}

void DrawText(string name, string text, int x, int y, color col, int size, bool bold)
{
   if(ObjectFind(0, name) < 0)
      ObjectCreate(0, name, OBJ_LABEL, 0, 0, 0);
   ObjectSetString (0, name, OBJPROP_TEXT,      text);
   ObjectSetInteger(0, name, OBJPROP_XDISTANCE, x);
   ObjectSetInteger(0, name, OBJPROP_YDISTANCE, y);
   ObjectSetInteger(0, name, OBJPROP_COLOR,     col);
   ObjectSetInteger(0, name, OBJPROP_FONTSIZE,  size);
   ObjectSetString (0, name, OBJPROP_FONT,      bold ? "Arial Bold" : "Arial");
   ObjectSetInteger(0, name, OBJPROP_CORNER,    CORNER_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_ANCHOR,    ANCHOR_LEFT_UPPER);
   ObjectSetInteger(0, name, OBJPROP_SELECTABLE,false);
   ObjectSetInteger(0, name, OBJPROP_BACK,      false);
}
