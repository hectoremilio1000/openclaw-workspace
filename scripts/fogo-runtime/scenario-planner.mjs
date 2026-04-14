const PHASE_BLUEPRINTS = {
  open: {
    scenario: 'opening_ramp',
    serviceProfile: 'prep_and_open',
    expectedCovers: { prod: 18, dev: 12, local: 8 },
    expectedSalesRange: { prod: [12000, 22000], dev: [7000, 14000], local: [3500, 9000] },
    attendanceIncidents: ['late_waiter'],
    inventoryPressure: ['produce', 'bar_prep', 'pantry'],
    operationalRisks: ['zombie_shift', 'cash_session_missing'],
  },
  lunch: {
    scenario: 'lunch_peak',
    serviceProfile: 'high_turnover',
    expectedCovers: { prod: 84, dev: 52, local: 28 },
    expectedSalesRange: { prod: [42000, 68000], dev: [22000, 42000], local: [9000, 22000] },
    attendanceIncidents: ['late_waiter', 'absent_hostess'],
    inventoryPressure: ['premium_cuts', 'sides', 'wine'],
    operationalRisks: ['queue_growth', 'discount_pressure'],
  },
  afternoon: {
    scenario: 'midday_reset',
    serviceProfile: 'slow_recovery',
    expectedCovers: { prod: 26, dev: 16, local: 10 },
    expectedSalesRange: { prod: [9000, 18000], dev: [5000, 9000], local: [2000, 5000] },
    attendanceIncidents: ['early_checkout'],
    inventoryPressure: ['salad_bar', 'desserts'],
    operationalRisks: ['open_orders_stale', 'staff_gap'],
  },
  dinner: {
    scenario: 'dinner_peak',
    serviceProfile: 'premium_service',
    expectedCovers: { prod: 96, dev: 58, local: 32 },
    expectedSalesRange: { prod: [48000, 76000], dev: [26000, 46000], local: [11000, 26000] },
    attendanceIncidents: ['late_bartender', 'coverage_swap'],
    inventoryPressure: ['premium_cuts', 'cocktails', 'desserts'],
    operationalRisks: ['ticket_backlog', 'cash_station_pressure'],
  },
  close: {
    scenario: 'day_closeout',
    serviceProfile: 'settlement_and_close',
    expectedCovers: { prod: 20, dev: 12, local: 6 },
    expectedSalesRange: { prod: [6000, 14000], dev: [3000, 7000], local: [1000, 3500] },
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
