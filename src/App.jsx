import { useState, useEffect, useRef } from 'react'
import './App.css'

function App() {
  const [activeTab, setActiveTab] = useState('log')
  const [trades, setTrades] = useState([])
  const [journals, setJournals] = useState({})
  const [direction, setDirection] = useState(null)
  const [editDirection, setEditDirection] = useState(null)
  const [selectedMood, setSelectedMood] = useState(null)
  const [startingBalance, setStartingBalance] = useState(0)
  const [plan, setPlan] = useState('free')
  const [billingEmail, setBillingEmail] = useState('')
  const [isLightMode, setIsLightMode] = useState(false)
  const [checks, setChecks] = useState({ chk1: false, chk2: false, chk3: false })
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showPricingModal, setShowPricingModal] = useState(false)
  const [editingTradeId, setEditingTradeId] = useState(null)
  const [toasts, setToasts] = useState([])
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [selectedCalDay, setSelectedCalDay] = useState(null)
  const [equityPeriod, setEquityPeriod] = useState('all')
  const [filterSearch, setFilterSearch] = useState('')
  const [filterDir, setFilterDir] = useState('')
  const [filterOutcome, setFilterOutcome] = useState('')
  const [filterSession, setFilterSession] = useState('')
  const [filterSetup, setFilterSetup] = useState('')
  const [filterSort, setFilterSort] = useState('newest')
  const [journalDate, setJournalDate] = useState(new Date().toISOString().split('T')[0])
  const [journalText, setJournalText] = useState('')
  const [journalSaved, setJournalSaved] = useState(false)
  const [expandedNoteId, setExpandedNoteId] = useState(null)
  const chartRef = useRef(null)
  const equityChartRef = useRef(null)

  const SUB_LIMITS = { freeTrades: 25, freeJournals: 10 }
  const today = new Date()

  // Toast notifications
  const toast = (msg, type = 'success', duration = 3000) => {
    const id = Date.now()
    setToasts(prev => [...prev, { id, msg, type }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration)
  }

  // Storage helper
  const storage = {
    async set(key, value) {
      try {
        const r = await fetch(`/api/storage/${encodeURIComponent(key)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ value })
        })
        if (!r.ok) throw new Error()
      } catch {
        localStorage.setItem(key, value)
      }
    },
    async get(key) {
      try {
        const r = await fetch(`/api/storage/${encodeURIComponent(key)}`)
        if (r.ok) {
          const d = await r.json()
          return d && typeof d.value !== 'undefined' ? { value: d.value } : null
        }
        if (r.status !== 404) throw new Error()
      } catch {}
      const v = localStorage.getItem(key)
      return v === null ? null : { value: v }
    }
  }

  // Date helpers
  const pad2 = n => String(n).padStart(2, '0')
  const todayStr = () => `${today.getFullYear()}-${pad2(today.getMonth() + 1)}-${pad2(today.getDate())}`
  const fmt = d => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(d + 'T00:00:00'))
  const fmtM = (y, m) => new Date(y, m, 1).toLocaleString('default', { month: 'long', year: 'numeric' })

  // Load initial data
  useEffect(() => {
    loadTheme()
    loadAllData()
  }, [])

  const loadTheme = () => {
    const saved = localStorage.getItem('xau-theme')
    if (saved === 'light') {
      setIsLightMode(true)
      document.body.classList.add('light')
    }
  }

  const loadAllData = async () => {
    try {
      const e = await storage.get('xau-billing-email')
      const newBillingEmail = e ? String(JSON.parse(e.value) || '') : ''
      setBillingEmail(newBillingEmail)

      if (newBillingEmail) {
        const s = await fetch(`/api/billing/status?email=${encodeURIComponent(newBillingEmail)}`)
        if (s.ok) {
          const st = await s.json()
          setPlan(st.active && st.plan === 'pro' ? 'pro' : 'free')
        }
      }
    } catch {}

    await loadTrades()
    await loadJournals()
    await loadWallet()

    if (!localStorage.getItem('xau-onboarded')) {
      setTimeout(() => setShowOnboarding(true), 400)
    }
  }

  const loadTrades = async () => {
    try {
      const r = await storage.get('xau-trades')
      setTrades(r ? JSON.parse(r.value) : [])
    } catch {
      setTrades([])
    }
  }

  const loadJournals = async () => {
    try {
      const r = await storage.get('xau-journals')
      const raw = r ? JSON.parse(r.value) : {}
      const newJournals = {}
      for (const [k, v] of Object.entries(raw)) {
        newJournals[k] = typeof v === 'string' ? { text: v, mood: null } : v
      }
      setJournals(newJournals)
    } catch {
      setJournals({})
    }
  }

  const loadWallet = async () => {
    try {
      const r = await storage.get('xau-starting-balance')
      setStartingBalance(r ? parseFloat(JSON.parse(r.value)) || 0 : 0)
    } catch {
      setStartingBalance(0)
    }
  }

  const saveTrades = async (newTrades) => {
    try {
      await storage.set('xau-trades', JSON.stringify(newTrades))
    } catch {
      toast('Storage error — saved locally.', 'warn')
    }
  }

  const toggleTheme = () => {
    const newMode = !isLightMode
    setIsLightMode(newMode)
    document.body.classList.toggle('light', newMode)
    localStorage.setItem('xau-theme', newMode ? 'light' : 'dark')
  }

  const toggleCheck = (id) => {
    setChecks(prev => {
      const updated = { ...prev, [id]: !prev[id] }
      return updated
    })
  }

  const allChecked = () => checks.chk1 && checks.chk2 && checks.chk3

  const resetChecklist = () => {
    setChecks({ chk1: false, chk2: false, chk3: false })
  }

  const calcPnl = (entry, exit, lots, amount, sl, tp) => {
    if (!entry || !exit || !direction || (!lots && !amount)) {
      return { pnl: null, rr: null, risk: null, reward: null }
    }

    const diff = direction === 'BUY' ? exit - entry : entry - exit
    const pnl = amount > 0 ? (diff / entry) * amount : diff * lots * 100

    let rr = null,
      risk = null,
      reward = null
    if (sl && tp && sl !== '' && tp !== '') {
      risk = Math.abs(direction === 'BUY' ? entry - sl : sl - entry)
      reward = Math.abs(direction === 'BUY' ? tp - entry : entry - tp)
      if (risk > 0) rr = parseFloat((reward / risk).toFixed(2))
    }

    return { pnl: parseFloat(pnl.toFixed(2)), rr, risk, reward }
  }

  const saveTrade = async (e) => {
    e.preventDefault()
    const formData = new FormData(e.target)
    const date = formData.get('date')
    const entry = parseFloat(formData.get('entry'))
    const exit = parseFloat(formData.get('exit'))
    const lots = parseFloat(formData.get('lots')) || 0
    const amount = parseFloat(formData.get('amount')) || 0
    const sl = parseFloat(formData.get('sl')) || null
    const tp = parseFloat(formData.get('tp')) || null
    const note = formData.get('note').trim()
    const session = formData.get('session')
    const setup = formData.get('setup')

    if (!date || !direction || isNaN(entry) || isNaN(exit) || (!amount && isNaN(lots))) {
      toast('Please fill in date, direction, prices and lot size.', 'error')
      return
    }

    if (!allChecked()) {
      toast('Complete the checklist before saving.', 'warn')
      return
    }

    if (plan === 'free' && trades.length >= SUB_LIMITS.freeTrades) {
      setShowPricingModal(true)
      toast(`Free plan limit (${SUB_LIMITS.freeTrades} trades). Upgrade to Pro.`, 'warn')
      return
    }

    const diff = direction === 'BUY' ? exit - entry : entry - exit
    const pnl = amount > 0 ? (diff / entry) * amount : diff * lots * 100
    const outcome = pnl > 0.01 ? 'WIN' : pnl < -0.01 ? 'LOSS' : 'BE'

    let rr = null
    if (sl && tp) {
      const risk = Math.abs(direction === 'BUY' ? entry - sl : sl - entry)
      const rew = Math.abs(direction === 'BUY' ? tp - entry : entry - tp)
      if (risk > 0) rr = parseFloat((rew / risk).toFixed(2))
    }

    const trade = {
      id: Date.now(),
      date,
      direction,
      entry,
      exit,
      lots: isNaN(lots) ? 0 : lots,
      amount,
      sl,
      tp,
      rr,
      session,
      setup,
      pnl: parseFloat(pnl.toFixed(2)),
      outcome,
      note
    }

    const newTrades = [trade, ...trades]
    setTrades(newTrades)
    await saveTrades(newTrades)

    e.target.reset()
    e.target.date.value = todayStr()
    setDirection(null)
    resetChecklist()

    const icon = outcome === 'WIN' ? '🟢' : outcome === 'LOSS' ? '🔴' : '🟡'
    toast(
      `${icon} Trade saved — ${outcome} ${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toFixed(2)}`,
      outcome === 'WIN' ? 'success' : outcome === 'LOSS' ? 'error' : 'warn'
    )
  }

  const deleteTrade = async (id) => {
    if (!confirm('Delete this trade?')) return
    const newTrades = trades.filter(t => t.id !== id)
    setTrades(newTrades)
    await saveTrades(newTrades)
    toast('Trade deleted.', 'warn')
  }

  const showTab = (tab) => {
    setActiveTab(tab)
    if (tab === 'journal') {
      const entry = journals[journalDate]
      setJournalText(entry ? entry.text : '')
      setSelectedMood(entry ? entry.mood : null)
    }
  }

  useEffect(() => {
    const entry = journals[journalDate]
    setJournalText(entry ? entry.text : '')
    setSelectedMood(entry ? entry.mood : null)
  }, [journalDate, journals])

  const saveJournal = async (e) => {
    e.preventDefault()
    if (!journalDate) return

    const entryExists = Boolean(journals[journalDate])
    const newJournals = { ...journals }
    if (journalText.trim()) {
      newJournals[journalDate] = { text: journalText, mood: selectedMood }
    } else {
      delete newJournals[journalDate]
    }

    if (plan === 'free' && !entryExists && Object.keys(newJournals).length > SUB_LIMITS.freeJournals) {
      setShowPricingModal(true)
      toast(`Free plan limit (${SUB_LIMITS.freeJournals} entries). Upgrade to Pro.`, 'warn')
      return
    }

    try {
      await storage.set('xau-journals', JSON.stringify(newJournals))
      setJournals(newJournals)
      setJournalSaved(true)
      setTimeout(() => setJournalSaved(false), 2000)
      toast('Journal saved!', 'success')
    } catch {
      toast('Storage error.', 'error')
    }
  }

  const deleteJournalEntry = async (date) => {
    if (!confirm('Delete this journal entry?')) return
    const newJournals = { ...journals }
    delete newJournals[date]
    try {
      await storage.set('xau-journals', JSON.stringify(newJournals))
      setJournals(newJournals)
      if (journalDate === date) {
        setJournalText('')
        setSelectedMood(null)
      }
      toast('Entry deleted.', 'warn')
    } catch {
      toast('Storage error.', 'warn')
    }
  }

  const completeOnboarding = async () => {
    const walletInput = document.getElementById('onboard-wallet')
    if (walletInput) {
      const val = parseFloat(walletInput.value)
      if (!isNaN(val) && val > 0) {
        const newBalance = parseFloat(val.toFixed(2))
        setStartingBalance(newBalance)
        try {
          await storage.set('xau-starting-balance', JSON.stringify(newBalance))
        } catch {}
      }
    }
    localStorage.setItem('xau-onboarded', '1')
    setShowOnboarding(false)
    toast('Welcome! Log your first trade below.', 'success')
  }

  const dismissOnboarding = () => {
    localStorage.setItem('xau-onboarded', '1')
    setShowOnboarding(false)
  }

  return (
    <div className="app-container">
      {/* Toast Notifications */}
      <div className="toast-wrap" id="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            {t.msg}
          </div>
        ))}
      </div>

      {/* Onboarding Modal */}
      {showOnboarding && (
        <div className="onboard-wrap">
          <div className="onboard-card">
            <div className="onboard-icon">📈</div>
            <div className="onboard-title">Welcome to Gold Journal</div>
            <div className="onboard-sub">
              Your personal XAUUSD trading journal. Simple, elegant, built to help you become a better trader.
            </div>

            <div className="onboard-steps">
              <div className="onboard-step">
                <div className="onboard-num">1</div>
                <div className="onboard-step-text">
                  <strong>Set your starting balance</strong> so your wallet tracks your real progress
                </div>
              </div>
              <div className="onboard-step">
                <div className="onboard-num">2</div>
                <div className="onboard-step-text">
                  <strong>Log every trade</strong> — wins, losses, and everything in between
                </div>
              </div>
              <div className="onboard-step">
                <div className="onboard-num">3</div>
                <div className="onboard-step-text">
                  <strong>Write in your journal</strong> — emotions and mindset matter as much as charts
                </div>
              </div>
            </div>

            <div className="onboard-wallet-row">
              <div className="field">
                <label>Your starting balance ($)</label>
                <input
                  type="number"
                  id="onboard-wallet"
                  placeholder="e.g. 1000.00"
                  step="0.01"
                />
              </div>
            </div>

            <button className="onboard-btn" onClick={completeOnboarding}>
              Start journaling ✦
            </button>
            <div className="onboard-skip" onClick={dismissOnboarding}>
              Skip for now
            </div>
          </div>
        </div>
      )}

      {/* Main App */}
      <div id="app">
        <h2 className="sr-only">XAUUSD Gold Trading Journal</h2>

        {/* Header */}
        <div className="hdr">
          <div className="hdr-left">
            <h1>Gold Journal</h1>
            <span className="badge">XAUUSD</span>
            <span className={`plan-chip ${plan === 'pro' ? 'pro' : 'free'}`}>
              {plan === 'pro' ? 'PRO' : 'FREE'}
            </span>
          </div>
          <div className="hdr-actions">
            <span className="hdr-date">
              {today.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              })}
            </span>
            <button
              className="theme-btn"
              onClick={toggleTheme}
              title="Toggle light/dark mode"
            >
              {isLightMode ? '🌙' : '☀️'}
            </button>
            <button
              className="upgrade-btn"
              onClick={() => setShowPricingModal(true)}
            >
              Upgrade
            </button>
          </div>
        </div>

        {/* Navigation tabs */}
        <nav className="nav">
          <button
            className={`nav-btn ${activeTab === 'log' ? 'active' : ''}`}
            onClick={() => showTab('log')}
          >
            Log Trade
          </button>
          <button
            className={`nav-btn ${activeTab === 'history' ? 'active' : ''}`}
            onClick={() => showTab('history')}
          >
            History
          </button>
          <button
            className={`nav-btn ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => showTab('calendar')}
          >
            Calendar
          </button>
          <button
            className={`nav-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => showTab('analytics')}
          >
            Analytics
          </button>
          <button
            className={`nav-btn ${activeTab === 'journal' ? 'active' : ''}`}
            onClick={() => showTab('journal')}
          >
            Journal
          </button>
        </nav>

        {/* Tab content */}
        {activeTab === 'log' && (
          <LogTradeTab
            trades={trades}
            startingBalance={startingBalance}
            direction={direction}
            setDirection={setDirection}
            checks={checks}
            toggleCheck={toggleCheck}
            onSaveTrade={saveTrade}
            calcPnl={calcPnl}
            plan={plan}
            onUpgrade={() => setShowPricingModal(true)}
          />
        )}

        {activeTab === 'history' && (
          <HistoryTab
            trades={trades}
            onDeleteTrade={deleteTrade}
            setEditingTradeId={setEditingTradeId}
            setShowEditModal={setShowEditModal}
            filterSearch={filterSearch}
            setFilterSearch={setFilterSearch}
            filterDir={filterDir}
            setFilterDir={setFilterDir}
            filterOutcome={filterOutcome}
            setFilterOutcome={setFilterOutcome}
            filterSession={filterSession}
            setFilterSession={setFilterSession}
            filterSetup={filterSetup}
            setFilterSetup={setFilterSetup}
            filterSort={filterSort}
            setFilterSort={setFilterSort}
          />
        )}

        {activeTab === 'calendar' && <CalendarTab trades={trades} />}

        {activeTab === 'analytics' && (
          <AnalyticsTab trades={trades} startingBalance={startingBalance} />
        )}

        {activeTab === 'journal' && (
          <JournalTab
            journals={journals}
            journalDate={journalDate}
            setJournalDate={setJournalDate}
            journalText={journalText}
            setJournalText={setJournalText}
            selectedMood={selectedMood}
            setSelectedMood={setSelectedMood}
            saveJournal={saveJournal}
            deleteJournalEntry={deleteJournalEntry}
            journalSaved={journalSaved}
          />
        )}
      </div>

      {/* Pricing Modal */}
      {showPricingModal && (
        <div className="modal-wrap">
          <div className="modal-card wide">
            <div className="modal-head">
              <h3>Choose your plan</h3>
              <button
                className="modal-close"
                onClick={() => setShowPricingModal(false)}
              >
                &#215;
              </button>
            </div>
            <div className="pricing-grid">
              <div className="price-card">
                <div className="price-name">Free</div>
                <div className="price-cost">
                  $0<span>/mo</span>
                </div>
                <ul className="price-list">
                  <li>Up to 25 trades</li>
                  <li>Up to 10 journal entries</li>
                  <li>Core dashboard + calendar</li>
                </ul>
              </div>
              <div className="price-card featured">
                <div className="price-badge">Most Popular</div>
                <div className="price-name">Pro</div>
                <div className="price-cost">
                  $9<span>/mo</span>
                </div>
                <ul className="price-list">
                  <li>Unlimited trades & journals</li>
                  <li>Full analytics + equity curve</li>
                  <li>CSV export</li>
                  <li>Priority support</li>
                </ul>
                <button className="sub-cta full">Upgrade Monthly</button>
              </div>
              <div className="price-card">
                <div className="price-name">Pro Yearly</div>
                <div className="price-cost">
                  $79<span>/yr</span>
                </div>
                <ul className="price-list">
                  <li>All Pro features</li>
                  <li>Save ~27% vs monthly</li>
                  <li>Best value plan</li>
                </ul>
                <button className="sub-cta full">Upgrade Yearly</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Subcomponents
function LogTradeTab({
  trades,
  startingBalance,
  direction,
  setDirection,
  checks,
  toggleCheck,
  onSaveTrade,
  calcPnl,
  plan,
  onUpgrade
}) {
  const [entry, setEntry] = useState('')
  const [exit, setExit] = useState('')
  const [lots, setLots] = useState('0.10')
  const [amount, setAmount] = useState('')
  const [sl, setSl] = useState('')
  const [tp, setTp] = useState('')
  const [note, setNote] = useState('')

  const pnlData = calcPnl(
    parseFloat(entry) || 0,
    parseFloat(exit) || 0,
    parseFloat(lots) || 0,
    parseFloat(amount) || 0,
    parseFloat(sl) || 0,
    parseFloat(tp) || 0
  )

  return (
    <div id="tab-log" className="section active">
      <div className="sub-banner">
        <div>
          <div className="sub-title">Trade like a pro with deeper insights</div>
          <div className="sub-text">
            Unlimited trades, equity curve, advanced analytics — all in Pro.
          </div>
        </div>
        <button className="sub-cta" onClick={onUpgrade}>
          View plans
        </button>
      </div>

      <div className="card">
        <div className="card-title">New trade</div>

        <form onSubmit={onSaveTrade}>
          <div className="field-row r2">
            <div className="field">
              <label>Date</label>
              <input
                type="date"
                name="date"
                defaultValue={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div className="field">
              <label>Session</label>
              <select name="session">
                <option value="">— Select session —</option>
                <option value="Asian">Asian</option>
                <option value="London">London</option>
                <option value="NY">New York</option>
                <option value="LN-NY">London–NY Overlap</option>
              </select>
            </div>
          </div>

          <div className="field-row r2">
            <div className="field">
              <label>Direction</label>
              <div className="dir-group">
                <div
                  className={`dir-opt ${direction === 'BUY' ? 'sel-buy' : ''}`}
                  onClick={() => setDirection('BUY')}
                >
                  BUY
                </div>
                <div
                  className={`dir-opt ${direction === 'SELL' ? 'sel-sell' : ''}`}
                  onClick={() => setDirection('SELL')}
                >
                  SELL
                </div>
              </div>
            </div>
            <div className="field">
              <label>Setup tag</label>
              <select name="setup">
                <option value="">— Select setup —</option>
                <option value="A+ Setup">A+ Setup</option>
                <option value="Breakout">Breakout</option>
                <option value="Reversal">Reversal</option>
                <option value="News">News</option>
                <option value="FOMO">FOMO</option>
                <option value="Revenge">Revenge</option>
                <option value="Other">Other</option>
              </select>
            </div>
          </div>

          <div className="field-row r3">
            <div className="field">
              <label>Entry price</label>
              <input
                type="number"
                name="entry"
                placeholder="2645.00"
                step="0.01"
                value={entry}
                onChange={e => setEntry(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Exit price</label>
              <input
                type="number"
                name="exit"
                placeholder="2658.50"
                step="0.01"
                value={exit}
                onChange={e => setExit(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Lot size</label>
              <input
                type="number"
                name="lots"
                placeholder="0.10"
                step="0.01"
                value={lots}
                onChange={e => setLots(e.target.value)}
              />
            </div>
          </div>

          <div className="field-row r3">
            <div className="field">
              <label>Stop Loss (SL)</label>
              <input
                type="number"
                name="sl"
                placeholder="2638.00"
                step="0.01"
                value={sl}
                onChange={e => setSl(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Take Profit (TP)</label>
              <input
                type="number"
                name="tp"
                placeholder="2668.00"
                step="0.01"
                value={tp}
                onChange={e => setTp(e.target.value)}
              />
            </div>
            <div className="field">
              <label>Amount invested ($)</label>
              <input
                type="number"
                name="amount"
                placeholder="500.00"
                step="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
          </div>

          {pnlData.pnl !== null && (
            <div className="pnl-preview">
              <div>
                <span>Estimated P&L</span>
                <div style={{ marginTop: '3px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <strong style={{ color: pnlData.pnl >= 0 ? 'var(--win)' : 'var(--loss)' }}>
                    {pnlData.pnl >= 0 ? '+' : ''}${Math.abs(pnlData.pnl).toFixed(2)}
                  </strong>
                  {pnlData.rr && (
                    <span className={`rr-chip ${pnlData.rr >= 1.5 ? 'good' : pnlData.rr < 1 ? 'bad' : ''}`}>
                      R:R {pnlData.rr}
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="field mb-10">
            <label>Trade notes</label>
            <textarea
              name="note"
              placeholder="Setup, entry reason, what went right or wrong..."
              value={note}
              onChange={e => setNote(e.target.value)}
            ></textarea>
          </div>

          <div className="checklist-card">
            <div className="checklist-title">Pre-trade checklist</div>

            {['chk1', 'chk2', 'chk3'].map((checkId, idx) => (
              <div
                key={checkId}
                className={`checklist-item ${checks[checkId] ? 'checked' : ''}`}
                onClick={() => toggleCheck(checkId)}
              >
                <div className="check-box">{checks[checkId] ? '✓' : ''}</div>
                <span className="check-label">
                  {idx === 0 && 'I followed my trading plan'}
                  {idx === 1 && 'I identified the session and key levels'}
                  {idx === 2 && 'My Stop Loss is set and I accept the risk'}
                </span>
              </div>
            ))}
          </div>

          <button type="submit" className="submit-btn">
            Save trade
          </button>
        </form>
      </div>
    </div>
  )
}

function HistoryTab({
  trades,
  onDeleteTrade,
  setEditingTradeId,
  setShowEditModal,
  filterSearch,
  setFilterSearch,
  filterDir,
  setFilterDir,
  filterOutcome,
  setFilterOutcome,
  filterSession,
  setFilterSession,
  filterSetup,
  setFilterSetup,
  filterSort,
  setFilterSort
}) {
  const [expandedNotes, setExpandedNotes] = useState({})

  let filtered = trades.filter(t => {
    if (filterSearch && !t.note.toLowerCase().includes(filterSearch.toLowerCase())) return false
    if (filterDir && t.direction !== filterDir) return false
    if (filterOutcome && t.outcome !== filterOutcome) return false
    if (filterSession && t.session !== filterSession) return false
    if (filterSetup && t.setup !== filterSetup) return false
    return true
  })

  if (filterSort === 'oldest') filtered.sort((a, b) => a.date.localeCompare(b.date))
  else if (filterSort === 'best') filtered.sort((a, b) => b.pnl - a.pnl)
  else if (filterSort === 'worst') filtered.sort((a, b) => a.pnl - b.pnl)

  return (
    <div id="tab-history" className="section active">
      <div className="filter-bar">
        <input
          type="text"
          placeholder="Search notes..."
          value={filterSearch}
          onChange={e => setFilterSearch(e.target.value)}
        />
        <select value={filterDir} onChange={e => setFilterDir(e.target.value)}>
          <option value="">All directions</option>
          <option value="BUY">BUY</option>
          <option value="SELL">SELL</option>
        </select>
        <select value={filterOutcome} onChange={e => setFilterOutcome(e.target.value)}>
          <option value="">All outcomes</option>
          <option value="WIN">WIN</option>
          <option value="LOSS">LOSS</option>
          <option value="BE">Breakeven</option>
        </select>
        <select value={filterSession} onChange={e => setFilterSession(e.target.value)}>
          <option value="">All sessions</option>
          <option value="Asian">Asian</option>
          <option value="London">London</option>
          <option value="NY">New York</option>
          <option value="LN-NY">LN–NY Overlap</option>
        </select>
        <select value={filterSetup} onChange={e => setFilterSetup(e.target.value)}>
          <option value="">All setups</option>
          <option value="A+ Setup">A+ Setup</option>
          <option value="Breakout">Breakout</option>
          <option value="Reversal">Reversal</option>
          <option value="News">News</option>
          <option value="FOMO">FOMO</option>
          <option value="Revenge">Revenge</option>
          <option value="Other">Other</option>
        </select>
        <select value={filterSort} onChange={e => setFilterSort(e.target.value)}>
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
          <option value="best">Best P&L</option>
          <option value="worst">Worst P&L</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state">No trades match the current filters</div>
      ) : (
        <div id="history-list">
          {filtered.map(t => (
            <div key={t.id} className="trade-item cursor-pointer">
              <span className={`tag tag-${t.direction.toLowerCase()}`}>{t.direction}</span>
              <span className="td-date">{t.date}</span>
              <span className="td-price">
                {t.entry} → {t.exit}
                <br />
                <span className="small-muted">
                  {t.amount > 0 ? `$${t.amount.toFixed(2)} invested` : `${t.lots} lot`}
                </span>
              </span>
              <span className="td-meta">
                {t.session && <span className="tag-session">{t.session}</span>}
                {t.setup && <span className="tag-setup">{t.setup}</span>}
                {t.rr && (
                  <span className={`td-rr ${t.rr >= 1.5 ? 'good' : t.rr < 1 ? 'bad' : ''}`}>
                    R:R {t.rr}
                  </span>
                )}
              </span>
              <span className={`td-pnl ${t.pnl >= 0 ? 'pos' : 'neg'}`}>
                {t.pnl >= 0 ? '+' : ''}${Math.abs(t.pnl).toFixed(2)}
              </span>
              <button
                className="del-btn"
                onClick={e => {
                  e.stopPropagation()
                  onDeleteTrade(t.id)
                }}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function CalendarTab({ trades }) {
  const [calMonth, setCalMonth] = useState(new Date().getMonth())
  const [calYear, setCalYear] = useState(new Date().getFullYear())
  const [selectedCalDay, setSelectedCalDay] = useState(null)

  const formatDate = (y, m, d) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  const fmtDate = (dateString) => new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(dateString + 'T00:00:00'))

  const dayTrades = (y, m, d) => {
    const key = formatDate(y, m, d)
    return trades.filter(t => t.date === key)
  }

  const renderCells = () => {
    const first = new Date(calYear, calMonth, 1).getDay()
    const days = new Date(calYear, calMonth + 1, 0).getDate()
    const cells = []

    for (let i = 0; i < first; i += 1) {
      cells.push(<div key={`empty-${i}`} className="cal-day empty"></div>)
    }

    for (let d = 1; d <= days; d += 1) {
      const ts = dayTrades(calYear, calMonth, d)
      const pnl = ts.reduce((sum, trade) => sum + trade.pnl, 0)
      const cls = ts.length ? (pnl > 0.01 ? 'win' : pnl < -0.01 ? 'loss' : 'be') : ''
      const today = new Date()
      const isToday = d === today.getDate() && calMonth === today.getMonth() && calYear === today.getFullYear()
      const selected = d === selectedCalDay
      cells.push(
        <div
          key={`day-${d}`}
          className={`cal-day ${cls}${isToday ? ' today' : ''}${selected ? ' selected' : ''}`}
          onClick={() => setSelectedCalDay(d)}
        >
          <div className="cal-day-num">{d}</div>
          {ts.length > 0 && <div className="cal-pnl">{pnl >= 0 ? '+' : ''}${Math.abs(pnl).toFixed(0)}</div>}
          {ts.length > 0 && <div className="cal-trade-count">{ts.length}t</div>}
        </div>
      )
    }

    return cells
  }

  const selectedTrades = selectedCalDay ? dayTrades(calYear, calMonth, selectedCalDay) : []
  const selectedDate = selectedCalDay ? formatDate(calYear, calMonth, selectedCalDay) : ''
  const selectedTotal = selectedTrades.reduce((sum, trade) => sum + trade.pnl, 0)

  const changeMonth = (delta) => {
    let nextMonth = calMonth + delta
    let nextYear = calYear
    if (nextMonth < 0) { nextMonth = 11; nextYear -= 1 }
    if (nextMonth > 11) { nextMonth = 0; nextYear += 1 }
    setCalMonth(nextMonth)
    setCalYear(nextYear)
    setSelectedCalDay(null)
  }

  return (
    <div id="tab-calendar" className="section active">
      <div className="card">
        <div className="cal-nav">
          <button type="button" onClick={() => changeMonth(-1)}>&#8249;</button>
          <h3>{new Date(calYear, calMonth, 1).toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
          <button type="button" onClick={() => changeMonth(1)}>&#8250;</button>
        </div>
        <div className="cal-grid">
          <div className="cal-dow">Sun</div>
          <div className="cal-dow">Mon</div>
          <div className="cal-dow">Tue</div>
          <div className="cal-dow">Wed</div>
          <div className="cal-dow">Thu</div>
          <div className="cal-dow">Fri</div>
          <div className="cal-dow">Sat</div>
        </div>
        <div className="cal-grid" id="cal-cells" style={{ marginTop: '4px' }}>
          {renderCells()}
        </div>
      </div>
      <div className="legend-row">
        <span className="legend-item win">■ Win day</span>
        <span className="legend-item loss">■ Loss day</span>
        <span className="legend-item be">■ Breakeven</span>
      </div>
      <div className="cal-day-detail">
        {selectedCalDay ? (
          <>
            <div className="cal-detail-title">
              {fmtDate(selectedDate)} — {selectedTrades.length} trade{selectedTrades.length !== 1 ? 's' : ''}
              {' '}
              <span style={{ color: selectedTotal >= 0 ? 'var(--win)' : 'var(--loss)' }}>
                {selectedTotal >= 0 ? '+' : ''}${Math.abs(selectedTotal).toFixed(2)}
              </span>
            </div>
            {selectedTrades.map(trade => (
              <div key={trade.id} className="cal-detail-trade">
                <span className={`tag tag-${trade.direction.toLowerCase()}`}>{trade.direction}</span>
                <span style={{ fontFamily: 'Consolas,monospace', color: 'var(--text-soft)' }}>
                  {trade.entry} → {trade.exit}
                </span>
                {trade.session && <span className="tag-session">{trade.session}</span>}
                {trade.setup && <span className="tag-setup">{trade.setup}</span>}
                <span className={`td-pnl ${trade.pnl >= 0 ? 'pos' : 'neg'}`} style={{ marginLeft: 'auto' }}>
                  {trade.pnl >= 0 ? '+' : ''}${Math.abs(trade.pnl).toFixed(2)}
                </span>
              </div>
            ))}
          </>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Select a day to see trade details.
          </div>
        )}
      </div>
    </div>
  )
}

function AnalyticsTab({ trades, startingBalance }) {
  const wins = trades.filter(t => t.outcome === 'WIN')
  const losses = trades.filter(t => t.outcome === 'LOSS')
  const avgWin = wins.length ? wins.reduce((sum, t) => sum + t.pnl, 0) / wins.length : 0
  const avgLoss = losses.length ? losses.reduce((sum, t) => sum + t.pnl, 0) / losses.length : 0
  const wr = trades.length ? wins.length / trades.length : 0
  const expectancy = (wr * avgWin) + ((1 - wr) * avgLoss)
  const grossWin = wins.reduce((sum, t) => sum + t.pnl, 0)
  const grossLoss = Math.abs(losses.reduce((sum, t) => sum + t.pnl, 0))
  const pf = grossLoss > 0 ? grossWin / grossLoss : null
  const rrTrades = trades.filter(t => t.rr)
  const avgRR = rrTrades.length ? rrTrades.reduce((sum, t) => sum + t.rr, 0) / rrTrades.length : null

  let peak = startingBalance
  let maxDD = 0
  let running = startingBalance;
  [...trades].reverse().forEach(t => {
    running += t.pnl
    if (running > peak) peak = running
    const dd = peak - running
    if (dd > maxDD) maxDD = dd
  })

  const breakdownRows = (items, key) => items.map(label => {
    const list = trades.filter(t => t[key] === label)
    const winsCount = list.filter(t => t.outcome === 'WIN').length
    return {
      label,
      total: list.length,
      wr: list.length ? Math.round(winsCount / list.length * 100) : 0
    }
  }).filter(row => row.total > 0)

  const sessions = breakdownRows(['Asian', 'London', 'NY', 'LN-NY'], 'session')
  const setups = breakdownRows(['A+ Setup', 'Breakout', 'Reversal', 'News', 'FOMO', 'Revenge', 'Other'], 'setup')

  const monthMap = {}
  trades.forEach(t => {
    const key = t.date.substring(0, 7)
    monthMap[key] = (monthMap[key] || 0) + t.pnl
  })
  const months = Object.keys(monthMap).sort().reverse()
  const maxAbs = months.length ? Math.max(...months.map(m => Math.abs(monthMap[m]))) : 1

  return (
    <div id="tab-analytics" className="section active">
      <div className="stats-row">
        <div className="stat">
          <div className="stat-lbl">Expectancy</div>
          <div className={`stat-val ${expectancy > 0 ? 'pos' : expectancy < 0 ? 'neg' : ''}`}>
            {trades.length ? `${expectancy >= 0 ? '+' : ''}$${expectancy.toFixed(2)}` : '—'}
          </div>
          <div className="stat-sub">per trade avg</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Avg Win</div>
          <div className="stat-val pos">{wins.length ? `+$${avgWin.toFixed(2)}` : '—'}</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Avg Loss</div>
          <div className="stat-val neg">{losses.length ? `-$${Math.abs(avgLoss).toFixed(2)}` : '—'}</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Profit Factor</div>
          <div className={`stat-val ${pf !== null ? (pf >= 1.5 ? 'pos' : pf < 1 ? 'neg' : '') : ''}`}>
            {pf !== null ? pf.toFixed(2) : '—'}
          </div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Avg R:R</div>
          <div className="stat-val gold">{avgRR !== null ? avgRR.toFixed(2) : '—'}</div>
        </div>
        <div className="stat">
          <div className="stat-lbl">Max Drawdown</div>
          <div className="stat-val neg">{maxDD > 0 ? `-$${maxDD.toFixed(2)}` : '—'}</div>
        </div>
      </div>

      <div className="card">
        <div className="card-title">Win rate by session</div>
        {sessions.length ? (
          <div>
            <div className="breakdown-header"><span>Name</span><span></span><span>Win%</span><span>Trades</span></div>
            {sessions.map(row => (
              <div key={row.label} className="breakdown-row">
                <div className="breakdown-label">{row.label}</div>
                <div className="breakdown-bar-track"><div className="breakdown-bar-fill" style={{ width: `${row.wr}%` }}></div></div>
                <div className="breakdown-wr">{row.wr}%</div>
                <div className="breakdown-cnt">{row.total}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Log trades with a session to see this.
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Win rate by setup</div>
        {setups.length ? (
          <div>
            <div className="breakdown-header"><span>Name</span><span></span><span>Win%</span><span>Trades</span></div>
            {setups.map(row => (
              <div key={row.label} className="breakdown-row">
                <div className="breakdown-label">{row.label}</div>
                <div className="breakdown-bar-track"><div className="breakdown-bar-fill" style={{ width: `${row.wr}%` }}></div></div>
                <div className="breakdown-wr">{row.wr}%</div>
                <div className="breakdown-cnt">{row.total}</div>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
            Log trades with a setup tag to see this.
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-title">Monthly P&L</div>
        <div className="monthly-bars">
          {months.length ? months.map(month => {
            const value = monthMap[month]
            const percent = Math.abs(value) / maxAbs * 100
            const label = new Date(`${month}-01`).toLocaleString('default', { month: 'short', year: '2-digit' })
            return (
              <div key={month} className="monthly-bar-row">
                <div className="monthly-bar-label">{label}</div>
                <div className="monthly-bar-track"><div className={`monthly-bar-fill ${value >= 0 ? 'pos' : 'neg'}`} style={{ width: `${percent.toFixed(1)}%` }}></div></div>
                <div className={`monthly-bar-val ${value >= 0 ? 'pos' : 'neg'}`}>
                  {value >= 0 ? '+' : ''}${value.toFixed(0)}
                </div>
              </div>
            )
          }) : (
            <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
              No trades yet.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function JournalTab({ journals, journalDate, setJournalDate, journalText, setJournalText, selectedMood, setSelectedMood, saveJournal, deleteJournalEntry, journalSaved }) {
  const moods = ['','😤','😕','😐','🙂','😎']
  const entries = Object.entries(journals).sort((a,b) => b[0].localeCompare(a[0]))
  const moodLabels = ['Terrible', 'Bad', 'Neutral', 'Good', 'Excellent']

  return (
    <div id="tab-journal" className="section active">
      <div className="card">
        <div className="card-title">Daily journal</div>
        <div className="jnl-date-row">
          <div className="field journal-date-field">
            <label>Date</label>
            <input type="date" value={journalDate} onChange={e => setJournalDate(e.target.value)} />
          </div>
        </div>
        <div className="mood-row">
          <span className="mood-label">Mindset today</span>
          <div className="mood-btns">
            {moods.slice(1).map((emoji, index) => (
              <div
                key={index + 1}
                className={`mood-btn ${selectedMood === index + 1 ? 'sel' : ''}`}
                title={moodLabels[index]}
                onClick={() => setSelectedMood(index + 1)}
              >
                {emoji}
              </div>
            ))}
          </div>
        </div>
        <div className="field">
          <label>Your thoughts</label>
          <textarea
            className="jnl-area"
            value={journalText}
            onChange={e => setJournalText(e.target.value)}
            placeholder="How did you feel today? What was the market doing?\nWhat did you learn? What mistakes did you make?\n\nThere are no rules here — write freely."
          />
        </div>
        <div className="journal-actions">
          <button className="save-btn" onClick={saveJournal}>Save entry</button>
          <span className="save-ok" style={{ display: journalSaved ? 'inline' : 'none' }}>✓ Saved</span>
        </div>
      </div>
      <div className="jnl-list">
        <div className="jnl-list-title">Past entries</div>
        {entries.length === 0 ? (
          <div className="empty-state">No journal entries yet — write your first one above</div>
        ) : entries.map(([date, entry]) => (
          <div key={date} className="jnl-entry">
            <div className="jnl-entry-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div className="jnl-entry-date">{new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date + 'T00:00:00'))}</div>
                {entry.mood ? <span className="jnl-entry-mood">{moods[entry.mood]}</span> : null}
              </div>
              <button className="jnl-del-btn" onClick={() => deleteJournalEntry(date)}>×</button>
            </div>
            <div className="jnl-entry-text">
              {entry.text.replace(/</g, '&lt;').substring(0, 200)}{entry.text.length > 200 ? '...' : ''}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default App
