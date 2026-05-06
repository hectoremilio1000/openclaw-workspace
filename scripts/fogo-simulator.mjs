#!/usr/bin/env node
/**
 * Fogo de Chão Demo Simulator v3
 * 
 * Simulates a real restaurant day:
 * 
 * 10:00 → Staff check-in + open shift + generate schedules
 * 13:00 → Lunch orders (peak)
 * 16:00 → Afternoon orders (slow) + some check-outs (morning shift)
 * 19:00 → Dinner orders (peak) + evening check-ins
 * 22:00 → Last orders + close ALL open accounts + pay tips + Corte Z + close shift + check-outs
 * 
 * ONE shift per day. All orders go to that shift.
 */

import pg from 'pg'
import fs from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { buildScenarioPlan, scenarioHeadline } from './fogo-runtime/scenario-planner.mjs'
import { verifyRuntimeConsistency } from './fogo-runtime/consistency-verifier.mjs'
import { createRuntimeTracker, recordRuntimeStep, setRuntimeVerification, writeRuntimeArtifact } from './fogo-runtime/runtime-artifacts.mjs'
const { Client } = pg

// ── Environment Selection ────────────────────────────────────────
const IS_DEV = process.argv.includes('--dev')
const IS_LOCAL = process.argv.includes('--local')
const PHASE_OVERRIDE_EQ = process.argv.find(arg => arg.startsWith('--phase='))
const PHASE_OVERRIDE = (() => {
  const explicit = process.argv.indexOf('--phase')
  if (explicit >= 0 && process.argv[explicit + 1]) return process.argv[explicit + 1]
  if (PHASE_OVERRIDE_EQ) return PHASE_OVERRIDE_EQ.split('=')[1]
  return ''
})().trim().toLowerCase()
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

const PROD_DB_URL = process.env.FOGO_PROD_DB_URL || ''
const DEV_DB_URL = process.env.FOGO_DEV_DB_URL || ''
const LOCAL_DB_URL = process.env.FOGO_LOCAL_DB_URL || ''

const DB_URL = IS_LOCAL ? LOCAL_DB_URL : IS_DEV ? DEV_DB_URL : PROD_DB_URL

if (!DB_URL) {
  console.error('❌ Missing database URL for selected environment. Set one of: FOGO_PROD_DB_URL, FOGO_DEV_DB_URL, FOGO_LOCAL_DB_URL')
  process.exit(1)
}

// Load dev ID mapping if --dev
let idMap = null
if (IS_DEV) {
  const mapPath = join(__dirname, 'fogo-id-mapping-dev.json')
  if (!fs.existsSync(mapPath)) {
    console.error('❌ Missing fogo-id-mapping-dev.json — run clone-fogo-to-dev.mjs first')
    process.exit(1)
  }
  idMap = JSON.parse(fs.readFileSync(mapPath, 'utf8'))
  console.log(`🔧 DEV MODE: restaurant r${idMap.restaurant.dev} (mapped from prod r${idMap.restaurant.prod})`)
}

// Helper to remap IDs in dev mode
function mapId(table, prodId) {
  if (!IS_DEV || !idMap) return prodId
  const mapped = idMap[table]?.[String(prodId)]
  if (!mapped) {
    console.warn(`⚠️ No dev mapping for ${table}[${prodId}]`)
    return prodId
  }
  return mapped
}

const RESTAURANT_ID = IS_DEV ? idMap?.restaurant?.dev ?? 40 : 40
const TAX_RATE = 0.16
const ENV_PROFILE = IS_LOCAL ? 'local' : IS_DEV ? 'dev' : 'prod'
const MX_TZ = 'America/Mexico_City'
const RUNTIME_ARTIFACT_DIR = join(__dirname, '..', 'artifacts', 'fogo-runtime')

// ── Time Engine (canonical — single source of truth) ──────────────
const OPERATIONAL_CUT_HOUR = 4

const _mxFormatter = new Intl.DateTimeFormat('en-US', {
  timeZone: MX_TZ,
  year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
})

function getMXComponents(now = new Date()) {
  const parts = Object.fromEntries(
    _mxFormatter.formatToParts(now).map(p => [p.type, p.value])
  )
  return {
    year: parseInt(parts.year),
    month: parseInt(parts.month),
    day: parseInt(parts.day),
    hour: parseInt(parts.hour === '24' ? '0' : parts.hour),
    minute: parseInt(parts.minute),
  }
}

