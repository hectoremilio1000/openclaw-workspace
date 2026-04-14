import fs from 'fs'
import { join } from 'path'

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
}

export function createRuntimeTracker({ envLabel, envProfile, phase, restaurantId, plan, startedAt }) {
  return {
    envLabel,
    envProfile,
    phase,
    restaurantId,
    startedAt,
    plan,
    verification: null,
    steps: [],
    totals: {
      orders: 0,
      revenue: 0,
      schedules: 0,
      attendanceEvents: 0,
      checkIns: 0,
      checkOuts: 0,
      shiftsOpened: 0,
      shiftsClosed: 0,
      payments: 0,
      inventoryPurchases: 0,
      inventoryConsumptions: 0,
      inventoryWaste: 0,
    },
  }
}

export function setRuntimeVerification(tracker, verification) {
  tracker.verification = verification
}

export function recordRuntimeStep(tracker, name, data = {}) {
  tracker.steps.push({ name, ...data })

  const totals = tracker.totals
  totals.orders += Number(data.orders ?? 0)
  totals.revenue += Number(data.revenue ?? 0)
  totals.schedules += Number(data.schedules ?? 0)
  totals.attendanceEvents += Number(data.attendanceEvents ?? 0)
  totals.checkIns += Number(data.checkIns ?? 0)
  totals.checkOuts += Number(data.checkOuts ?? 0)
  totals.shiftsOpened += Number(data.shiftsOpened ?? 0)
  totals.shiftsClosed += Number(data.shiftsClosed ?? 0)
  totals.payments += Number(data.payments ?? 0)
  totals.inventoryPurchases += Number(data.inventoryPurchases ?? 0)
  totals.inventoryConsumptions += Number(data.inventoryConsumptions ?? 0)
  totals.inventoryWaste += Number(data.inventoryWaste ?? 0)
}

export function writeRuntimeArtifact({ outputDir, tracker, status = 'ok', error = null, finishedAt = new Date().toISOString() }) {
  ensureDir(outputDir)
  const safePhase = tracker.phase.replace(/[^a-z0-9_-]+/gi, '-')
  const artifact = {
    status,
    envLabel: tracker.envLabel,
    envProfile: tracker.envProfile,
    phase: tracker.phase,
    restaurantId: tracker.restaurantId,
    startedAt: tracker.startedAt,
    finishedAt,
    plan: tracker.plan,
    verification: tracker.verification,
    totals: {
      ...tracker.totals,
      revenue: Math.round(tracker.totals.revenue * 100) / 100,
    },
    steps: tracker.steps,
    error: error ? { message: error.message, stack: error.stack } : null,
  }

  const stamp = finishedAt.replace(/[:.]/g, '-').replace('T', '__')
  fs.writeFileSync(join(outputDir, `last-${tracker.envProfile}.json`), JSON.stringify(artifact, null, 2))
  fs.writeFileSync(join(outputDir, `${stamp}-${tracker.envProfile}-${safePhase}.json`), JSON.stringify(artifact, null, 2))
  return artifact
}
