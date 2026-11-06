import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Archive, BadgeDollarSign, CalendarClock, CircleDollarSign, Pencil, Plus, RefreshCw, ShieldCheck } from 'lucide-react'
import { blink } from '@/blink/client'
import { toast } from 'sonner'
import type { EarningsEventsRow, InvestmentEarningsRow, InvestmentPlansRow, InvestmentPositionsRow } from '@/lib/db-types'
import { EventEditor, PlanEditor, type EventDraft, type PlanDraft } from './InvestmentAdminForms'

const freshPlan = (): PlanDraft => ({ name: '', assetClass: 'Multi-asset', minInvestment: '', maxInvestment: '', durationValue: '30', durationUnit: 'days', feePercent: '0', riskLevel: 'Moderate', returnType: 'fixed', calculationMethod: 'simple', returnValue: '', returnValueUnit: 'annual_percent', marketReference: '', participationRate: '', returnCapPercent: '', returnFloorPercent: '', earningsSchedule: 'monthly', calculationRules: '', startAt: '', endAt: '' })
const freshEvent = (): EventDraft => ({ name: '', eventType: 'promotion', startAt: '', endAt: '', eligibility: '', rewardValue: '', rewardUnit: 'USD', participationLimit: '', details: '' })
const dateField = (value: string | null) => value ? value.slice(0, 10) : ''
const dateValue = (value: string) => value ? `${value}T00:00:00.000Z` : null
const money = (value: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(value)
const control = 'rounded-md border border-border px-2.5 py-1.5 text-[10px] font-semibold transition hover:border-primary/40 hover:bg-secondary'

type Tab = 'plans' | 'events' | 'investments'
export function InvestmentAdminPanel({ userId, tab, onTabChange }: { userId: string; tab: Tab; onTabChange: (tab: Tab) => void }) {
  const [plans, setPlans] = useState<InvestmentPlansRow[]>([])
  const [events, setEvents] = useState<EarningsEventsRow[]>([])
  const [positions, setPositions] = useState<InvestmentPositionsRow[]>([])
  const [earnings, setEarnings] = useState<InvestmentEarningsRow[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editingPlan, setEditingPlan] = useState<string | null>(null)
  const [editingEvent, setEditingEvent] = useState<string | null>(null)
  const [planDraft, setPlanDraft] = useState(freshPlan)
  const [eventDraft, setEventDraft] = useState(freshEvent)
  const [now, setNow] = useState(0)

  const reload = useCallback(async () => {
    setLoading(true)
    try {
      const [nextPlans, nextEvents, nextPositions, nextEarnings] = await Promise.all([
        blink.db.table<InvestmentPlansRow>('investment_plans').list({ where: { scopeId: 'global' }, orderBy: { createdAt: 'desc' }, limit: 200 }),
        blink.db.table<EarningsEventsRow>('earnings_events').list({ where: { scopeId: 'global' }, orderBy: { createdAt: 'desc' }, limit: 200 }),
        blink.db.table<InvestmentPositionsRow>('investment_positions').list({ where: { scopeId: 'global' }, orderBy: { createdAt: 'desc' }, limit: 500 }),
        blink.db.table<InvestmentEarningsRow>('investment_earnings').list({ where: { scopeId: 'global' }, orderBy: { earningsDate: 'desc' }, limit: 500 }),
      ])
      setPlans(nextPlans); setEvents(nextEvents); setPositions(nextPositions); setEarnings(nextEarnings)
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not load investment records.') }
    finally { setLoading(false) }
  }, [])
  useEffect(() => {
    const timer = window.setTimeout(() => { void reload() }, 0)
    return () => window.clearTimeout(timer)
  }, [reload, userId])
  useEffect(() => {
    const initial = window.setTimeout(() => setNow(Date.now()), 0)
    const timer = window.setInterval(() => setNow(Date.now()), 60_000)
    return () => { window.clearTimeout(initial); window.clearInterval(timer) }
  }, [])

  async function savePlan(event: FormEvent) {
    event.preventDefault()
    const min = Number(planDraft.minInvestment); const max = Number(planDraft.maxInvestment)
    const duration = Number(planDraft.durationValue); const fee = Number(planDraft.feePercent); const rate = planDraft.returnValue ? Number(planDraft.returnValue) : null
    const marketReference = planDraft.marketReference.trim()
    const participationRate = planDraft.participationRate.trim() ? Number(planDraft.participationRate) : null
    const returnCapPercent = planDraft.returnCapPercent.trim() ? Number(planDraft.returnCapPercent) : null
    const returnFloorPercent = planDraft.returnFloorPercent.trim() ? Number(planDraft.returnFloorPercent) : null
    const isMarketLinked = planDraft.returnType === 'market_linked'
    const fixedTermsInvalid = !isMarketLinked && (!rate || rate <= 0)
    const marketTermsInvalid = isMarketLinked && (!marketReference || participationRate === null || !Number.isFinite(participationRate) || participationRate <= 0)
    const boundsInvalid = isMarketLinked && ((returnCapPercent !== null && (!Number.isFinite(returnCapPercent) || returnCapPercent < 0)) || (returnFloorPercent !== null && !Number.isFinite(returnFloorPercent)) || (returnCapPercent !== null && returnFloorPercent !== null && returnFloorPercent > returnCapPercent))
    if (!planDraft.name.trim() || !Number.isFinite(min) || min <= 0 || !Number.isFinite(max) || max < min || !Number.isInteger(duration) || duration < 1 || !Number.isFinite(fee) || fee < 0 || fixedTermsInvalid || marketTermsInvalid || boundsInvalid) return toast.error('Check the plan terms, return model, benchmark, participation rate, and optional cap/floor.')
    setSaving(true)
    try {
      const table = blink.db.table<InvestmentPlansRow>('investment_plans')
      const payload = { userId, scopeId: 'global', name: planDraft.name.trim(), assetClass: planDraft.assetClass, minInvestment: min, maxInvestment: max, durationValue: duration, durationUnit: planDraft.durationUnit, feePercent: fee, riskLevel: planDraft.riskLevel, returnType: planDraft.returnType, calculationMethod: planDraft.calculationMethod, returnValue: isMarketLinked ? null : rate, returnValueUnit: isMarketLinked ? 'benchmark' : planDraft.returnValueUnit, marketReference: isMarketLinked ? marketReference : '', participationRate: isMarketLinked ? participationRate : null, returnCapPercent: isMarketLinked ? returnCapPercent : null, returnFloorPercent: isMarketLinked ? returnFloorPercent : null, earningsSchedule: planDraft.earningsSchedule, calculationRules: planDraft.calculationRules.trim(), startAt: dateValue(planDraft.startAt), endAt: dateValue(planDraft.endAt), updatedAt: new Date().toISOString() }
      if (editingPlan) await table.update(editingPlan, payload)
      else await table.create({ ...payload, status: 'draft' })
      toast.success(editingPlan ? 'Investment plan updated.' : 'Plan saved as draft.')
      setEditingPlan(null); setPlanDraft(freshPlan()); await reload()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save investment plan.') }
    finally { setSaving(false) }
  }

  async function saveEvent(event: FormEvent) {
    event.preventDefault()
    if (!eventDraft.name.trim() || !eventDraft.eligibility.trim() || !eventDraft.startAt || !eventDraft.endAt || new Date(eventDraft.endAt) < new Date(eventDraft.startAt) || !Number.isFinite(Number(eventDraft.rewardValue)) || Number(eventDraft.rewardValue) < 0 || (eventDraft.participationLimit && Number(eventDraft.participationLimit) < 1)) return toast.error('Check campaign dates, eligibility, reward, and participation limit.')
    setSaving(true)
    try {
      const table = blink.db.table<EarningsEventsRow>('earnings_events')
      const payload = { userId, scopeId: 'global', name: eventDraft.name.trim(), eventType: eventDraft.eventType, startAt: dateValue(eventDraft.startAt) ?? '', endAt: dateValue(eventDraft.endAt) ?? '', eligibility: eventDraft.eligibility.trim(), rewardValue: Number(eventDraft.rewardValue), rewardUnit: eventDraft.rewardUnit, participationLimit: eventDraft.participationLimit ? Number(eventDraft.participationLimit) : null, details: eventDraft.details.trim(), updatedAt: new Date().toISOString() }
      if (editingEvent) await table.update(editingEvent, payload)
      else await table.create({ ...payload, status: 'draft' })
      toast.success(editingEvent ? 'Campaign updated.' : 'Campaign saved as draft.')
      setEditingEvent(null); setEventDraft(freshEvent()); await reload()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not save campaign.') }
    finally { setSaving(false) }
  }

  async function updateStatus(kind: 'plan' | 'event', id: string, status: string) {
    try {
      const table = kind === 'plan' ? blink.db.table<InvestmentPlansRow>('investment_plans') : blink.db.table<EarningsEventsRow>('earnings_events')
      await table.update(id, { status, updatedAt: new Date().toISOString() })
      toast.success(`${kind === 'plan' ? 'Plan' : 'Campaign'} ${status}.`)
      await reload()
    } catch (error) { toast.error(error instanceof Error ? error.message : 'Could not update status.') }
  }

  function editPlan(row: InvestmentPlansRow) {
    setEditingPlan(row.id); onTabChange('plans')
    setPlanDraft({ name: row.name, assetClass: row.assetClass, minInvestment: String(row.minInvestment), maxInvestment: String(row.maxInvestment), durationValue: String(row.durationValue), durationUnit: row.durationUnit, feePercent: String(row.feePercent), riskLevel: row.riskLevel, returnType: row.returnType, calculationMethod: row.calculationMethod, returnValue: row.returnValue == null ? '' : String(row.returnValue), returnValueUnit: row.returnValueUnit ?? 'annual_percent', marketReference: row.marketReference ?? '', participationRate: row.participationRate == null ? '' : String(row.participationRate), returnCapPercent: row.returnCapPercent == null ? '' : String(row.returnCapPercent), returnFloorPercent: row.returnFloorPercent == null ? '' : String(row.returnFloorPercent), earningsSchedule: row.earningsSchedule, calculationRules: row.calculationRules, startAt: dateField(row.startAt), endAt: dateField(row.endAt) })
  }
  function editEvent(row: EarningsEventsRow) {
    setEditingEvent(row.id); onTabChange('events')
    setEventDraft({ name: row.name, eventType: row.eventType, startAt: dateField(row.startAt), endAt: dateField(row.endAt), eligibility: row.eligibility, rewardValue: String(row.rewardValue), rewardUnit: row.rewardUnit, participationLimit: row.participationLimit == null ? '' : String(row.participationLimit), details: row.details })
  }

  const matured = (row: InvestmentPositionsRow) => row.status === 'matured' || new Date(row.maturityAt).getTime() <= now
  const activePositions = positions.filter((row) => row.status === 'active' && !matured(row))
  const accrued = earnings.reduce((sum, row) => sum + Number(row.amount), 0)
  const pending = earnings.filter((row) => row.status === 'pending').reduce((sum, row) => sum + Number(row.amount), 0)
  const paid = earnings.filter((row) => row.status === 'paid').reduce((sum, row) => sum + Number(row.amount), 0)
  const tabs: { id: Tab; label: string }[] = [{ id: 'plans', label: 'Plans' }, { id: 'events', label: 'Promotions & events' }, { id: 'investments', label: 'Investments & earnings' }]

  return <section id="investment-admin" className="mb-6 scroll-mt-24 rounded-xl border border-border bg-card p-4 md:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div className="flex items-start gap-3"><span className="grid h-9 w-9 place-items-center rounded-lg bg-accent/70 text-accent-foreground"><ShieldCheck size={17}/></span><div><p className="text-[9px] font-semibold uppercase tracking-[.18em] text-accent-foreground">Administrator workspace</p><h2 className="mt-0.5 text-lg font-semibold">Investment plans & earnings</h2><p className="mt-1 text-[10px] text-muted-foreground">Configure approved product terms and review saved investment records.</p></div></div><button onClick={() => void reload()} className={`${control} inline-flex items-center gap-1.5`}><RefreshCw size={12}/>Refresh</button></div>
    <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-5">{[{ label: 'Active investments', value: String(activePositions.length), icon: CircleDollarSign }, { label: 'Accrued earnings', value: money(accrued), icon: BadgeDollarSign }, { label: 'Paid earnings', value: money(paid), icon: BadgeDollarSign }, { label: 'Pending earnings', value: money(pending), icon: CalendarClock }, { label: 'Matured investments', value: String(positions.filter(matured).length), icon: Archive }].map((metric) => <article key={metric.label} className="rounded-lg border border-border/70 bg-background/50 p-3"><div className="flex items-center justify-between gap-1"><p className="text-[9px] uppercase tracking-wider text-muted-foreground">{metric.label}</p><metric.icon size={13} className="shrink-0 text-accent-foreground"/></div><p className="mt-2 truncate font-mono text-sm font-semibold">{metric.value}</p></article>)}</div>
    <div className="mt-4 flex flex-wrap items-center gap-1 border-b border-border pb-3">{tabs.map((item) => <button key={item.id} onClick={() => onTabChange(item.id)} className={`rounded-md px-3 py-2 text-[10px] font-semibold transition ${tab === item.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-secondary hover:text-foreground'}`}>{item.label}</button>)}{tab === 'plans' && !editingPlan && <button onClick={() => { setPlanDraft(freshPlan()); setEditingPlan('new') }} className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[10px] font-semibold text-primary-foreground"><Plus size={13}/>New plan</button>}{tab === 'events' && !editingEvent && <button onClick={() => { setEventDraft(freshEvent()); setEditingEvent('new') }} className="ml-auto inline-flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[10px] font-semibold text-primary-foreground"><Plus size={13}/>New campaign</button>}</div>
    {loading ? <p className="py-8 text-center text-xs text-muted-foreground">Loading investment records…</p> : <div className="mt-4 space-y-4">
      {tab === 'plans' && <>{editingPlan && <PlanEditor value={planDraft} onChange={setPlanDraft} onSave={(event) => void savePlan(event)} onCancel={() => { setEditingPlan(null); setPlanDraft(freshPlan()) }} saving={saving} isEditing={editingPlan !== 'new'} />}{plans.length === 0 && !editingPlan ? <Empty message="No plans yet. Create a draft with your approved product terms." /> : <div className="grid gap-3 lg:grid-cols-2">{plans.map((row) => <article key={row.id} className="rounded-lg border border-border bg-background/40 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{row.name}</h3><p className="mt-1 text-[10px] text-muted-foreground">{row.assetClass} · {row.riskLevel} risk · {row.durationValue} {row.durationUnit}</p></div><Status value={row.status}/></div><div className="mt-3 grid grid-cols-2 gap-2 text-[10px]"><p>Investment <b className="font-mono">{money(Number(row.minInvestment))}–{money(Number(row.maxInvestment))}</b></p><p>Fee <b className="font-mono">{Number(row.feePercent)}%</b></p><p>Model <b>{row.returnType.replace(/_/g, ' ')}</b></p><p>Schedule <b>{row.earningsSchedule}</b></p>{row.returnType === 'fixed' ? <p>Configured return <b className="font-mono">{row.returnValue == null ? '—' : `${row.returnValue} ${row.returnValueUnit ?? ''}`}</b></p> : <><p>Benchmark <b>{row.marketReference || 'Not set'}</b></p><p>Participation <b className="font-mono">{row.participationRate == null ? '—' : `${row.participationRate}%`}</b></p><p>Cap / floor <b className="font-mono">{row.returnCapPercent == null ? 'No cap' : `${row.returnCapPercent}%`} / {row.returnFloorPercent == null ? 'No floor' : `${row.returnFloorPercent}%`}</b></p></>}</div><p className="mt-3 line-clamp-2 text-[10px] leading-4 text-muted-foreground">{row.calculationRules}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => editPlan(row)} className={control}><Pencil size={11} className="mr-1 inline"/>Edit</button>{row.status !== 'archived' && <button onClick={() => void updateStatus('plan', row.id, row.status === 'active' ? 'paused' : 'active')} className={control}>{row.status === 'active' ? 'Pause' : 'Activate'}</button>}{row.status !== 'archived' && <button onClick={() => void updateStatus('plan', row.id, 'archived')} className={`${control} text-destructive`}>Archive</button>}</div></article>)}</div>}</>}
      {tab === 'events' && <>{editingEvent && <EventEditor value={eventDraft} onChange={setEventDraft} onSave={(event) => void saveEvent(event)} onCancel={() => { setEditingEvent(null); setEventDraft(freshEvent()) }} saving={saving} />}{events.length === 0 && !editingEvent ? <Empty message="No campaigns yet. Draft an event, promotion, bonus, or reward campaign." /> : <div className="grid gap-3 lg:grid-cols-2">{events.map((row) => <article key={row.id} className="rounded-lg border border-border bg-background/40 p-4"><div className="flex items-start justify-between gap-3"><div><h3 className="text-sm font-semibold">{row.name}</h3><p className="mt-1 text-[10px] capitalize text-muted-foreground">{row.eventType.replace(/_/g, ' ')} · {dateField(row.startAt)} – {dateField(row.endAt)}</p></div><Status value={row.status}/></div><p className="mt-3 text-[10px]">Reward <b className="font-mono">{row.rewardValue} {row.rewardUnit}</b> · Eligibility: {row.eligibility}</p><p className="mt-2 text-[10px] text-muted-foreground">Limit: {row.participationLimit ?? 'Unlimited'} · {row.details || 'No additional terms.'}</p><div className="mt-3 flex flex-wrap gap-2"><button onClick={() => editEvent(row)} className={control}><Pencil size={11} className="mr-1 inline"/>Edit</button>{row.status !== 'archived' && <button onClick={() => void updateStatus('event', row.id, row.status === 'active' ? 'paused' : 'active')} className={control}>{row.status === 'active' ? 'Pause' : 'Activate'}</button>}{row.status !== 'archived' && <button onClick={() => void updateStatus('event', row.id, 'archived')} className={`${control} text-destructive`}>Archive</button>}</div></article>)}</div>}</>}
      {tab === 'investments' && <><div><h3 className="text-sm font-semibold">Investment records</h3><p className="mt-1 text-[10px] text-muted-foreground">These totals reflect records entered in the database; earnings are not automatically calculated or paid.</p></div>{positions.length ? <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[680px] text-left text-[10px]"><thead><tr className="border-b border-border text-muted-foreground"><th className="p-3">Investor</th><th className="p-3">Plan</th><th className="p-3">Principal</th><th className="p-3">Started</th><th className="p-3">Maturity</th><th className="p-3">Status</th></tr></thead><tbody>{positions.map((row) => <tr key={row.id} className="border-b border-border/60 last:border-0"><td className="p-3 font-mono">{row.investorUserId.slice(0, 10)}…</td><td className="p-3">{plans.find((plan) => plan.id === row.planId)?.name ?? 'Plan record'}</td><td className="p-3 font-mono">{money(Number(row.principal))}</td><td className="p-3">{dateField(row.startedAt)}</td><td className="p-3">{dateField(row.maturityAt)}</td><td className="p-3"><Status value={matured(row) ? 'matured' : row.status}/></td></tr>)}</tbody></table></div> : <Empty message="No investment positions have been recorded." />}{earnings.length > 0 && <div className="overflow-x-auto rounded-lg border border-border"><table className="w-full min-w-[560px] text-left text-[10px]"><thead><tr className="border-b border-border text-muted-foreground"><th className="p-3">Investment ID</th><th className="p-3">Earnings date</th><th className="p-3">Amount</th><th className="p-3">Payout reference</th><th className="p-3">Status</th></tr></thead><tbody>{earnings.map((row) => <tr key={row.id} className="border-b border-border/60 last:border-0"><td className="p-3 font-mono">{row.investmentId.slice(0, 12)}…</td><td className="p-3">{dateField(row.earningsDate)}</td><td className="p-3 font-mono">{money(Number(row.amount))}</td><td className="p-3">{row.payoutReference || '—'}</td><td className="p-3"><Status value={row.status}/></td></tr>)}</tbody></table></div>}</>}
    </div>}
    <p className="mt-4 rounded-lg border border-accent/40 bg-accent/15 p-3 text-[10px] leading-4 text-accent-foreground">Configured terms are administrative records, not a promise of returns. No partner market feed, investor onboarding, automatic accrual engine, or payout processor is connected here.</p>
  </section>
}

function Empty({ message }: { message: string }) { return <div className="rounded-lg border border-dashed border-border px-4 py-8 text-center text-xs text-muted-foreground">{message}</div> }
function Status({ value }: { value: string }) { return <span className={`rounded-full px-2 py-1 text-[9px] font-semibold capitalize ${value === 'active' || value === 'paid' ? 'bg-primary/10 text-primary' : value === 'archived' ? 'bg-destructive/10 text-destructive' : 'bg-secondary text-muted-foreground'}`}>{value}</span> }
