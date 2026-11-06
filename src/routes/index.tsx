import { useCallback, useEffect, useMemo, useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { blink } from '@/blink/client'
import { toast } from 'sonner'
import { Activity, ArrowDownRight, ArrowUpRight, Bell, ChevronDown, ChevronRight, CircleHelp, Clock3, Copy, Crosshair, Download, FlaskConical, Gauge, LayoutDashboard, LineChart, Link2, Menu, MessageCircle, MoreHorizontal, Pause, Play, Plus, Radio, ShieldAlert, ShieldCheck, SlidersHorizontal, TrendingUp, Trophy, UsersRound, Wallet, X } from 'lucide-react'
import type { PaperTradesRow, RiskSettingsRow } from '@/lib/db-types'
import { StrategyBacktester } from '@/components/StrategyBacktester'

export const Route = createFileRoute('/')({
  head: () => ({ meta: [
    { title: 'OctaXwealth · Multi-asset Trading Workspace' },
    { name: 'description', content: 'A multi-asset trading workspace for portfolio performance, market monitoring, and simulated risk controls.' },
  ] }),
  component: TradingTerminal,
})

type Asset = { symbol: string; name: string; price: number; change: number; spread: string; depth: string; seconds: number; history: number[]; market: 'crypto' | 'stock'; tvSymbol: string }
const initialAssets: Asset[] = [
  { symbol: 'BTC', name: 'Bitcoin', price: 67428.52, change: 1.82, spread: '0.04%', depth: '$2.84M', seconds: 482, market: 'crypto', tvSymbol: 'BINANCE:BTCUSDT', history: [34, 36, 32, 43, 40, 47, 45, 56, 51, 61, 58, 67, 63, 76, 70, 83, 79, 89, 86] },
  { symbol: 'ETH', name: 'Ethereum', price: 3521.84, change: 0.94, spread: '0.06%', depth: '$1.26M', seconds: 482, market: 'crypto', tvSymbol: 'BINANCE:ETHUSDT', history: [42, 38, 44, 39, 51, 47, 53, 49, 61, 57, 65, 59, 68, 64, 74, 71, 79, 76, 83] },
  { symbol: 'SOL', name: 'Solana', price: 182.67, change: -0.61, spread: '0.09%', depth: '$684K', seconds: 482, market: 'crypto', tvSymbol: 'BINANCE:SOLUSDT', history: [77, 71, 75, 63, 69, 60, 66, 56, 61, 53, 59, 50, 55, 47, 52, 44, 49, 42, 45] },
  { symbol: 'XRP', name: 'XRP', price: 0.6248, change: 2.36, spread: '0.08%', depth: '$412K', seconds: 482, market: 'crypto', tvSymbol: 'BINANCE:XRPUSDT', history: [29, 35, 31, 42, 38, 49, 45, 56, 51, 59, 56, 68, 64, 73, 69, 81, 77, 86, 89] },
  { symbol: 'AAPL', name: 'Apple', price: 232.14, change: 0.72, spread: '0.01%', depth: '$18.2M', seconds: 482, market: 'stock', tvSymbol: 'NASDAQ:AAPL', history: [42, 45, 43, 51, 48, 55, 53, 58, 56, 62, 60, 68, 65, 71, 69, 76, 73, 80, 82] },
  { symbol: 'NVDA', name: 'NVIDIA', price: 138.85, change: 2.13, spread: '0.01%', depth: '$24.7M', seconds: 482, market: 'stock', tvSymbol: 'NASDAQ:NVDA', history: [31, 35, 34, 43, 40, 49, 45, 55, 52, 60, 57, 66, 63, 72, 69, 78, 75, 84, 89] },
  { symbol: 'SPY', name: 'S&P 500 ETF', price: 579.22, change: 0.38, spread: '0.01%', depth: '$32.1M', seconds: 482, market: 'stock', tvSymbol: 'AMEX:SPY', history: [39, 42, 41, 46, 45, 51, 49, 54, 53, 58, 57, 63, 61, 66, 64, 69, 68, 74, 76] },
  { symbol: 'QQQ', name: 'Nasdaq 100 ETF', price: 495.63, change: 0.91, spread: '0.01%', depth: '$14.5M', seconds: 482, market: 'stock', tvSymbol: 'NASDAQ:QQQ', history: [35, 38, 37, 44, 42, 48, 46, 53, 51, 59, 56, 64, 61, 70, 67, 75, 72, 81, 84] },
]
const fmt = (n: number, digits = 2) => new Intl.NumberFormat('en-US', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(n)
const boolValue = (value: unknown) => value === true || value === 1 || value === 'true' || value === '1'
const normalizeRisk = (risk: RiskSettingsRow): RiskSettingsRow => ({
  ...risk,
  tradingEnabled: boolValue(risk.tradingEnabled),
  emergencyStopped: boolValue(risk.emergencyStopped),
})
const coinColor: Record<string, string> = { BTC: 'bg-amber-400/15 text-amber-300', ETH: 'bg-violet-400/15 text-violet-300', SOL: 'bg-emerald-400/15 text-emerald-300', XRP: 'bg-sky-400/15 text-sky-300', AAPL: 'bg-sky-400/15 text-sky-300', NVDA: 'bg-emerald-400/15 text-emerald-300', SPY: 'bg-indigo-400/15 text-indigo-300', QQQ: 'bg-cyan-400/15 text-cyan-300' }

const navigation = [
  { label: 'Dashboard', icon: LayoutDashboard, target: 'overview' },
  { label: 'Live Trading', icon: LineChart, target: 'markets' },
  { label: 'Bot Monitor', icon: Radio, target: 'bot-monitor' },
  { label: 'Strategy Backtesting', icon: FlaskConical, target: 'backtesting' },
  { label: 'Copy Trading', icon: Copy },
  { label: 'Trading Challenges', icon: Trophy },
  { label: 'DeFi Pools', icon: Activity },
  { label: 'Referrals', icon: UsersRound },
  { label: 'Leaderboard', icon: Trophy },
  { label: 'Broker Accounts', icon: Link2 },
  { label: 'Transactions', icon: ArrowDownRight, target: 'trades' },
  { label: 'Deposits', icon: Wallet },
  { label: 'Withdrawals', icon: ArrowUpRight },
  { label: 'KYC', icon: ShieldCheck },
  { label: 'Community', icon: MessageCircle },
  { label: 'Settings', icon: SlidersHorizontal, target: 'risk' },
]

function TradingTerminal() {
  const [user, setUser] = useState<{ id: string; displayName?: string | null; email?: string | null } | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [trades, setTrades] = useState<PaperTradesRow[]>([])
  const [risk, setRisk] = useState<RiskSettingsRow | null>(null)
  const [selected, setSelected] = useState('BTC')
  const [marketView, setMarketView] = useState<'up' | 'down'>('up')
  const [period, setPeriod] = useState('1H')
  const [orderSize, setOrderSize] = useState('250')
  const [busy, setBusy] = useState(false)
  const [assets, setAssets] = useState(initialAssets)
  const [showRisk, setShowRisk] = useState(false)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [performanceRange, setPerformanceRange] = useState('1M')
  const [marketFilter, setMarketFilter] = useState<'all' | 'crypto' | 'stock'>('all')
  const [riskDraft, setRiskDraft] = useState({ max: '1000', loss: '500' })

  useEffect(() => blink.auth.onAuthStateChanged((state) => {
    queueMicrotask(() => {
      const nextUser = state.user ? { id: state.user.id, displayName: state.user.displayName, email: state.user.email } : null
      setUser(nextUser)
      if (!state.isLoading) setAuthLoading(false)
    })
  }), [])

  const reload = useCallback(async (userId: string) => {
    try {
      const tradesTable = blink.db.table<PaperTradesRow>('paper_trades')
      const settingsTable = blink.db.table<RiskSettingsRow>('risk_settings')
      const [loadedTrades, settings] = await Promise.all([
        tradesTable.list({ where: { userId }, orderBy: { createdAt: 'desc' }, limit: 100 }),
        settingsTable.list({ where: { userId }, limit: 1 }),
      ])
      setTrades(loadedTrades)
      if (settings.length) {
        const normalized = normalizeRisk(settings[0])
        setRisk(normalized)
        setRiskDraft({ max: String(normalized.maxPositionUsd), loss: String(normalized.dailyLossLimitUsd) })
      } else {
        const initial = await settingsTable.create({ userId, maxPositionUsd: 1000, dailyLossLimitUsd: 500, tradingEnabled: true, emergencyStopped: false })
        setRisk(normalizeRisk(initial))
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Could not load your paper portfolio.')
    }
  }, [])

  useEffect(() => {
    if (!user?.id) return
    const timer = window.setTimeout(() => { void reload(user.id) }, 0)
    return () => window.clearTimeout(timer)
  }, [user?.id, reload])
  useEffect(() => {
    const tick = window.setInterval(() => {
      setAssets((current) => current.map((asset) => ({ ...asset, seconds: asset.seconds > 0 ? asset.seconds - 1 : 899 })))
    }, 1000)
    return () => window.clearInterval(tick)
  }, [])

  const activeAsset = assets.find((asset) => asset.symbol === selected) ?? assets[0]
  const visibleNavigation = navigation
  const visibleAssets = assets.filter((asset) => marketFilter === 'all' || asset.market === marketFilter)
  const openTrades = trades.filter((trade) => trade.status === 'open')
  const realized = trades.filter((trade) => trade.status === 'closed').reduce((sum, trade) => sum + Number(trade.realizedPnl || 0), 0)
  const fees = trades.reduce((sum, trade) => sum + Number(trade.fees || 0), 0)
  const unrealized = openTrades.reduce((sum, trade) => {
    const current = assets.find((asset) => asset.symbol === trade.symbol)?.price ?? Number(trade.entryPrice)
    return sum + (trade.side === 'up' ? current - Number(trade.entryPrice) : Number(trade.entryPrice) - current) * Number(trade.quantity) - Number(trade.fees)
  }, 0)
  const todayStart = new Date(); todayStart.setUTCHours(0, 0, 0, 0)
  const todayRealized = trades.filter((trade) => trade.status === 'closed' && trade.closedAt && new Date(trade.closedAt) >= todayStart).reduce((sum, trade) => sum + Number(trade.realizedPnl || 0), 0)
  const dailyPnl = todayRealized + unrealized
  const winRate = useMemo(() => {
    const closed = trades.filter((trade) => trade.status === 'closed')
    return closed.length ? Math.round((closed.filter((trade) => Number(trade.realizedPnl) > 0).length / closed.length) * 100) : 0
  }, [trades])
  const portfolioValue = 25000 + realized + unrealized
  const activeRisk = risk?.emergencyStopped ? 'Emergency stop' : risk?.tradingEnabled ? 'Paper engine active' : 'Engine paused'
  const countdown = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`
  const closedTrades = trades.filter((trade) => trade.status === 'closed' && trade.closedAt).slice().sort((a, b) => new Date(a.closedAt || '').getTime() - new Date(b.closedAt || '').getTime())
  const rangeStart = new Date()
  if (performanceRange === '1D') rangeStart.setUTCHours(0, 0, 0, 0)
  else if (performanceRange === '1W') rangeStart.setDate(rangeStart.getDate() - 7)
  else if (performanceRange === '1M') rangeStart.setMonth(rangeStart.getMonth() - 1)
  else if (performanceRange === '1Y') rangeStart.setFullYear(rangeStart.getFullYear() - 1)
  else rangeStart.setTime(0)
  const beforeRangeValue = 25000 + closedTrades.filter((trade) => new Date(trade.closedAt || '') < rangeStart).reduce((sum, trade) => sum + Number(trade.realizedPnl || 0), 0)
  const rangeTrades = closedTrades.filter((trade) => performanceRange === 'ALL' || new Date(trade.closedAt || '') >= rangeStart)
  const performanceValues = [beforeRangeValue]
  rangeTrades.forEach((trade) => performanceValues.push(performanceValues[performanceValues.length - 1] + Number(trade.realizedPnl || 0)))
  const performanceMin = Math.min(...performanceValues)
  const performanceMax = Math.max(...performanceValues)
  const performanceSpan = performanceMax - performanceMin || 1
  const performancePath = performanceValues.length < 2 ? 'M 0 50 L 100 50' : performanceValues.map((value, index) => `${index === 0 ? 'M' : 'L'} ${(index / Math.max(1, performanceValues.length - 1)) * 100} ${90 - ((value - performanceMin) / performanceSpan) * 80}`).join(' ')
  const performanceAreaPath = `${performancePath} L 100 100 L 0 100 Z`

  async function placePaperOrder(side: 'up' | 'down') {
    if (!user || !risk) return
    const size = Number(orderSize)
    if (!Number.isFinite(size) || size <= 0) return toast.error('Enter a valid order size.')
    if (risk.emergencyStopped || !risk.tradingEnabled) return toast.error('Paper execution is paused. Resume the engine first.')
    const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0)
    const dayClosedPnl = trades.filter((trade) => trade.status === 'closed' && trade.closedAt && new Date(trade.closedAt) >= startOfDay).reduce((sum, trade) => sum + Number(trade.realizedPnl), 0)
    if (dayClosedPnl + unrealized <= -Number(risk.dailyLossLimitUsd)) {
      await updateRisk({ tradingEnabled: false, emergencyStopped: true })
      return toast.error('Daily loss stop reached. New paper entries are disabled.')
    }
    if (size > Number(risk.maxPositionUsd)) return toast.error('Order exceeds your per-position limit.')
    if (openTrades.some((trade) => trade.symbol === selected)) return toast.error(`You already have an open ${selected} position.`)
    setBusy(true)
    try {
      const fee = size * 0.0008
      const created = await blink.db.table<PaperTradesRow>('paper_trades').create({
        userId: user.id, symbol: selected, side, orderType: 'paper', status: 'open', quantity: size / activeAsset.price,
        entryPrice: activeAsset.price, fees: fee, realizedPnl: 0,
      })
      setTrades((current) => [created, ...current])
      toast.success(`${side.toUpperCase()} paper position opened`, { description: `${selected} · $${fmt(size)} notional` })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Paper order could not be placed.')
    } finally { setBusy(false) }
  }

  async function closeTrade(trade: PaperTradesRow) {
    const price = assets.find((asset) => asset.symbol === trade.symbol)?.price ?? Number(trade.entryPrice)
    const fee = price * Number(trade.quantity) * 0.0008
    const pnl = (trade.side === 'up' ? price - Number(trade.entryPrice) : Number(trade.entryPrice) - price) * Number(trade.quantity)
    try {
      const closedAt = new Date().toISOString()
      const netPnl = pnl - fee - Number(trade.fees)
      await blink.db.table<PaperTradesRow>('paper_trades').update(trade.id, { status: 'closed', exitPrice: price, closedAt, realizedPnl: netPnl, fees: Number(trade.fees) + fee })
      const startOfDay = new Date(); startOfDay.setUTCHours(0, 0, 0, 0)
      const dayClosedPnl = trades.filter((item) => item.status === 'closed' && item.closedAt && new Date(item.closedAt) >= startOfDay).reduce((sum, item) => sum + Number(item.realizedPnl), 0)
      if (risk && dayClosedPnl + netPnl <= -Number(risk.dailyLossLimitUsd)) await updateRisk({ tradingEnabled: false, emergencyStopped: true })
      if (user) await reload(user.id)
      toast.success(`${trade.symbol} position closed`, { description: `Realized ${netPnl >= 0 ? '+' : ''}$${fmt(netPnl)} after fees` })
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not close position.') }
  }

  async function updateRisk(patch: Partial<RiskSettingsRow>) {
    if (!risk || !user) return
    try {
      const saved = await blink.db.table<RiskSettingsRow>('risk_settings').update(risk.id, { ...patch, updatedAt: new Date().toISOString() })
      setRisk(normalizeRisk(saved))
      toast.success('Risk settings updated.')
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update risk settings.') }
  }

  function saveRisk() {
    const max = Number(riskDraft.max); const loss = Number(riskDraft.loss)
    if (!Number.isFinite(max) || max <= 0 || !Number.isFinite(loss) || loss <= 0) return toast.error('Set positive limits for both controls.')
    void updateRisk({ maxPositionUsd: max, dailyLossLimitUsd: loss })
    setShowRisk(false)
  }

  function exportReport() {
    const rows = [
      ['Symbol', 'Side', 'Status', 'Quantity', 'Entry price', 'Exit price', 'Fees', 'Realized P&L', 'Opened at', 'Closed at'],
      ...trades.map((trade) => [trade.symbol, trade.side, trade.status, trade.quantity, trade.entryPrice, trade.exitPrice ?? '', trade.fees, trade.realizedPnl, trade.createdAt, trade.closedAt ?? '']),
    ]
    const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'octaxwealth-paper-trades.csv'
    link.click()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    toast.success('Paper trade report downloaded.')
  }

  if (authLoading) return <main className="grid min-h-dvh place-items-center bg-background"><div className="flex items-center gap-3 text-muted-foreground"><span className="h-2 w-2 animate-pulse rounded-full bg-primary" />Loading secure trading workspace…</div></main>
  if (!user) return <main className="grid min-h-dvh place-items-center bg-background px-6"><div className="w-full max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-xl"><div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-xl bg-primary/15 text-primary"><Activity size={22} /></div><h1 className="text-2xl font-semibold tracking-tight">OctaXwealth</h1><p className="mt-3 text-sm leading-6 text-muted-foreground">Sign in to access your private multi-asset portfolio, paper orders, and risk controls.</p><button onClick={() => blink.auth.login()} className="mt-7 w-full rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[.98]">Sign in or create account</button><p className="mt-4 text-xs text-muted-foreground">All execution in this workspace is simulated.</p></div></main>

  return (
    <main className="min-h-dvh bg-background text-foreground">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-background/90 backdrop-blur-xl">
        <div className="mx-auto flex h-[68px] max-w-[1600px] items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3"><button aria-label="Open navigation" onClick={() => setMobileSidebarOpen((open) => !open)} className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground transition hover:bg-secondary hover:text-foreground lg:hidden"><Menu size={17}/></button><div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><Activity size={18} /></div><div><p className="text-sm font-bold tracking-tight">OCTAX<span className="text-primary">WEALTH</span></p><p className="hidden text-[10px] tracking-[.19em] text-muted-foreground sm:block">MULTI-ASSET TRADING WORKSPACE</p></div></div>
          <nav className="hidden items-center gap-1 rounded-lg border border-border bg-card/70 p-1 md:flex"><button onClick={() => { setActiveNav('Dashboard'); document.getElementById('overview')?.scrollIntoView({ behavior: 'smooth', block: 'start' }) }} className="rounded-md bg-secondary px-4 py-2 text-xs font-semibold text-foreground">Overview</button><button onClick={() => document.getElementById('trades')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-md px-4 py-2 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground">Positions</button><button onClick={() => document.getElementById('performance')?.scrollIntoView({ behavior: 'smooth' })} className="rounded-md px-4 py-2 text-xs text-muted-foreground transition hover:bg-secondary hover:text-foreground">Reports</button></nav>
          <div className="flex items-center gap-2 sm:gap-4"><span className="hidden items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1.5 text-[11px] font-medium text-primary sm:flex"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-primary" />PAPER MODE</span><button aria-label="Notifications" onClick={() => toast('You’re all caught up.')} className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground transition hover:bg-secondary hover:text-foreground"><Bell size={17} /><span className="absolute right-2 top-2 h-1.5 w-1.5 rounded-full bg-primary" /></button><div className="hidden h-8 w-px bg-border sm:block"/><div className="relative"><button onClick={() => setShowAccountMenu((open) => !open)} aria-expanded={showAccountMenu} aria-label="Open account menu" className="flex items-center gap-2 rounded-lg p-1.5 transition hover:bg-secondary"><div className="grid h-8 w-8 place-items-center rounded-full bg-accent text-xs font-bold text-accent-foreground">{(user.displayName || user.email || 'T')[0].toUpperCase()}</div><span className="hidden max-w-28 truncate text-xs font-medium sm:block">{user.displayName || user.email?.split('@')[0]}</span><ChevronDown size={13} className="hidden text-muted-foreground sm:block" /></button>{showAccountMenu && <div className="absolute right-0 top-12 z-50 w-56 rounded-lg border border-border bg-popover p-2 shadow-xl"><p className="truncate px-2 py-2 text-xs text-muted-foreground">{user.email}</p><button onClick={() => blink.auth.logout()} className="w-full rounded-md px-2 py-2 text-left text-xs font-medium transition hover:bg-secondary">Sign out</button></div>}</div></div>
        </div>
      </header>
      <div className="mx-auto flex w-full max-w-[1680px] flex-1">
        {mobileSidebarOpen && <button aria-label="Close navigation" onClick={() => setMobileSidebarOpen(false)} className="fixed inset-x-0 bottom-0 top-[68px] z-30 bg-background/60 backdrop-blur-sm lg:hidden"/>}
        <aside className={`${mobileSidebarOpen ? 'fixed' : 'hidden'} inset-y-[68px] left-0 z-40 w-64 border-r border-border bg-sidebar lg:sticky lg:top-[68px] lg:block lg:h-[calc(100dvh-68px)] lg:shrink-0`}>
          <div className="flex h-full flex-col overflow-y-auto px-3 py-5">
            <p className="px-3 pb-3 text-[9px] font-semibold uppercase tracking-[.18em] text-muted-foreground">Workspace</p>
            <nav aria-label="Main navigation" className="space-y-1">{visibleNavigation.map((item) => <button key={item.label} onClick={() => { if (item.target) { setActiveNav(item.label); document.getElementById(item.target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }) } else { toast(`${item.label} isn’t connected in this workspace yet.`) } setMobileSidebarOpen(false) }} className={`flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left text-xs font-medium transition ${activeNav === item.label ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'}`}><item.icon size={16}/><span>{item.label}</span>{item.label === 'Live Trading' && <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary"/>}</button>)}</nav>
            <div className="mt-auto border-t border-border pt-4"><div className="rounded-lg border border-border bg-background/60 p-3"><div className="flex items-center gap-2 text-[10px] font-semibold text-primary"><ShieldCheck size={13}/>PAPER ACCOUNT</div><p className="mt-2 text-[10px] leading-4 text-muted-foreground">All orders are simulated. Live broker execution is not connected.</p></div></div>
          </div>
        </aside>
        <div className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">
        <div id="overview" className="mb-6 flex scroll-mt-24 flex-wrap items-end justify-between gap-4"><div><div className="mb-2 flex items-center gap-2 text-[11px] font-medium uppercase tracking-[.16em] text-muted-foreground"><span className="text-primary">Workspace</span><ChevronRight size={12}/><span>Dashboard</span></div><h1 className="text-2xl font-semibold tracking-tight md:text-[30px]">Portfolio dashboard</h1><p className="mt-1 text-sm text-muted-foreground">Your multi-asset watchlist, portfolio health, and paper execution.</p></div><div className="flex items-center gap-2"><button onClick={() => setShowRisk(true)} className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3.5 py-2.5 text-xs font-semibold transition hover:bg-secondary"><SlidersHorizontal size={14}/>Risk settings</button><button onClick={() => updateRisk({ emergencyStopped: true, tradingEnabled: false })} className="inline-flex items-center gap-2 rounded-lg bg-destructive/10 px-3.5 py-2.5 text-xs font-semibold text-destructive ring-1 ring-inset ring-destructive/25 transition hover:bg-destructive/15 active:scale-[.98]"><ShieldAlert size={14}/>Emergency stop</button></div></div>
        <div className="mb-5 grid gap-3 rounded-xl border border-border bg-card/70 p-3 sm:grid-cols-3 sm:p-4"><div className="flex items-center gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><Radio size={17}/></span><div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Paper status</p><p className="mt-0.5 text-xs font-semibold">{activeRisk === 'Paper engine active' ? 'Paper execution ready' : activeRisk}</p></div><span className={`ml-auto h-2 w-2 rounded-full ${risk?.tradingEnabled && !risk?.emergencyStopped ? 'bg-primary shadow-[0_0_10px_var(--primary)]' : 'bg-destructive'}`}/></div><div className="flex items-center gap-3 border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"><span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/70 text-accent-foreground"><ShieldCheck size={17}/></span><div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Risk guard</p><p className="mt-0.5 text-xs font-semibold">${fmt(Number(risk?.maxPositionUsd ?? 1000), 0)} max · ${fmt(Number(risk?.dailyLossLimitUsd ?? 500), 0)} stop</p></div></div><div className="flex items-center gap-3 border-t border-border pt-3 sm:border-l sm:border-t-0 sm:pl-5 sm:pt-0"><span className="grid h-9 w-9 place-items-center rounded-lg bg-sky-400/10 text-sky-300"><Clock3 size={17}/></span><div><p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Market cycle</p><p className="mt-0.5 text-xs font-semibold">15-minute · resets in {countdown(activeAsset.seconds)}</p></div></div></div>
        <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{[
          { label: 'Portfolio value', value: `$${fmt(portfolioValue)}`, change: 'Paper account · $25,000 start', icon: Wallet, positive: true },
          { label: 'Daily P&L', value: `${dailyPnl >= 0 ? '+' : '−'}$${fmt(Math.abs(dailyPnl))}`, change: 'Realized today + open P&L', icon: TrendingUp, positive: dailyPnl >= 0 },
          { label: 'Realized P&L', value: `${realized >= 0 ? '+' : '−'}$${fmt(Math.abs(realized))}`, change: `${trades.filter((trade) => trade.status === 'closed').length} closed trades`, icon: Activity, positive: realized >= 0 },
          { label: 'Unrealized P&L', value: `${unrealized >= 0 ? '+' : '−'}$${fmt(Math.abs(unrealized))}`, change: `${openTrades.length} active position${openTrades.length === 1 ? '' : 's'}`, icon: Crosshair, positive: unrealized >= 0 },
          { label: 'Trading fees', value: `$${fmt(fees)}`, change: `Win rate ${winRate}%`, icon: Gauge, positive: true },
        ].map((metric) => <article key={metric.label} className="group rounded-xl border border-border bg-card p-4 transition duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-lg hover:shadow-black/10 sm:p-5"><div className="flex items-start justify-between"><span className="text-xs font-medium text-muted-foreground">{metric.label}</span><metric.icon size={16} className="text-muted-foreground transition group-hover:text-primary"/></div><p className={`mt-3 truncate font-mono text-xl font-semibold tracking-tight sm:text-2xl ${metric.positive ? 'text-emerald-400' : 'text-destructive'}`}>{metric.value}</p><p className="mt-1.5 text-[11px] text-muted-foreground">{metric.change}</p></article>)}</div>
        <section id="markets" className="mb-5 grid scroll-mt-24 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,.9fr)]">
          <article className="overflow-hidden rounded-xl border border-border bg-card"><div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-4 md:px-5"><div className="flex items-center gap-3"><div className={`grid h-9 w-9 place-items-center rounded-full text-xs font-bold ${coinColor[selected]}`}>{selected.slice(0,1)}</div><div><div className="flex items-center gap-2"><h2 className="text-sm font-semibold">{activeAsset.name}</h2><span className="rounded bg-secondary px-1.5 py-0.5 text-[9px] font-semibold text-muted-foreground">{activeAsset.market === 'crypto' ? `${selected}/USD` : selected}</span></div><p className="mt-0.5 font-mono text-xs text-muted-foreground">{activeAsset.market === 'crypto' ? 'Cryptocurrency pair' : 'Stock / ETF'} · TradingView chart</p></div></div><div className="flex items-center gap-3"><div className="text-right"><p className="font-mono text-sm font-semibold">${fmt(activeAsset.price, selected === 'XRP' ? 4 : 2)}</p><p className={`text-[11px] font-semibold ${activeAsset.change >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>{activeAsset.change >= 0 ? '+' : ''}{activeAsset.change.toFixed(2)}% <span className="font-normal text-muted-foreground">sample 24h</span></p></div><button aria-label="More market actions" onClick={() => toast('Select a symbol from the watchlist to change this chart.')} className="rounded-md p-2 text-muted-foreground hover:bg-secondary"><MoreHorizontal size={17}/></button></div></div>
            <div className="flex items-center justify-between px-4 pt-4 md:px-5"><div className="flex items-center gap-1 rounded-md bg-secondary/70 p-1">{['1H','4H','1D'].map((item) => <button key={item} onClick={() => setPeriod(item)} className={`rounded px-2.5 py-1 text-[10px] font-semibold ${period === item ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{item}</button>)}</div><div className="flex items-center gap-3 text-[10px] text-muted-foreground"><span className="hidden items-center gap-1 sm:flex"><span className="h-1.5 w-1.5 rounded-full bg-primary"/>TradingView</span><span>Spread {activeAsset.spread}</span></div></div>
            <div className="h-[280px] px-2 pb-2 pt-3 sm:h-[340px] md:px-4"><iframe key={`${activeAsset.tvSymbol}-${period}`} title={`${activeAsset.name} TradingView chart`} src={`https://s.tradingview.com/widgetembed/?frameElementId=octax-${selected}&symbol=${encodeURIComponent(activeAsset.tvSymbol)}&interval=${period === '1H' ? '60' : period === '4H' ? '240' : 'D'}&hidesidetoolbar=0&symboledit=1&saveimage=0&toolbarbg=%23111620&studies=%5B%5D&theme=dark&style=1&timezone=Etc%2FUTC&withdateranges=1&hideideas=1&locale=en`} className="h-full w-full border-0" loading="lazy" allowFullScreen/></div>
            <div className="border-t border-border px-3 py-3 md:px-5"><div className="mb-2 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-[10px] font-semibold uppercase tracking-wider">Unified watchlist</h3><p className="mt-0.5 text-[9px] text-muted-foreground">Crypto pairs and US stocks / ETFs · sample quote labels</p></div><div className="flex gap-1 rounded-md bg-secondary/70 p-1">{(['all','crypto','stock'] as const).map((filter) => <button key={filter} onClick={() => setMarketFilter(filter)} className={`rounded px-2 py-1 text-[9px] font-semibold capitalize transition ${marketFilter === filter ? 'bg-background text-foreground' : 'text-muted-foreground hover:text-foreground'}`}>{filter === 'stock' ? 'Stocks / ETFs' : filter === 'all' ? 'All' : 'Crypto'}</button>)}</div></div><div className="flex overflow-x-auto">{visibleAssets.map((asset) => <button key={asset.symbol} onClick={() => setSelected(asset.symbol)} className={`min-w-[94px] border-r border-border px-3 py-2 text-left transition last:border-r-0 hover:bg-secondary/50 ${asset.symbol === selected ? 'bg-secondary/35' : ''}`}><span className="text-[10px] font-semibold text-muted-foreground">{asset.symbol}</span><p className="mt-1 truncate font-mono text-xs font-semibold">${fmt(asset.price, asset.symbol === 'XRP' ? 4 : 2)}</p><span className={`text-[10px] ${asset.change >= 0 ? 'text-emerald-400' : 'text-destructive'}`}>{asset.change >= 0 ? '+' : ''}{asset.change.toFixed(2)}%</span></button>)}</div></div>
          </article>
          <article className="rounded-xl border border-border bg-card p-4 md:p-5"><div className="mb-4 flex items-start justify-between"><div><div className="flex items-center gap-2"><h2 className="text-sm font-semibold">Paper order</h2><span className="rounded-full bg-primary/10 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-primary">simulated</span></div><p className="mt-1 text-[11px] text-muted-foreground">{selected} · settles at market cycle end</p></div><button aria-label="Order help" className="text-muted-foreground hover:text-foreground"><CircleHelp size={16}/></button></div>
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary/70 p-1"><button onClick={() => setMarketView('up')} className={`flex items-center justify-center gap-2 rounded-md py-2.5 text-xs font-semibold transition ${marketView === 'up' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><ArrowUpRight size={15}/>UP</button><button onClick={() => setMarketView('down')} className={`flex items-center justify-center gap-2 rounded-md py-2.5 text-xs font-semibold transition ${marketView === 'down' ? 'bg-destructive text-destructive-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}><ArrowDownRight size={15}/>DOWN</button></div>
            <div className="mt-5"><div className="mb-2 flex items-center justify-between"><label htmlFor="size" className="text-xs font-medium">Position size</label><span className="text-[10px] text-muted-foreground">Limit ${fmt(Number(risk?.maxPositionUsd ?? 1000), 0)}</span></div><div className="flex items-center rounded-lg border border-input bg-background px-3 focus-within:ring-1 focus-within:ring-ring"><span className="font-mono text-sm text-muted-foreground">$</span><input id="size" type="number" min="1" max={risk?.maxPositionUsd ?? 1000} value={orderSize} onChange={(event) => setOrderSize(event.target.value)} className="h-11 w-full bg-transparent px-2 font-mono text-sm outline-none"/><span className="text-[10px] text-muted-foreground">USD</span></div><div className="mt-2 grid grid-cols-4 gap-2">{['100','250','500','1000'].map((amount) => <button key={amount} onClick={() => setOrderSize(amount)} className="rounded-md border border-border py-1.5 text-[10px] font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground">${amount}</button>)}</div></div>
            <div className="mt-4 space-y-2 rounded-lg bg-background/70 p-3"><div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Reference price</span><span className="font-mono">${fmt(activeAsset.price, selected === 'XRP' ? 4 : 2)}</span></div><div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Estimated fee</span><span className="font-mono">${fmt(Number(orderSize || 0)*0.0008)}</span></div><div className="flex justify-between text-[11px]"><span className="text-muted-foreground">Sample clock</span><span className="font-mono text-accent-foreground">{countdown(activeAsset.seconds)}</span></div></div>
            <button disabled={busy || Boolean(openTrades.find((trade) => trade.symbol === selected)) || !risk?.tradingEnabled || risk.emergencyStopped} onClick={() => void placePaperOrder(marketView)} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-primary py-3 text-xs font-bold text-primary-foreground transition hover:brightness-110 active:scale-[.99] disabled:cursor-not-allowed disabled:opacity-45"><Plus size={15}/>{busy ? 'Placing paper order…' : openTrades.some((trade) => trade.symbol === selected) ? `${selected} position already open` : `Place ${marketView.toUpperCase()} paper order`}</button><p className="mt-2 text-center text-[10px] leading-4 text-muted-foreground">Simulation only. No exchange connection or real order is used.</p>
          </article>
        </section>
        <section className="mb-5 grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(300px,.8fr)]" id="trades">
          <article className="overflow-hidden rounded-xl border border-border bg-card"><div className="flex items-center justify-between border-b border-border px-4 py-4 md:px-5"><div><h2 className="text-sm font-semibold">Positions & recent trades</h2><p className="mt-1 text-[11px] text-muted-foreground">Your latest paper fills, fees, and outcomes.</p></div><button onClick={exportReport} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-[10px] font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"><Download size={13}/>Export CSV</button></div>
            <div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left"><thead><tr className="border-b border-border text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"><th className="px-4 py-3 md:px-5">Asset</th><th className="px-3 py-3">Direction</th><th className="px-3 py-3">Entry</th><th className="px-3 py-3">Exit</th><th className="px-3 py-3">Size</th><th className="px-3 py-3">Fees</th><th className="px-3 py-3">P&L</th><th className="px-3 py-3">Status</th><th className="px-4 py-3 text-right md:px-5">Action</th></tr></thead><tbody>{trades.length === 0 ? <tr><td colSpan={9} className="px-5 py-10 text-center"><div className="mx-auto mb-2 grid h-9 w-9 place-items-center rounded-full bg-secondary text-muted-foreground"><Activity size={16}/></div><p className="text-xs font-medium">No paper trades yet</p><p className="mt-1 text-[10px] text-muted-foreground">Place a simulated UP or DOWN order to start your log.</p></td></tr> : trades.slice(0, 6).map((trade) => { const current = assets.find((asset) => asset.symbol === trade.symbol)?.price ?? Number(trade.entryPrice); const pnl = trade.status === 'open' ? (trade.side === 'up' ? current - Number(trade.entryPrice) : Number(trade.entryPrice) - current) * Number(trade.quantity) - Number(trade.fees) : Number(trade.realizedPnl); return <tr key={trade.id} className="border-b border-border/70 text-[11px] last:border-b-0 hover:bg-secondary/25"><td className="px-4 py-3 md:px-5"><span className="font-semibold">{trade.symbol}</span><span className="ml-2 text-[9px] text-muted-foreground">{trade.status === 'open' ? 'OPEN' : 'CLOSED'}</span></td><td className={`px-3 py-3 font-semibold uppercase ${trade.side === 'up' ? 'text-primary' : 'text-destructive'}`}>{trade.side}</td><td className="px-3 py-3 font-mono">${fmt(Number(trade.entryPrice), trade.symbol === 'XRP' ? 4 : 2)}</td><td className="px-3 py-3 font-mono">{trade.exitPrice ? `$${fmt(Number(trade.exitPrice), trade.symbol === 'XRP' ? 4 : 2)}` : '—'}</td><td className="px-3 py-3 font-mono">${fmt(Number(trade.quantity)*Number(trade.entryPrice))}</td><td className="px-3 py-3 font-mono text-muted-foreground">${fmt(Number(trade.fees))}</td><td className={`px-3 py-3 font-mono font-semibold ${pnl >= 0 ? 'text-primary' : 'text-destructive'}`}>{pnl >= 0 ? '+' : '−'}${fmt(Math.abs(pnl))}</td><td className="px-3 py-3"><span className={`rounded-full px-2 py-1 text-[9px] font-semibold ${trade.status === 'open' ? 'bg-primary/10 text-primary' : 'bg-secondary text-muted-foreground'}`}>{trade.status === 'open' ? 'Open' : 'Closed'}</span></td><td className="px-4 py-3 text-right md:px-5">{trade.status === 'open' ? <button onClick={() => void closeTrade(trade)} className="rounded-md border border-border px-2.5 py-1.5 text-[10px] font-semibold transition hover:border-primary/40 hover:bg-secondary">Close</button> : <span className="text-[10px] text-muted-foreground">Settled</span>}</td></tr> })}</tbody></table></div>
          </article>
          <article id="bot-monitor" className="scroll-mt-24 rounded-xl border border-border bg-card p-4 md:p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Bot monitor & latest signals</h2><p className="mt-1 text-[11px] text-muted-foreground">Sample watchlists · signal-only, not automated</p></div><span className={`flex items-center gap-1.5 text-[9px] font-semibold ${risk?.tradingEnabled && !risk.emergencyStopped ? 'text-primary' : 'text-muted-foreground'}`}><span className={`h-1.5 w-1.5 rounded-full ${risk?.tradingEnabled && !risk.emergencyStopped ? 'animate-pulse bg-primary' : 'bg-muted-foreground'}`}/>{risk?.tradingEnabled && !risk.emergencyStopped ? 'ENGINE READY' : 'ENGINE PAUSED'}</span></div><div className="mt-4 grid grid-cols-2 gap-2"><div className="rounded-lg border border-border bg-background/50 p-3"><div className="flex items-center justify-between"><p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Active strategy</p><span className="rounded bg-secondary px-1.5 py-0.5 text-[8px] font-semibold text-muted-foreground">WATCH</span></div><p className="mt-2 text-xs font-semibold">Trend Pulse</p><p className="mt-1 text-[9px] text-muted-foreground">BTC · ETH · 15 min</p></div><div className="rounded-lg border border-border bg-background/50 p-3"><div className="flex items-center justify-between"><p className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">Active strategy</p><span className="rounded bg-secondary px-1.5 py-0.5 text-[8px] font-semibold text-muted-foreground">WATCH</span></div><p className="mt-2 text-xs font-semibold">Equity Momentum</p><p className="mt-1 text-[9px] text-muted-foreground">NVDA · SPY · 1 hr</p></div></div><div className="mt-4 space-y-2">{assets.map((asset) => { const signal = asset.change >= 1.25 ? 'Momentum up' : asset.change <= -0.5 ? 'Momentum down' : 'Neutral'; return <button key={asset.symbol} onClick={() => setSelected(asset.symbol)} className={`grid w-full grid-cols-[1fr_auto] items-center gap-2 rounded-lg border p-3 text-left transition hover:border-primary/35 ${selected === asset.symbol ? 'border-primary/30 bg-primary/[.035]' : 'border-border bg-background/40'}`}><div className="flex items-center gap-2.5"><span className={`grid h-8 w-8 place-items-center rounded-full text-[10px] font-bold ${coinColor[asset.symbol]}`}>{asset.symbol.slice(0,1)}</span><div><p className="text-xs font-semibold">{asset.symbol}<span className="ml-1.5 font-normal text-muted-foreground">{asset.name}</span></p><p className="mt-1 text-[9px] text-muted-foreground">Depth <span className="font-mono text-foreground/80">{asset.depth}</span> · Spread <span className="font-mono text-foreground/80">{asset.spread}</span></p><span className={`mt-1 inline-flex rounded px-1.5 py-0.5 text-[8px] font-semibold ${signal === 'Momentum up' ? 'bg-primary/10 text-primary' : signal === 'Momentum down' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}>Sample signal · {signal}</span></div></div><div className="text-right"><p className="font-mono text-xs font-semibold">${fmt(asset.price, asset.symbol === 'XRP' ? 4 : 2)}</p><p className="mt-1 flex items-center justify-end gap-1 text-[9px] text-muted-foreground"><Clock3 size={10}/>{countdown(asset.seconds)}</p></div></button> })}</div><div className="mt-4 flex items-start gap-2 rounded-lg border border-accent/60 bg-accent/25 p-3 text-[10px] leading-4 text-accent-foreground"><CircleHelp size={13} className="mt-0.5 shrink-0"/><span>Prices, depth, clocks, strategies, and momentum labels are illustrative sample data. No bot places orders and no live exchange feed is connected.</span></div></article>
        </section>
        <StrategyBacktester assets={assets} />
        <section id="performance" className="mb-5 scroll-mt-24 rounded-xl border border-border bg-card p-4 md:p-5"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-sm font-semibold">Portfolio performance</h2><p className="mt-1 text-[11px] text-muted-foreground">Realized paper-account equity · based on your closed trades</p></div><div className="flex gap-1 rounded-lg bg-secondary/70 p-1">{['1D','1W','1M','1Y','ALL'].map((range) => <button key={range} onClick={() => setPerformanceRange(range)} className={`rounded-md px-2.5 py-1.5 text-[10px] font-semibold transition ${performanceRange === range ? 'bg-background text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}>{range}</button>)}</div></div><div className="mt-4 rounded-lg border border-border/70 bg-background/50 p-3"><div className="mb-2 flex items-center justify-between text-[10px] text-muted-foreground"><span>Equity curve</span><span className={realized >= 0 ? 'font-mono text-primary' : 'font-mono text-destructive'}>{realized >= 0 ? '+' : '−'}${fmt(Math.abs(realized))} all time</span></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`Realized account performance for ${performanceRange}`} className="h-40 w-full overflow-visible sm:h-52"><defs><linearGradient id="performance-fill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="var(--primary)" stopOpacity=".28"/><stop offset="100%" stopColor="var(--primary)" stopOpacity="0"/></linearGradient></defs><line x1="0" y1="10" x2="100" y2="10" stroke="var(--border)" strokeDasharray="1 2" vectorEffect="non-scaling-stroke"/><line x1="0" y1="50" x2="100" y2="50" stroke="var(--border)" strokeDasharray="1 2" vectorEffect="non-scaling-stroke"/><line x1="0" y1="90" x2="100" y2="90" stroke="var(--border)" strokeDasharray="1 2" vectorEffect="non-scaling-stroke"/><path d={performanceAreaPath} fill="url(#performance-fill)"/><path d={performancePath} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round"/></svg><div className="mt-2 flex items-center justify-between font-mono text-[9px] text-muted-foreground"><span>${fmt(performanceMin)}</span><span>{rangeTrades.length ? `${rangeTrades.length} closed fill${rangeTrades.length === 1 ? '' : 's'} in range` : 'Close a paper trade to build this curve'}</span><span>${fmt(performanceMax)}</span></div></div></section>
        <section className="mb-8 grid gap-4 lg:grid-cols-[1fr_1fr]"><article className="rounded-xl border border-border bg-card p-4 md:p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Performance snapshot</h2><p className="mt-1 text-[11px] text-muted-foreground">Paper account · realized performance</p></div><span className="rounded-md border border-border px-2 py-1 text-[9px] font-semibold text-muted-foreground">ALL TIME</span></div><div className="mt-5 grid grid-cols-3 gap-3"><div className="rounded-lg bg-background/60 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Win rate</p><p className="mt-2 font-mono text-lg font-semibold">{winRate}%</p></div><div className="rounded-lg bg-background/60 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Closed trades</p><p className="mt-2 font-mono text-lg font-semibold">{trades.filter((trade) => trade.status === 'closed').length}</p></div><div className="rounded-lg bg-background/60 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Total fees</p><p className="mt-2 font-mono text-lg font-semibold">${fmt(fees)}</p></div></div><div className="mt-4 flex items-center gap-2 border-t border-border pt-4 text-[10px] text-muted-foreground"><Activity size={13} className="text-primary"/>Metrics calculate from your saved paper fills.</div></article><article id="risk" className="scroll-mt-24 rounded-xl border border-border bg-card p-4 md:p-5"><div className="flex items-center justify-between"><div><h2 className="text-sm font-semibold">Risk & controls</h2><p className="mt-1 text-[11px] text-muted-foreground">Protect the paper account at the execution layer.</p></div><Gauge size={17} className="text-muted-foreground"/></div><div className="mt-4 space-y-3"><div className="flex items-center justify-between rounded-lg border border-border bg-background/50 px-3 py-3"><div><p className="text-xs font-medium">Paper engine</p><p className="mt-1 text-[10px] text-muted-foreground">Controls new simulated entries.</p></div><button onClick={() => updateRisk({ tradingEnabled: !risk?.tradingEnabled, emergencyStopped: false })} aria-label={risk?.tradingEnabled ? 'Pause paper engine' : 'Resume paper engine'} className={`flex h-8 items-center gap-1.5 rounded-md px-2.5 text-[10px] font-semibold transition ${risk?.tradingEnabled && !risk.emergencyStopped ? 'bg-primary/10 text-primary hover:bg-primary/15' : 'bg-secondary text-muted-foreground hover:text-foreground'}`}>{risk?.tradingEnabled && !risk.emergencyStopped ? <><Pause size={12}/>Pause</> : <><Play size={12}/>Resume</>}</button></div><div className="grid grid-cols-2 gap-2"><div className="rounded-lg bg-background/60 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Position cap</p><p className="mt-1 font-mono text-sm font-semibold">${fmt(Number(risk?.maxPositionUsd ?? 1000), 0)}</p></div><div className="rounded-lg bg-background/60 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">Daily stop</p><p className="mt-1 font-mono text-sm font-semibold">${fmt(Number(risk?.dailyLossLimitUsd ?? 500), 0)}</p></div></div></div></article></section>
        <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border py-5 text-[10px] text-muted-foreground"><span>© 2026 OctaXwealth <span className="mx-1.5">·</span> Simulated paper environment</span><span className="flex items-center gap-1.5"><ShieldCheck size={12} className="text-primary"/>No live exchange orders are sent</span></footer>
        </div>
      </div>
      {showRisk && <div className="fixed inset-0 z-50 grid place-items-center bg-background/75 px-4 backdrop-blur-sm" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowRisk(false) }}><section role="dialog" aria-modal="true" aria-labelledby="risk-title" className="w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-2xl"><div className="flex items-start justify-between"><div><h2 id="risk-title" className="text-lg font-semibold">Risk settings</h2><p className="mt-1 text-xs text-muted-foreground">Set account-level safeguards for paper entries.</p></div><button onClick={() => setShowRisk(false)} aria-label="Close risk settings" className="rounded-md p-1.5 text-muted-foreground hover:bg-secondary"><X size={16}/></button></div><label className="mt-5 block text-xs font-medium" htmlFor="max-position">Maximum position size (USD)</label><input id="max-position" type="number" min="1" value={riskDraft.max} onChange={(event) => setRiskDraft((draft) => ({ ...draft, max: event.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none focus:ring-1 focus:ring-ring"/><label className="mt-4 block text-xs font-medium" htmlFor="daily-stop">Daily loss stop (USD)</label><input id="daily-stop" type="number" min="1" value={riskDraft.loss} onChange={(event) => setRiskDraft((draft) => ({ ...draft, loss: event.target.value }))} className="mt-2 h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-sm outline-none focus:ring-1 focus:ring-ring"/><div className="mt-5 rounded-lg border border-accent/50 bg-accent/20 p-3 text-[10px] leading-4 text-accent-foreground">Daily stop is a configured paper-risk threshold; it does not currently auto-liquidate or evaluate external exchange balances.</div><div className="mt-5 flex justify-end gap-2"><button onClick={() => setShowRisk(false)} className="rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground hover:bg-secondary">Cancel</button><button onClick={saveRisk} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110">Save limits</button></div></section></div>}
    </main>
  )
}
