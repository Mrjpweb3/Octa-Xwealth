import { useMemo, useState } from 'react'
import { Download, FlaskConical, Play, RotateCcw, Upload } from 'lucide-react'

type BacktestAsset = { symbol: string; name: string; price: number }
type Candle = { date: string; open: number; high: number; low: number; close: number; volume?: number }
type Strategy = 'ema' | 'rsi' | 'momentum'
type Trade = { entryDate: string; exitDate: string; entry: number; exit: number; returnPct: number; pnl: number }
type Result = { trades: Trade[]; equity: number[]; start: number; end: number; maxDrawdown: number; winRate: number; profitFactor: number }

const strategies: Record<Strategy, { name: string; description: string }> = {
  ema: { name: 'EMA crossover', description: 'Long when EMA 12 crosses above EMA 26; exit on a cross below.' },
  rsi: { name: 'RSI mean reversion', description: 'Enter below RSI 30; exit above RSI 55.' },
  momentum: { name: '20-day momentum', description: 'Hold long while close is above its 20-bar lookback.' },
}
function seededRandom(seed: number) {
  let value = seed >>> 0
  return () => { value = (value * 1664525 + 1013904223) >>> 0; return value / 4294967296 }
}

function sampleCandles(asset: BacktestAsset): Candle[] {
  const seed = [...asset.symbol].reduce((value, char) => value * 31 + char.charCodeAt(0), 7)
  const random = seededRandom(seed)
  const raw = [1]
  for (let i = 1; i < 252; i++) {
    const noise = (random() + random() + random() + random() - 2) * 0.024
    raw.push(raw[i - 1] * Math.exp(0.0002 + noise))
  }
  const scale = asset.price / raw[raw.length - 1]
  return raw.map((point, index) => {
    const close = point * scale
    const open = index ? raw[index - 1] * scale : close * (1 - (random() - 0.5) * 0.008)
    const wick = close * (0.002 + random() * 0.009)
    const date = new Date(Date.UTC(2025, 0, 2 + index)).toISOString().slice(0, 10)
    return { date, open, close, high: Math.max(open, close) + wick, low: Math.max(0, Math.min(open, close) - wick), volume: 100000 + random() * 900000 }
  })
}

function csvCells(line: string) {
  return line.match(/("(?:[^"]|"")*"|[^,]*)(,|$)/g)?.map((cell) => cell.replace(/,$/, '').replace(/^"|"$/g, '').replace(/""/g, '"')) ?? []
}

