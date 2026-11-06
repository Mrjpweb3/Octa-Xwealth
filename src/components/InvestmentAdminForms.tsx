import { useState, type FormEvent, type ReactNode } from 'react'

export type PlanDraft = {
  name: string; assetClass: string; minInvestment: string; maxInvestment: string; durationValue: string
  durationUnit: string; feePercent: string; riskLevel: string; returnType: string; calculationMethod: string
  returnValue: string; returnValueUnit: string; marketReference: string; participationRate: string
  returnCapPercent: string; returnFloorPercent: string; earningsSchedule: string; calculationRules: string
  startAt: string; endAt: string
}
export type EventDraft = {
  name: string; eventType: string; startAt: string; endAt: string; eligibility: string
  rewardValue: string; rewardUnit: string; participationLimit: string; details: string
}

const controlClass = 'mt-1.5 h-10 w-full rounded-lg border border-input bg-background px-3 text-xs text-foreground outline-none focus:ring-1 focus:ring-ring'
function Field({ label, children, className = '' }: { label: string; children: ReactNode; className?: string }) {
  return <label className={`block text-[10px] font-medium text-muted-foreground ${className}`}>{label}{children}</label>
}
function TextInput({ value, onChange, type = 'text', min, step, required = false }: { value: string; onChange: (value: string) => void; type?: string; min?: string; step?: string; required?: boolean }) {
  return <input className={controlClass} type={type} value={value} min={min} step={step} required={required} onChange={(event) => onChange(event.target.value)} />
}
function SelectInput({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return <select className={controlClass} value={value} onChange={(event) => onChange(event.target.value)}>{options.map((option) => <option key={option} value={option}>{option.replace(/_/g, ' ')}</option>)}</select>
}
function Actions({ onCancel, label }: { onCancel: () => void; label: string }) {
  return <div className="flex justify-end gap-2 border-t border-border pt-4"><button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-secondary">Cancel</button><button type="submit" className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110">{label}</button></div>
}

export function PlanEditor({ value, onChange, onSave, onCancel, saving, isEditing = false }: { value: PlanDraft; onChange: (next: PlanDraft) => void; onSave: (event: FormEvent) => void; onCancel: () => void; saving: boolean; isEditing?: boolean }) {
  const [step, setStep] = useState<'model' | 'terms'>(isEditing ? 'terms' : 'model')
  const set = (key: keyof PlanDraft) => (next: string) => onChange({ ...value, [key]: next })
  const chooseModel = (returnType: string) => {
    onChange({
      ...value,
      returnType,
      calculationMethod: returnType === 'fixed' ? 'simple' : 'market_reference',
      returnValueUnit: returnType === 'fixed' ? 'annual_percent' : 'benchmark',
    })
    setStep('terms')
  }
  return <form onSubmit={onSave} className="space-y-4 rounded-xl border border-primary/25 bg-background/50 p-4">
    {step === 'model' ? <>
      <div><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-primary">Step 1 of 2 · Return model</p><h3 className="mt-1 text-sm font-semibold">Choose how this plan’s return is determined</h3><p className="mt-1 text-[10px] leading-4 text-muted-foreground">Each model has its own configuration step. Enter your approved product terms on the next screen.</p></div>
      <div className="grid gap-3 sm:grid-cols-2">
        <button type="button" onClick={() => chooseModel('fixed')} className="rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/50 hover:bg-secondary/40 active:scale-[.99]"><span className="text-[9px] font-semibold uppercase tracking-wider text-primary">Fixed return</span><p className="mt-2 text-sm font-semibold">Set a defined return</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">Enter the approved rate, simple or compound method, and return unit.</p><span className="mt-4 inline-block rounded-md bg-primary px-3 py-2 text-[10px] font-semibold text-primary-foreground">Configure fixed return</span></button>
        <button type="button" onClick={() => chooseModel('market_linked')} className="rounded-xl border border-border bg-card p-4 text-left transition hover:border-primary/50 hover:bg-secondary/40 active:scale-[.99]"><span className="text-[9px] font-semibold uppercase tracking-wider text-accent-foreground">Market-linked</span><p className="mt-2 text-sm font-semibold">Tie return to a benchmark</p><p className="mt-1 text-[10px] leading-4 text-muted-foreground">Specify the market reference, participation rate, and optional return bounds.</p><span className="mt-4 inline-block rounded-md border border-border px-3 py-2 text-[10px] font-semibold text-foreground">Configure market-linked</span></button>
      </div>
      <div className="flex justify-end border-t border-border pt-4"><button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-secondary">Cancel</button></div>
    </> : <>
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-[9px] font-semibold uppercase tracking-[.16em] text-primary">Step 2 of 2 · {value.returnType === 'fixed' ? 'Fixed-return terms' : 'Market-linked terms'}</p><h3 className="mt-1 text-sm font-semibold">{value.returnType === 'fixed' ? 'Configure the defined return' : 'Configure the benchmark calculation'}</h3><p className="mt-1 text-[10px] leading-4 text-muted-foreground">Use approved product terms. OctaXwealth does not assume rates, benchmarks, or formulas.</p></div><button type="button" onClick={() => setStep('model')} className="rounded-md border border-border px-2.5 py-1.5 text-[10px] font-semibold transition hover:bg-secondary">Change model</button></div>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Field label="Plan name" className="sm:col-span-2"><TextInput value={value.name} onChange={set('name')} required /></Field>
        <Field label="Asset class"><SelectInput value={value.assetClass} onChange={set('assetClass')} options={['Crypto', 'Stocks / ETFs', 'Fixed income', 'Commodities', 'Multi-asset', 'Other']} /></Field>
        <Field label="Risk level"><SelectInput value={value.riskLevel} onChange={set('riskLevel')} options={['Low', 'Moderate', 'High', 'Very high']} /></Field>
        <Field label="Minimum investment · USD"><TextInput type="number" min="0.01" step="0.01" value={value.minInvestment} onChange={set('minInvestment')} required /></Field>
        <Field label="Maximum investment · USD"><TextInput type="number" min="0.01" step="0.01" value={value.maxInvestment} onChange={set('maxInvestment')} required /></Field>
        <Field label="Duration"><TextInput type="number" min="1" step="1" value={value.durationValue} onChange={set('durationValue')} required /></Field>
        <Field label="Duration unit"><SelectInput value={value.durationUnit} onChange={set('durationUnit')} options={['days', 'weeks', 'months', 'years']} /></Field>
        <Field label="Fee · percent"><TextInput type="number" min="0" step="0.01" value={value.feePercent} onChange={set('feePercent')} required /></Field>
        {value.returnType === 'fixed' ? <>
          <Field label="Calculation method"><SelectInput value={value.calculationMethod} onChange={set('calculationMethod')} options={['simple', 'compound']} /></Field>
          <Field label="Configured return"><TextInput type="number" min="0.01" step="0.01" value={value.returnValue} onChange={set('returnValue')} required /></Field>
          <Field label="Return unit"><SelectInput value={value.returnValueUnit} onChange={set('returnValueUnit')} options={['annual_percent', 'total_percent', 'usd']} /></Field>
        </> : <>
          <Field label="Benchmark / market reference"><TextInput value={value.marketReference} onChange={set('marketReference')} required /></Field>
          <Field label="Participation rate · %"><TextInput type="number" min="0.01" step="0.01" value={value.participationRate} onChange={set('participationRate')} required /></Field>
          <Field label="Return cap · % (optional)"><TextInput type="number" min="0" step="0.01" value={value.returnCapPercent} onChange={set('returnCapPercent')} /></Field>
          <Field label="Return floor · % (optional)"><TextInput type="number" step="0.01" value={value.returnFloorPercent} onChange={set('returnFloorPercent')} /></Field>
        </>}
        <Field label="Earnings schedule"><SelectInput value={value.earningsSchedule} onChange={set('earningsSchedule')} options={['daily', 'weekly', 'monthly', 'maturity']} /></Field>
        <Field label="Offer start"><TextInput type="date" value={value.startAt} onChange={set('startAt')} /></Field>
        <Field label="Offer end"><TextInput type="date" value={value.endAt} onChange={set('endAt')} /></Field>
        <Field label="Calculation rules" className="sm:col-span-2 xl:col-span-4"><textarea className={`${controlClass} h-20 py-2`} value={value.calculationRules} onChange={(event) => set('calculationRules')(event.target.value)} placeholder={value.returnType === 'fixed' ? 'Describe the approved fixed-return formula, fee handling, schedule, and rounding rules.' : 'Describe the benchmark observation window, return formula, fee handling, schedule, and rounding rules.'} required /></Field>
      </div>
      {value.returnType === 'market_linked' && <p className="rounded-lg border border-accent/50 bg-accent/20 p-3 text-[10px] leading-4 text-accent-foreground">This saves market-linked plan terms only. No live pricing feed or automatic earnings calculation is connected.</p>}
      <div className="flex justify-between border-t border-border pt-4"><button type="button" onClick={() => setStep('model')} className="rounded-lg px-3 py-2 text-xs font-semibold text-muted-foreground transition hover:bg-secondary">Back to model choice</button><button type="submit" disabled={saving} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition hover:brightness-110 disabled:opacity-50">{saving ? 'Saving…' : 'Save plan draft'}</button></div>
    </>}
  </form>
}

export function EventEditor({ value, onChange, onSave, onCancel, saving }: { value: EventDraft; onChange: (next: EventDraft) => void; onSave: (event: FormEvent) => void; onCancel: () => void; saving: boolean }) {
  const set = (key: keyof EventDraft) => (next: string) => onChange({ ...value, [key]: next })
  return <form onSubmit={onSave} className="space-y-4 rounded-xl border border-primary/25 bg-background/50 p-4">
    <div><h3 className="text-sm font-semibold">Promotion or earnings event</h3><p className="mt-1 text-[10px] text-muted-foreground">Set event terms and participation limits before publishing.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      <Field label="Event name"><TextInput value={value.name} onChange={set('name')} required /></Field>
      <Field label="Campaign type"><SelectInput value={value.eventType} onChange={set('eventType')} options={['promotion', 'earnings_event', 'bonus', 'reward_campaign']} /></Field>
      <Field label="Eligibility"><TextInput value={value.eligibility} onChange={set('eligibility')} required /></Field>
      <Field label="Starts"><TextInput type="date" value={value.startAt} onChange={set('startAt')} required /></Field>
      <Field label="Ends"><TextInput type="date" value={value.endAt} onChange={set('endAt')} required /></Field>
      <Field label="Reward amount"><TextInput type="number" min="0" step="0.01" value={value.rewardValue} onChange={set('rewardValue')} required /></Field>
      <Field label="Reward unit"><SelectInput value={value.rewardUnit} onChange={set('rewardUnit')} options={['USD', 'percent', 'bonus_credit', 'token']} /></Field>
      <Field label="Participation limit · blank = unlimited"><TextInput type="number" min="1" step="1" value={value.participationLimit} onChange={set('participationLimit')} /></Field>
      <Field label="Details" className="sm:col-span-2 xl:col-span-3"><textarea className={`${controlClass} h-20 py-2`} value={value.details} onChange={(event) => set('details')(event.target.value)} placeholder="Terms, exclusions, and fulfillment notes." /></Field>
    </div>
    <Actions onCancel={onCancel} label={saving ? 'Saving…' : 'Save campaign'} />
  </form>
}
