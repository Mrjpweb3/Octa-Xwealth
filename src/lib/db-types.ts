// Auto-generated from your database schema — do not edit by hand.
// Regenerates automatically whenever a table is created or altered.

export type AppRolesRow = {
  id: string
  userId: string
  scopeId: string
  role: string
  createdAt: string
}

export type EarningsEventsRow = {
  id: string
  userId: string
  scopeId: string
  name: string
  eventType: string
  startAt: string
  endAt: string
  eligibility: string
  rewardValue: number | string
  rewardUnit: string
  participationLimit: number | string | null
  status: string
  details: string
  createdAt: string
  updatedAt: string
}

export type InvestmentEarningsRow = {
  id: string
  userId: string
  scopeId: string
  investmentId: string
  amount: number | string
  earningsDate: string
  status: string
  payoutReference: string
  paidAt: string | null
  createdAt: string
}

export type InvestmentPlansRow = {
  id: string
  userId: string
  scopeId: string
  name: string
  assetClass: string
  minInvestment: number | string
  maxInvestment: number | string
  durationValue: number | string
  durationUnit: string
  feePercent: number | string
  riskLevel: string
  returnType: string
  calculationMethod: string
  returnValue: number | string | null
  returnValueUnit: string | null
  earningsSchedule: string
  calculationRules: string
  status: string
  startAt: string | null
  endAt: string | null
  createdAt: string
  updatedAt: string
  marketReference: string
  participationRate: number | string | null
  returnCapPercent: number | string | null
  returnFloorPercent: number | string | null
}

export type InvestmentPositionsRow = {
  id: string
  userId: string
  scopeId: string
  investorUserId: string
  planId: string
  principal: number | string
  status: string
  startedAt: string
  maturityAt: string
  marketValue: number | string | null
  notes: string
  createdAt: string
  updatedAt: string
}

export type PaperTradesRow = {
  id: string
  userId: string
  symbol: string
  side: string
  orderType: string
  status: string
  quantity: number | string
  entryPrice: number | string
  exitPrice: number | string | null
  fees: number | string
  realizedPnl: number | string
  createdAt: string
  closedAt: string | null
}

export type RiskSettingsRow = {
  id: string
  userId: string
  maxPositionUsd: number | string
  dailyLossLimitUsd: number | string
  tradingEnabled: boolean
  emergencyStopped: boolean
  updatedAt: string
}

export type UsersRow = {
  id: string
  email: string
  emailVerified: number | string | null
  displayName: string | null
  avatarUrl: string | null
  phone: string | null
  phoneVerified: number | string | null
  role: string | null
  metadata: string | null
  createdAt: string
  updatedAt: string
  lastSignIn: string
}