function getBusinessDate(now = new Date()) {
  const mx = getMXComponents(now)
  let { year, month, day } = mx
  if (mx.hour < OPERATIONAL_CUT_HOUR) {
    const prev = new Date(year, month - 1, day - 1)
    year = prev.getFullYear()
    month = prev.getMonth() + 1
    day = prev.getDate()
  }
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

function getServiceWindow(now = new Date()) {
  const { hour } = getMXComponents(now)
  if (hour >= OPERATIONAL_CUT_HOUR && hour <= 8) return 'CLOSED'
  if (hour === 9)               return 'PREP'
  if (hour >= 10 && hour <= 14) return 'LUNCH'
  if (hour >= 15 && hour <= 17) return 'AFTERNOON'
  if (hour >= 18 && hour <= 21) return 'DINNER'
  if (hour >= 22 || hour <= 1)  return 'LATE_NIGHT'  // 10pm-1:59am
  if (hour >= 2 && hour <= 3)   return 'CLOSE'       // 2am-3:59am
  return 'CLOSED'
}

function getHourMX(now = new Date()) {
  return getMXComponents(now).hour
}

function formatYMD(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

// today()/tomorrow() derived from business date
function today() { return getBusinessDate() }
function tomorrow() {
  const bd = getBusinessDate()
  const d = new Date(bd + 'T12:00:00')
  d.setDate(d.getDate() + 1)
  return formatYMD(d.getFullYear(), d.getMonth() + 1, d.getDate())
}

function mxTimestamp(hour, minute = 0, dateStr = getBusinessDate()) {
  const [year, month, day] = dateStr.split('-').map(Number)
  const approx = new Date(Date.UTC(year, month - 1, day, hour, minute))
  const mxStr = approx.toLocaleString('en-US', { timeZone: 'America/Mexico_City' })
  const mxDate = new Date(mxStr)
  const offsetMs = approx.getTime() - mxDate.getTime()
  return new Date(Date.UTC(year, month - 1, day, hour, minute) + offsetMs)
}

// ── Phase → Service Window Mapping ─────────────────────────────────
const PHASE_TO_WINDOW = {
  'open': 'PREP', 'prep': 'PREP',
  'lunch': 'LUNCH',
  'afternoon': 'AFTERNOON',
  'dinner': 'DINNER',
  'late_night': 'LATE_NIGHT', 'latenight': 'LATE_NIGHT',
  'close': 'CLOSE', 'close_night': 'CLOSE', 'closenight': 'CLOSE',
  'shift_change': 'DINNER', // shift_change was at 6pm = DINNER window
}

// ── Demo Coverage Policy ──────────────────────────────────────────
const DEMO_COVERAGE_POLICY = {
  PREP:       { minOpen: 2, minPrinted: 2, rotatePerTick: 1 },
  LUNCH:      { minOpen: 2, minPrinted: 2, rotatePerTick: 2 },
  AFTERNOON:  { minOpen: 2, minPrinted: 2, rotatePerTick: 2 },
  DINNER:     { minOpen: 2, minPrinted: 2, rotatePerTick: 2 },
  LATE_NIGHT: { minOpen: 2, minPrinted: 2, rotatePerTick: 1 },
  CLOSE:      { minOpen: 0, minPrinted: 0, rotatePerTick: 0 },
  CLOSED:     { minOpen: 0, minPrinted: 0, rotatePerTick: 0 },
}

// ── Run Lock (DB-based idempotency) ────────────────────────────────
async function cleanupStaleRuns(db) {
  const result = await db.query(`
    UPDATE sim_runs SET status = 'stale', error_message = 'exceeded 15min TTL'
    WHERE restaurant_id = $1 AND env = $2 AND status = 'running'
      AND started_at < now() - INTERVAL '15 minutes'
  `, [RESTAURANT_ID, ENV_PROFILE])
  if (result.rowCount > 0) console.log(`  🧹 Cleaned ${result.rowCount} stale run(s)`)
}

async function acquireRunLock(db, businessDate, serviceWindow) {
  await cleanupStaleRuns(db)
  try {
    const result = await db.query(`
      INSERT INTO sim_runs (restaurant_id, env, business_date, service_window, status)
      VALUES ($1, $2, $3, $4, 'running')
      ON CONFLICT (restaurant_id, env, business_date, service_window)
      DO UPDATE SET started_at = now(), status = 'running', error_message = NULL
      WHERE sim_runs.status = 'stale'
      RETURNING id
    `, [RESTAURANT_ID, ENV_PROFILE, businessDate, serviceWindow])
    if (result.rows.length > 0) {
      console.log(`  🔒 Run lock acquired for ${serviceWindow} on ${businessDate}`)
      return result.rows[0].id
    }
    console.log(`  ℹ️ Already ran ${serviceWindow} for ${businessDate} — skipping`)
    return null
  } catch (err) {
    if (String(err?.code) === '23505') {
      console.log(`  ℹ️ Already ran ${serviceWindow} for ${businessDate} — skipping`)
      return null
    }
    throw err
  }
}

async function releaseRunLock(db, runId, status, metrics = {}) {
  if (!runId) return
  await db.query(`
    UPDATE sim_runs SET status = $2, finished_at = now(),
      orders_created = $3, revenue = $4, error_message = $5
    WHERE id = $1
  `, [runId, status, metrics.orders || 0, metrics.revenue || 0, metrics.error || null])
}

// ── Preflight Checks ───────────────────────────────────────────────
async function preflight(db) {
  const hard = []
  const soft = []

  const simRunsOk = await db.query("SELECT 1 FROM information_schema.tables WHERE table_name='sim_runs'")
  if (!simRunsOk.rows.length) hard.push('sim_runs table missing')

  const openShifts = await db.query("SELECT count(*)::int as n FROM shifts WHERE restaurant_id=$1 AND status='OPEN'", [RESTAURANT_ID])
  if (openShifts.rows[0].n > 1) hard.push(`${openShifts.rows[0].n} open shifts (max 1)`)

  const areas = await db.query('SELECT count(*)::int as n FROM areas WHERE restaurant_id=$1', [RESTAURANT_ID])
  if (areas.rows[0].n < 1) hard.push('No areas exist')

  const stations = await db.query('SELECT count(*)::int as n FROM cash_stations WHERE restaurant_id=$1', [RESTAURANT_ID])
  if (stations.rows[0].n < 1) hard.push('No cash stations')

  if (areas.rows[0].n < 3) soft.push(`Only ${areas.rows[0].n} areas (expected 3+)`)

  if (soft.length) soft.forEach(w => console.warn(`  ⚠️ PREFLIGHT: ${w}`))
  if (hard.length) {
    hard.forEach(e => console.error(`  ❌ PREFLIGHT HARD FAIL: ${e}`))
    return false
  }
  return true
}

// ── State × Window Transition Matrix ───────────────────────────────
async function loadShiftState(db, businessDate) {
  // Check for open shift (any business date)
  const openShift = await db.query(
    "SELECT id, opened_at FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN' ORDER BY id DESC LIMIT 1",
    [RESTAURANT_ID]
  )

  if (openShift.rows.length > 0) {
    const shiftBD = getBusinessDate(new Date(openShift.rows[0].opened_at))
    if (shiftBD === businessDate) {
      return { state: 'OPEN', shiftId: openShift.rows[0].id, shiftBusinessDate: shiftBD }
    } else {
      return { state: 'ZOMBIE', shiftId: openShift.rows[0].id, shiftBusinessDate: shiftBD }
    }
  }

  // Check for closed shift of this business date
  const closedShift = await db.query(
    `SELECT id FROM shifts WHERE restaurant_id = $1 AND status = 'CLOSED'
     AND (opened_at AT TIME ZONE 'America/Mexico_City')::date = $2::date
     ORDER BY id DESC LIMIT 1`,
    [RESTAURANT_ID, businessDate]
  )
  if (closedShift.rows.length > 0) {
    return { state: 'CLOSED', shiftId: closedShift.rows[0].id, shiftBusinessDate: businessDate }
  }

  return { state: 'NO_SHIFT', shiftId: null, shiftBusinessDate: null }
}

function evaluateTransition(shiftState, serviceWindow) {
  const { state } = shiftState

  // Zombie always gets resolved first
  if (state === 'ZOMBIE') {
    return { action: 'CLOSE_ZOMBIE', reason: `Zombie shift from ${shiftState.shiftBusinessDate}` }
  }

  // State × Window matrix
  if (state === 'NO_SHIFT') {
    if (serviceWindow === 'PREP') return { action: 'OPEN_SHIFT', reason: 'Start of business day' }
    if (serviceWindow === 'CLOSED') return { action: 'SKIP', reason: 'Restaurant closed, no shift needed' }
    if (serviceWindow === 'CLOSE') return { action: 'SKIP', reason: 'Nothing to close' }
    return { action: 'ANOMALY', reason: `No shift exists in ${serviceWindow} — should have been opened in PREP` }
  }

  if (state === 'OPEN') {
    if (serviceWindow === 'CLOSED') return { action: 'SKIP', reason: 'Restaurant closed, shift stays open for tomorrow PREP zombie guard' }
    if (serviceWindow === 'PREP') return { action: 'USE_EXISTING_SHIFT', reason: 'Shift already open for today' }
    if (serviceWindow === 'CLOSE') return { action: 'CLOSE_SHIFT', reason: 'End of business day' }
    // LUNCH, AFTERNOON, DINNER, LATE_NIGHT
    return { action: 'GENERATE_ORDERS', reason: `Normal service in ${serviceWindow}` }
  }

  if (state === 'CLOSED') {
    if (serviceWindow === 'PREP') {
      // Is the closed shift from TODAY's business date or a previous one?
      if (shiftState.shiftBusinessDate === getBusinessDate()) {
        return { action: 'SKIP', reason: 'Shift already opened and closed today' }
      }
      return { action: 'OPEN_SHIFT', reason: 'New business day, previous shift already closed' }
    }
    return { action: 'SKIP', reason: `Shift already closed for ${shiftState.shiftBusinessDate}` }
  }

  return { action: 'SKIP', reason: 'Unknown state' }
}

// ── Demand Curve & Delta Generation ────────────────────────────────
const DEMAND_CURVE = {
  PREP: 0.06,
  LUNCH: 0.50,
  AFTERNOON: 0.65,
  DINNER: 0.92,
  LATE_NIGHT: 1.00,
  CLOSE: 1.00,
  CLOSED: 0.00,
}

const DAILY_TARGET = {
  0: 70,  // sunday
  1: 55,  // monday
  2: 55,  // tuesday
  3: 60,  // wednesday
  4: 65,  // thursday
  5: 85,  // friday
  6: 95,  // saturday
}

function getDailyTarget(businessDate) {
  const d = new Date(businessDate + 'T12:00:00')
  const dayOfWeek = d.getDay()
  const base = DAILY_TARGET[dayOfWeek] || 60
  // Scale by env
  if (IS_LOCAL) return Math.round(base * 0.6)
  if (IS_DEV) return Math.round(base * 0.8)
  return base
}

async function getOrderDelta(db, businessDate, serviceWindow) {
  const target = getDailyTarget(businessDate)
  const curve = DEMAND_CURVE[serviceWindow] || 0
  const targetNow = Math.round(target * curve)

  // Count orders in the CURRENT open shift only — not old closed shifts from same business date
  const openShift = await db.query(
    "SELECT id FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN' ORDER BY id DESC LIMIT 1",
    [RESTAURANT_ID]
  )
  const existingQuery = openShift.rows[0]?.id
    ? `SELECT count(*)::int as n FROM orders WHERE restaurant_id = $1 AND shift_id = $2`
    : `SELECT count(*)::int as n FROM orders WHERE restaurant_id = $1 AND (opened_at AT TIME ZONE 'America/Mexico_City')::date = $2::date`
  const existingParams = openShift.rows[0]?.id
    ? [RESTAURANT_ID, openShift.rows[0].id]
    : [RESTAURANT_ID, businessDate]
  const existing = await db.query(existingQuery, existingParams)
  const existingCount = existing.rows[0].n

  const delta = Math.max(0, targetNow - existingCount)
  const capped = Math.min(delta, MAX_ORDERS_PER_RUN)

  console.log(`  📊 Demand: target=${target} curve=${(curve*100).toFixed(0)}% targetNow=${targetNow} existing=${existingCount} delta=${capped}`)
  return { target, targetNow, existing: existingCount, delta: capped }
}

// ── executeOpenShift helper ────────────────────────────────────────
async function executeOpenShift(db, businessDate) {
  const hour = getHourMX()

  // Generate schedules
  for (const dateStr of [businessDate, tomorrow()]) {
    const existing = await db.query(
      'SELECT count(*) as cnt FROM attendance_schedules WHERE restaurant_id = $1 AND work_date = $2',
      [RESTAURANT_ID, dateStr]
    )
    if (parseInt(existing.rows[0].cnt) > 5) continue
    for (const userId of ALL_SCHEDULABLE) {
      const isDayOff = Math.random() < 0.10
      const isMorning = Math.random() < 0.5
      await db.query(`
        INSERT INTO attendance_schedules (restaurant_id, user_id, work_date, start_time, end_time, tolerance_minutes, is_day_off, source, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 10, $6, 'simulator', now(), now())
        ON CONFLICT (restaurant_id, user_id, work_date) DO NOTHING
      `, [RESTAURANT_ID, userId, dateStr, isMorning ? '09:00:00' : '18:00:00', isMorning ? '18:00:00' : '02:00:00', isDayOff])
    }
    console.log(`  📋 Schedules generated for ${dateStr}`)
  }

  // Open shift
  const cashier = pick(CASHIERS)
  const shiftOpenedAt = new Date()
  const result = await db.query(`
    INSERT INTO shifts (restaurant_id, master_station_id, user_id, opened_at, status, processed, created_at, updated_at)
    VALUES ($1, $2, $3, $4, 'OPEN', false, now(), now())
    RETURNING id
  `, [RESTAURANT_ID, CASH_STATIONS[0].id, cashier, shiftOpenedAt])

  const shiftId = result.rows[0].id
  console.log(`  🔓 Shift #${shiftId} opened`)

  await ensureCashSession(db, shiftId, {
    cashStationId: CASH_STATIONS[0].id,
    cashUserId: cashier,
    openedAt: shiftOpenedAt,
  })

  return shiftId
}

// ── executeAttendance helper ───────────────────────────────────────
async function executeAttendance(db, businessDate, serviceWindow) {
  const hour = getHourMX()
  let totalCheckIns = 0, totalCheckOuts = 0

  // Check-ins based on window
  if (serviceWindow === 'PREP' || serviceWindow === 'LUNCH') {
    for (const groupName of ['dayKitchenEarly', 'dayFloorOpen', 'dayCashierOpen']) {
      const group = STAFF_GROUPS[groupName]
      if (!group) continue
      const result = await simulateRoleCheckIns(db, group, { hour, dateStr: businessDate })
      totalCheckIns += result.total
    }
  }
  if (serviceWindow === 'DINNER' || serviceWindow === 'LATE_NIGHT') {
    for (const groupName of ['nightFloor', 'nightKitchen', 'nightCashier']) {
      const group = STAFF_GROUPS[groupName]
      if (!group) continue
      const result = await simulateRoleCheckIns(db, group, { hour, dateStr: businessDate })
      totalCheckIns += result.total
    }
  }

  // Check-outs based on window
  if (serviceWindow === 'AFTERNOON') {
    for (const groupName of ['dayFloorOpen', 'dayCashierOpen']) {
      const group = STAFF_GROUPS[groupName]
      if (!group) continue
      const result = await simulateRoleCheckOuts(db, group, { hour, dateStr: businessDate })
      totalCheckOuts += result.total
    }
  }
  if (serviceWindow === 'LATE_NIGHT' || serviceWindow === 'CLOSE') {
    for (const groupName of ['nightFloor', 'nightKitchen', 'nightCashier', 'dayKitchenEarly']) {
      const group = STAFF_GROUPS[groupName]
      if (!group) continue
      const result = await simulateRoleCheckOuts(db, group, { hour, dateStr: businessDate })
      totalCheckOuts += result.total
    }
  }

  if (totalCheckIns) console.log(`  👥 Check-ins: ${totalCheckIns}`)
  if (totalCheckOuts) console.log(`  👋 Check-outs: ${totalCheckOuts}`)
  return { checkIns: totalCheckIns, checkOuts: totalCheckOuts }
}

// ── Safety Guards ────────────────────────────────────────────────
// Hard limit: never create more than this many orders per run
const MAX_ORDERS_PER_RUN = 25
// Hard limit: never create more than this many orders per day
// Hourly cron: ~16 runs × ~10 orders = ~160, ceiling at 500
const MAX_ORDERS_PER_DAY = 500
// Only touch our target restaurant
const SAFETY_RESTAURANT_ID = RESTAURANT_ID

async function safetyCheck(db) {
  const todayStr = today()
  // 1. Verify we're only touching our demo restaurant
  if (RESTAURANT_ID !== SAFETY_RESTAURANT_ID) {
    throw new Error(`SAFETY: RESTAURANT_ID ${RESTAURANT_ID} !== ${SAFETY_RESTAURANT_ID}. Aborting.`)
  }
  // 2. Check how many orders we already created today for r40
  const todayCount = await db.query(
    "SELECT count(*) as cnt FROM orders WHERE restaurant_id = $1 AND ((created_at AT TIME ZONE 'America/Mexico_City')::date = $2)",
    [RESTAURANT_ID, todayStr]
  )
  const existing = parseInt(todayCount.rows[0].cnt)
  if (existing >= MAX_ORDERS_PER_DAY) {
    console.log(`⛔ SAFETY: Already ${existing} orders today (limit: ${MAX_ORDERS_PER_DAY}). Skipping.`)
    return false
  }
  console.log(`  🛡️ Safety: ${existing}/${MAX_ORDERS_PER_DAY} orders today`)

  // 3. Create sim_runs table if not exists (idempotency lock)
  await db.query(`
    CREATE TABLE IF NOT EXISTS sim_runs (
      id SERIAL PRIMARY KEY,
      restaurant_id INTEGER NOT NULL,
      env VARCHAR(20) NOT NULL,
      business_date DATE NOT NULL,
      service_window VARCHAR(20) NOT NULL,
      started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      finished_at TIMESTAMPTZ,
      status VARCHAR(20) NOT NULL DEFAULT 'running',
      orders_created INTEGER DEFAULT 0,
      revenue NUMERIC(12,2) DEFAULT 0,
      error_message TEXT,
      created_at TIMESTAMPTZ DEFAULT now(),
      UNIQUE(restaurant_id, env, business_date, service_window)
    )
  `)

  // 4. Ensure areas, services, and tables exist (idempotent)
  const areaCount = await db.query('SELECT count(*)::int as n FROM areas WHERE restaurant_id = $1', [RESTAURANT_ID])
  if (parseInt(areaCount.rows[0].n) < 5) {
    console.log('  🏗️ Creating missing services/areas/tables...')
    const svcData = [[46,'Comedor',1],[47,'Terraza',2],[48,'Bar',3],[49,'Eventos',4],[50,'Para Llevar',5]]
    for (const [id, name, sort] of svcData) {
      await db.query(`INSERT INTO services (id, restaurant_id, name, sort_order, created_at, updated_at)
        VALUES ($1, $2, $3, $4, now(), now()) ON CONFLICT (id) DO UPDATE SET name = $3, restaurant_id = $2`, [id, RESTAURANT_ID, name, sort])
    }
    const areaData = [[186,'Salón Principal',46],[187,'Terraza',47],[188,'Bar Fogo',48],[189,'Salón Privado',49],[190,'Para Llevar',50]]
    for (const [id, name, svc] of areaData) {
      const ex = await db.query("SELECT id FROM areas WHERE restaurant_id = $1 AND lower(trim(name)) = lower(trim($2))", [RESTAURANT_ID, name])
      if (ex.rows.length) { await db.query('UPDATE areas SET service_id = $1 WHERE id = $2', [svc, ex.rows[0].id]) }
      else { await db.query(`INSERT INTO areas (id, restaurant_id, name, service_id, sort_order, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,now(),now()) ON CONFLICT (id) DO UPDATE SET name=$3, service_id=$4`, [id, RESTAURANT_ID, name, svc, areaData.indexOf([id,name,svc])+1]) }
    }
    await db.query(`SELECT setval('services_id_seq', GREATEST((SELECT MAX(id) FROM services), 50))`)
    await db.query(`SELECT setval('areas_id_seq', GREATEST((SELECT MAX(id) FROM areas), 190))`)
    console.log('  ✅ Services + areas ensured')
  }
  const tableCount = await db.query('SELECT count(*)::int as n FROM tables WHERE restaurant_id = $1', [RESTAURANT_ID])
  if (parseInt(tableCount.rows[0].n) < 10) {
    console.log('  🏗️ Creating tables...')
    const areaRows = await db.query("SELECT id, name FROM areas WHERE restaurant_id = $1", [RESTAURANT_ID])
    const am = {}; for (const r of areaRows.rows) am[r.name.toLowerCase().trim()] = r.id
    const td = [
      {a:'salón principal', t:[['S1',4],['S2',4],['S3',6],['S4',6],['S5',8],['S6',4],['S7',4],['S8',6],['S9',8],['S10',10],['S11',4],['S12',4],['S13',6],['S14',6],['S15',12]]},
      {a:'terraza', t:[['T1',4],['T2',4],['T3',6],['T4',6],['T5',4],['T6',8],['T7',4],['T8',10]]},
      {a:'bar fogo', t:[['B1',2],['B2',2],['B3',2],['B4',4],['B5',4],['B6',6]]},
      {a:'salón privado', t:[['P1',12],['P2',20],['P3',30]]},
    ]
    for (const g of td) {
      const aid = am[g.a]; if (!aid) continue
      for (const [code, seats] of g.t) {
        await db.query(`INSERT INTO tables (restaurant_id, area_id, code, seats, status, created_at, updated_at)
          VALUES ($1, $2, $3, $4, 'free', now(), now()) ON CONFLICT DO NOTHING`, [RESTAURANT_ID, aid, code, seats])
      }
    }
    const fc = await db.query('SELECT count(*)::int as n FROM tables WHERE restaurant_id = $1', [RESTAURANT_ID])
    console.log(`  ✅ ${fc.rows[0].n} tables ensured`)
  }

  return true
}

function phaseResult(name, extra = {}) {
  return { name, ...extra }
}

function ensureDir(path) {
  fs.mkdirSync(path, { recursive: true })
}

function simulatorStatePath() {
  return join(RUNTIME_ARTIFACT_DIR, 'state', `${ENV_PROFILE}-r${RESTAURANT_ID}.json`)
}

function loadSimulatorState() {
  const path = simulatorStatePath()
  if (!fs.existsSync(path)) {
    return {
      envProfile: ENV_PROFILE,
      restaurantId: RESTAURANT_ID,
      days: {},
    }
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(path, 'utf8'))
    return {
      envProfile: parsed.envProfile || ENV_PROFILE,
      restaurantId: parsed.restaurantId || RESTAURANT_ID,
      days: parsed.days || {},
    }
  } catch (error) {
    console.warn(`  ⚠️ Could not parse simulator state, resetting: ${error.message}`)
    return {
      envProfile: ENV_PROFILE,
      restaurantId: RESTAURANT_ID,
      days: {},
    }
  }
}

function saveSimulatorState(state) {
  const path = simulatorStatePath()
  ensureDir(dirname(path))
  fs.writeFileSync(path, JSON.stringify({
    envProfile: ENV_PROFILE,
    restaurantId: RESTAURANT_ID,
    updatedAt: new Date().toISOString(),
    lastBusinessDate: getBusinessDate(),
    lastServiceWindow: getServiceWindow(),
  }, null, 2))
}

/** @deprecated v4 — state is no longer used for decisions. Delete after 2026-05-04. */
function getDayState(state, businessDate) {
  if (!state || !state.days) return { shiftIds: [], closedShiftIds: [], handoffCompleted: false, closeNightCompleted: false, groups: {} }
  if (!state.days[businessDate]) {
    state.days[businessDate] = { shiftIds: [], closedShiftIds: [], handoffCompleted: false, closeNightCompleted: false, groups: {} }
  }
  return state.days[businessDate]
}

/** @deprecated v4 — no-op. Delete after 2026-05-04. */
function markPhaseRun() {}

/** @deprecated v4 — no-op. Delete after 2026-05-04. */
function recordGroupProgress() {}

/** @deprecated v4 — only used by old phase functions. Delete after 2026-05-04. */
function mergePhaseMetrics(...parts) {
  const merged = {
    orders: 0,
    revenue: 0,
    payments: 0,
    schedules: 0,
    attendanceEvents: 0,
    checkIns: 0,
    checkOuts: 0,
    lateCheckIns: 0,
    shiftsOpened: 0,
    shiftsClosed: 0,
  }

  for (const part of parts.filter(Boolean)) {
    merged.orders += Number(part.orders ?? 0)
    merged.revenue += Number(part.revenue ?? 0)
    merged.payments += Number(part.payments ?? 0)
    merged.schedules += Number(part.schedules ?? 0)
    merged.attendanceEvents += Number(part.attendanceEvents ?? 0)
    merged.checkIns += Number(part.checkIns ?? 0)
    merged.checkOuts += Number(part.checkOuts ?? 0)
    merged.lateCheckIns += Number(part.lateCheckIns ?? 0)
    merged.shiftsOpened += Number(part.shiftsOpened ?? 0)
    merged.shiftsClosed += Number(part.shiftsClosed ?? 0)
  }

  return merged
}

// ── Dynamic Catalog Loader ──────────────────────────────────────
// PATCH: incident response — load areas/stations/users from DB so we only
// reference IDs that actually exist. Hardcoded arrays below are FALLBACK defaults.

const ROLE_MAP = {
  waiter: 'WAITERS', mesero: 'WAITERS',
  cashier: 'CASHIERS', cajero: 'CASHIERS',
  chef: 'CHEFS', cocinero: 'CHEFS',
  bartender: 'BARTENDERS', barman: 'BARTENDERS',
  churrasqueiro: 'CHURRASQUEIROS', parrillero: 'CHURRASQUEIROS',
  hostess: 'HOSTESSES', host: 'HOSTESSES', recepcionista: 'HOSTESSES',
  captain: 'CAPTAINS', capitan: 'CAPTAINS',
  manager: 'MANAGERS', gerente: 'MANAGERS', admin: 'MANAGERS',
}

async function loadCatalogsFromDB(db) {
  try {
    // 1. Areas
    const areasRes = await db.query(
      `SELECT id, name, service_id FROM areas WHERE restaurant_id = $1 ORDER BY id`,
      [RESTAURANT_ID]
    )
    if (areasRes.rows.length > 0) {
      // Build weight map: keep hardcoded weights for known areas, distribute remainder equally
      const hardcodedWeights = {}
      for (const a of AREAS) hardcodedWeights[a.name] = { weight: a.weight, hasTables: a.hasTables }
      const defaultWeight = 0.05
      AREAS.length = 0
      for (const row of areasRes.rows) {
        const known = hardcodedWeights[row.name]
        AREAS.push({
          id: row.id,
          name: row.name,
          service_id: row.service_id,
          weight: known?.weight ?? defaultWeight,
          hasTables: known?.hasTables ?? true,
        })
      }
      console.log(`  📦 Loaded ${AREAS.length} areas from DB`)
    } else {
      console.warn('  ⚠️ No areas in DB — using hardcoded fallback')
    }

    // 2. Cash stations
    const stationsRes = await db.query(
      `SELECT id, name FROM cash_stations WHERE restaurant_id = $1 ORDER BY id`,
      [RESTAURANT_ID]
    )
    if (stationsRes.rows.length > 0) {
      CASH_STATIONS.length = 0
      for (const row of stationsRes.rows) {
        CASH_STATIONS.push({ id: row.id, name: row.name })
      }
      console.log(`  📦 Loaded ${CASH_STATIONS.length} cash stations from DB`)
    } else {
      console.warn('  ⚠️ No cash stations in DB — using hardcoded fallback')
    }

    // 3. Users by role
    const usersRes = await db.query(
      `SELECT u.id, r.name as role_name FROM users u JOIN roles r ON u.role_id = r.id WHERE u.restaurant_id = $1 AND u.status = 'active' ORDER BY u.id`,
      [RESTAURANT_ID]
    )
    if (usersRes.rows.length > 0) {
      const buckets = { WAITERS: [], CASHIERS: [], CHEFS: [], BARTENDERS: [], CHURRASQUEIROS: [], HOSTESSES: [], CAPTAINS: [], MANAGERS: [] }
      for (const u of usersRes.rows) {
        const key = ROLE_MAP[(u.role_name || '').toLowerCase()]
        if (key && buckets[key]) buckets[key].push(u.id)
      }
      // Only replace arrays that got at least 1 user; keep fallback otherwise
      for (const [key, arr] of Object.entries(buckets)) {
        if (arr.length > 0) {
          const target = key === 'WAITERS' ? WAITERS : key === 'CASHIERS' ? CASHIERS : key === 'CHEFS' ? CHEFS : key === 'BARTENDERS' ? BARTENDERS : key === 'CHURRASQUEIROS' ? CHURRASQUEIROS : key === 'HOSTESSES' ? HOSTESSES : key === 'CAPTAINS' ? CAPTAINS : MANAGERS
          target.length = 0
          target.push(...arr)
        }
      }
      const loaded = Object.entries(buckets).filter(([,a]) => a.length > 0).map(([k,a]) => `${k}:${a.length}`).join(', ')
      console.log(`  📦 Loaded users from DB: ${loaded}`)
    } else {
      console.warn('  ⚠️ No active users in DB — using hardcoded fallback')
    }
  } catch (err) {
    console.error('  ⚠️ loadCatalogsFromDB failed — using hardcoded fallback:', err.message)
    // Never crash — hardcoded defaults remain in place
  }
}

// ── Restaurant Data (hardcoded fallback defaults) ───────────────

let AREAS = [
  // Restaurante (70% del tráfico)
  { id: 186, name: 'Salón Principal', service_id: 46, weight: 0.30, hasTables: true },
  { id: 187, name: 'Terraza', service_id: 46, weight: 0.15, hasTables: true },
  { id: 188, name: 'Bar Fogo', service_id: 46, weight: 0.10, hasTables: true },
  { id: 189, name: 'Salón Privado', service_id: 46, weight: 0.05, hasTables: true },
  // Para Llevar (10%)
  { id: 190, name: 'Mostrador', service_id: 50, weight: 0.10, hasTables: false },
  // Delivery (15%)
  { id: 194, name: 'Uber Eats', service_id: 47, weight: 0.07, hasTables: false },
  { id: 195, name: 'Didi Food', service_id: 47, weight: 0.04, hasTables: false },
  { id: 196, name: 'Rappi', service_id: 47, weight: 0.04, hasTables: false },
  // Eventos (5%)
  { id: 197, name: 'Salón de Eventos', service_id: 49, weight: 0.05, hasTables: false },
]

let CASH_STATIONS = [
  { id: 31, name: 'Caja Principal' },
  { id: 32, name: 'Caja Bar' },
]

let WAITERS = [7796, 7797, 7798, 7799, 7800, 7801, 7802, 7803, 7804, 7805, 7823, 7824, 7825]
let CASHIERS = [7806, 7807, 7808]
let CHEFS = [7809, 7810, 7811]
let BARTENDERS = [7812, 7813, 7814]
let CHURRASQUEIROS = [7817, 7818, 7819, 7820, 7821]
let HOSTESSES = [7815, 7816]
let CAPTAINS = [7794, 7795]
let MANAGERS = [7792, 7793]

// ── Dev mode: remap all hardcoded IDs ──
if (IS_DEV && idMap) {
  const mu = (id) => idMap.users[String(id)] ?? id
  const ma = (id) => idMap.areas[String(id)] ?? id
  const ms = (id) => idMap.services[String(id)] ?? id
  const mc = (id) => idMap.cashStations[String(id)] ?? id

  for (const area of AREAS) {
    area.id = ma(area.id)
    area.service_id = ms(area.service_id)
  }
  for (const st of CASH_STATIONS) st.id = mc(st.id)

  const remapArr = (arr) => {
    for (let i = 0; i < arr.length; i++) arr[i] = mu(arr[i])
  }
  remapArr(WAITERS); remapArr(CASHIERS); remapArr(CHEFS)
  remapArr(BARTENDERS); remapArr(CHURRASQUEIROS)
  remapArr(HOSTESSES); remapArr(CAPTAINS); remapArr(MANAGERS)

  // Filter out unmapped users (those that failed to clone due to FK)
  const validUsers = new Set(Object.values(idMap.users))
  const filterValid = (arr) => {
    const filtered = arr.filter(id => validUsers.has(id))
    arr.length = 0
    arr.push(...(filtered.length ? filtered : [arr[0] ?? Object.values(idMap.users)[0]]))
  }
  filterValid(WAITERS); filterValid(CASHIERS); filterValid(CHEFS)
  filterValid(BARTENDERS); filterValid(CHURRASQUEIROS)
  filterValid(HOSTESSES); filterValid(CAPTAINS); filterValid(MANAGERS)
}

// Safe index helper: wrap around if index is out of bounds
const safeAt = (arr, i) => arr[i % arr.length]

const MORNING_STAFF = [...WAITERS.slice(0, 7), ...CASHIERS.slice(0, 2), ...CHEFS, ...BARTENDERS.slice(0, 2), ...CHURRASQUEIROS.slice(0, 3), safeAt(HOSTESSES, 0), safeAt(CAPTAINS, 0), safeAt(MANAGERS, 0)].filter(Boolean)
const EVENING_STAFF = [...WAITERS.slice(5), ...CASHIERS.slice(1), ...CHEFS.slice(0, 2), ...BARTENDERS.slice(1), ...CHURRASQUEIROS.slice(2), safeAt(HOSTESSES, 1), safeAt(CAPTAINS, 1), safeAt(MANAGERS, 1)].filter(Boolean)
const ALL_SCHEDULABLE = [...new Set([...MORNING_STAFF, ...EVENING_STAFF])]

const STAFF_GROUPS = {
  dayKitchenEarly: {
    users: [...CHEFS, ...CHURRASQUEIROS.slice(0, 3), safeAt(MANAGERS, 0)].filter(Boolean),
    shift: 'day',
    checkInWindow: [8, 9],
    baseHour: 8,
    earlyBias: true,
    noShowRate: 0.04,
    lateRate: 0.08,
    checkOutWindow: [23, 1],
    closePreference: 'late',
  },
  dayFloorOpen: {
    users: [...WAITERS.slice(0, 7), ...BARTENDERS.slice(0, 2), safeAt(HOSTESSES, 0), safeAt(CAPTAINS, 0)].filter(Boolean),
    shift: 'day',
    checkInWindow: [9, 10],
    baseHour: 9,
    earlyBias: false,
    noShowRate: 0.08,
    lateRate: 0.15,
    checkOutWindow: [16, 18],
    closePreference: 'normal',
  },
  dayCashierOpen: {
    users: [...CASHIERS.slice(0, 2)].filter(Boolean),
    shift: 'day',
    checkInWindow: [9, 10],
    baseHour: 9,
    earlyBias: false,
    noShowRate: 0.03,
    lateRate: 0.10,
    checkOutWindow: [18, 20],
    closePreference: 'normal',
  },
  nightFloor: {
    users: [...WAITERS.slice(5), ...BARTENDERS.slice(1), safeAt(HOSTESSES, 1), safeAt(CAPTAINS, 1)].filter(Boolean),
    shift: 'night',
    checkInWindow: [17, 19],
    baseHour: 18,
    earlyBias: false,
    noShowRate: 0.08,
    lateRate: 0.15,
    checkOutWindow: [22, 1],
    closePreference: 'normal',
  },
  nightKitchen: {
    users: [...CHEFS.slice(0, 2), ...CHURRASQUEIROS.slice(2), safeAt(MANAGERS, 1)].filter(Boolean),
    shift: 'night',
    checkInWindow: [17, 19],
    baseHour: 18,
    earlyBias: true,
    noShowRate: 0.04,
    lateRate: 0.08,
    checkOutWindow: [0, 3],
    closePreference: 'late',
  },
  nightCashier: {
    users: [...CASHIERS.slice(1)].filter(Boolean),
    shift: 'night',
    checkInWindow: [17, 19],
    baseHour: 18,
    earlyBias: false,
    noShowRate: 0.03,
    lateRate: 0.08,
    checkOutWindow: [1, 3],
    closePreference: 'late',
  },
}

// ── Dev mode: remap product IDs ──
const PRODUCTS_RAW = {
  carnes: [
    { id: 47646, price: 850, weight: 0.20 }, { id: 47647, price: 890, weight: 0.12 },
    { id: 47648, price: 780, weight: 0.10 }, { id: 47649, price: 720, weight: 0.08 },
    { id: 47650, price: 680, weight: 0.08 }, { id: 47651, price: 950, weight: 0.05 },
    { id: 47652, price: 620, weight: 0.06 }, { id: 47653, price: 580, weight: 0.07 },
    { id: 47654, price: 590, weight: 0.06 }, { id: 47656, price: 750, weight: 0.05 },
    { id: 47657, price: 790, weight: 0.04 }, { id: 47658, price: 920, weight: 0.04 },
    { id: 47659, price: 940, weight: 0.03 }, { id: 47660, price: 1850, weight: 0.02 },
  ],
  mariscos: [
    { id: 47661, price: 480, weight: 0.25 }, { id: 47662, price: 520, weight: 0.20 },
    { id: 47663, price: 490, weight: 0.15 }, { id: 47664, price: 460, weight: 0.15 },
    { id: 47665, price: 420, weight: 0.10 }, { id: 47666, price: 510, weight: 0.05 },
    { id: 47667, price: 490, weight: 0.05 }, { id: 47668, price: 580, weight: 0.05 },
  ],
  entradas: [
    { id: 47669, price: 180, weight: 0.15 }, { id: 47670, price: 170, weight: 0.10 },
    { id: 47671, price: 290, weight: 0.10 }, { id: 47672, price: 160, weight: 0.15 },
    { id: 47673, price: 190, weight: 0.08 }, { id: 47674, price: 140, weight: 0.15 },
    { id: 47675, price: 390, weight: 0.08 }, { id: 47676, price: 150, weight: 0.05 },
    { id: 47677, price: 160, weight: 0.07 }, { id: 47678, price: 180, weight: 0.07 },
  ],
  acomp: [
    { id: 47679, price: 220, weight: 0.15 }, { id: 47680, price: 350, weight: 0.10 },
    { id: 47681, price: 120, weight: 0.15 }, { id: 47682, price: 180, weight: 0.12 },
    { id: 47683, price: 120, weight: 0.10 }, { id: 47684, price: 130, weight: 0.10 },
    { id: 47685, price: 140, weight: 0.08 }, { id: 47686, price: 130, weight: 0.08 },
    { id: 47687, price: 130, weight: 0.07 }, { id: 47688, price: 90, weight: 0.05 },
  ],
  bebidas: [
    { id: 47689, price: 220, weight: 0.18 }, { id: 47690, price: 240, weight: 0.10 },
    { id: 47691, price: 240, weight: 0.08 }, { id: 47692, price: 230, weight: 0.07 },
    { id: 47693, price: 250, weight: 0.07 }, { id: 47705, price: 60, weight: 0.15 },
    { id: 47706, price: 65, weight: 0.12 }, { id: 47707, price: 90, weight: 0.06 },
    { id: 47708, price: 85, weight: 0.06 }, { id: 47709, price: 80, weight: 0.05 },
    { id: 47710, price: 70, weight: 0.06 },
  ],
  vinos: [
    { id: 47697, price: 290, weight: 0.20 }, { id: 47698, price: 240, weight: 0.20 },
    { id: 47699, price: 260, weight: 0.10 }, { id: 47700, price: 250, weight: 0.15 },
    { id: 47701, price: 300, weight: 0.10 }, { id: 47702, price: 270, weight: 0.10 },
    { id: 47703, price: 320, weight: 0.10 }, { id: 47704, price: 280, weight: 0.05 },
  ],
  postres: [
    { id: 47719, price: 180, weight: 0.15 }, { id: 47720, price: 150, weight: 0.15 },
    { id: 47721, price: 170, weight: 0.12 }, { id: 47722, price: 220, weight: 0.15 },
    { id: 47723, price: 160, weight: 0.10 }, { id: 47724, price: 250, weight: 0.10 },
    { id: 47725, price: 280, weight: 0.13 }, { id: 47726, price: 160, weight: 0.10 },
  ],
  rodizio: [
    { id: 47727, price: 890, weight: 0.35 }, { id: 47728, price: 1190, weight: 0.30 },
    { id: 47729, price: 1990, weight: 0.20 }, { id: 47730, price: 4290, weight: 0.10 },
    { id: 47731, price: 590, weight: 0.05 },
  ],
}

// Remap product IDs in dev mode
const PRODUCTS = Object.fromEntries(
  Object.entries(PRODUCTS_RAW).map(([cat, items]) => [
    cat,
    items.map(p => ({
      ...p,
      id: IS_DEV && idMap ? (idMap.products[String(p.id)] ?? p.id) : p.id
    }))
  ])
)

const PAYMENT_METHODS = [
  { id: 1, code: 'CASH', weight: 0.25 },
  { id: 2, code: 'CARD', weight: 0.30 },
  { id: 4, code: 'VISA', weight: 0.15 },
  { id: 5, code: 'MC', weight: 0.15 },
  { id: 6, code: 'AMEX', weight: 0.08 },
  { id: 7, code: 'TRANSFER', weight: 0.05 },
  { id: 10, code: 'VALES', weight: 0.02 },
]

const DEMO_PURCHASE_PROFILES = {
  premium_cuts: {
    keywords: ['picanha', 'ribeye', 'sirloin', 'filete', 'short rib', 'costilla', 'vacío', 'arrachera', 'churrasco'],
    openQty: [10, 24],
    lunchQty: [4, 10],
    costRange: [180, 520],
  },
  poultry_pork: {
    keywords: ['pollo', 'chicken', 'cerdo', 'pork', 'sausage', 'salchicha'],
    openQty: [8, 18],
    lunchQty: [3, 8],
    costRange: [70, 220],
  },
  seafood: {
    keywords: ['shrimp', 'camar', 'salm', 'fish', 'pescado', 'pulpo'],
    openQty: [6, 14],
    lunchQty: [2, 6],
    costRange: [120, 380],
  },
  produce_sides: {
    keywords: ['papa', 'potato', 'ensalada', 'salad', 'lechuga', 'tomate', 'vegetal', 'verdura', 'rice', 'arroz', 'frijol', 'bean', 'yuca', 'plátano'],
    openQty: [12, 28],
    lunchQty: [5, 14],
    costRange: [15, 90],
  },
  pantry_bar: {
    keywords: ['vino', 'wine', 'whisky', 'ron', 'tequila', 'agua', 'refresco', 'soda', 'cerveza', 'beer', 'azúcar', 'sugar', 'sal', 'aceite'],
    openQty: [8, 18],
    lunchQty: [3, 8],
    costRange: [20, 260],
  },
}

const DEMO_RECIPES = [
  {
    name: 'rodizio_classic',
    productKeywords: ['rodizio', 'espadas', 'fogo'],
    ingredients: [
      { keywords: ['picanha', 'sirloin', 'arrachera', 'churrasco'], qty: [0.35, 0.7] },
      { keywords: ['sal', 'sal gruesa', 'seasoning'], qty: [0.01, 0.03] },
      { keywords: ['carbón', 'charcoal', 'gas'], qty: [0.02, 0.05], optional: true },
    ],
  },
  {
    name: 'seafood_plate',
    productKeywords: ['shrimp', 'camar', 'salm', 'marisco', 'fish', 'pescado'],
    ingredients: [
      { keywords: ['shrimp', 'camar', 'salm', 'fish', 'pescado'], qty: [0.2, 0.45] },
      { keywords: ['mantequilla', 'butter', 'garlic', 'ajo'], qty: [0.02, 0.08] },
      { keywords: ['limón', 'lemon'], qty: [0.01, 0.04], optional: true },
    ],
  },
  {
    name: 'dessert_service',
    productKeywords: ['postre', 'dessert', 'cake', 'pastel', 'flan', 'cheesecake'],
    ingredients: [
      { keywords: ['azúcar', 'sugar', 'harina', 'flour'], qty: [0.03, 0.09] },
      { keywords: ['crema', 'cream', 'milk', 'leche'], qty: [0.04, 0.12] },
      { keywords: ['fruta', 'fruit', 'chocolate'], qty: [0.02, 0.08], optional: true },
    ],
  },
  {
    name: 'bar_service',
    productKeywords: ['vino', 'wine', 'cocktail', 'coctel', 'whisky', 'ron', 'tequila', 'beer', 'cerveza'],
    ingredients: [
      { keywords: ['vino', 'wine', 'whisky', 'ron', 'tequila', 'beer', 'cerveza'], qty: [0.08, 0.25] },
      { keywords: ['agua mineral', 'soda', 'agua tónica', 'tonic'], qty: [0.05, 0.18], optional: true },
      { keywords: ['limón', 'lemon', 'naranja', 'orange'], qty: [0.01, 0.04], optional: true },
    ],
  },
]

// ── Helpers ───────────────────────────────────────────────────────

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function pickWeighted(items) {
  const r = Math.random(); let c = 0
  for (const it of items) { c += it.weight; if (r <= c) return it }
  return items[items.length - 1]
}
function normalizeText(v) {
  return String(v || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}
function hasAnyKeyword(text, keywords = []) {
  const n = normalizeText(text)
  return keywords.some(k => n.includes(normalizeText(k)))
}

function hourInWindow(hour, [start, end]) {
  return start <= end ? hour >= start && hour <= end : hour >= start || hour <= end
}


function offsetForCheckIn({ earlyBias = false, lateRate = 0.12 }) {
  const isLate = Math.random() < lateRate
  if (isLate) return { isLate: true, offsetMin: rand(5, 25) }
  if (earlyBias) return { isLate: false, offsetMin: rand(-35, 5) }
  return { isLate: false, offsetMin: rand(-12, 8) }
}

async function ensureAttendanceSession(db, { userId, dateStr, eventAt, lateMin = 0 }) {
  const schedRow = await db.query(
    'SELECT id FROM attendance_schedules WHERE restaurant_id = $1 AND user_id = $2 AND work_date = $3',
    [RESTAURANT_ID, userId, dateStr]
  )
  const schedId = schedRow.rows[0]?.id ?? null
  const sessResult = await db.query(`
    INSERT INTO attendance_sessions (restaurant_id, user_id, schedule_id, work_date, first_check_in_at, late_minutes, early_leave_minutes, overtime_minutes, status, source, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, $6, 0, 0, 'open', 'simulator', now(), now())
    ON CONFLICT DO NOTHING RETURNING id
  `, [RESTAURANT_ID, userId, schedId, dateStr, eventAt, lateMin])
  if (lateMin > 0 && sessResult.rows[0]?.id) {
    await db.query(`
      INSERT INTO attendance_incidents (restaurant_id, user_id, session_id, work_date, incident_type, severity, minutes, description, is_resolved, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'late', $5, $6, $7, false, now(), now())
    `, [RESTAURANT_ID, userId, sessResult.rows[0].id, dateStr, lateMin >= 15 ? 'warning' : 'info', lateMin, `Retardo de ${lateMin} minuto(s)`])
  }
}

async function simulateRoleCheckIns(db, group, opts = {}) {
  const dateStr = opts.dateStr ?? today()
  const hour = opts.hour ?? getHourMX()
  if (!hourInWindow(hour, group.checkInWindow)) return { total: 0, late: 0 }

  const result = await db.query(`
    SELECT DISTINCT user_id FROM attendance_events
    WHERE restaurant_id = $1 AND event_date = $2 AND event_type = 'check_in' AND user_id = ANY($3::int[])
  `, [RESTAURANT_ID, dateStr, group.users])
  const checkedIn = new Set(result.rows.map(r => Number(r.user_id)))

  let total = 0
  let late = 0
  const targetShare = opts.targetShare ?? (hour === group.checkInWindow[0] ? 0.65 : 1)
  for (const userId of group.users) {
    if (checkedIn.has(userId)) continue
    if (Math.random() > targetShare) continue
    if (Math.random() < (group.noShowRate ?? 0.08)) continue

    const { isLate, offsetMin } = offsetForCheckIn(group)
    const baseHour = opts.baseHour ?? group.baseHour
    const baseTime = mxTimestamp(baseHour, 0, dateStr)
    const eventAt = new Date(baseTime.getTime() + offsetMin * 60000)
    await db.query(`
      INSERT INTO attendance_events (restaurant_id, user_id, event_type, event_method, event_at, event_date, source_context, notes, created_at, updated_at)
      VALUES ($1, $2, 'check_in', 'pin', $3, $4, 'simulator', $5, now(), now())
    `, [RESTAURANT_ID, userId, eventAt, dateStr, isLate ? `Llegó ${offsetMin} min tarde` : null])
    await ensureAttendanceSession(db, { userId, dateStr, eventAt, lateMin: isLate ? offsetMin : 0 })
    total++
    if (isLate) late++
  }

  return { total, late }
}

async function simulateRoleCheckOuts(db, group, opts = {}) {
  const dateStr = opts.dateStr ?? today()
  const hour = opts.hour ?? getHourMX()
  if (!hourInWindow(hour, group.checkOutWindow)) return { total: 0 }

  const openSessions = await db.query(`
    SELECT s.user_id, s.first_check_in_at
    FROM attendance_sessions s
    WHERE s.restaurant_id = $1 AND s.work_date = $2 AND s.status = 'open' AND s.user_id = ANY($3::int[])
  `, [RESTAURANT_ID, dateStr, group.users])

  const targetShare = opts.targetShare ?? (group.closePreference === 'late' ? 0.45 : 0.7)
  let total = 0
  for (const row of openSessions.rows) {
    if (Math.random() > targetShare) continue
    const userId = Number(row.user_id)
    const checkoutHour = opts.checkoutHour ?? hour
    const baseTime = mxTimestamp(checkoutHour, 0, dateStr)
    const offset = group.closePreference === 'late' ? rand(5, 55) : rand(-15, 35)
    const checkoutAt = new Date(baseTime.getTime() + offset * 60000)
    await db.query(`
      INSERT INTO attendance_events (restaurant_id, user_id, event_type, event_method, event_at, event_date, source_context, created_at, updated_at)
      VALUES ($1, $2, 'check_out', 'pin', $3, $4, 'simulator', now(), now())
    `, [RESTAURANT_ID, userId, checkoutAt, dateStr])
    await db.query(`
      UPDATE attendance_sessions
      SET last_check_out_at = $3,
          worked_minutes = EXTRACT(EPOCH FROM ($3::timestamptz - first_check_in_at)) / 60,
          status = 'closed',
          updated_at = now()
      WHERE restaurant_id = $1 AND user_id = $2 AND work_date = $4 AND status = 'open'
    `, [RESTAURANT_ID, userId, checkoutAt, dateStr])
    total++
  }
  return { total }
}


function generateOrderItems(persons) {
  const items = []
  for (let p = 0; p < persons; p++) {
    if (Math.random() < 0.40) {
      items.push({ ...pickWeighted(PRODUCTS.rodizio), qty: 1, category: 'Alimentos' })
      items.push({ ...pickWeighted(PRODUCTS.bebidas), qty: 1, category: 'Bebidas' })
      if (Math.random() < 0.5) items.push({ ...pickWeighted(PRODUCTS.postres), qty: 1, category: 'Postres' })
    } else {
      if (Math.random() < 0.6) items.push({ ...pickWeighted(PRODUCTS.entradas), qty: 1, category: 'Alimentos' })
      items.push({ ...pickWeighted(Math.random() < 0.7 ? PRODUCTS.carnes : PRODUCTS.mariscos), qty: 1, category: 'Alimentos' })
      items.push({ ...pickWeighted(PRODUCTS.acomp), qty: 1, category: 'Alimentos' })
      items.push({ ...pickWeighted(PRODUCTS.bebidas), qty: 1, category: 'Bebidas' })
      if (Math.random() < 0.30) items.push({ ...pickWeighted(PRODUCTS.vinos), qty: 1, category: 'Bebidas' })
      if (Math.random() < 0.40) items.push({ ...pickWeighted(PRODUCTS.postres), qty: 1, category: 'Postres' })
    }
  }
  return items
}

// ── Ensure Open Shift (zombie guard for non-open phases) ─────────

async function ensureOpenShift(db) {
  const openShift = await db.query(
    "SELECT id, opened_at FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN'", [RESTAURANT_ID]
  )
  if (openShift.rows.length === 0) {
    console.log('  ⚠️ No open shift — running phaseOpen first')
    return await phaseOpen(db)
  } else {
    const shiftDate = getBusinessDate(new Date(openShift.rows[0].opened_at))
    const todayStr = today()
    if (shiftDate !== todayStr) {
      console.log(`  🧟 Zombie shift from ${shiftDate} — running phaseOpen to fix`)
      return await phaseOpen(db)
    } else {
      await ensureCashSession(db, openShift.rows[0].id)
    }
  }

  return phaseResult('bootstrap', {})
}

async function ensureCashSession(db, shiftId, options = {}) {
  const existing = await db.query(
    `SELECT id, shift_id, cash_station_id, cash_user_id, opening_cash, expected_cash, closing_cash, difference, status, opened_at, closed_at
     FROM cash_sessions
     WHERE shift_id = $1
     ORDER BY CASE WHEN status = 'OPEN' THEN 0 ELSE 1 END, id ASC
     LIMIT 1`,
    [shiftId]
  )
  if (existing.rows.length > 0) return existing.rows[0]

  const shiftRes = await db.query(
    'SELECT id, master_station_id, user_id, opened_at FROM shifts WHERE id = $1 LIMIT 1',
    [shiftId]
  )
  if (shiftRes.rows.length === 0) {
    throw new Error(`Shift ${shiftId} not found while creating cash session`)
  }

  const shift = shiftRes.rows[0]
  const cashStationId = options.cashStationId || shift.master_station_id || CASH_STATIONS[0].id
  const cashUserId = options.cashUserId || shift.user_id || pick(CASHIERS)
  const openingCash = Number(options.openingCash ?? rand(2500, 4500))
  const openedAt = options.openedAt || shift.opened_at || new Date()

  const created = await db.query(`
    INSERT INTO cash_sessions (
      shift_id, cash_station_id, cash_user_id,
      opening_cash, expected_cash, status, opened_at,
      metadata, created_at, updated_at
    ) VALUES ($1, $2, $3, $4, $4, 'OPEN', $5, $6, now(), now())
    RETURNING id, shift_id, cash_station_id, cash_user_id, opening_cash, expected_cash, closing_cash, difference, status, opened_at, closed_at
  `, [shiftId, cashStationId, cashUserId, openingCash, openedAt, JSON.stringify({ source: 'fogo-simulator' })])

  console.log(`  🧾 Cash session #${created.rows[0].id} opened for shift #${shiftId}`)
  return created.rows[0]
}

async function settleOrder(db, order, closedAt = new Date()) {
  const stationId = order.cash_station_id || CASH_STATIONS[0].id
  const cashierId = order.cashier_id || pick(CASHIERS)
  const shiftId = order.shift_id || (await db.query(
    "SELECT id FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN' ORDER BY opened_at DESC LIMIT 1",
    [RESTAURANT_ID]
  )).rows[0]?.id

  if (!shiftId) {
    console.warn(`  ⚠️ Skipping order #${order.id} — no shift`)
    return { settled: false, payments: 0 }
  }

  await db.query(`UPDATE orders SET status = 'closed', closed_at = $2, updated_at = now() WHERE id = $1`, [order.id, closedAt])
  await db.query(`UPDATE order_items SET status = 'prepared', prepared_at = COALESCE(prepared_at, $2), updated_at = now() WHERE order_id = $1 AND status IN ('pending','sent','fire')`, [order.id, closedAt])

  const method = pickWeighted(PAYMENT_METHODS)
  const orderTotal = Number(order.total || 0)
  const tip = Number(order.tip || 0)

  // PATCH: incident response — dedupe payments to prevent double-settle on re-runs
  let payments = 0
  const existingSale = await db.query(`SELECT id FROM payments WHERE order_id = $1 AND kind = 'SALE' LIMIT 1`, [order.id])
  if (existingSale.rows.length === 0) {
    await db.query(`INSERT INTO payments (order_id, payment_method_id, amount, currency, status, kind, paid_at, shift_id, cash_station_id, cashier_id, created_at, updated_at) VALUES ($1,$2,$3,'MXN','settled','SALE',$4,$5,$6,$7,$4,$4)`,
      [order.id, method.id, orderTotal, closedAt, shiftId, stationId, cashierId])
    payments++
  }

  if (tip > 0) {
    const existingTip = await db.query(`SELECT id FROM payments WHERE order_id = $1 AND kind = 'TIP' LIMIT 1`, [order.id])
    if (existingTip.rows.length === 0) {
      await db.query(`INSERT INTO payments (order_id, payment_method_id, amount, currency, status, kind, paid_at, shift_id, cash_station_id, cashier_id, created_at, updated_at) VALUES ($1,$2,$3,'MXN','settled','TIP',$4,$5,$6,$7,$4,$4)`,
        [order.id, method.id, tip, closedAt, shiftId, stationId, cashierId])
      payments++
    }
    await db.query(`UPDATE orders SET tip_collected_total = $2, updated_at = now() WHERE id = $1`, [order.id, tip])
  }

  await db.query(`UPDATE tables SET status = 'free', updated_at = now() WHERE restaurant_id = $1 AND id = (SELECT table_id FROM orders WHERE id = $2)`, [RESTAURANT_ID, order.id])
  return { settled: true, payments }
}

async function settleOpenOrders(db, options = {}) {
  const statuses = options.statuses || ['open', 'printed']
  const query = options.shiftId
    ? `SELECT id, total, tip, shift_id, cash_station_id, cashier_id, opened_at
       FROM orders WHERE restaurant_id = $1 AND shift_id = $2 AND status::text = ANY($3::text[])
       ORDER BY opened_at ASC`
    : `SELECT id, total, tip, shift_id, cash_station_id, cashier_id, opened_at
       FROM orders WHERE restaurant_id = $1 AND status::text = ANY($2::text[])
       ORDER BY opened_at ASC`
  const params = options.shiftId ? [RESTAURANT_ID, options.shiftId, statuses] : [RESTAURANT_ID, statuses]
  const result = await db.query(query, params)

  let settled = 0
  let payments = 0
  for (const order of result.rows) {
    const closedAt = options.closedAtFactory ? options.closedAtFactory(order) : new Date()
    const outcome = await settleOrder(db, order, closedAt)
    if (!outcome.settled) continue
    settled++
    payments += outcome.payments
  }

  return { settled, payments }
}

async function finalizeShiftClose(db, shiftId, options = {}) {
  const shiftRes = await db.query(
    `SELECT id, restaurant_id, master_station_id, user_id, opened_at, closed_at, status, cash_closure_id
     FROM shifts WHERE id = $1 LIMIT 1`,
    [shiftId]
  )
  if (shiftRes.rows.length === 0) throw new Error(`Shift ${shiftId} not found`)
  const shift = shiftRes.rows[0]
  const businessDate = options.businessDate || getBusinessDate(new Date(shift.opened_at || new Date()))

  const totals = await db.query(`
    SELECT count(*) as cnt, coalesce(sum(total),0) as sales,
           coalesce(sum(tip),0) as tips, coalesce(sum(tax),0) as tax,
           coalesce(sum(CASE WHEN status='void' THEN total ELSE 0 END),0) as refunds
    FROM orders WHERE shift_id = $1
  `, [shiftId])
  const { cnt, sales, tips, tax, refunds } = totals.rows[0]

  const byMethod = await db.query(`
    SELECT p.payment_method_id, count(*) as cnt, coalesce(sum(p.amount),0) as total
    FROM payments p WHERE p.shift_id = $1 GROUP BY p.payment_method_id ORDER BY p.payment_method_id
  `, [shiftId])

  const cashSession = await ensureCashSession(db, shiftId, {
    cashStationId: shift.master_station_id || CASH_STATIONS[0].id,
    cashUserId: shift.user_id || pick(CASHIERS),
    openedAt: shift.opened_at,
  })

  for (const pm of byMethod.rows) {
    // PATCH: DELETE+INSERT — dev DB may lack the UNIQUE constraint that ON CONFLICT requires.
    // TODO P1: align dev schema, then revert to ON CONFLICT DO UPDATE.
    await db.query(`DELETE FROM shift_totals WHERE shift_id = $1 AND payment_method_id = $2`, [shiftId, pm.payment_method_id])
    await db.query(`
      INSERT INTO shift_totals (
        shift_id, payment_method_id, sales_count, sales_amount,
        tips_amount, refunds_amount, net_sales_amount, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 0, 0, $4, now(), now())
    `, [shiftId, pm.payment_method_id, pm.cnt, pm.total])
  }
  console.log(`  📊 Shift totals: ${byMethod.rows.length} payment methods`)

  for (const pm of byMethod.rows) {
    const expected = Number(pm.total)
    const isCash = parseInt(pm.payment_method_id, 10) === 1
    const declared = isCash ? expected + rand(-50, 30) : expected
    const diff = Math.round((declared - expected) * 100) / 100
    // PATCH: DELETE+INSERT — dev DB may lack the UNIQUE constraint.
    // TODO P1: align dev schema, then revert to ON CONFLICT DO UPDATE.
    await db.query(`DELETE FROM shift_declarations WHERE shift_id = $1 AND payment_method_id = $2`, [shiftId, pm.payment_method_id])
    await db.query(`
      INSERT INTO shift_declarations (
        shift_id, payment_method_id, expected_amount, declared_amount,
        difference_amount, is_final, cash_session_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, true, $6, now(), now())
    `, [shiftId, pm.payment_method_id, expected, declared, diff, cashSession.id])
  }
  console.log('  📝 Declarations filed')

  const tipOrders = await db.query(`
    SELECT id, waiter_id, tip, cashier_id FROM orders
    WHERE shift_id = $1 AND tip > 0 AND status = 'closed'
  `, [shiftId])

  await db.query('DELETE FROM tip_payouts WHERE shift_id = $1', [shiftId])
  let tipCount = 0
  for (const o of tipOrders.rows) {
    await db.query(`
      INSERT INTO tip_payouts (
        shift_id, waiter_id, payment_method_id, order_id,
        amount, paid_by, paid_at, notes, created_at, updated_at
      ) VALUES ($1, $2, 1, $3, $4, $5, now(), $6, now(), now())
    `, [shiftId, o.waiter_id, o.id, o.tip, o.cashier_id, `Propina orden #${o.id}`])
    tipCount++
  }
  console.log(`  💰 Tips paid: ${tipCount} (total: $${parseFloat(tips).toFixed(2)})`)

  await db.query(`
    UPDATE orders SET tip_paid_total = tip WHERE shift_id = $1 AND tip > 0 AND status = 'closed'
  `, [shiftId])

  const cashTotal = Number(byMethod.rows.find(r => parseInt(r.payment_method_id, 10) === 1)?.total || 0)
  const openingCash = Number(cashSession.opening_cash || 0)
  const expectedCash = Math.round((openingCash + cashTotal) * 100) / 100
  const closingCash = Math.round((expectedCash + rand(-50, 30)) * 100) / 100
  const cashDifference = Math.round((closingCash - expectedCash) * 100) / 100

  let closureId = Number(shift.cash_closure_id || 0)
  if (!closureId) {
    const existingClosure = await db.query(`
      SELECT id FROM cash_closures
      WHERE restaurant_id = $1 AND business_date = $2 AND period_start = $3
      ORDER BY id DESC LIMIT 1
    `, [RESTAURANT_ID, businessDate, shift.opened_at])
    closureId = Number(existingClosure.rows[0]?.id || 0)
  }

  if (closureId) {
    await db.query(`
      UPDATE cash_closures
      SET business_date = $2, period_start = $3, period_end = now(), generated_by = $4, generated_at = now(),
          gross_sales = $5, net_sales = $6, total_tax = $7,
          cash_total = $8, difference = $9, updated_at = now()
      WHERE id = $1
    `, [closureId, businessDate, shift.opened_at, MANAGERS[0], sales, parseFloat(sales) - parseFloat(tax), tax, cashTotal, cashDifference])
  } else {
    // PATCH: incident response — ON CONFLICT prevents dup crash on re-runs
    const closureResult = await db.query(`
      INSERT INTO cash_closures (
        restaurant_id, business_date, period_start, period_end,
        generated_by, generated_at, gross_sales, net_sales, total_tax,
        cash_total, difference, created_at, updated_at
      ) VALUES ($1, $2, $3, now(), $4, now(), $5, $6, $7, $8, $9, now(), now())
      ON CONFLICT (restaurant_id, business_date) DO UPDATE SET
        period_end = now(), gross_sales = EXCLUDED.gross_sales,
        net_sales = EXCLUDED.net_sales, total_tax = EXCLUDED.total_tax,
        cash_total = EXCLUDED.cash_total, difference = EXCLUDED.difference,
        updated_at = now()
      RETURNING id
    `, [
      RESTAURANT_ID,
      businessDate,
      shift.opened_at,
      MANAGERS[0],
      sales,
      parseFloat(sales) - parseFloat(tax),
      tax,
      cashTotal,
      cashDifference,
    ])
    closureId = closureResult.rows[0].id
  }

  await db.query('DELETE FROM closure_totals WHERE cash_closure_id = $1', [closureId])
  for (const pm of byMethod.rows) {
    await db.query(`
      INSERT INTO closure_totals (cash_closure_id, payment_method_id, sales_count, sales_amount)
      VALUES ($1, $2, $3, $4)
    `, [closureId, pm.payment_method_id, pm.cnt, pm.total])
  }
  console.log(`  🧾 Corte Z #${closureId} generated`)

  await db.query(`
    UPDATE cash_sessions
    SET expected_cash = $2, closing_cash = $3, difference = $4,
        status = 'CLOSED', closed_at = COALESCE(closed_at, now()), updated_at = now()
    WHERE id = $1
  `, [cashSession.id, expectedCash, closingCash, cashDifference])

  await db.query(`
    UPDATE shifts SET status = 'CLOSED', closed_at = COALESCE(closed_at, now()), updated_at = now(),
    processed = true, sales_count = $2, sales_amount = $3, tips_amount = $4,
    refunds_amount = $5, net_sales_amount = $6, cash_closure_id = $7
    WHERE id = $1
  `, [shiftId, cnt, sales, tips, refunds, parseFloat(sales) - parseFloat(refunds), closureId])

  return { shiftId, closureId, cnt, sales, tips, refunds, cashSessionId: cashSession.id }
}

// ── Phase: OPEN (10am) ───────────────────────────────────────────

/** @deprecated v4 — not called from main(). Delete after 2026-05-04. */
async function phaseOpen(db) {
  console.log('🌅 PHASE: OPEN — Starting the day')
  const hour = getHourMX()
  let schedulesGenerated = 0

  // 1. Generate schedules for today and tomorrow
  for (const dateStr of [today(), tomorrow()]) {
    const existing = await db.query(
      'SELECT count(*) as cnt FROM attendance_schedules WHERE restaurant_id = $1 AND work_date = $2',
      [RESTAURANT_ID, dateStr]
    )
    if (parseInt(existing.rows[0].cnt) > 5) continue
    for (const userId of ALL_SCHEDULABLE) {
      const isDayOff = Math.random() < 0.10
      const isMorning = Math.random() < 0.5
      await db.query(`
        INSERT INTO attendance_schedules (restaurant_id, user_id, work_date, start_time, end_time, tolerance_minutes, is_day_off, source, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 10, $6, 'simulator', now(), now())
        ON CONFLICT (restaurant_id, user_id, work_date) DO NOTHING
      `, [RESTAURANT_ID, userId, dateStr, isMorning ? '09:00:00' : '18:00:00', isMorning ? '18:00:00' : '02:00:00', isDayOff])
      schedulesGenerated++
    }
    console.log(`  📋 Schedules generated for ${dateStr}`)
  }

  const todayStr = today()
  const earlyKitchen = await simulateRoleCheckIns(db, STAFF_GROUPS.dayKitchenEarly, { hour, dateStr: todayStr, targetShare: hour === 9 ? 0.8 : 1 })
  const dayFloor = await simulateRoleCheckIns(db, STAFF_GROUPS.dayFloorOpen, { hour, dateStr: todayStr, targetShare: hour === 9 ? 0.45 : 1, baseHour: hour === 9 ? 9 : 10 })
  const dayCashiers = await simulateRoleCheckIns(db, STAFF_GROUPS.dayCashierOpen, { hour, dateStr: todayStr, targetShare: hour === 9 ? 0.5 : 1, baseHour: hour === 9 ? 9 : 10 })
  recordGroupProgress(db.simState, todayStr, 'dayKitchenEarly', 'checkIn', earlyKitchen.total)
  recordGroupProgress(db.simState, todayStr, 'dayFloorOpen', 'checkIn', dayFloor.total)
  recordGroupProgress(db.simState, todayStr, 'dayCashierOpen', 'checkIn', dayCashiers.total)
  const morningCheckins = earlyKitchen.total + dayFloor.total + dayCashiers.total
  const morningLate = earlyKitchen.late + dayFloor.late + dayCashiers.late
  if (morningCheckins) console.log(`  👥 Morning arrivals: ${morningCheckins} staff (${morningLate} tarde)`)

  // 3. Open ONE shift for the day (if none exists)
  let shiftsClosed = 0
  let shiftsOpened = 0
  // ZOMBIE GUARD: if there's an open shift from a previous day, close it first
  const openShift = await db.query(
    "SELECT id, opened_at FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN'", [RESTAURANT_ID]
  )
  if (openShift.rows.length > 0) {
    const shiftDate = getBusinessDate(new Date(openShift.rows[0].opened_at))
    if (shiftDate !== todayStr) {
      const zombieId = openShift.rows[0].id
      console.log(`  🧟 Zombie shift #${zombieId} from ${shiftDate} detected — force-closing`)
      const closed = await finalizeShiftClose(db, zombieId, { businessDate: shiftDate })
      const zombieState = getDayState(db.simState, shiftDate)
      if (!zombieState.closedShiftIds.includes(zombieId)) zombieState.closedShiftIds.push(zombieId)
      shiftsClosed++
      console.log(`  🔐 Zombie shift #${zombieId} closed (${closed.cnt} orders, $${parseFloat(closed.sales).toFixed(2)})`)
    } else {
      console.log(`  ℹ️ Shift #${openShift.rows[0].id} already open for today`)
      const dayState = getDayState(db.simState, todayStr)
      if (!dayState.shiftIds.includes(openShift.rows[0].id)) dayState.shiftIds.push(openShift.rows[0].id)
      await ensureCashSession(db, openShift.rows[0].id)
    }
  }

  // Now check if we need a new shift for today
  const currentOpen = await db.query(
    "SELECT id FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN'", [RESTAURANT_ID]
  )
  if (currentOpen.rows.length === 0) {
    const closedToday = await db.query(
      // PATCH: incident response — timezone-aware date comparison
      "SELECT id FROM shifts WHERE restaurant_id = $1 AND status = 'CLOSED' AND (opened_at AT TIME ZONE 'America/Mexico_City')::date = $2",
      [RESTAURANT_ID, todayStr]
    )
    if (closedToday.rows.length > 0) {
      console.log('  ⚠️ Shift already opened and closed today — skipping')
    } else {
      const cashier = pick(CASHIERS)
      const shiftOpenedAt = mxTimestamp(hour <= 9 ? 9 : 10, 0, todayStr)
      shiftOpenedAt.setMinutes(hour <= 9 ? rand(10, 35) : rand(0, 20), 0, 0)
      const result = await db.query(`
        INSERT INTO shifts (restaurant_id, master_station_id, user_id, opened_at, status, processed, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'OPEN', false, now(), now()) RETURNING id
      `, [RESTAURANT_ID, CASH_STATIONS[0].id, cashier, shiftOpenedAt])
      shiftsOpened++
      console.log(`  🔓 Shift #${result.rows[0].id} opened`)
      const dayState = getDayState(db.simState, todayStr)
      if (!dayState.shiftIds.includes(result.rows[0].id)) dayState.shiftIds.push(result.rows[0].id)
      await ensureCashSession(db, result.rows[0].id, {
        cashStationId: CASH_STATIONS[0].id,
        cashUserId: cashier,
        openedAt: shiftOpenedAt,
      })
    }
  }

  const orders = hour === 9 ? await generateOrders(db, rand(2, 6)) : await generateOrders(db, rand(6, 12))

  return phaseResult('open', {
    schedules: schedulesGenerated,
    attendanceEvents: morningCheckins,
    checkIns: morningCheckins,
    lateCheckIns: morningLate,
    shiftsOpened,
    shiftsClosed,
    orders: orders?.created ?? 0,
    revenue: orders?.revenue ?? 0,
    payments: orders?.payments ?? 0,
  })
}

// ── Phase: LUNCH (1pm) ───────────────────────────────────────────

/** @deprecated v4 — not called from main(). Delete after 2026-05-04. */
async function phaseLunch(db) {
  console.log('🍽️ PHASE: LUNCH — Peak service')
  const bootstrap = await ensureOpenShift(db)
  await closeLingeringOrders(db)
  // Hourly: 8-15 orders per run (was 25-45 when running every 3h)
  const orders = await generateOrders(db, rand(8, 15))
  const totals = mergePhaseMetrics(bootstrap, {
    orders: orders.created,
    revenue: orders.revenue,
    payments: orders.payments,
  })
  return phaseResult('lunch', {
    ...totals,
  })
}

// ── Phase: AFTERNOON (4pm) ───────────────────────────────────────

/** @deprecated v4 — not called from main(). Delete after 2026-05-04. */
async function phaseAfternoon(db) {
  console.log('☕ PHASE: AFTERNOON — Slow period')
  const hour = getHourMX()
  const bootstrap = await ensureOpenShift(db)
  await closeLingeringOrders(db)
  const orders = await generateOrders(db, rand(8, 15))

  const todayStr = today()
  const floorCheckouts = await simulateRoleCheckOuts(db, STAFF_GROUPS.dayFloorOpen, { hour, dateStr: todayStr, targetShare: hour === 15 ? 0.35 : hour === 16 ? 0.55 : 0.8 })
  const cashierCheckouts = await simulateRoleCheckOuts(db, STAFF_GROUPS.dayCashierOpen, { hour, dateStr: todayStr, targetShare: hour === 17 ? 0.45 : 0.2 })
  recordGroupProgress(db.simState, todayStr, 'dayFloorOpen', 'checkOut', floorCheckouts.total)
  recordGroupProgress(db.simState, todayStr, 'dayCashierOpen', 'checkOut', cashierCheckouts.total)
  const checkouts = floorCheckouts.total + cashierCheckouts.total
  if (checkouts) console.log(`  👋 Partial day checkout: ${checkouts} staff`)

  const totals = mergePhaseMetrics(bootstrap, {
    attendanceEvents: checkouts,
    checkOuts: checkouts,
    orders: orders.created,
    revenue: orders.revenue,
    payments: orders.payments,
  })

  return phaseResult('afternoon', totals)
}

// ── Phase: DINNER (7pm) ──────────────────────────────────────────

/** @deprecated v4 — not called from main(). Delete after 2026-05-04. */
async function phaseDinner(db) {
  console.log('🌙 PHASE: DINNER — Peak service (night shift)')
  const hour = getHourMX()
  const bootstrap = await ensureOpenShift(db)
  await closeLingeringOrders(db)

  const todayStr = today()
  const nightFloor = await simulateRoleCheckIns(db, STAFF_GROUPS.nightFloor, { hour, dateStr: todayStr, targetShare: hour === 19 ? 0.7 : 1 })
  const nightKitchen = await simulateRoleCheckIns(db, STAFF_GROUPS.nightKitchen, { hour, dateStr: todayStr, targetShare: hour === 19 ? 0.55 : 0.9 })
  const nightCashier = await simulateRoleCheckIns(db, STAFF_GROUPS.nightCashier, { hour, dateStr: todayStr, targetShare: hour === 19 ? 0.6 : 1 })
  recordGroupProgress(db.simState, todayStr, 'nightFloor', 'checkIn', nightFloor.total)
  recordGroupProgress(db.simState, todayStr, 'nightKitchen', 'checkIn', nightKitchen.total)
  recordGroupProgress(db.simState, todayStr, 'nightCashier', 'checkIn', nightCashier.total)
  const eveningCheckins = nightFloor.total + nightKitchen.total + nightCashier.total
  const eveningLate = nightFloor.late + nightKitchen.late + nightCashier.late
  if (eveningCheckins) console.log(`  👥 Evening arrivals: ${eveningCheckins} staff (${eveningLate} tarde)`)

  // Hourly: 10-18 orders per run (was 30-50 when running every 3h)
  const orders = await generateOrders(db, rand(10, 18))
  const totals = mergePhaseMetrics(bootstrap, {
    attendanceEvents: eveningCheckins,
    checkIns: eveningCheckins,
    lateCheckIns: eveningLate,
    orders: orders.created,
    revenue: orders.revenue,
    payments: orders.payments,
  })
  return phaseResult('dinner', {
    ...totals,
  })
}

// ── Phase: CLOSE (10pm) ──────────────────────────────────────────

/** @deprecated v4 — not called from main(). Delete after 2026-05-04. */
async function phaseClose(db) {
  console.log('🔒 PHASE: CLOSE — legacy alias → CLOSE_NIGHT')
  return phaseCloseNight(db)
}

// ── Phase: SHIFT_CHANGE (6pm) — Close day shift, open night shift ──

/** @deprecated v4 — not called from main(). Delete after 2026-05-04. */
async function phaseShiftChange(db) {
  console.log('🔄 PHASE: SHIFT_CHANGE — Day→Night transition')
  const todayStr = today()
  const dayState = getDayState(db.simState, todayStr)
  if (dayState.handoffCompleted) {
    console.log('  ℹ️ Handoff already completed for today — continuing with dinner flow')
    return phaseDinner(db)
  }

  // 1. Close all remaining open orders from day shift
  await closeLingeringOrders(db)
  const remaining = await settleOpenOrders(db)
  if (remaining.settled) console.log(`  🧾 Closed ${remaining.settled} day orders`)

  // 2. Close day shift
  const dayShift = await db.query("SELECT id, opened_at FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN' LIMIT 1", [RESTAURANT_ID])
  let dayShiftClosed = false
  if (dayShift.rows.length > 0) {
    const shiftId = dayShift.rows[0].id
    console.log(`  🔐 Closing day shift #${shiftId}`)
    const closed = await finalizeShiftClose(db, shiftId, { businessDate: todayStr })
    if (!dayState.closedShiftIds.includes(shiftId)) dayState.closedShiftIds.push(shiftId)
    console.log(`  📊 Day shift closed — ${closed.cnt} orders, $${parseFloat(closed.sales).toFixed(2)}`)
    dayShiftClosed = true
  }

  const floorCheckouts = await simulateRoleCheckOuts(db, STAFF_GROUPS.dayFloorOpen, { hour: 18, dateStr: todayStr, targetShare: 1, checkoutHour: 18 })
  const cashierCheckouts = await simulateRoleCheckOuts(db, STAFF_GROUPS.dayCashierOpen, { hour: 18, dateStr: todayStr, targetShare: 0.5, checkoutHour: 18 })
  const kitchenCarry = await simulateRoleCheckOuts(db, STAFF_GROUPS.dayKitchenEarly, { hour: 18, dateStr: todayStr, targetShare: 0.2, checkoutHour: 18 })
  recordGroupProgress(db.simState, todayStr, 'dayFloorOpen', 'checkOut', floorCheckouts.total)
  recordGroupProgress(db.simState, todayStr, 'dayCashierOpen', 'checkOut', cashierCheckouts.total)
  recordGroupProgress(db.simState, todayStr, 'dayKitchenEarly', 'checkOut', kitchenCarry.total)
  const morningCheckoutCount = floorCheckouts.total + cashierCheckouts.total + kitchenCarry.total
  if (morningCheckoutCount) console.log(`  👋 Day handoff checkout: ${morningCheckoutCount} staff`)

  // 4. Open night shift
  const nightCashier = pick(CASHIERS)
  const nightOpenedAt = mxTimestamp(18, 0, todayStr)
  nightOpenedAt.setMinutes(rand(0, 20), 0, 0)
  const nightShift = await db.query(`
    INSERT INTO shifts (restaurant_id, master_station_id, user_id, opened_at, status, processed, created_at, updated_at)
    VALUES ($1, $2, $3, $4, 'OPEN', false, now(), now()) RETURNING id
  `, [RESTAURANT_ID, CASH_STATIONS[0].id, nightCashier, nightOpenedAt])
  console.log(`  🌙 Night shift #${nightShift.rows[0].id} opened`)
  if (!dayState.shiftIds.includes(nightShift.rows[0].id)) dayState.shiftIds.push(nightShift.rows[0].id)
  await ensureCashSession(db, nightShift.rows[0].id, {
    cashStationId: CASH_STATIONS[0].id,
    cashUserId: nightCashier,
    openedAt: nightOpenedAt,
  })

  const nightFloor = await simulateRoleCheckIns(db, STAFF_GROUPS.nightFloor, { hour: 18, dateStr: todayStr, targetShare: 0.85 })
  const nightKitchen = await simulateRoleCheckIns(db, STAFF_GROUPS.nightKitchen, { hour: 18, dateStr: todayStr, targetShare: 0.75 })
  const nightCashierCheckins = await simulateRoleCheckIns(db, STAFF_GROUPS.nightCashier, { hour: 18, dateStr: todayStr, targetShare: 1 })
  recordGroupProgress(db.simState, todayStr, 'nightFloor', 'checkIn', nightFloor.total)
  recordGroupProgress(db.simState, todayStr, 'nightKitchen', 'checkIn', nightKitchen.total)
  recordGroupProgress(db.simState, todayStr, 'nightCashier', 'checkIn', nightCashierCheckins.total)
  const eveningCheckins = nightFloor.total + nightKitchen.total + nightCashierCheckins.total
  console.log(`  👥 Evening handoff arrivals: ${eveningCheckins} staff`)
  dayState.handoffCompleted = true

  // 6. Generate first night orders
  const orders = await generateOrders(db, rand(5, 10))

  return phaseResult('shift_change', {
    shiftsClosed: dayShiftClosed ? 1 : 0,
    shiftsOpened: 1,
    attendanceEvents: morningCheckoutCount + eveningCheckins,
    checkIns: eveningCheckins,
    checkOuts: morningCheckoutCount,
    lateCheckIns: nightFloor.late + nightKitchen.late + nightCashierCheckins.late,
    orders: orders.created,
    revenue: orders.revenue,
    payments: orders.payments,
  })
}

// ── Phase: LATE_NIGHT (10pm) — Last orders of the night ─────────

/** @deprecated v4 — not called from main(). Delete after 2026-05-04. */
async function phaseLateNight(db) {
  console.log('🌃 PHASE: LATE_NIGHT — Final service')
  const hour = getHourMX()
  const bootstrap = await ensureOpenShift(db)
  await closeLingeringOrders(db)
  const orders = await generateOrders(db, rand(5, 12))
  const lateNightDate = getBusinessDate()

  // Guarantee at least 1 void per day
  const voidCountToday = await db.query(
    `SELECT count(*) as n FROM orders WHERE restaurant_id = $1 AND status = 'void' AND cancelled_at::date = $2`,
    [RESTAURANT_ID, lateNightDate]
  )
  if (parseInt(voidCountToday.rows[0].n) === 0) {
    const candidate = await db.query(
      `SELECT o.id, o.total FROM orders o
       LEFT JOIN payments p ON p.order_id = o.id
       WHERE o.restaurant_id = $1 AND o.status = 'closed' AND o.closed_at::date = $2
       ORDER BY random() LIMIT 1`, [RESTAURANT_ID, lateNightDate]
    )
    if (candidate.rows.length > 0) {
      const v = candidate.rows[0]
      const cancelReason = pick(['Cliente se fue sin pagar', 'Error de captura', 'Cambio de mesa', 'Duplicada'])
      await db.query(`UPDATE orders SET status = 'void', cancelled_at = now(), cancelled_by_user_id = $2, cancel_reason = $3, updated_at = now() WHERE id = $1`,
        [v.id, pick(MANAGERS), cancelReason])
      console.log(`  🚫 Forced void: order #${v.id}`)
    }
  }

  const floorCheckouts = await simulateRoleCheckOuts(db, STAFF_GROUPS.nightFloor, { hour, dateStr: lateNightDate, targetShare: hour <= 22 ? 0.35 : hour === 23 ? 0.55 : 0.7, checkoutHour: Math.min(Math.max(hour, 22), 23) })
  const earlyKitchenCheckouts = await simulateRoleCheckOuts(db, STAFF_GROUPS.nightKitchen, { hour, dateStr: lateNightDate, targetShare: hour >= 23 ? 0.2 : 0.05, checkoutHour: hour >= 23 ? 23 : hour })
  recordGroupProgress(db.simState, lateNightDate, 'nightFloor', 'checkOut', floorCheckouts.total)
  recordGroupProgress(db.simState, lateNightDate, 'nightKitchen', 'checkOut', earlyKitchenCheckouts.total)
  const checkouts = floorCheckouts.total + earlyKitchenCheckouts.total
  if (checkouts) console.log(`  👋 Late-night partial checkout: ${checkouts} staff`)

  const totals = mergePhaseMetrics(bootstrap, {
    attendanceEvents: checkouts,
    checkOuts: checkouts,
    orders: orders.created,
    revenue: orders.revenue,
    payments: orders.payments,
  })
  return phaseResult('late_night', totals)
}

// ── Phase: CLOSE_NIGHT (3am) — Close night shift + Corte Z ──────

/** @deprecated v4 — not called from main(). Delete after 2026-05-04. */
async function phaseCloseNight(db) {
  console.log('🔒 PHASE: CLOSE_NIGHT — End of night')
  const hour = getHourMX()
  // Business date = getBusinessDate() handles the 4am cutoff automatically
  const businessDate = getBusinessDate()
  const dayState = getDayState(db.simState, businessDate)
  if (dayState.closeNightCompleted) {
    console.log('  ℹ️ Night close already completed for business date')
    return phaseResult('close_night', {
      skipped: true,
      attendanceEvents: 0,
      checkOuts: 0,
      shiftsClosed: 0,
      orders: 0,
      revenue: 0,
    })
  }

  // 1. Close ALL remaining open orders
  const allOpen = await settleOpenOrders(db)
  if (allOpen.settled) console.log(`  🧾 Closed ${allOpen.settled} remaining night orders`)

  // 2. Close night shift
  const nightShift = await db.query("SELECT id, opened_at FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN' LIMIT 1", [RESTAURANT_ID])
  if (nightShift.rows.length > 0) {
    const shiftId = nightShift.rows[0].id
    console.log(`  🔐 Closing night shift #${shiftId}`)
    const closed = await finalizeShiftClose(db, shiftId, { businessDate })
    if (!dayState.closedShiftIds.includes(shiftId)) dayState.closedShiftIds.push(shiftId)
    console.log(`  📊 Night shift closed — ${closed.cnt} orders, $${parseFloat(closed.sales).toFixed(2)}`)
  }

  const kitchenFinal = await simulateRoleCheckOuts(db, STAFF_GROUPS.nightKitchen, { hour, dateStr: businessDate, targetShare: 1, checkoutHour: hour })
  const cashierFinal = await simulateRoleCheckOuts(db, STAFF_GROUPS.nightCashier, { hour, dateStr: businessDate, targetShare: 1, checkoutHour: hour })
  const floorFinal = await simulateRoleCheckOuts(db, STAFF_GROUPS.nightFloor, { hour, dateStr: businessDate, targetShare: 1, checkoutHour: hour })
  recordGroupProgress(db.simState, businessDate, 'nightKitchen', 'checkOut', kitchenFinal.total)
  recordGroupProgress(db.simState, businessDate, 'nightCashier', 'checkOut', cashierFinal.total)
  recordGroupProgress(db.simState, businessDate, 'nightFloor', 'checkOut', floorFinal.total)
  const finalCheckouts = kitchenFinal.total + cashierFinal.total + floorFinal.total
  if (finalCheckouts) console.log(`  💤 Final close checkout: ${finalCheckouts} staff`)

  // 3. Complete/no-show reservations
  await simulateReservations(db, 'close')

  // 4. Free all tables
  await db.query(`UPDATE tables SET status = 'free', updated_at = now() WHERE restaurant_id = $1`, [RESTAURANT_ID])
  dayState.closeNightCompleted = true

  return phaseResult('close_night', {
    attendanceEvents: finalCheckouts,
    checkOuts: finalCheckouts,
    shiftsClosed: nightShift.rows.length > 0 ? 1 : 0,
    orders: 0,
    revenue: 0,
  })
}

// ── Close lingering open orders from previous phases ─────────────
// Simulates customers finishing their meals and paying between phases.
// Called at the start of each phase so Operación shows realistic open accounts.

// ── Maintenance Tick (runs every hour, even if window already ran) ──
// Keeps the restaurant "alive": rotates orders, preserves coverage minimums.
// NOT blocked by sim_runs — this is operational heartbeat, not window transition.
async function maintenanceTick(db, serviceWindow) {
  // Never maintain during CLOSE or CLOSED — those are terminal
  if (serviceWindow === 'CLOSE' || serviceWindow === 'CLOSED') return

  // Must have an open shift
  const shiftRes = await db.query(
    "SELECT id FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN' LIMIT 1",
    [RESTAURANT_ID]
  )
  if (shiftRes.rows.length === 0) return

  const shiftId = shiftRes.rows[0].id
  const MIN_OPEN = 2
  const MIN_PRINTED = 2
  const MIN_ROTATION = 2  // close+replace at least 2 per tick for visual movement

  // 1. Count current active orders
  const active = await db.query(`
    SELECT o.id, o.status, o.opened_at, o.area_id, a.name as area_name
    FROM orders o LEFT JOIN areas a ON o.area_id = a.id
    WHERE o.restaurant_id = $1 AND o.shift_id = $2 AND o.status IN ('open', 'printed')
    ORDER BY o.opened_at ASC
  `, [RESTAURANT_ID, shiftId])

  let openCount = active.rows.filter(r => r.status === 'open').length
  let printedCount = active.rows.filter(r => r.status === 'printed').length
  const totalActive = active.rows.length

  console.log(`  🔄 Maintenance: ${totalActive} active (${openCount} open, ${printedCount} printed)`)

  // 2. Close old orders (rotate out) — but NEVER break minimums
  const now = new Date()
  const MIN_AGE_MS = 30 * 60 * 1000 // 30 min for maintenance (shorter than closeLingeringOrders)
  const byArea = {}
  for (const o of active.rows) {
    const area = o.area_name || 'unknown'
    byArea[area] = (byArea[area] || 0) + 1
  }

  let closed = 0
  for (const o of active.rows) {
    if (closed >= MIN_ROTATION) break
    const ageMs = now.getTime() - new Date(o.opened_at).getTime()
    if (ageMs < MIN_AGE_MS) continue

    // Check all invariants before closing
    const area = o.area_name || 'unknown'
    if ((byArea[area] || 0) <= 1) continue
    if (o.status === 'open' && openCount <= MIN_OPEN) continue
    if (o.status === 'printed' && printedCount <= MIN_PRINTED) continue
    if (totalActive - closed <= (MIN_OPEN + MIN_PRINTED + 1)) break

    // Close this order
    const closedAt = new Date(now.getTime() - rand(1, 10) * 60000)
    await settleOrder(db, o, closedAt)

    byArea[area]--
    if (o.status === 'open') openCount--
    if (o.status === 'printed') printedCount--
    closed++
  }
  if (closed) console.log(`  🔄 Rotated out: ${closed} orders closed`)

  // 3. Generate replacements to maintain minimums
  const needOpen = Math.max(0, MIN_OPEN - openCount)
  const needPrinted = Math.max(0, MIN_PRINTED - printedCount)
  const needTotal = needOpen + needPrinted + Math.max(0, closed - needOpen - needPrinted)

  if (needTotal > 0) {
    // Generate replacement orders with forced status
    const result = await generateOrders(db, needTotal, { noOpen: false, forceActive: true })
    console.log(`  🔄 Rotated in: ${result?.created || 0} new orders`)
  }

  // 4. Fix coverage if still below minimums (belt and suspenders)
  const recheck = await db.query(`
    SELECT status, count(*)::int as cnt FROM orders
    WHERE restaurant_id = $1 AND shift_id = $2 AND status IN ('open', 'printed')
    GROUP BY status
  `, [RESTAURANT_ID, shiftId])

  const finalOpen = recheck.rows.find(r => r.status === 'open')?.cnt || 0
  const finalPrinted = recheck.rows.find(r => r.status === 'printed')?.cnt || 0

  // If still short on open, flip some printed → open
  if (finalOpen < MIN_OPEN && finalPrinted > MIN_PRINTED) {
    const toFlip = Math.min(MIN_OPEN - finalOpen, finalPrinted - MIN_PRINTED)
    await db.query(`
      UPDATE orders SET status = 'open', updated_at = now()
      WHERE id IN (
        SELECT id FROM orders WHERE restaurant_id = $1 AND shift_id = $2 AND status = 'printed'
        ORDER BY opened_at DESC LIMIT $3
      )
    `, [RESTAURANT_ID, shiftId, toFlip])
    if (toFlip) console.log(`  🔄 Flipped ${toFlip} printed → open`)
  }

  // If still short on printed, flip some open → printed
  if (finalPrinted < MIN_PRINTED && finalOpen > MIN_OPEN) {
    const toFlip = Math.min(MIN_PRINTED - finalPrinted, finalOpen - MIN_OPEN)
    await db.query(`
      UPDATE orders SET status = 'printed', updated_at = now()
      WHERE id IN (
        SELECT id FROM orders WHERE restaurant_id = $1 AND shift_id = $2 AND status = 'open'
        ORDER BY opened_at ASC LIMIT $3
      )
    `, [RESTAURANT_ID, shiftId, toFlip])
    if (toFlip) console.log(`  🔄 Flipped ${toFlip} open → printed`)
  }

  console.log(`  ✅ Maintenance done: ${finalOpen >= MIN_OPEN ? '✓' : '✗'} open≥${MIN_OPEN}, ${finalPrinted >= MIN_PRINTED ? '✓' : '✗'} printed≥${MIN_PRINTED}`)

  // Write maintenance artifact
  try {
    ensureDir(RUNTIME_ARTIFACT_DIR)
    const artifactPath = join(RUNTIME_ARTIFACT_DIR, `${new Date().toISOString().replace(/[:.]/g, '-')}-${ENV_PROFILE}-maintenance.json`)
    fs.writeFileSync(artifactPath, JSON.stringify({
      type: 'maintenance',
      envProfile: ENV_PROFILE,
      businessDate: getBusinessDate(),
      serviceWindow,
      restaurantId: RESTAURANT_ID,
      timestamp: new Date().toISOString(),
      rotatedOut: closed,
      rotatedIn: needTotal,
      coverage: { open: finalOpen, printed: finalPrinted },
      coverageOk: finalOpen >= MIN_OPEN && finalPrinted >= MIN_PRINTED,
    }, null, 2))
  } catch (e) { /* artifact write is best-effort */ }
}

async function closeLingeringOrders(db) {
  const openOrders = await db.query(`
    SELECT o.id, o.status, o.total, o.tip, o.shift_id, o.cash_station_id,
           o.cashier_id, o.waiter_id, o.opened_at, o.area_id, a.name as area_name
    FROM orders o
    LEFT JOIN areas a ON o.area_id = a.id
    WHERE o.restaurant_id = $1 AND o.status IN ('open', 'printed')
    ORDER BY o.opened_at ASC
  `, [RESTAURANT_ID])

  if (openOrders.rows.length === 0) return 0

  // ── Invariantes de cobertura (reglas de negocio del demo) ──
  // Estas NO son probabilidades — son pisos duros que nunca se rompen.
  const now = new Date()
  const MIN_ACTIVE_TOTAL = 5       // nunca bajar de 5 cuentas activas
  const MIN_OPEN = 2               // siempre ≥2 con status 'open'
  const MIN_PRINTED = 2            // siempre ≥2 con status 'printed'
  const MIN_PER_AREA = 1           // nunca vaciar un área completamente
  const MIN_AGE_MS = 45 * 60 * 1000 // solo cerrar orders de >45 min

  // Count current distribution
  const byArea = {}
  let openCount = 0
  let printedCount = 0
  for (const o of openOrders.rows) {
    const area = o.area_name || 'unknown'
    byArea[area] = (byArea[area] || 0) + 1
    if (o.status === 'open') openCount++
    if (o.status === 'printed') printedCount++
  }

  let remaining = openOrders.rows.length
  let closed = 0

  for (const o of openOrders.rows) {
    // INVARIANT 1: never go below minimum total active
    if (remaining <= MIN_ACTIVE_TOTAL) break

    // INVARIANT 2: only close orders older than 45 min
    const ageMs = now.getTime() - new Date(o.opened_at).getTime()
    if (ageMs < MIN_AGE_MS) continue

    // INVARIANT 3: never empty an area
    const area = o.area_name || 'unknown'
    if ((byArea[area] || 0) <= MIN_PER_AREA) continue

    // INVARIANT 4: never go below minimum open
    if (o.status === 'open' && openCount <= MIN_OPEN) continue

    // INVARIANT 5: never go below minimum printed
    if (o.status === 'printed' && printedCount <= MIN_PRINTED) continue

    // All invariants pass — close this order
    const openedMs = new Date(o.opened_at).getTime()
    const closedAt = new Date(Math.max(openedMs + rand(30, 90) * 60000, now.getTime() - rand(1, 30) * 60000))

    // Close the order + mark all items as prepared
    await db.query(`
      UPDATE orders SET status = 'closed', closed_at = $2, updated_at = now() WHERE id = $1
    `, [o.id, closedAt])
    await db.query(`
      UPDATE order_items SET status = 'prepared', prepared_at = COALESCE(prepared_at, $2), updated_at = now()
      WHERE order_id = $1 AND status IN ('pending','sent','fire')
    `, [o.id, closedAt])

    // Free the table
    await db.query(`UPDATE tables SET status = 'free', updated_at = now()
      WHERE restaurant_id = $1 AND id = (SELECT table_id FROM orders WHERE id = $2)`, [RESTAURANT_ID, o.id])

    // Create SALE payment (fallback station/cashier if missing — admin-created orders)
    const method = pickWeighted(PAYMENT_METHODS)
    const orderTotal = Number(o.total)
    const tip = Number(o.tip || 0)
    const stationId = o.cash_station_id || CASH_STATIONS[0].id
    const cashierId = o.cashier_id || pick(CASHIERS)
    const shiftId = o.shift_id || (await db.query("SELECT id FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN' LIMIT 1", [RESTAURANT_ID])).rows[0]?.id

    if (!shiftId) { console.warn(`  ⚠️ Skipping order #${o.id} — no shift`); continue }

    await db.query(`
      INSERT INTO payments (order_id, payment_method_id, amount, currency, status, kind, paid_at, shift_id, cash_station_id, cashier_id, created_at, updated_at)
      VALUES ($1, $2, $3, 'MXN', 'settled', 'SALE', $4, $5, $6, $7, $4, $4)
    `, [o.id, method.id, orderTotal, closedAt, shiftId, stationId, cashierId])

    // Create TIP payment if applicable
    if (tip > 0) {
      await db.query(`
        INSERT INTO payments (order_id, payment_method_id, amount, currency, status, kind, paid_at, shift_id, cash_station_id, cashier_id, created_at, updated_at)
        VALUES ($1, $2, $3, 'MXN', 'settled', 'TIP', $4, $5, $6, $7, $4, $4)
      `, [o.id, method.id, tip, closedAt, shiftId, stationId, cashierId])
      await db.query(`UPDATE orders SET tip_collected_total = $2, updated_at = now() WHERE id = $1`, [o.id, tip])
    }

    // Update counters after closing
    byArea[area]--
    if (o.status === 'open') openCount--
    if (o.status === 'printed') printedCount--
    remaining--
    closed++
  }

  if (closed) console.log(`  🧾 Closed ${closed} lingering orders (${remaining} still active: ${openCount} open, ${printedCount} printed)`)
  return closed
}

// ── Order Generation (shared) ────────────────────────────────────

async function generateOrders(db, count, opts = {}) {
  // Enforce per-run cap
  count = Math.min(count, MAX_ORDERS_PER_RUN)

  // Check daily cap
  const todayStr = today()
  const todayCount = await db.query(
    "SELECT count(*) as cnt FROM orders WHERE restaurant_id = $1 AND ((created_at AT TIME ZONE 'America/Mexico_City')::date = $2)",
    [RESTAURANT_ID, todayStr]
  )
  const existing = parseInt(todayCount.rows[0].cnt)
  const remaining = MAX_ORDERS_PER_DAY - existing
  if (remaining <= 0) {
    console.log(`  ⛔ Daily order limit reached (${existing}/${MAX_ORDERS_PER_DAY}). Skipping orders.`)
    return
  }
  count = Math.min(count, remaining)

  const shiftRow = await db.query(
    "SELECT id FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN' LIMIT 1",
    [RESTAURANT_ID]
  )
  if (shiftRow.rows.length === 0) {
    console.log('  ⚠️ No open shift — skipping orders')
    return { created: 0, revenue: 0, payments: 0 }
  }
  const shiftId = shiftRow.rows[0].id
  const now = new Date()
  let total = 0, revenue = 0, payments = 0

  for (let i = 0; i < count; i++) {
    // PATCH: incident response — try-catch per order so one FK violation doesn't kill the batch
    try {
    const area = pickWeighted(AREAS)
    const waiter = pick(WAITERS)
    const cashier = pick(CASHIERS)
    const station = area.name === 'Bar Fogo' ? CASH_STATIONS[1] : CASH_STATIONS[0]
    // Delivery/Para Llevar = fewer persons, no dine-in
    const isDelivery = area.service_id === 47 // Delivery
    const isTakeout = area.service_id === 50 // Para Llevar
    const persons = isDelivery ? rand(1, 3) : isTakeout ? rand(1, 2) : rand(1, 6)
    // Delivery/takeout orders are always closed immediately (no dine-in)
    const forceClose = isDelivery || isTakeout

    const minutesAgo = rand(5, 170)
    const openedAt = new Date(now.getTime() - minutesAgo * 60000)
    
    // Clamp openedAt to today's start in MX timezone to avoid cross-day leakage
    const todayMXStart = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Mexico_City' }))
    todayMXStart.setHours(0, 0, 0, 0)
    // Convert back to UTC: MX is UTC-6
    const todayStartUTC = new Date(todayMXStart.getTime() + 6 * 60 * 60 * 1000)
    if (openedAt < todayStartUTC) {
      openedAt.setTime(todayStartUTC.getTime() + rand(0, 30) * 60000)
    }
    
    const closedAt = new Date(openedAt.getTime() + rand(30, 90) * 60000)
    // Clamp closedAt to before midnight MX (23:59)
    const todayEndUTC = new Date(todayStartUTC.getTime() + 24 * 60 * 60 * 1000 - 60000)
    if (closedAt > todayEndUTC) {
      closedAt.setTime(todayEndUTC.getTime())
    }

    const items = generateOrderItems(persons)
    const subtotal = items.reduce((s, it) => s + it.price * it.qty, 0)
    const tax = Math.round(subtotal * TAX_RATE * 100) / 100
    const orderTotal = Math.round((subtotal + tax) * 100) / 100

    const hasTip = Math.random() < 0.70
    const tip = hasTip ? Math.round(orderTotal * (rand(10, 20) / 100) * 100) / 100 : 0

    const hasDiscount = Math.random() < 0.03
    const discPct = hasDiscount ? pick([10, 15, 20]) : null
    const discAmt = hasDiscount ? Math.round(subtotal * discPct / 100 * 100) / 100 : null
    const discReason = hasDiscount ? pick(['Cortesía gerente', 'Promoción especial', 'Cliente frecuente', 'Evento corporativo']) : null
    const isVoid = Math.random() < 0.02
    // 40% of orders stay active (open or printed) — except in close phase
    // forceActive: maintenance tick needs ALL replacement orders to stay active
    const leaveOpen = opts.forceActive ? !isVoid : (!isVoid && !opts.noOpen && !forceClose && Math.random() < 0.40)

    const finalSubtotal = hasDiscount ? subtotal - discAmt : subtotal
    const finalTotal = hasDiscount ? orderTotal - discAmt : orderTotal

    // Assign a real table from the DB (only for areas with tables)
    let tableId = null
    let tableName = area.name.charAt(0) + rand(1, 20)
    if (area.hasTables) {
      const tableRow = await db.query(`
        SELECT id, code FROM tables
        WHERE restaurant_id = $1 AND area_id = $2 AND status = 'free'
        ORDER BY random() LIMIT 1
      `, [RESTAURANT_ID, area.id])
      tableId = tableRow.rows[0]?.id || null
      tableName = tableRow.rows[0]?.code || tableName
      if (leaveOpen && tableId) {
        await db.query(`UPDATE tables SET status = 'busy', updated_at = now() WHERE id = $1`, [tableId])
      }
    } else {
      // Non-table areas: distinct prefix by type
      const isEventArea = (area.name || '').toLowerCase().includes('evento')
      if (isDelivery) tableName = `${area.name}-${rand(1000, 9999)}`
      else if (isEventArea) tableName = `EVT-${rand(100, 999)}`
      else tableName = `PLL-${rand(100, 999)}`
    }

    const orderResult = await db.query(`
      INSERT INTO orders (
        restaurant_id, cash_station_id, shift_id, waiter_id, cashier_id,
        status, opened_at, closed_at, subtotal, tax, total, tip,
        persons, area_id, service_id, origin, table_id, "tableName",
        discount_type, discount_value, discount_reason, discount_applied_by, discount_amount,
        cancelled_at, cancelled_by_user_id, cancel_reason,
        created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12,
        $13, $14, $15, $26, $24, $25,
        $16, $17, $18, $19, $20, $21, $22, $23, $7, $8
      ) RETURNING id
    `, [
      RESTAURANT_ID, station.id, shiftId, waiter, cashier,
      isVoid ? 'void' : leaveOpen ? (Math.random() < 0.5 ? 'open' : 'printed') : 'closed', openedAt, isVoid ? openedAt : leaveOpen ? null : closedAt,
      finalSubtotal, tax, finalTotal, tip,
      persons, area.id, area.service_id,
      hasDiscount ? 'percent' : null, discPct, discReason,
      hasDiscount ? pick(MANAGERS) : null, discAmt,
      isVoid ? closedAt : null, isVoid ? pick(MANAGERS) : null,
      isVoid ? pick(['Cliente se fue', 'Error de captura', 'Cambio de mesa']) : null,
      tableId, tableName,
      isDelivery ? 'delivery' : isTakeout ? 'takeout' : 'pos',
    ])

    const orderId = orderResult.rows[0].id
    // Determine route_area_id per item (cocina=44 vs barra=45)
    // Beverages go to barra regardless of area, food goes to cocina

    for (const item of items) {
      const itemCancelled = !isVoid && Math.random() < 0.04
      const cancelReason = itemCancelled ? pick(['Cliente cambió de opinión', 'Se acabó el producto', 'Error de captura', 'Platillo tardó mucho']) : null
      const prepMinutes = rand(5, 25)

      // For open/printed orders: items are in production (pending/sent/fire)
      // For closed orders: items are prepared
      let itemStatus = 'prepared'
      let preparedAt = new Date(openedAt.getTime() + prepMinutes * 60000)
      if (itemCancelled) {
        itemStatus = 'cancelled'
        preparedAt = null
      } else if (leaveOpen) {
        // Mix of production statuses for open orders
        const prodStatuses = ['pending', 'sent', 'sent', 'fire', 'fire', 'prepared']
        itemStatus = pick(prodStatuses)
        preparedAt = itemStatus === 'prepared' ? new Date(openedAt.getTime() + prepMinutes * 60000) : null
      }

      // Route: beverages (Cocteles, Bebidas sin alcohol, Vinos, Licores) → barra(45), everything else → cocina(44)
      const itemRouteAreaId = (item.category === 'Bebidas' || area.name === 'Bar Fogo') ? 45 : 44

      const itemResult = await db.query(`
        INSERT INTO order_items (order_id, product_id, qty, unit_price, total, course, tax_rate, base_price, status, cancellation_reason, prepared_at, route_area_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, 1, $6, $4, $7, $8, $9, $10, $11, $11)
        RETURNING id
      `, [orderId, item.id, item.qty, item.price, item.price * item.qty, TAX_RATE,
          itemStatus,
          cancelReason,
          preparedAt,
          itemRouteAreaId,
          openedAt])

      // Create order_item_voids record for cancelled items (feeds cancellation reports)
      if (itemCancelled) {
        const voidedAt = new Date(openedAt.getTime() + rand(5, 30) * 60000)
        await db.query(`
          INSERT INTO order_item_voids (order_id, order_item_id, product_id, qty, unit_price, reason, voided_by, voided_at, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $8, $8)
        `, [orderId, itemResult.rows[0].id, item.id, item.qty, item.price, cancelReason, pick(MANAGERS), voidedAt])
      }
    }

    // Create payment immediately for closed orders (not open ones — they pay later)
    if (!isVoid && !leaveOpen) {
      const method = pickWeighted(PAYMENT_METHODS)
      // 1. SALE payment (the actual sale amount)
      await db.query(`
        INSERT INTO payments (order_id, payment_method_id, amount, currency, status, kind, paid_at, shift_id, cash_station_id, cashier_id, created_at, updated_at)
        VALUES ($1, $2, $3, 'MXN', 'settled', 'SALE', $4, $5, $6, $7, $4, $4)
      `, [orderId, method.id, finalTotal, closedAt, shiftId, station.id, cashier])
      payments++

      // 2. TIP payment (separate record — source of truth for tip_collected_total)
      if (tip > 0) {
        await db.query(`
          INSERT INTO payments (order_id, payment_method_id, amount, currency, status, kind, paid_at, shift_id, cash_station_id, cashier_id, created_at, updated_at)
          VALUES ($1, $2, $3, 'MXN', 'settled', 'TIP', $4, $5, $6, $7, $4, $4)
        `, [orderId, method.id, tip, closedAt, shiftId, station.id, cashier])

        // 3. Accumulate tip_collected_total on the order (matches real adminPay flow)
        await db.query(`
          UPDATE orders SET tip_collected_total = $2, updated_at = $3 WHERE id = $1
        `, [orderId, tip, closedAt])
        payments++
      }
    }

    total++
    revenue += finalTotal
    } catch (orderErr) {
      console.error(`  ⚠️ Order ${i + 1}/${count} failed: ${orderErr.message}`)
    }
  }

  console.log(`  🍽️ Orders: ${total} created, revenue: $${revenue.toFixed(2)}`)
  return { created: total, revenue, payments }
}

// ── Reservations Simulation ──────────────────────────────────────

const GUEST_FIRST_NAMES = [
  'Carlos','María','Roberto','Ana','Fernando','Gabriela','Diego','Valentina',
  'Javier','Lucía','Emilio','Sofía','Andrés','Patricia','Raúl','Isabella',
  'Marco','Daniela','Arturo','Camila','Héctor','Laura','Santiago','Alejandra',
  'Rodrigo','Mariana','Pablo','Renata','Eduardo','Natalia',
]
const GUEST_LAST_NAMES = [
  'García','Hernández','López','Martínez','González','Rodríguez','Pérez',
  'Sánchez','Ramírez','Torres','Flores','Rivera','Gómez','Díaz','Reyes',
  'Cruz','Morales','Ortiz','Gutiérrez','Chávez',
]
const RESERVATION_SOURCES = ['widget', 'whatsapp', 'admin', 'walkin']
const RESERVATION_TIMES = ['13:00','13:30','14:00','14:30','19:00','19:30','20:00','20:30','21:00']
const RESERVATION_NOTES = [null, null, null, null, 'Cumpleaños', 'Mesa junto a ventana', 'Sin gluten', 'Grupo corporativo', 'Aniversario', 'Niños pequeños']

async function simulateReservations(db, phase) {
  const todayStr = today()
  let created = 0, completed = 0, noShows = 0

  // Get reservation types for this restaurant
  const typesRes = await db.query(
    'SELECT id, duration_minutes FROM reservation_types WHERE restaurant_id = $1 AND is_active = true',
    [RESTAURANT_ID]
  )
  if (typesRes.rows.length === 0) return { reservations: 0 }

  // Get existing customers
  const customersRes = await db.query(
    'SELECT id, name, phone, email FROM customers WHERE restaurant_id = $1',
    [RESTAURANT_ID]
  )

  if (phase === 'open') {
    // Generate 8-14 reservations for today (mix of new + existing customers)
    const existingToday = await db.query(
      "SELECT count(*) as cnt FROM reservations WHERE restaurant_id = $1 AND date = $2",
      [RESTAURANT_ID, todayStr]
    )
    if (parseInt(existingToday.rows[0].cnt) > 5) {
      console.log(`  📅 Reservations: ${existingToday.rows[0].cnt} already exist for today`)
      return { reservations: 0 }
    }

    const count = rand(8, 14)
    for (let i = 0; i < count; i++) {
      const type = pick(typesRes.rows)
      const time = pick(RESERVATION_TIMES)
      const endMinutes = parseInt(time.split(':')[0]) * 60 + parseInt(time.split(':')[1]) + type.duration_minutes
      const endTime = `${Math.floor(endMinutes / 60).toString().padStart(2, '0')}:${(endMinutes % 60).toString().padStart(2, '0')}`
      const source = pick(RESERVATION_SOURCES)
      const partySize = rand(2, 8)

      // 60% existing customer, 40% new
      let customerId = null
      let guestName, guestPhone, guestEmail
      if (customersRes.rows.length > 0 && Math.random() < 0.6) {
        const customer = pick(customersRes.rows)
        customerId = customer.id
        guestName = customer.name
        guestPhone = customer.phone
        guestEmail = customer.email
      } else {
        guestName = `${pick(GUEST_FIRST_NAMES)} ${pick(GUEST_LAST_NAMES)}`
        guestPhone = `555${rand(1000000, 9999999)}`
        guestEmail = guestName.toLowerCase().replace(/\s+/g, '.').replace(/[áéíóúñ]/g, c => ({á:'a',é:'e',í:'i',ó:'o',ú:'u',ñ:'n'}[c] || c)) + '@email.com'

        // Create new customer
        const newCust = await db.query(`
          INSERT INTO customers (restaurant_id, name, phone, email, visit_count, no_show_count, cancel_count, is_vip, tags, created_at, updated_at)
          VALUES ($1, $2, $3, $4, 0, 0, 0, false, '[]'::jsonb, now(), now()) RETURNING id
        `, [RESTAURANT_ID, guestName, guestPhone, guestEmail])
        customerId = newCust.rows[0].id
        customersRes.rows.push({ id: customerId, name: guestName, phone: guestPhone, email: guestEmail })
      }

      await db.query(`
        INSERT INTO reservations (
          restaurant_id, reservation_type_id, customer_id, guest_name, guest_phone, guest_email,
          party_size, date, start_time, end_time, status, source, confirmation_code,
          notes, confirmed_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'confirmed', $11, $12, $13, now(), now(), now())
      `, [RESTAURANT_ID, type.id, customerId, guestName, guestPhone, guestEmail,
          partySize, todayStr, time, endTime, source,
          'FOGO-' + String(rand(1000, 9999)),
          pick(RESERVATION_NOTES)])
      created++
    }
    console.log(`  📅 Reservations: ${created} created for today`)
  }

  if (phase === 'dinner') {
    // Seat some confirmed reservations (lunch ones)
    const lunchRes = await db.query(`
      UPDATE reservations SET status = 'seated', seated_at = now(), updated_at = now()
      WHERE restaurant_id = $1 AND date = $2 AND status = 'confirmed'
        AND start_time < '15:00'
      RETURNING id
    `, [RESTAURANT_ID, todayStr])
    if (lunchRes.rowCount) console.log(`  📅 Reservations: ${lunchRes.rowCount} lunch seated`)
  }

  if (phase === 'close') {
    // Complete seated ones
    const completedRes = await db.query(`
      UPDATE reservations SET status = 'completed', updated_at = now()
      WHERE restaurant_id = $1 AND date = $2 AND status = 'seated'
      RETURNING id, customer_id
    `, [RESTAURANT_ID, todayStr])
    completed = completedRes.rowCount || 0

    // Seat + complete dinner reservations
    const dinnerSeated = await db.query(`
      UPDATE reservations SET status = 'completed', seated_at = now(), updated_at = now()
      WHERE restaurant_id = $1 AND date = $2 AND status = 'confirmed'
        AND start_time >= '15:00'
        AND random() < 0.85
      RETURNING id, customer_id
    `, [RESTAURANT_ID, todayStr])
    completed += dinnerSeated.rowCount || 0

    // No-shows (~10% of remaining confirmed)
    const noShowRes = await db.query(`
      UPDATE reservations SET status = 'no_show', updated_at = now()
      WHERE restaurant_id = $1 AND date = $2 AND status = 'confirmed'
      RETURNING id, customer_id
    `, [RESTAURANT_ID, todayStr])
    noShows = noShowRes.rowCount || 0

    // Update customer visit counts
    const allCompleted = [...(completedRes.rows || []), ...(dinnerSeated.rows || [])]
    for (const r of allCompleted) {
      if (r.customer_id) {
        await db.query(`
          UPDATE customers SET visit_count = visit_count + 1, last_visit_at = now(), updated_at = now()
          WHERE id = $1
        `, [r.customer_id])
      }
    }
    for (const r of (noShowRes.rows || [])) {
      if (r.customer_id) {
        await db.query(`
          UPDATE customers SET no_show_count = no_show_count + 1, updated_at = now()
          WHERE id = $1
        `, [r.customer_id])
      }
    }

    if (completed || noShows) console.log(`  📅 Reservations: ${completed} completed, ${noShows} no-shows`)
  }

  return { reservations: created + completed + noShows }
}

// ── Inventory Simulation ─────────────────────────────────────────

const INVENTORY_PHASE_PROFILES = {
  prod: {
    openPurchases: [18, 30],
    lunchPurchases: [8, 16],
    consume: { afternoon: [10, 18], dinner: [15, 24], close: [8, 14] },
    waste: [2, 6],
  },
  dev: {
    openPurchases: [10, 18],
    lunchPurchases: [5, 10],
    consume: { afternoon: [6, 12], dinner: [8, 14], close: [5, 8] },
    waste: [1, 4],
  },
  local: {
    openPurchases: [8, 14],
    lunchPurchases: [4, 8],
    consume: { afternoon: [4, 8], dinner: [6, 10], close: [3, 6] },
    waste: [1, 3],
  },
}

function sampleItems(items, min, max) {
  const count = Math.min(items.length, rand(min, max))
  return [...items].sort(() => Math.random() - 0.5).slice(0, count)
}

function purchaseQtyForEnv(profile) {
  const base = profile === 'prod' ? 12 : profile === 'dev' ? 8 : 6
  return Math.round((base + Math.random() * base * 2) * 100) / 100
}

function consumptionQtyForEnv(profile) {
  const base = profile === 'prod' ? 4 : profile === 'dev' ? 2.5 : 1.8
  return Math.round((0.5 + Math.random() * base) * 100) / 100
}

function wasteQtyForEnv(profile) {
  const base = profile === 'prod' ? 1.5 : profile === 'dev' ? 1 : 0.7
  return Math.round((0.1 + Math.random() * base) * 100) / 100
}

function findPurchaseProfile(itemName) {
  return Object.values(DEMO_PURCHASE_PROFILES).find(profile => hasAnyKeyword(itemName, profile.keywords))
}

function pickRange([min, max]) {
  return Math.round((min + Math.random() * (max - min)) * 100) / 100
}

function recipeDrivenConsumption(items, soldProducts, phase) {
  const impacts = []
  for (const sold of soldProducts) {
    const recipe = DEMO_RECIPES.find(r => hasAnyKeyword(sold.name, r.productKeywords))
    if (!recipe) continue
    for (const ingredient of recipe.ingredients) {
      const candidate = items.find(item => hasAnyKeyword(item.name, ingredient.keywords))
      if (!candidate) continue
      const qty = Math.round(pickRange(ingredient.qty) * Math.max(1, sold.qty) * 100) / 100
      impacts.push({ item: candidate, qty, recipe: recipe.name, product: sold.name })
    }
  }

  if (impacts.length > 0) return impacts

  const phaseDefaults = {
    afternoon: ['salad', 'potato', 'rice', 'bean', 'shrimp'],
    dinner: ['picanha', 'sirloin', 'wine', 'beer', 'salad'],
    close: ['picanha', 'sirloin', 'salad', 'sugar'],
  }
  const fallbackKeywords = phaseDefaults[phase] || ['salad', 'potato', 'rice']
  return fallbackKeywords.flatMap(keyword => {
    const item = items.find(it => normalizeText(it.name).includes(keyword))
    if (!item) return []
    return [{ item, qty: consumptionQtyForEnv(ENV_PROFILE), recipe: 'fallback', product: keyword }]
  })
}

async function simulateInventory(db, phase) {
  try {
    const { rows: [{ cnt }] } = await db.query(
      'SELECT count(*) as cnt FROM inventory_items WHERE restaurant_id = $1', [RESTAURANT_ID]
    )
    if (parseInt(cnt) === 0) {
      console.log('  ℹ️ No inventory items — skipping inventory sim')
      return { purchases: 0, consumptions: 0, waste: 0 }
    }
  } catch (e) {
    console.log('  ℹ️ Inventory tables not available — skipping')
    return { purchases: 0, consumptions: 0, waste: 0, skipped: true }
  }

  const { rows: warehouses } = await db.query(
    'SELECT id, code FROM inventory_warehouses WHERE restaurant_id = $1', [RESTAURANT_ID]
  )
  if (warehouses.length === 0) return { purchases: 0, consumptions: 0, waste: 0 }

  const mainWH = warehouses.find(w => w.code === 'GENERAL' || w.code === 'GEN') || warehouses[0]
  const kitchenWH = warehouses.find(w => w.code === 'COCINA' || w.code === 'COC') || mainWH

  const { rows: items } = await db.query(`
    SELECT ii.id as item_id, ii.code, ii.name, ii.unit_id,
           ip.id as pres_id, ip.content_in_base_unit,
           COALESCE(ipd.standard_cost, 0) as cost
    FROM inventory_items ii
    JOIN inventory_presentations ip ON ip.inventory_item_id = ii.id
    LEFT JOIN inventory_presentation_details ipd ON ipd.presentation_id = ip.id
    WHERE ii.restaurant_id = $1 AND ii.is_active = true
    ORDER BY ii.id
  `, [RESTAURANT_ID])
  if (items.length === 0) return { purchases: 0, consumptions: 0, waste: 0 }

  const todayStr = today()
  const profile = INVENTORY_PHASE_PROFILES[ENV_PROFILE]
  const soldProducts = []
  let purchaseCount = 0, consumptionCount = 0, wasteCount = 0

  const tryInsertMovement = async (whId, itemId, presId, type, qty, unitCost, note) => {
    const totalCost = Math.round(Math.abs(qty) * unitCost * 100) / 100
    try {
      await db.query(`
        INSERT INTO inventory_movements (warehouse_id, inventory_item_id, presentation_id, movement_type, quantity_base, unit_cost, total_cost,
          reference_type, notes, movement_at, restaurant_id, created_at, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, 'simulator', $8, now(), $9, now(), now())
      `, [whId, itemId, presId, type, qty, unitCost, totalCost, note, RESTAURANT_ID])
      return true
    } catch (e) {
      return false
    }
  }

  if (phase === 'open' || phase === 'lunch') {
    const [minPurch, maxPurch] = phase === 'open' ? profile.openPurchases : profile.lunchPurchases
    const purchaseItems = sampleItems(items, minPurch, maxPurch)
    for (const item of purchaseItems) {
      const purchaseProfile = findPurchaseProfile(item.name)
      const qty = purchaseProfile
        ? pickRange(phase === 'open' ? purchaseProfile.openQty : purchaseProfile.lunchQty)
        : purchaseQtyForEnv(ENV_PROFILE)
      const unitCost = parseFloat(item.cost) || (purchaseProfile ? pickRange(purchaseProfile.costRange) : rand(20, 500))
      const note = `${ENV_PROFILE.toUpperCase()} entrega ${phase} ${todayStr} - ${item.name}`
      const ok = await tryInsertMovement(mainWH.id, item.item_id, item.pres_id, 'purchase', qty, unitCost, note)
      if (ok) purchaseCount++
      else if (purchaseCount === 0) { console.log('  ⚠️ inventory_movements table issue — skipping'); return { purchases: 0, consumptions: 0, waste: 0, skipped: true } }
    }
  }

  if (phase === 'afternoon' || phase === 'dinner' || phase === 'close') {
    const { rows: soldRows } = await db.query(`
      SELECT p.name, sum(oi.qty) as qty
      FROM order_items oi
      JOIN orders o ON o.id = oi.order_id
      JOIN products p ON p.id = oi.product_id
      WHERE o.restaurant_id = $1
        AND o.created_at::date = CURRENT_DATE
      GROUP BY p.name
      ORDER BY sum(oi.qty) DESC
      LIMIT 12
    `, [RESTAURANT_ID]).catch(() => ({ rows: [] }))
    soldProducts.push(...soldRows.map(r => ({ name: r.name, qty: Number(r.qty) || 1 })))

    const [minConsume, maxConsume] = profile.consume[phase]
    const plannedConsumptions = recipeDrivenConsumption(items, soldProducts, phase)
      .slice(0, Math.min(rand(minConsume, maxConsume), 18))

    for (const entry of plannedConsumptions) {
      const item = entry.item
      const qty = entry.qty || consumptionQtyForEnv(ENV_PROFILE)
      const unitCost = parseFloat(item.cost) || rand(20, 500)
      const note = `${ENV_PROFILE.toUpperCase()} consumo ${phase} ${todayStr} - ${entry.recipe}/${entry.product}`
      const ok = await tryInsertMovement(kitchenWH.id, item.item_id, item.pres_id, 'consumption', -qty, unitCost, note)
      if (ok) consumptionCount++
      else if (consumptionCount === 0) { console.log('  ⚠️ inventory consumption issue — skipping'); return { purchases: purchaseCount, consumptions: 0, waste: 0, skipped: true } }
    }

    if (phase === 'close') {
      const [minWaste, maxWaste] = profile.waste
      const wasteItems = sampleItems(items, minWaste, maxWaste)
      for (const item of wasteItems) {
        const qty = wasteQtyForEnv(ENV_PROFILE)
        const unitCost = parseFloat(item.cost) || rand(20, 500)
        const ok = await tryInsertMovement(kitchenWH.id, item.item_id, item.pres_id, 'waste', -qty, unitCost, `${ENV_PROFILE.toUpperCase()} merma cierre ${todayStr} - ${item.name}`)
        if (ok) wasteCount++
      }
    }
  }

  if (purchaseCount > 0 || consumptionCount > 0 || wasteCount > 0) {
    console.log(`  📦 Inventory (${ENV_PROFILE}): ${purchaseCount} purchases, ${consumptionCount} consumptions, ${wasteCount} waste`)
  }
  return { purchases: purchaseCount, consumptions: consumptionCount, waste: wasteCount }
}

// ── Pipeline Role 1: resolveCalendar ─────────────────────────────
function resolveCalendar(now = new Date()) {
  const mx = getMXComponents(now)
  const businessDate = getBusinessDate(now)
  const serviceWindow = PHASE_OVERRIDE
    ? (PHASE_TO_WINDOW[PHASE_OVERRIDE] || PHASE_OVERRIDE.toUpperCase())
    : getServiceWindow(now)

  return {
    now,
    businessDate,
    serviceWindow,
    mxHour: mx.hour,
    mxMinute: mx.minute,
    isManual: !!PHASE_OVERRIDE,
    envProfile: ENV_PROFILE,
    envLabel: IS_LOCAL ? 'LOCAL' : IS_DEV ? 'DEV' : 'PROD',
  }
}

// ── Pipeline Role 2: readState ───────────────────────────────────
async function readState(db, calendar) {
  // Shift state (already exists as loadShiftState)
  const shiftState = await loadShiftState(db, calendar.businessDate)

  // Coverage counts (for the current open shift)
  let coverage = { open: 0, printed: 0, total: 0, byArea: {} }
  if (shiftState.shiftId && shiftState.state === 'OPEN') {
    const activeOrders = await db.query(`
      SELECT o.status, a.name as area_name, count(*)::int as cnt
      FROM orders o LEFT JOIN areas a ON o.area_id = a.id
      WHERE o.restaurant_id = $1 AND o.shift_id = $2 AND o.status IN ('open', 'printed')
      GROUP BY o.status, a.name
    `, [RESTAURANT_ID, shiftState.shiftId])

    for (const row of activeOrders.rows) {
      if (row.status === 'open') coverage.open += row.cnt
      if (row.status === 'printed') coverage.printed += row.cnt
      coverage.total += row.cnt
      coverage.byArea[row.area_name] = (coverage.byArea[row.area_name] || 0) + row.cnt
    }
  }

  // Order count in current shift (for delta calculation)
  let orderCount = 0
  if (shiftState.shiftId && shiftState.state === 'OPEN') {
    const cnt = await db.query(
      'SELECT count(*)::int as n FROM orders WHERE restaurant_id = $1 AND shift_id = $2',
      [RESTAURANT_ID, shiftState.shiftId]
    )
    orderCount = cnt.rows[0].n
  }

  // Sim run status
  const runStatus = await db.query(
    'SELECT id, status FROM sim_runs WHERE restaurant_id = $1 AND env = $2 AND business_date = $3 AND service_window = $4',
    [RESTAURANT_ID, ENV_PROFILE, calendar.businessDate, calendar.serviceWindow]
  )
  const windowAlreadyRan = runStatus.rows.length > 0 && runStatus.rows[0].status !== 'stale'

  // Daily order count (safety)
  const dailyCount = await db.query(
    "SELECT count(*)::int as n FROM orders WHERE restaurant_id = $1 AND ((created_at AT TIME ZONE 'America/Mexico_City')::date = $2)",
    [RESTAURANT_ID, calendar.businessDate]
  )

  return {
    shift: shiftState,
    coverage,
    orderCount,
    windowAlreadyRan,
    dailyOrderCount: dailyCount.rows[0].n,
  }
}

// ── Pipeline Role 3: buildPlan ───────────────────────────────────
function buildPlan(calendar, state) {
  const actions = []
  const { serviceWindow, businessDate } = calendar
  const { shift, coverage, orderCount, windowAlreadyRan, dailyOrderCount } = state
  const policy = DEMO_COVERAGE_POLICY[serviceWindow] || DEMO_COVERAGE_POLICY.CLOSED

  // Skip if restaurant closed
  if (serviceWindow === 'CLOSED' && !calendar.isManual) {
    actions.push({ type: 'SKIP', reason: 'Restaurant closed (4am-8am)' })
    return { actions, runType: 'skip', policy }
  }

  // Safety cap
  if (dailyOrderCount >= MAX_ORDERS_PER_DAY) {
    actions.push({ type: 'SKIP', reason: `Daily cap reached: ${dailyOrderCount}/${MAX_ORDERS_PER_DAY}` })
    return { actions, runType: 'skip', policy }
  }

  // --- WINDOW RUN (first time this window runs) ---
  if (!windowAlreadyRan) {
    actions.push({ type: 'ACQUIRE_WINDOW_LOCK', businessDate, serviceWindow })

    // Zombie resolution
    if (shift.state === 'ZOMBIE') {
      actions.push({ type: 'CLOSE_ZOMBIE', shiftId: shift.shiftId, zombieDate: shift.shiftBusinessDate })
    }

    // Shift management
    if (shift.state === 'NO_SHIFT' || shift.state === 'ZOMBIE') {
      if (serviceWindow === 'PREP') {
        actions.push({ type: 'OPEN_SHIFT' })
      } else if (serviceWindow !== 'CLOSE' && serviceWindow !== 'CLOSED') {
        actions.push({ type: 'ANOMALY', reason: `No shift in ${serviceWindow}` })
      }
    } else if (shift.state === 'CLOSED') {
      if (serviceWindow === 'PREP' && shift.shiftBusinessDate !== businessDate) {
        actions.push({ type: 'OPEN_SHIFT' })
      } else {
        actions.push({ type: 'SKIP', reason: 'Shift already closed for this business date' })
        return { actions, runType: 'skip', policy }
      }
    }

    // Close shift in CLOSE window
    if (serviceWindow === 'CLOSE' && shift.state === 'OPEN') {
      actions.push({ type: 'SETTLE_ALL_ORDERS' })
      actions.push({ type: 'CLOSE_SHIFT', shiftId: shift.shiftId, businessDate })
      actions.push({ type: 'COMPLETE_RESERVATIONS' })
      actions.push({ type: 'FINAL_ATTENDANCE', businessDate, serviceWindow })
      actions.push({ type: 'FINAL_INVENTORY', serviceWindow })
      return { actions, runType: 'window', policy }
    }

    // Normal service: close lingering + generate delta + attendance + inventory
    if (shift.state === 'OPEN' || actions.some(a => a.type === 'OPEN_SHIFT')) {
      actions.push({ type: 'CLOSE_LINGERING' })

      // Calculate delta
      const target = getDailyTarget(businessDate)
      const curve = DEMAND_CURVE[serviceWindow] || 0
      const targetNow = Math.round(target * curve)
      const delta = Math.max(0, Math.min(targetNow - orderCount, MAX_ORDERS_PER_RUN))

      if (delta > 0) {
        actions.push({ type: 'GENERATE_ORDERS', count: delta, allowOpen: serviceWindow !== 'CLOSE' })
      }

      actions.push({ type: 'ATTENDANCE', businessDate, serviceWindow })

      // Reservations
      if (serviceWindow === 'PREP') actions.push({ type: 'CREATE_RESERVATIONS' })
      if (serviceWindow === 'DINNER') actions.push({ type: 'SEAT_RESERVATIONS' })

      // Inventory
      actions.push({ type: 'INVENTORY', serviceWindow })
    }

    // Ensure coverage at end of window run
    actions.push({ type: 'ENSURE_COVERAGE', ...policy })

    return { actions, runType: 'window', policy }
  }

  // --- MAINTENANCE TICK (window already ran) ---
  if (serviceWindow === 'CLOSE' || serviceWindow === 'CLOSED') {
    actions.push({ type: 'SKIP', reason: 'Maintenance not needed in CLOSE/CLOSED' })
    return { actions, runType: 'skip', policy }
  }

  if (shift.state !== 'OPEN') {
    actions.push({ type: 'SKIP', reason: 'No open shift for maintenance' })
    return { actions, runType: 'skip', policy }
  }

  // Rotation: close old + create new
  if (policy.rotatePerTick > 0 && coverage.total > policy.minOpen + policy.minPrinted) {
    actions.push({ type: 'ROTATE_ORDERS', maxClose: policy.rotatePerTick, maxCreate: policy.rotatePerTick,
      preserveMinOpen: policy.minOpen, preserveMinPrinted: policy.minPrinted })
  }

  // Coverage enforcement
  actions.push({ type: 'ENSURE_COVERAGE', ...policy })

  return { actions, runType: 'maintenance', policy }
}

// ── Pipeline Role 4: executePlan ─────────────────────────────────
async function executePlan(db, plan, calendar) {
  const metrics = { orders: 0, revenue: 0, checkIns: 0, checkOuts: 0, errors: [] }
  let runId = null

  for (const action of plan.actions) {
    try {
      console.log(`  ▶ ${action.type}${action.reason ? ': ' + action.reason : ''}`)

      switch (action.type) {
        case 'SKIP':
          break

        case 'ANOMALY':
          console.warn(`  ⚠️ ANOMALY: ${action.reason}`)
          break

        case 'ACQUIRE_WINDOW_LOCK': {
          runId = await acquireRunLock(db, action.businessDate, action.serviceWindow)
          if (!runId) {
            // Lock failed — switch to maintenance
            console.log('  ℹ️ Lock not acquired — falling back to maintenance')
            return metrics
          }
          break
        }

        case 'CLOSE_ZOMBIE':
          await settleOpenOrders(db, { shiftId: action.shiftId })
          await finalizeShiftClose(db, action.shiftId, { businessDate: action.zombieDate })
          console.log(`  🧟 Zombie shift #${action.shiftId} closed`)
          break

        case 'OPEN_SHIFT':
          await executeOpenShift(db, calendar.businessDate)
          break

        case 'CLOSE_LINGERING':
          await closeLingeringOrders(db)
          break

        case 'GENERATE_ORDERS': {
          const result = await generateOrders(db, action.count, { noOpen: !action.allowOpen })
          metrics.orders += result?.created || 0
          metrics.revenue += result?.revenue || 0
          break
        }

        case 'SETTLE_ALL_ORDERS':
          await settleOpenOrders(db)
          break

        case 'CLOSE_SHIFT':
          await finalizeShiftClose(db, action.shiftId, { businessDate: action.businessDate })
          console.log(`  🔐 Shift #${action.shiftId} closed`)
          break

        case 'ATTENDANCE': {
          const att = await executeAttendance(db, action.businessDate, action.serviceWindow)
          metrics.checkIns += att.checkIns
          metrics.checkOuts += att.checkOuts
          break
        }

        case 'FINAL_ATTENDANCE': {
          const att = await executeAttendance(db, action.businessDate, action.serviceWindow)
          metrics.checkIns += att.checkIns
          metrics.checkOuts += att.checkOuts
          break
        }

        case 'CREATE_RESERVATIONS':
          await simulateReservations(db, 'open')
          break

        case 'SEAT_RESERVATIONS':
          await simulateReservations(db, 'dinner')
          break

        case 'COMPLETE_RESERVATIONS':
          await simulateReservations(db, 'close')
          break

        case 'INVENTORY': {
          const invPhase = action.serviceWindow === 'PREP' ? 'open' :
                          action.serviceWindow === 'LUNCH' ? 'lunch' :
                          action.serviceWindow === 'AFTERNOON' ? 'afternoon' :
                          action.serviceWindow === 'DINNER' ? 'dinner' : 'close'
          await simulateInventory(db, invPhase)
          break
        }

        case 'FINAL_INVENTORY':
          await simulateInventory(db, 'close')
          break

        case 'ROTATE_ORDERS': {
          // Close some old orders (respecting minimums)
          const activeOrders = await db.query(`
            SELECT o.id, o.status, o.total, o.tip, o.shift_id, o.cash_station_id,
                   o.cashier_id, o.waiter_id, o.opened_at, a.name as area_name
            FROM orders o LEFT JOIN areas a ON o.area_id = a.id
            WHERE o.restaurant_id = $1 AND o.status IN ('open', 'printed')
            ORDER BY o.opened_at ASC
          `, [RESTAURANT_ID])

          let openCount = activeOrders.rows.filter(r => r.status === 'open').length
          let printedCount = activeOrders.rows.filter(r => r.status === 'printed').length
          const byArea = {}
          for (const o of activeOrders.rows) {
            byArea[o.area_name || 'unknown'] = (byArea[o.area_name || 'unknown'] || 0) + 1
          }

          const rotateNow = new Date()
          let closed = 0
          for (const o of activeOrders.rows) {
            if (closed >= action.maxClose) break
            const ageMs = rotateNow.getTime() - new Date(o.opened_at).getTime()
            if (ageMs < 30 * 60 * 1000) continue // too young
            const area = o.area_name || 'unknown'
            if ((byArea[area] || 0) <= 1) continue
            if (o.status === 'open' && openCount <= action.preserveMinOpen) continue
            if (o.status === 'printed' && printedCount <= action.preserveMinPrinted) continue
            if (activeOrders.rows.length - closed <= action.preserveMinOpen + action.preserveMinPrinted) break

            await settleOrder(db, o, new Date(rotateNow.getTime() - rand(1, 10) * 60000))
            byArea[area]--
            if (o.status === 'open') openCount--
            if (o.status === 'printed') printedCount--
            closed++
          }
          if (closed) console.log(`  🔄 Rotated out: ${closed}`)

          // Generate replacements
          if (closed > 0) {
            const result = await generateOrders(db, Math.min(closed, action.maxCreate), { forceActive: true })
            if (result?.created) console.log(`  🔄 Rotated in: ${result.created}`)
            metrics.orders += result?.created || 0
            metrics.revenue += result?.revenue || 0
          }
          break
        }

        case 'ENSURE_COVERAGE': {
          if (action.minOpen === 0 && action.minPrinted === 0) break // CLOSE window

          const shiftRes = await db.query(
            "SELECT id FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN' LIMIT 1",
            [RESTAURANT_ID]
          )
          if (!shiftRes.rows.length) break
          const shiftId = shiftRes.rows[0].id

          const counts = await db.query(`
            SELECT status, count(*)::int as cnt FROM orders
            WHERE restaurant_id = $1 AND shift_id = $2 AND status IN ('open', 'printed')
            GROUP BY status
          `, [RESTAURANT_ID, shiftId])

          let curOpen = counts.rows.find(r => r.status === 'open')?.cnt || 0
          let curPrinted = counts.rows.find(r => r.status === 'printed')?.cnt || 0

          // Generate if below minimums
          const needOpen = Math.max(0, action.minOpen - curOpen)
          const needPrinted = Math.max(0, action.minPrinted - curPrinted)
          const need = needOpen + needPrinted

          if (need > 0) {
            const result = await generateOrders(db, need, { forceActive: true })
            console.log(`  📋 Coverage: generated ${result?.created || 0} to meet minimums`)
            metrics.orders += result?.created || 0
            metrics.revenue += result?.revenue || 0
          }

          // Recheck and flip if needed
          const recheck = await db.query(`
            SELECT status, count(*)::int as cnt FROM orders
            WHERE restaurant_id = $1 AND shift_id = $2 AND status IN ('open', 'printed')
            GROUP BY status
          `, [RESTAURANT_ID, shiftId])

          let finalOpen = recheck.rows.find(r => r.status === 'open')?.cnt || 0
          let finalPrinted = recheck.rows.find(r => r.status === 'printed')?.cnt || 0

          if (finalOpen < action.minOpen && finalPrinted > action.minPrinted) {
            const toFlip = Math.min(action.minOpen - finalOpen, finalPrinted - action.minPrinted)
            if (toFlip > 0) {
              await db.query(`
                UPDATE orders SET status = 'open', updated_at = now()
                WHERE id IN (SELECT id FROM orders WHERE restaurant_id = $1 AND shift_id = $2 AND status = 'printed' ORDER BY opened_at DESC LIMIT $3)
              `, [RESTAURANT_ID, shiftId, toFlip])
              console.log(`  🔄 Flipped ${toFlip} printed → open`)
            }
          }
          if (finalPrinted < action.minPrinted && finalOpen > action.minOpen) {
            const toFlip = Math.min(action.minPrinted - finalPrinted, finalOpen - action.minOpen)
            if (toFlip > 0) {
              await db.query(`
                UPDATE orders SET status = 'printed', updated_at = now()
                WHERE id IN (SELECT id FROM orders WHERE restaurant_id = $1 AND shift_id = $2 AND status = 'open' ORDER BY opened_at ASC LIMIT $3)
              `, [RESTAURANT_ID, shiftId, toFlip])
              console.log(`  🔄 Flipped ${toFlip} open → printed`)
            }
          }

          console.log(`  ✅ Coverage: open=${finalOpen}/${action.minOpen} printed=${finalPrinted}/${action.minPrinted}`)
          break
        }

        default:
          console.warn(`  ⚠️ Unknown action: ${action.type}`)
      }
    } catch (err) {
      console.error(`  ❌ Action ${action.type} failed: ${err.message}`)
      metrics.errors.push({ action: action.type, error: err.message })
    }
  }

  // Release window lock if we acquired one
  if (runId) {
    const status = metrics.errors.length ? 'error' : 'ok'
    await releaseRunLock(db, runId, status, { orders: metrics.orders, revenue: metrics.revenue, error: metrics.errors[0]?.error })
  }

  return metrics
}

// ── Pipeline Role 5: audit ───────────────────────────────────────
async function audit(db, calendar, plan, metrics) {
  const shiftRes = await db.query(
    "SELECT id, status FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN' LIMIT 1",
    [RESTAURANT_ID]
  )
  const shiftId = shiftRes.rows[0]?.id

  const coverageRes = shiftId ? await db.query(`
    SELECT status, count(*)::int as cnt FROM orders
    WHERE restaurant_id = $1 AND shift_id = $2 AND status IN ('open', 'printed')
    GROUP BY status
  `, [RESTAURANT_ID, shiftId]) : { rows: [] }

  const finalOpen = coverageRes.rows.find(r => r.status === 'open')?.cnt || 0
  const finalPrinted = coverageRes.rows.find(r => r.status === 'printed')?.cnt || 0

  const issues = []
  const policy = plan.policy

  // Only check coverage for non-terminal windows
  if (calendar.serviceWindow !== 'CLOSE' && calendar.serviceWindow !== 'CLOSED') {
    if (shiftId && finalOpen < policy.minOpen) issues.push(`open=${finalOpen} < min ${policy.minOpen}`)
    if (shiftId && finalPrinted < policy.minPrinted) issues.push(`printed=${finalPrinted} < min ${policy.minPrinted}`)
  }

  const auditResult = {
    type: plan.runType,
    envProfile: ENV_PROFILE,
    businessDate: calendar.businessDate,
    serviceWindow: calendar.serviceWindow,
    restaurantId: RESTAURANT_ID,
    timestamp: new Date().toISOString(),
    shiftId,
    shiftStatus: shiftRes.rows[0]?.status || 'none',
    plan: plan.actions.map(a => a.type),
    metrics,
    coverage: { open: finalOpen, printed: finalPrinted },
    coverageOk: issues.length === 0,
    issues,
  }

  // Write artifact
  const ts = new Date().toISOString().replace(/[:.]/g, '-')
  const artifactPath = join(RUNTIME_ARTIFACT_DIR, `${ts}-${ENV_PROFILE}-${plan.runType}.json`)
  ensureDir(RUNTIME_ARTIFACT_DIR)
  fs.writeFileSync(artifactPath, JSON.stringify(auditResult, null, 2))

  // Write minimal state
  saveSimulatorState({})

  // Log summary
  if (issues.length) {
    console.log(`  ⚠️ Audit: ${issues.join(', ')}`)
  } else {
    console.log(`  ✅ Audit: coverage ok (open=${finalOpen}, printed=${finalPrinted})`)
  }

  return auditResult
}

// ── Main (v5 — 5-role pipeline) ─────────────────────────────────

async function main() {
  const client = new Client(DB_URL)
  await client.connect()

  try {
    await loadCatalogsFromDB(client)

    // === THE 5-ROLE PIPELINE ===
    const calendar = resolveCalendar()

    console.log(`\n🔥 Fogo Simulator v5 — ${calendar.envLabel} — ${calendar.now.toISOString()}`)
    console.log(`📍 Window: ${calendar.serviceWindow} | Business date: ${calendar.businessDate} | r${RESTAURANT_ID}`)
    if (calendar.isManual) console.log(`🛠️ Override: --phase=${PHASE_OVERRIDE}`)
    console.log('──────────────────────────────────────────────────')

    // Safety + preflight
    const safe = await safetyCheck(client)
    if (!safe) return
    const preflightOk = await preflight(client)
    if (!preflightOk) return

    const state = await readState(client, calendar)
    console.log(`  🔍 Shift: ${state.shift.state}${state.shift.shiftId ? ' #' + state.shift.shiftId : ''} | Coverage: ${state.coverage.open}o/${state.coverage.printed}p | Orders: ${state.orderCount} | Daily: ${state.dailyOrderCount}`)

    const plan = buildPlan(calendar, state)
    console.log(`  🧭 Plan: ${plan.runType} — ${plan.actions.map(a => a.type).join(' → ')}`)

    const metrics = await executePlan(client, plan, calendar)

    const auditResult = await audit(client, calendar, plan, metrics)

    console.log('──────────────────────────────────────────────────')
    console.log(`📊 ${plan.runType}: ${metrics.orders} orders, $${(metrics.revenue || 0).toFixed(2)} revenue`)
    console.log(`✅ Complete`)
  } catch (err) {
    console.error(`❌ Error: ${err.message}`)
    console.error(err.stack)
  } finally {
    await client.end()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
