//+------------------------------------------------------------------+
//|                                          XAUJournalEA.mq5        |
//|                               xaujournal — MT5 Auto-Sync EA     |
//+------------------------------------------------------------------+
//
//  INSTALL (3 minutes):
//  1. MT5 → File → Open Data Folder → MQL5/Experts/ → paste this file
//  2. MetaEditor (F4) → open file → F7 to compile
//  3. Drag EA onto any XAUUSD chart
//  4. EA Properties → paste your API Key + Endpoint URL from xaujournal settings
//  5. Tools → Options → Expert Advisors → Allow WebRequest
//     → add your Endpoint URL to the allowed list
//  6. Trade normally — every trade auto-syncs ✓
//
//+------------------------------------------------------------------+

#property copyright "xaujournal"
#property version   "1.00"

input string ApiKey       = "";         // xaujournal API Key
input string EndpointURL  = "";         // Cloud Function URL e.g. https://xaujournal.vercel.app/api/sync-trade
input string TrackSymbols = "XAUUSD";  // Comma-separated symbols, blank = ALL
input bool   DebugLogs    = false;      // Show verbose logs in Experts tab

string g_symbols[];
int    g_symbolCount = 0;

//+------------------------------------------------------------------+
int OnInit()
{
   if(ApiKey == "" || EndpointURL == "")
   {
      Alert("xaujournal EA: API Key and Endpoint URL are required.\n"
            "Right-click the EA → Properties → Inputs.");
      return INIT_PARAMETERS_INCORRECT;
   }

   if(TrackSymbols == "")
      g_symbolCount = 0;
   else
   {
      g_symbolCount = StringSplit(TrackSymbols, ',', g_symbols);
      for(int i = 0; i < g_symbolCount; i++)
      {
         StringTrimLeft(g_symbols[i]);
         StringTrimRight(g_symbols[i]);
      }
   }

   string tracking = (g_symbolCount == 0) ? "ALL symbols" : TrackSymbols;
   Print("xaujournal EA active. Tracking: ", tracking);
   return INIT_SUCCEEDED;
}

//+------------------------------------------------------------------+
void OnTradeTransaction(const MqlTradeTransaction& trans,
                        const MqlTradeRequest&     request,
                        const MqlTradeResult&      result)
{
   if(trans.type != TRADE_TRANSACTION_DEAL_ADD) return;

   ulong dealTicket = trans.deal;
   if(dealTicket == 0) return;

   if(!HistoryDealSelect(dealTicket))
   {
      Sleep(300);
      if(!HistoryDealSelect(dealTicket)) return;
   }

   string symbol = HistoryDealGetString(dealTicket, DEAL_SYMBOL);
   if(g_symbolCount > 0 && !IsTracked(symbol)) return;

   ENUM_DEAL_ENTRY entryType  = (ENUM_DEAL_ENTRY)HistoryDealGetInteger(dealTicket, DEAL_ENTRY);
   ENUM_DEAL_TYPE  dealType   = (ENUM_DEAL_TYPE) HistoryDealGetInteger(dealTicket, DEAL_TYPE);
   long            positionId = HistoryDealGetInteger(dealTicket, DEAL_POSITION_ID);
   double          price      = HistoryDealGetDouble (dealTicket, DEAL_PRICE);
   double          lots       = HistoryDealGetDouble (dealTicket, DEAL_VOLUME);
   double          profit     = HistoryDealGetDouble (dealTicket, DEAL_PROFIT);
   double          commission = HistoryDealGetDouble (dealTicket, DEAL_COMMISSION);
   double          swap       = HistoryDealGetDouble (dealTicket, DEAL_SWAP);
   datetime        time       = (datetime)HistoryDealGetInteger(dealTicket, DEAL_TIME);
   string          comment    = HistoryDealGetString (dealTicket, DEAL_COMMENT);

   string direction = (dealType == DEAL_TYPE_BUY) ? "buy" : "sell";
   string eventType = "";
   if(entryType == DEAL_ENTRY_IN)  eventType = "open";
   if(entryType == DEAL_ENTRY_OUT) eventType = "close";
   if(eventType == "") return;

   string timeStr = TimeToString(time, TIME_DATE | TIME_SECONDS);
   StringReplace(timeStr, ".", "-");

   string json = StringFormat(
      "{"
        "\"event\":\"%s\","
        "\"source\":\"mt5\","
        "\"ticket\":\"%I64u\","
        "\"positionId\":\"%I64d\","
        "\"symbol\":\"%s\","
        "\"direction\":\"%s\","
        "\"lots\":%.2f,"
        "\"price\":%.5f,"
        "\"profit\":%.2f,"
        "\"commission\":%.2f,"
        "\"swap\":%.2f,"
        "\"time\":\"%s\","
        "\"comment\":\"%s\""
      "}",
      eventType, dealTicket, positionId, symbol, direction,
      lots, price, profit, commission, swap, timeStr, comment
   );

   if(DebugLogs) Print("xaujournal SEND: ", json);
   PostToJournal(json);
}

//+------------------------------------------------------------------+
void PostToJournal(string json)
{
   string headers = "Content-Type: application/json\r\n"
                  + "x-api-key: " + ApiKey + "\r\n";
   char body[], response[];
   string responseHeaders;
   StringToCharArray(json, body, 0, StringLen(json));

   int code = WebRequest("POST", EndpointURL, headers, 5000,
                         body, response, responseHeaders);

   if(code == -1)
      Print("xaujournal EA WebRequest error ", GetLastError(),
            ". Whitelist URL in Tools → Options → Expert Advisors.");
   else if(code == 200)
      Print("xaujournal: trade synced OK");
   else
      Print("xaujournal: HTTP ", code, " | ", CharArrayToString(response));
}

//+------------------------------------------------------------------+
bool IsTracked(string symbol)
{
   for(int i = 0; i < g_symbolCount; i++)
      if(g_symbols[i] == symbol) return true;
   return false;
}

void OnDeinit(const int reason) { Print("xaujournal EA stopped."); }