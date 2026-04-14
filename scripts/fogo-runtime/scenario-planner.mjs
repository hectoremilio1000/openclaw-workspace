const PHASE_BLUEPRINTS = {
  open: {
    scenario: 'opening_ramp',
    serviceProfile: 'prep_and_open',
    expectedCovers: { prod: 24, dev: 16, local: 14 },
    expectedSalesRange: { prod: [55000, 95000], dev: [45000, 90000], local: [40000, 80000] },
    attendanceIncidents: ['late_waiter'],
    inventoryPressure: ['produce', 'bar_prep', 'pantry'],
    operationalRisks: ['zombie_shift', 'cash_session_missing'],
  },
  lunch: {
    scenario: 'lunch_peak',
    serviceProfile: 'high_turnover',
    expectedCovers: { prod: 118, dev: 88, local: 74 },
    expectedSalesRange: { prod: [180000, 320000], dev: [140000, 260000], local: [140000, 260000] },
    attendanceIncidents: ['late_waiter', 'absent_hostess'],
    inventoryPressure: ['premium_cuts', 'sides', 'wine'],
    operationalRisks: ['queue_growth', 'discount_pressure'],
  },
  afternoon: {
    scenario: 'midday_reset',
    serviceProfile: 'slow_recovery',
    expectedCovers: { prod: 30, dev: 22, local: 18 },
    expectedSalesRange: { prod: [35000, 85000], dev: [25000, 65000], local: [20000, 55000] },
    attendanceIncidents: ['early_checkout'],
    inventoryPressure: ['salad_bar', 'desserts'],
    operationalRisks: ['open_orders_stale', 'staff_gap'],
  },
  dinner: {
    scenario: 'dinner_peak',
    serviceProfile: 'premium_service',
    expectedCovers: { prod: 126, dev: 92, local: 78 },
    expectedSalesRange: { prod: [190000, 340000], dev: [150000, 280000], local: [150000, 280000] },
    attendanceIncidents: ['late_bartender', 'coverage_swap'],
    inventoryPressure: ['premium_cuts', 'cocktails', 'desserts'],
    operationalRisks: ['ticket_backlog', 'cash_station_pressure'],
  },
  close: {
    scenario: 'day_closeout',
    serviceProfile: 'settlement_and_close',
    expectedCovers: { prod: 18, dev: 14, local: 12 },
    expectedSalesRange: { prod: [12000, 50000], dev: [8000, 35000], local: [6000, 28000] },
    attendanceIncidents: ['early_checkout'],
    inventoryPressure: ['waste_review', 'replenishment_candidates'],
    operationalRisks: ['open_orders_at_close', 'cash_difference'],
  },
}

function normalizePhase(phase) {
  return PHASE_BLUEPRINTS[phase] ? phase : 'open'
}

export function buildScenarioPlan({ phase, envProfile, restaurantId, forcedPhase = false, generatedAt = new Date().toISOString() }) {
  const safePhase = normalizePhase(phase)
  const blueprint = PHASE_BLUEPRINTS[safePhase]
  const expectedCovers = blueprint.expectedCovers[envProfile] ?? blueprint.expectedCovers.prod
  const expectedSalesRange = blueprint.expectedSalesRange[envProfile] ?? blueprint.expectedSalesRange.prod

  return {
    phase: safePhase,
    scenario: blueprint.scenario,
    serviceProfile: blueprint.serviceProfile,
    expectedCovers,
    expectedSalesRange,
    expectedOrdersRange: [Math.max(4, Math.round(expectedCovers * 0.35)), Math.max(8, Math.round(expectedCovers * 0.6))],
    attendanceIncidents: [...blueprint.attendanceIncidents],
    inventoryPressure: [...blueprint.inventoryPressure],
    operationalRisks: [...blueprint.operationalRisks],
    restaurantId,
    envProfile,
    forcedPhase,
    generatedAt,
  }
}

export function scenarioHeadline(plan) {
  return `${plan.envProfile.toUpperCase()} ${plan.phase} · ${plan.scenario} · covers~${plan.expectedCovers}`
}