function parseCsv(text: string): Candle[] {
  const lines = text.trim().split(/\r?\n/).filter(Boolean)
  if (lines.length < 31) throw new Error('Upload at least 30 daily bars to run a backtest.')
  const first = csvCells(lines[0]).map((cell) => cell.trim().toLowerCase())
  const hasHeader = first.some((cell) => ['close', 'date', 'timestamp'].includes(cell))
  const columns = hasHeader ? first : ['date', 'open', 'high', 'low', 'close', 'volume']
  const index = (names: string[], fallback: number) => { const found = columns.findIndex((column) => names.includes(column)); return found < 0 ? fallback : found }
  const dateIndex = index(['date', 'time', 'timestamp'], 0)
  const closeIndex = index(['close', 'adj close', 'adj_close'], 4)
  const openIndex = index(['open'], 1); const highIndex = index(['high'], 2); const lowIndex = index(['low'], 3); const volumeIndex = index(['volume'], 5)
  const rows = (hasHeader ? lines.slice(1) : lines).map((line, row) => {
    const cells = csvCells(line)
    const numberAt = (position: number) => Number(cells[position]?.replace(/["$\s]/g, ''))
    const close = numberAt(closeIndex)
    const open = numberAt(openIndex) || close
    const high = numberAt(highIndex) || Math.max(open, close)
    const low = numberAt(lowIndex) || Math.min(open, close)
    return { date: cells[dateIndex] || String(row + 1), open, high, low, close, volume: numberAt(volumeIndex) }
  }).filter((row) => Number.isFinite(row.close) && row.close > 0)
  if (rows.length < 30) throw new Error('The CSV needs at least 30 valid, positive closing prices.')
  return rows
}

function ema(values: number[], period: number) {
  const multiplier = 2 / (period + 1)
  return values.reduce<number[]>((result, value, index) => { result.push(index ? value * multiplier + result[index - 1] * (1 - multiplier) : value); return result }, [])
}

function rsi(values: number[], index: number, period = 14) {
  if (index < period) return 50
  let gains = 0; let losses = 0
  for (let i = index - period + 1; i <= index; i++) {
    const delta = values[i] - values[i - 1]
    if (delta > 0) gains += delta; else losses -= delta
  }
  if (losses === 0) return 100
  return 100 - 100 / (1 + gains / losses)
}

function simulate(candles: Candle[], strategy: Strategy, capital: number, feeBps: number): Result {
  const closes = candles.map((candle) => candle.close)
  const fast = ema(closes, 12); const slow = ema(closes, 26)
  const rate = feeBps / 10000
  let balance = capital; let position: { date: string; price: number } | null = null
  const trades: Trade[] = []; const equity = [capital]
  const exit = (index: number) => {
    if (!position) return
    const price = closes[index]; const factor = (price / position.price) * (1 - rate) ** 2
    const pnl = balance * (factor - 1)
    trades.push({ entryDate: position.date, exitDate: candles[index].date, entry: position.price, exit: price, returnPct: (factor - 1) * 100, pnl })
    balance += pnl; position = null
  }
  for (let i = 1; i < candles.length; i++) {
    let shouldHold = false
    if (strategy === 'ema') shouldHold = i >= 26 && fast[i] > slow[i]
    if (strategy === 'rsi') shouldHold = position ? rsi(closes, i) <= 55 : rsi(closes, i) < 30
    if (strategy === 'momentum') shouldHold = i >= 20 && closes[i] > closes[i - 20]
    if (shouldHold && !position) position = { date: candles[i].date, price: closes[i] }
    else if (!shouldHold && position) exit(i)
    equity.push(position ? balance * (closes[i] / position.price) * (1 - rate) : balance)
  }
  if (position) { exit(candles.length - 1); equity[equity.length - 1] = balance }
  let peak = capital; let maxDrawdown = 0
  equity.forEach((value) => { peak = Math.max(peak, value); if (peak > 0) maxDrawdown = Math.max(maxDrawdown, (peak - value) / peak * 100) })
  const winners = trades.filter((trade) => trade.pnl > 0); const losers = trades.filter((trade) => trade.pnl < 0)
  const grossWins = winners.reduce((sum, trade) => sum + trade.pnl, 0); const grossLosses = Math.abs(losers.reduce((sum, trade) => sum + trade.pnl, 0))
  return { trades, equity, start: capital, end: balance, maxDrawdown, winRate: trades.length ? winners.length / trades.length * 100 : 0, profitFactor: grossLosses ? grossWins / grossLosses : grossWins ? Infinity : 0 }
}

function downloadResult(result: Result, symbol: string, strategy: string) {
  const lines = [['Strategy', strategy], ['Asset', symbol], ['Entry date', 'Exit date', 'Entry price', 'Exit price', 'Net P&L', 'Net return %'], ...result.trades.map((trade) => [trade.entryDate, trade.exitDate, trade.entry.toFixed(6), trade.exit.toFixed(6), trade.pnl.toFixed(2), trade.returnPct.toFixed(2)])]
  const url = URL.createObjectURL(new Blob([lines.map((row) => row.map((value) => `"${value}"`).join(',')).join('\n')], { type: 'text/csv' }))
  const link = document.createElement('a'); link.href = url; link.download = `${symbol.toLowerCase()}-strategy-backtest.csv`; link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function StrategyBacktester({ assets }: { assets: BacktestAsset[] }) {
  const [symbol, setSymbol] = useState(assets[0]?.symbol ?? '')
  const [strategy, setStrategy] = useState<Strategy>('ema')
  const [range, setRange] = useState('90')
  const [capitalText, setCapitalText] = useState('10000')
  const [feeText, setFeeText] = useState('8')
  const [csvCandles, setCsvCandles] = useState<Candle[] | null>(null)
  const [csvName, setCsvName] = useState('')
  const [error, setError] = useState('')
  const [result, setResult] = useState<Result | null>(null)
  const [ranWith, setRanWith] = useState({ strategy: 'EMA crossover', symbol: '', bars: 0, source: '' })
  const asset = assets.find((item) => item.symbol === symbol) ?? assets[0]
  const sample = useMemo(() => asset ? sampleCandles(asset) : [], [asset])

  async function importCsv(file?: File) {
    if (!file) return
    try { setCsvCandles(parseCsv(await file.text())); setCsvName(file.name); setResult(null); setError('') }
    catch (issue) { setError(issue instanceof Error ? issue.message : 'Could not read that CSV.') }
  }
  function run() {
    const capital = Number(capitalText); const fee = Number(feeText)
    if (!asset || !Number.isFinite(capital) || capital <= 0 || !Number.isFinite(fee) || fee < 0 || fee > 100) { setError('Enter a positive starting balance and a fee between 0 and 100 basis points.'); return }
    const allBars = csvCandles ?? sample
    const bars = allBars.slice(-Math.min(Number(range), allBars.length))
    setResult(simulate(bars, strategy, capital, fee))
    setRanWith({ strategy: strategies[strategy].name, symbol, bars: bars.length, source: csvName ? `CSV · ${csvName}` : 'Generated demonstration prices' })
    setError('')
  }
  function clearCsv() { setCsvCandles(null); setCsvName(''); setResult(null); setError('') }

  return <section id="backtesting" className="mb-5 scroll-mt-24 rounded-xl border border-border bg-card p-4 md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary"><FlaskConical size={17}/></span><div><h2 className="text-sm font-semibold">Strategy backtester</h2><p className="mt-1 text-[11px] text-muted-foreground">Replay a rules-based strategy on daily closing prices. Runs locally; no orders are placed.</p></div></div>{result && <button onClick={() => downloadResult(result, ranWith.symbol, ranWith.strategy)} className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-2 text-[10px] font-semibold text-muted-foreground transition hover:bg-secondary hover:text-foreground"><Download size={13}/>Export report</button>}</div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-[1.2fr_1.1fr_.8fr_.8fr_.7fr_auto]">
      <label className="text-[10px] font-medium text-muted-foreground">Market<select value={symbol} onChange={(event) => { setSymbol(event.target.value); setCsvCandles(null); setCsvName(''); setResult(null) }} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-ring">{assets.map((item) => <option key={item.symbol} value={item.symbol}>{item.symbol} · {item.name}</option>)}</select></label>
      <label className="text-[10px] font-medium text-muted-foreground">Strategy<select value={strategy} onChange={(event) => { setStrategy(event.target.value as Strategy); setResult(null) }} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-xs font-semibold text-foreground outline-none focus:ring-1 focus:ring-ring">{Object.entries(strategies).map(([key, item]) => <option key={key} value={key}>{item.name}</option>)}</select></label>
      <label className="text-[10px] font-medium text-muted-foreground">Lookback<select value={range} onChange={(event) => { setRange(event.target.value); setResult(null) }} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"><option value="30">30 bars</option><option value="90">90 bars</option><option value="180">180 bars</option><option value="252">1 year · 252 bars</option></select></label>
      <label className="text-[10px] font-medium text-muted-foreground">Start balance<input type="number" min="1" value={capitalText} onChange={(event) => { setCapitalText(event.target.value); setResult(null) }} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"/></label>
      <label className="text-[10px] font-medium text-muted-foreground">Fee · bps / side<input type="number" min="0" max="100" value={feeText} onChange={(event) => { setFeeText(event.target.value); setResult(null) }} className="mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 font-mono text-xs text-foreground outline-none focus:ring-1 focus:ring-ring"/></label>
      <button onClick={run} className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-lg bg-primary px-4 text-xs font-bold text-primary-foreground transition hover:brightness-110 active:scale-[.98]"><Play size={14}/>Run test</button>
    </div>
    <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border/70 bg-background/50 px-3 py-2.5"><div className="flex min-w-0 items-center gap-2 text-[10px] text-muted-foreground"><span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary"/><span className="truncate">{csvName ? `Imported CSV · ${csvName} · ${csvCandles?.length ?? 0} bars` : `Demo series · ${sample.length} generated daily bars · ${asset?.symbol ?? ''}`}</span></div><div className="flex items-center gap-3"><label className="inline-flex cursor-pointer items-center gap-1.5 text-[10px] font-semibold text-primary hover:text-foreground"><Upload size={13}/>Import OHLCV CSV<input type="file" accept=".csv,text/csv" onChange={(event) => { void importCsv(event.target.files?.[0]); event.currentTarget.value = '' }} className="sr-only"/></label>{csvCandles && <button onClick={clearCsv} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground"><RotateCcw size={12}/>Demo data</button>}</div></div>
    <p className="mt-2 text-[10px] leading-4 text-muted-foreground">{strategies[strategy].description} Assumes close-price fills and a fee on each side; excludes slippage, taxes, and live execution effects. {csvCandles ? 'Your imported CSV is used only in this browser session.' : 'Demo series are generated examples, not historical market data; import dated OHLCV CSV for a data-based test.'}</p>
    {error && <p role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">{error}</p>}
    {result && <div className="mt-4 border-t border-border pt-4"><div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-xs font-semibold">{ranWith.strategy} · {ranWith.symbol}</h3><p className="mt-1 text-[10px] text-muted-foreground">{ranWith.bars} bars · {ranWith.source} · fee {feeText} bps per side</p></div><span className={`rounded-full px-2.5 py-1 text-[9px] font-semibold ${result.end >= result.start ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`}>Completed</span></div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-6">{[{ label: 'Ending balance', value: `$${result.end.toLocaleString('en-US', { maximumFractionDigits: 2 })}`, good: result.end >= result.start }, { label: 'Net return', value: `${((result.end / result.start - 1) * 100).toFixed(2)}%`, good: result.end >= result.start }, { label: 'Closed trades', value: String(result.trades.length) }, { label: 'Win rate', value: `${result.winRate.toFixed(1)}%` }, { label: 'Max drawdown', value: `${result.maxDrawdown.toFixed(2)}%`, good: false }, { label: 'Profit factor', value: result.profitFactor === Infinity ? '∞' : result.profitFactor.toFixed(2) }].map((metric) => <div key={metric.label} className="rounded-lg border border-border/70 bg-background/50 p-3"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">{metric.label}</p><p className={`mt-1.5 truncate font-mono text-sm font-semibold ${metric.good === undefined ? 'text-foreground' : metric.good ? 'text-primary' : 'text-destructive'}`}>{metric.value}</p></div>)}</div>
      <div className="mt-3 rounded-lg border border-border/70 bg-background/50 p-3"><div className="mb-2 flex justify-between text-[10px] text-muted-foreground"><span>Simulated equity curve</span><span>{ranWith.bars} bars</span></div><svg viewBox="0 0 100 100" preserveAspectRatio="none" role="img" aria-label={`${ranWith.strategy} backtest equity curve`} className="h-28 w-full"><path d={result.equity.map((value, index) => ` ${index ? 'L' : 'M'} ${(index / Math.max(1, result.equity.length - 1)) * 100} ${95 - (value - Math.min(...result.equity)) / (Math.max(...result.equity) - Math.min(...result.equity) || 1) * 85}`).join('')} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round"/></svg></div>
      <div className="mt-3 overflow-x-auto rounded-lg border border-border/70"><table className="w-full min-w-[600px] text-left"><thead><tr className="border-b border-border text-[9px] font-semibold uppercase tracking-wider text-muted-foreground"><th className="px-3 py-2.5">Entry</th><th className="px-3 py-2.5">Exit</th><th className="px-3 py-2.5">Buy</th><th className="px-3 py-2.5">Sell</th><th className="px-3 py-2.5">Net P&L</th><th className="px-3 py-2.5">Return</th></tr></thead><tbody>{result.trades.length ? result.trades.slice(-5).reverse().map((trade, index) => <tr key={`${trade.entryDate}-${index}`} className="border-b border-border/60 text-[10px] last:border-0"><td className="px-3 py-2.5">{trade.entryDate}</td><td className="px-3 py-2.5">{trade.exitDate}</td><td className="px-3 py-2.5 font-mono">${trade.entry.toFixed(2)}</td><td className="px-3 py-2.5 font-mono">${trade.exit.toFixed(2)}</td><td className={`px-3 py-2.5 font-mono font-semibold ${trade.pnl >= 0 ? 'text-primary' : 'text-destructive'}`}>{trade.pnl >= 0 ? '+' : '−'}${Math.abs(trade.pnl).toFixed(2)}</td><td className="px-3 py-2.5 font-mono">{trade.returnPct.toFixed(2)}%</td></tr>) : <tr><td colSpan={6} className="px-3 py-5 text-center text-[10px] text-muted-foreground">No entries were triggered in this period. Try another strategy or longer lookback.</td></tr>}</tbody></table></div>
    </div>}
  </section>
}
