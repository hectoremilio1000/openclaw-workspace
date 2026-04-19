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

const PROD_DB_URL = 'postgresql://postgres:ZksggoNJFXzWqLlTslzxWmFLZaVRXCVw@trolley.proxy.rlwy.net:20722/railway'
const DEV_DB_URL = 'postgresql://postgres:QJXfNcdEphOhyLCfOHjuOmXDKzRxVUnU@centerbeam.proxy.rlwy.net:38630/railway'
const LOCAL_DB_URL = 'postgresql://pos_user:pos_pass@127.0.0.1:5432/pos_app'

const DB_URL = IS_LOCAL ? LOCAL_DB_URL : IS_DEV ? DEV_DB_URL : PROD_DB_URL

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

  // 3. Ensure areas, services, and tables exist (idempotent)
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

// ── Restaurant Data ──────────────────────────────────────────────

const AREAS = [
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

const CASH_STATIONS = [
  { id: 31, name: 'Caja Principal' },
  { id: 32, name: 'Caja Bar' },
]

const WAITERS = [7796, 7797, 7798, 7799, 7800, 7801, 7802, 7803, 7804, 7805, 7823, 7824, 7825]
const CASHIERS = [7806, 7807, 7808]
const CHEFS = [7809, 7810, 7811]
const BARTENDERS = [7812, 7813, 7814]
const CHURRASQUEIROS = [7817, 7818, 7819, 7820, 7821]
const HOSTESSES = [7815, 7816]
const CAPTAINS = [7794, 7795]
const MANAGERS = [7792, 7793]

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
function mxNow() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: MX_TZ }))
}
function formatDateYmd(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
function today() { return formatDateYmd(mxNow()) }
function tomorrow() {
  const d = mxNow()
  d.setDate(d.getDate() + 1)
  return formatDateYmd(d)
}
function businessStartAt(dateStr = today()) {
  const [year, month, day] = String(dateStr).split('-').map(Number)
  return new Date(year, month - 1, day, 10, 0, 0, 0)
}
function dateInMx(dateValue) {
  return formatDateYmd(new Date(new Date(dateValue).toLocaleString('en-US', { timeZone: MX_TZ })))
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
function getHourMX() {
  return mxNow().getHours()
}

function hourInWindow(hour, [start, end]) {
  return start <= end ? hour >= start && hour <= end : hour >= start || hour <= end
}

function baseTimeForHour(targetHour, dateStr = today()) {
  const [year, month, day] = String(dateStr).split('-').map(Number)
  return new Date(year, month - 1, day, targetHour, 0, 0, 0)
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
    const baseTime = baseTimeForHour(baseHour, dateStr)
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
    const baseTime = baseTimeForHour(checkoutHour, dateStr)
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

function getPhase() {
  const h = getHourMX()
  // Every hour generates activity during operating hours
  if (h === 9 || h === 10)  return 'open'           // 9-10am: abre turno día + attendance
  if (h === 11)             return 'lunch'           // 11am: primeras órdenes lunch
  if (h === 12 || h === 13) return 'lunch'           // 12-1pm: pico comida
  if (h === 14)             return 'lunch'           // 2pm: comida tardía
  if (h === 15 || h === 16) return 'afternoon'       // 3-4pm: slow + checkout mañana
  if (h === 17)             return 'afternoon'       // 5pm: última hora turno día
  if (h === 18)             return 'shift_change'    // 6pm: cierra día + abre noche
  if (h === 19 || h === 20) return 'dinner'          // 7-8pm: pico cena
  if (h === 21 || h === 22) return 'late_night'      // 9-10pm: últimas órdenes
  if (h === 23 || h === 0 || h === 1) return 'late_night' // 11pm-1am: cierre gradual
  if (h === 2 || h === 3)   return 'close_night'     // 2-3am: cierra noche + corte Z
  return 'skip'                                       // 4-8am: cerrado
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
    const shiftDate = dateInMx(openShift.rows[0].opened_at)
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

async function finalizeShiftClose(db, shiftId, options = {}) {
  const shiftRes = await db.query(
    `SELECT id, restaurant_id, master_station_id, user_id, opened_at, closed_at, status, cash_closure_id
     FROM shifts WHERE id = $1 LIMIT 1`,
    [shiftId]
  )
  if (shiftRes.rows.length === 0) throw new Error(`Shift ${shiftId} not found`)
  const shift = shiftRes.rows[0]
  const businessDate = options.businessDate || dateInMx(shift.opened_at || new Date())

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
    await db.query(`
      INSERT INTO shift_totals (
        shift_id, payment_method_id, sales_count, sales_amount,
        tips_amount, refunds_amount, net_sales_amount, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, 0, 0, $4, now(), now())
      ON CONFLICT (shift_id, payment_method_id)
      DO UPDATE SET sales_count = EXCLUDED.sales_count, sales_amount = EXCLUDED.sales_amount,
                    net_sales_amount = EXCLUDED.sales_amount, updated_at = now()
    `, [shiftId, pm.payment_method_id, pm.cnt, pm.total])
  }
  console.log(`  📊 Shift totals: ${byMethod.rows.length} payment methods`)

  for (const pm of byMethod.rows) {
    const expected = Number(pm.total)
    const isCash = parseInt(pm.payment_method_id, 10) === 1
    const declared = isCash ? expected + rand(-50, 30) : expected
    const diff = Math.round((declared - expected) * 100) / 100
    await db.query(`
      INSERT INTO shift_declarations (
        shift_id, payment_method_id, expected_amount, declared_amount,
        difference_amount, is_final, cash_session_id, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, true, $6, now(), now())
      ON CONFLICT (shift_id, payment_method_id)
      DO UPDATE SET expected_amount = EXCLUDED.expected_amount, declared_amount = EXCLUDED.declared_amount,
                    difference_amount = EXCLUDED.difference_amount, cash_session_id = EXCLUDED.cash_session_id, updated_at = now()
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
    const closureResult = await db.query(`
      INSERT INTO cash_closures (
        restaurant_id, business_date, period_start, period_end,
        generated_by, generated_at, gross_sales, net_sales, total_tax,
        cash_total, difference, created_at, updated_at
      ) VALUES ($1, $2, $3, now(), $4, now(), $5, $6, $7, $8, $9, now(), now())
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
    const shiftDate = dateInMx(openShift.rows[0].opened_at)
    if (shiftDate !== todayStr) {
      const zombieId = openShift.rows[0].id
      console.log(`  🧟 Zombie shift #${zombieId} from ${shiftDate} detected — force-closing`)
      const closed = await finalizeShiftClose(db, zombieId, { businessDate: shiftDate })
      shiftsClosed++
      console.log(`  🔐 Zombie shift #${zombieId} closed (${closed.cnt} orders, $${parseFloat(closed.sales).toFixed(2)})`)
    } else {
      console.log(`  ℹ️ Shift #${openShift.rows[0].id} already open for today`)
      await ensureCashSession(db, openShift.rows[0].id)
    }
  }

  // Now check if we need a new shift for today
  const currentOpen = await db.query(
    "SELECT id FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN'", [RESTAURANT_ID]
  )
  if (currentOpen.rows.length === 0) {
    const closedToday = await db.query(
      "SELECT id FROM shifts WHERE restaurant_id = $1 AND status = 'CLOSED' AND opened_at::date = $2",
      [RESTAURANT_ID, todayStr]
    )
    if (closedToday.rows.length > 0) {
      console.log('  ⚠️ Shift already opened and closed today — skipping')
    } else {
      const cashier = pick(CASHIERS)
      const shiftOpenedAt = baseTimeForHour(hour <= 9 ? 9 : 10, todayStr)
      shiftOpenedAt.setMinutes(hour <= 9 ? rand(10, 35) : rand(0, 20), 0, 0)
      const result = await db.query(`
        INSERT INTO shifts (restaurant_id, master_station_id, user_id, opened_at, status, processed, created_at, updated_at)
        VALUES ($1, $2, $3, $4, 'OPEN', false, now(), now()) RETURNING id
      `, [RESTAURANT_ID, CASH_STATIONS[0].id, cashier, shiftOpenedAt])
      shiftsOpened++
      console.log(`  🔓 Shift #${result.rows[0].id} opened`)
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

async function phaseAfternoon(db) {
  console.log('☕ PHASE: AFTERNOON — Slow period')
  const hour = getHourMX()
  const bootstrap = await ensureOpenShift(db)
  await closeLingeringOrders(db)
  const orders = await generateOrders(db, rand(8, 15))

  const todayStr = today()
  const floorCheckouts = await simulateRoleCheckOuts(db, STAFF_GROUPS.dayFloorOpen, { hour, dateStr: todayStr, targetShare: hour === 15 ? 0.35 : hour === 16 ? 0.55 : 0.8 })
  const cashierCheckouts = await simulateRoleCheckOuts(db, STAFF_GROUPS.dayCashierOpen, { hour, dateStr: todayStr, targetShare: hour === 17 ? 0.45 : 0.2 })
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

async function phaseDinner(db) {
  console.log('🌙 PHASE: DINNER — Peak service (night shift)')
  const hour = getHourMX()
  const bootstrap = await ensureOpenShift(db)
  await closeLingeringOrders(db)

  const todayStr = today()
  const nightFloor = await simulateRoleCheckIns(db, STAFF_GROUPS.nightFloor, { hour, dateStr: todayStr, targetShare: hour === 19 ? 0.7 : 1 })
  const nightKitchen = await simulateRoleCheckIns(db, STAFF_GROUPS.nightKitchen, { hour, dateStr: todayStr, targetShare: hour === 19 ? 0.55 : 0.9 })
  const nightCashier = await simulateRoleCheckIns(db, STAFF_GROUPS.nightCashier, { hour, dateStr: todayStr, targetShare: hour === 19 ? 0.6 : 1 })
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

async function phaseClose(db) {
  console.log('🔒 PHASE: CLOSE — End of day')
  const todayStr = today()

  // 0. Close ALL remaining open orders (end of day — everyone pays)
  // Override: close 100% of open orders, not just 60-80%
  const allOpen = await db.query(
    `SELECT id, total, tip, shift_id, cash_station_id, cashier_id, opened_at
     FROM orders WHERE restaurant_id = $1 AND status IN ('open', 'printed')`,
    [RESTAURANT_ID]
  )
  let closedAtEnd = 0
  for (const o of allOpen.rows) {
    const closedAt = new Date()
    const stationId = o.cash_station_id || CASH_STATIONS[0].id
    const cashierId = o.cashier_id || pick(CASHIERS)
    const shiftId = o.shift_id || (await db.query("SELECT id FROM shifts WHERE restaurant_id = $1 ORDER BY id DESC LIMIT 1", [RESTAURANT_ID])).rows[0]?.id
    if (!shiftId) continue

    await db.query(`UPDATE orders SET status = 'closed', closed_at = $2, updated_at = now() WHERE id = $1`, [o.id, closedAt])
    // Also mark all items as prepared
    await db.query(`UPDATE order_items SET status = 'prepared', prepared_at = COALESCE(prepared_at, $2), updated_at = now() WHERE order_id = $1 AND status IN ('pending','sent','fire')`, [o.id, closedAt])
    const method = pickWeighted(PAYMENT_METHODS)
    await db.query(`INSERT INTO payments (order_id, payment_method_id, amount, currency, status, kind, paid_at, shift_id, cash_station_id, cashier_id, created_at, updated_at) VALUES ($1,$2,$3,'MXN','settled','SALE',$4,$5,$6,$7,$4,$4)`,
      [o.id, method.id, Number(o.total), closedAt, shiftId, stationId, cashierId])
    const tip = Number(o.tip || 0)
    if (tip > 0) {
      await db.query(`INSERT INTO payments (order_id, payment_method_id, amount, currency, status, kind, paid_at, shift_id, cash_station_id, cashier_id, created_at, updated_at) VALUES ($1,$2,$3,'MXN','settled','TIP',$4,$5,$6,$7,$4,$4)`,
        [o.id, method.id, tip, closedAt, shiftId, stationId, cashierId])
      await db.query(`UPDATE orders SET tip_collected_total = $2 WHERE id = $1`, [o.id, tip])
    }
    await db.query(`UPDATE tables SET status = 'free', updated_at = now() WHERE restaurant_id = $1 AND id = (SELECT table_id FROM orders WHERE id = $2)`, [RESTAURANT_ID, o.id])
    closedAtEnd++
  }
  if (closedAtEnd) console.log(`  🧾 End-of-day: closed ${closedAtEnd} remaining open orders`)

  // 1. Generate last orders (all closed — no open ones at close time)
  const lastOrders = await generateOrders(db, rand(5, 12), { noOpen: true })

  // 1.5. Guarantee at least 1 cancelled order (void) per day for demo/dashboard visibility
  const voidCountToday = await db.query(
    `SELECT count(*) as n FROM orders
     WHERE restaurant_id = $1 AND status = 'void' AND cancelled_at::date = $2`,
    [RESTAURANT_ID, todayStr]
  )
  if (parseInt(voidCountToday.rows[0].n) === 0) {
    // Pick a random closed order from today that has no payment yet (easier to void)
    const candidate = await db.query(
      `SELECT o.id, o.total FROM orders o
       LEFT JOIN payments p ON p.order_id = o.id
       WHERE o.restaurant_id = $1 AND o.status = 'closed' AND o.closed_at::date = $2
       ORDER BY random() LIMIT 1`,
      [RESTAURANT_ID, todayStr]
    )
    if (candidate.rows.length > 0) {
      const victim = candidate.rows[0]
      const cancelReason = pick(['Cliente se fue sin pagar', 'Error de captura del mesero', 'Cambio de mesa', 'Duplicada por sistema'])
      const manager = pick(MANAGERS)
      const cancelledAt = new Date()
      await db.query(
        `UPDATE orders SET status = 'void', cancelled_at = $2, cancelled_by_user_id = $3, cancel_reason = $4, updated_at = now() WHERE id = $1`,
        [victim.id, cancelledAt, manager, cancelReason]
      )
      console.log(`  🚫 Forced void: order #${victim.id} ($${parseFloat(victim.total).toFixed(2)}) — ${cancelReason}`)
    }
  } else {
    console.log(`  🚫 Voids today: ${voidCountToday.rows[0].n} (no forced void needed)`)
  }

  // 2. Get the open shift
  const shiftRow = await db.query(
    "SELECT id, opened_at FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN' LIMIT 1",
    [RESTAURANT_ID]
  )
  if (shiftRow.rows.length === 0) {
    console.log('  ⚠️ No open shift to close')
    return phaseResult('close', {
      shiftsClosed: 0,
      orders: lastOrders.created,
      revenue: lastOrders.revenue,
      payments: lastOrders.payments,
      skipped: true,
    })
  }
  const shiftId = shiftRow.rows[0].id

  // 3. Create payments for all unpaid closed orders in this shift
  const unpaid = await db.query(`
    SELECT o.id, o.total, o.shift_id, o.cash_station_id, o.cashier_id, o.closed_at
    FROM orders o LEFT JOIN payments p ON p.order_id = o.id
    WHERE o.shift_id = $1 AND o.status = 'closed' AND p.id IS NULL
  `, [shiftId])

  let paymentCount = 0
  for (const order of unpaid.rows) {
    const method = pickWeighted(PAYMENT_METHODS)
    await db.query(`
      INSERT INTO payments (order_id, payment_method_id, amount, currency, status, kind, paid_at, shift_id, cash_station_id, cashier_id, created_at, updated_at)
      VALUES ($1, $2, $3, 'MXN', 'settled', 'SALE', $4, $5, $6, $7, $4, $4)
    `, [order.id, method.id, order.total, order.closed_at || new Date(), shiftId, order.cash_station_id, order.cashier_id])
    paymentCount++
  }
  console.log(`  💳 Payments created: ${paymentCount}`)

  const closed = await finalizeShiftClose(db, shiftId, { businessDate: dateInMx(shiftRow.rows[0].opened_at) })
  console.log(`  🔐 Shift #${shiftId} CLOSED — ${closed.cnt} orders, $${parseFloat(closed.sales).toFixed(2)} revenue`)

  // 11. Evening staff check-out
  const eveningCheckins = await db.query(`
    SELECT ae.user_id FROM attendance_events ae
    WHERE ae.restaurant_id = $1 AND ae.event_date = $2 AND ae.event_type = 'check_in'
    AND extract(hour from ae.event_at) BETWEEN 16 AND 19
    AND NOT EXISTS (
      SELECT 1 FROM attendance_events ae2
      WHERE ae2.restaurant_id = $1 AND ae2.user_id = ae.user_id AND ae2.event_date = $2 AND ae2.event_type = 'check_out'
      AND extract(hour from ae2.event_at) >= 20
    )
  `, [RESTAURANT_ID, todayStr])

  for (const row of eveningCheckins.rows) {
    const checkoutAt = new Date()
    checkoutAt.setHours(rand(22, 23), rand(0, 45), 0, 0)
    await db.query(`
      INSERT INTO attendance_events (restaurant_id, user_id, event_type, event_method, event_at, event_date, source_context, created_at, updated_at)
      VALUES ($1, $2, 'check_out', 'pin', $3, $4, 'simulator', now(), now())
    `, [RESTAURANT_ID, row.user_id, checkoutAt, todayStr])

    // Update attendance_session with checkout + worked_minutes
    await db.query(`
      UPDATE attendance_sessions
      SET last_check_out_at = $3,
          worked_minutes = EXTRACT(EPOCH FROM ($3::timestamptz - first_check_in_at)) / 60,
          status = 'closed',
          updated_at = now()
      WHERE restaurant_id = $1 AND user_id = $2 AND work_date = $4 AND status = 'open'
    `, [RESTAURANT_ID, row.user_id, checkoutAt, todayStr])
  }
  console.log(`  👋 Evening check-out: ${eveningCheckins.rows.length} staff`)

  return phaseResult('close', {
    attendanceEvents: eveningCheckins.rows.length,
    checkOuts: eveningCheckins.rows.length,
    shiftsClosed: 1,
    orders: lastOrders.created,
    revenue: lastOrders.revenue,
    payments: lastOrders.payments + paymentCount,
  })
}

// ── Phase: SHIFT_CHANGE (6pm) — Close day shift, open night shift ──

async function phaseShiftChange(db) {
  console.log('🔄 PHASE: SHIFT_CHANGE — Day→Night transition')
  const todayStr = today()

  // 1. Close all remaining open orders from day shift
  await closeLingeringOrders(db)
  // Force-close any that remain
  const remaining = await db.query(
    `SELECT id, total, tip, shift_id, cash_station_id, cashier_id, opened_at
     FROM orders WHERE restaurant_id = $1 AND status IN ('open', 'printed')`, [RESTAURANT_ID]
  )
  for (const o of remaining.rows) {
    const closedAt = new Date()
    const stationId = o.cash_station_id || CASH_STATIONS[0].id
    const cashierId = o.cashier_id || pick(CASHIERS)
    const shiftId = o.shift_id || (await db.query("SELECT id FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN' LIMIT 1", [RESTAURANT_ID])).rows[0]?.id
    if (!shiftId) continue
    await db.query(`UPDATE orders SET status = 'closed', closed_at = $2, updated_at = now() WHERE id = $1`, [o.id, closedAt])
    await db.query(`UPDATE order_items SET status = 'prepared', prepared_at = COALESCE(prepared_at, $2), updated_at = now() WHERE order_id = $1 AND status IN ('pending','sent','fire')`, [o.id, closedAt])
    const method = pickWeighted(PAYMENT_METHODS)
    await db.query(`INSERT INTO payments (order_id, payment_method_id, amount, currency, status, kind, paid_at, shift_id, cash_station_id, cashier_id, created_at, updated_at) VALUES ($1,$2,$3,'MXN','settled','SALE',$4,$5,$6,$7,$4,$4)`,
      [o.id, method.id, Number(o.total), closedAt, shiftId, stationId, cashierId])
    const tip = Number(o.tip || 0)
    if (tip > 0) {
      await db.query(`INSERT INTO payments (order_id, payment_method_id, amount, currency, status, kind, paid_at, shift_id, cash_station_id, cashier_id, created_at, updated_at) VALUES ($1,$2,$3,'MXN','settled','TIP',$4,$5,$6,$7,$4,$4)`,
        [o.id, method.id, tip, closedAt, shiftId, stationId, cashierId])
      await db.query(`UPDATE orders SET tip_collected_total = $2 WHERE id = $1`, [o.id, tip])
    }
    await db.query(`UPDATE tables SET status = 'free', updated_at = now() WHERE restaurant_id = $1 AND id = (SELECT table_id FROM orders WHERE id = $2)`, [RESTAURANT_ID, o.id])
  }
  if (remaining.rows.length) console.log(`  🧾 Closed ${remaining.rows.length} day orders`)

  // 2. Close day shift
  const dayShift = await db.query("SELECT id, opened_at FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN' LIMIT 1", [RESTAURANT_ID])
  let dayShiftClosed = false
  if (dayShift.rows.length > 0) {
    const shiftId = dayShift.rows[0].id
    console.log(`  🔐 Closing day shift #${shiftId}`)
    const closed = await finalizeShiftClose(db, shiftId, { businessDate: todayStr })
    console.log(`  📊 Day shift closed — ${closed.cnt} orders, $${parseFloat(closed.sales).toFixed(2)}`)
    dayShiftClosed = true
  }

  const floorCheckouts = await simulateRoleCheckOuts(db, STAFF_GROUPS.dayFloorOpen, { hour: 18, dateStr: todayStr, targetShare: 1, checkoutHour: 18 })
  const cashierCheckouts = await simulateRoleCheckOuts(db, STAFF_GROUPS.dayCashierOpen, { hour: 18, dateStr: todayStr, targetShare: 0.5, checkoutHour: 18 })
  const kitchenCarry = await simulateRoleCheckOuts(db, STAFF_GROUPS.dayKitchenEarly, { hour: 18, dateStr: todayStr, targetShare: 0.2, checkoutHour: 18 })
  const morningCheckoutCount = floorCheckouts.total + cashierCheckouts.total + kitchenCarry.total
  if (morningCheckoutCount) console.log(`  👋 Day handoff checkout: ${morningCheckoutCount} staff`)

  // 4. Open night shift
  const nightCashier = pick(CASHIERS)
  const nightOpenedAt = baseTimeForHour(18, todayStr)
  nightOpenedAt.setMinutes(rand(0, 20), 0, 0)
  const nightShift = await db.query(`
    INSERT INTO shifts (restaurant_id, master_station_id, user_id, opened_at, status, processed, created_at, updated_at)
    VALUES ($1, $2, $3, $4, 'OPEN', false, now(), now()) RETURNING id
  `, [RESTAURANT_ID, CASH_STATIONS[0].id, nightCashier, nightOpenedAt])
  console.log(`  🌙 Night shift #${nightShift.rows[0].id} opened`)
  await ensureCashSession(db, nightShift.rows[0].id, {
    cashStationId: CASH_STATIONS[0].id,
    cashUserId: nightCashier,
    openedAt: nightOpenedAt,
  })

  const nightFloor = await simulateRoleCheckIns(db, STAFF_GROUPS.nightFloor, { hour: 18, dateStr: todayStr, targetShare: 0.85 })
  const nightKitchen = await simulateRoleCheckIns(db, STAFF_GROUPS.nightKitchen, { hour: 18, dateStr: todayStr, targetShare: 0.75 })
  const nightCashierCheckins = await simulateRoleCheckIns(db, STAFF_GROUPS.nightCashier, { hour: 18, dateStr: todayStr, targetShare: 1 })
  const eveningCheckins = nightFloor.total + nightKitchen.total + nightCashierCheckins.total
  console.log(`  👥 Evening handoff arrivals: ${eveningCheckins} staff`)

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

async function phaseLateNight(db) {
  console.log('🌃 PHASE: LATE_NIGHT — Final service')
  const hour = getHourMX()
  const bootstrap = await ensureOpenShift(db)
  await closeLingeringOrders(db)
  const orders = await generateOrders(db, rand(5, 12))
  const lateNightDate = hour <= 1 ? formatDateYmd(new Date(mxNow().getTime() - 24 * 60 * 60 * 1000)) : today()

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
      await db.query(`UPDATE orders SET status = 'void', cancelled_at = now(), cancelled_by_user_id = $3, cancel_reason = $4, updated_at = now() WHERE id = $1`,
        [v.id, pick(MANAGERS), cancelReason])
      console.log(`  🚫 Forced void: order #${v.id}`)
    }
  }

  const floorCheckouts = await simulateRoleCheckOuts(db, STAFF_GROUPS.nightFloor, { hour, dateStr: lateNightDate, targetShare: hour <= 22 ? 0.35 : hour === 23 ? 0.55 : 0.7, checkoutHour: Math.min(Math.max(hour, 22), 23) })
  const earlyKitchenCheckouts = await simulateRoleCheckOuts(db, STAFF_GROUPS.nightKitchen, { hour, dateStr: lateNightDate, targetShare: hour >= 23 ? 0.2 : 0.05, checkoutHour: hour >= 23 ? 23 : hour })
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

async function phaseCloseNight(db) {
  console.log('🔒 PHASE: CLOSE_NIGHT — End of night')
  const hour = getHourMX()
  // Business date = yesterday (since it's 3am, the fiscal day is the previous day)
  const yesterday = new Date(); yesterday.setDate(yesterday.getDate() - 1)
  const businessDate = formatDateYmd(yesterday)
  const todayStr = today()

  // 1. Close ALL remaining open orders
  const allOpen = await db.query(
    `SELECT id, total, tip, shift_id, cash_station_id, cashier_id, opened_at
     FROM orders WHERE restaurant_id = $1 AND status IN ('open', 'printed')`, [RESTAURANT_ID]
  )
  let closedAtEnd = 0
  for (const o of allOpen.rows) {
    const closedAt = new Date()
    const stationId = o.cash_station_id || CASH_STATIONS[0].id
    const cashierId = o.cashier_id || pick(CASHIERS)
    const shiftId = o.shift_id || (await db.query("SELECT id FROM shifts WHERE restaurant_id = $1 ORDER BY id DESC LIMIT 1", [RESTAURANT_ID])).rows[0]?.id
    if (!shiftId) continue
    await db.query(`UPDATE orders SET status = 'closed', closed_at = $2, updated_at = now() WHERE id = $1`, [o.id, closedAt])
    await db.query(`UPDATE order_items SET status = 'prepared', prepared_at = COALESCE(prepared_at, $2), updated_at = now() WHERE order_id = $1 AND status IN ('pending','sent','fire')`, [o.id, closedAt])
    const method = pickWeighted(PAYMENT_METHODS)
    await db.query(`INSERT INTO payments (order_id, payment_method_id, amount, currency, status, kind, paid_at, shift_id, cash_station_id, cashier_id, created_at, updated_at) VALUES ($1,$2,$3,'MXN','settled','SALE',$4,$5,$6,$7,$4,$4)`,
      [o.id, method.id, Number(o.total), closedAt, shiftId, stationId, cashierId])
    const tip = Number(o.tip || 0)
    if (tip > 0) {
      await db.query(`INSERT INTO payments (order_id, payment_method_id, amount, currency, status, kind, paid_at, shift_id, cash_station_id, cashier_id, created_at, updated_at) VALUES ($1,$2,$3,'MXN','settled','TIP',$4,$5,$6,$7,$4,$4)`,
        [o.id, method.id, tip, closedAt, shiftId, stationId, cashierId])
      await db.query(`UPDATE orders SET tip_collected_total = $2 WHERE id = $1`, [o.id, tip])
    }
    await db.query(`UPDATE tables SET status = 'free', updated_at = now() WHERE restaurant_id = $1 AND id = (SELECT table_id FROM orders WHERE id = $2)`, [RESTAURANT_ID, o.id])
    closedAtEnd++
  }
  if (closedAtEnd) console.log(`  🧾 Closed ${closedAtEnd} remaining night orders`)

  // 2. Close night shift
  const nightShift = await db.query("SELECT id, opened_at FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN' LIMIT 1", [RESTAURANT_ID])
  if (nightShift.rows.length > 0) {
    const shiftId = nightShift.rows[0].id
    console.log(`  🔐 Closing night shift #${shiftId}`)
    const closed = await finalizeShiftClose(db, shiftId, { businessDate })
    console.log(`  📊 Night shift closed — ${closed.cnt} orders, $${parseFloat(closed.sales).toFixed(2)}`)
  }

  const kitchenFinal = await simulateRoleCheckOuts(db, STAFF_GROUPS.nightKitchen, { hour, dateStr: businessDate, targetShare: 1, checkoutHour: hour })
  const cashierFinal = await simulateRoleCheckOuts(db, STAFF_GROUPS.nightCashier, { hour, dateStr: businessDate, targetShare: 1, checkoutHour: hour })
  const floorFinal = await simulateRoleCheckOuts(db, STAFF_GROUPS.nightFloor, { hour, dateStr: businessDate, targetShare: 1, checkoutHour: hour })
  const finalCheckouts = kitchenFinal.total + cashierFinal.total + floorFinal.total
  if (finalCheckouts) console.log(`  💤 Final close checkout: ${finalCheckouts} staff`)

  // 3. Complete/no-show reservations
  await simulateReservations(db, 'close')

  // 4. Free all tables
  await db.query(`UPDATE tables SET status = 'free', updated_at = now() WHERE restaurant_id = $1`, [RESTAURANT_ID])

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

async function closeLingeringOrders(db) {
  const openOrders = await db.query(`
    SELECT id, total, tip, shift_id, cash_station_id, cashier_id, waiter_id, opened_at
    FROM orders
    WHERE restaurant_id = $1 AND status IN ('open', 'printed')
    ORDER BY opened_at ASC
  `, [RESTAURANT_ID])

  if (openOrders.rows.length === 0) return 0

  // Close 60-80% of open orders (some stay for next phase — still eating)
  const toClose = Math.max(1, Math.floor(openOrders.rows.length * (0.6 + Math.random() * 0.2)))
  let closed = 0

  for (let i = 0; i < toClose && i < openOrders.rows.length; i++) {
    const o = openOrders.rows[i]
    const now = new Date()
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

    closed++
  }

  const remaining = openOrders.rows.length - closed
  if (closed) console.log(`  🧾 Closed ${closed} lingering orders (${remaining} still eating)`)
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
    // 25% of orders stay open (customer still eating) — except in close phase
    const leaveOpen = !isVoid && !opts.noOpen && !forceClose && Math.random() < 0.25

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
      // Delivery/takeout: use channel name as tableName
      tableName = isDelivery ? `${area.name}-${rand(1000, 9999)}` : `PLL-${rand(100, 999)}`
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
      isVoid ? 'void' : leaveOpen ? (Math.random() < 0.5 ? 'printed' : 'open') : 'closed', openedAt, isVoid ? openedAt : leaveOpen ? null : closedAt,
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

// ── Main ─────────────────────────────────────────────────────────

async function main() {
  const phase = PHASE_OVERRIDE || getPhase()
  if (phase === 'skip') {
    console.log('💤 Restaurant is closed (2am-9am). Skipping.')
    return
  }

  const envLabel = IS_LOCAL ? 'LOCAL' : IS_DEV ? 'DEV' : 'PROD'
  const startedAt = new Date().toISOString()
  const plan = buildScenarioPlan({
    phase,
    envProfile: ENV_PROFILE,
    restaurantId: RESTAURANT_ID,
    forcedPhase: Boolean(PHASE_OVERRIDE),
    generatedAt: startedAt,
  })
  const tracker = createRuntimeTracker({
    envLabel,
    envProfile: ENV_PROFILE,
    phase,
    restaurantId: RESTAURANT_ID,
    plan,
    startedAt,
  })
  const client = new Client(DB_URL)
  await client.connect()

  console.log(`\n🔥 Fogo de Chão Simulator v3 — ${envLabel} — ${startedAt}`)
  console.log(`📍 Phase: ${phase} (${getHourMX()}:00 MX) | r${RESTAURANT_ID}`)
  if (PHASE_OVERRIDE) console.log(`🛠️ Phase override requested via --phase=${PHASE_OVERRIDE}`)
  console.log(`🧠 Scenario: ${scenarioHeadline(plan)}`)
  console.log('─'.repeat(50))

  try {
    const safe = await safetyCheck(client)
    if (!safe) {
      recordRuntimeStep(tracker, 'safety-check', { skipped: true })
      writeRuntimeArtifact({ outputDir: RUNTIME_ARTIFACT_DIR, tracker, status: 'skipped' })
      return
    }
    recordRuntimeStep(tracker, 'scenario-plan', {
      expectedCovers: plan.expectedCovers,
      expectedSalesMin: plan.expectedSalesRange[0],
      expectedSalesMax: plan.expectedSalesRange[1],
    })

    const phaseHandlers = {
      open: phaseOpen,
      lunch: phaseLunch,
      afternoon: phaseAfternoon,
      shift_change: phaseShiftChange,
      dinner: phaseDinner,
      late_night: phaseLateNight,
      close_night: phaseCloseNight,
      // Legacy: if old cron sends 'close', treat as close_night
      close: phaseCloseNight,
    }

    const phaseSummary = await phaseHandlers[phase](client)
    recordRuntimeStep(tracker, phaseSummary.name, phaseSummary)

    // Run inventory simulation after each phase
    const inventorySummary = await simulateInventory(client, phase)
    recordRuntimeStep(tracker, 'inventory', {
      inventoryPurchases: inventorySummary.purchases,
      inventoryConsumptions: inventorySummary.consumptions,
      inventoryWaste: inventorySummary.waste,
      skipped: Boolean(inventorySummary.skipped),
    })

    // Run reservations simulation after each phase
    const reservationsSummary = await simulateReservations(client, phase)
    recordRuntimeStep(tracker, 'reservations', {
      reservations: reservationsSummary.reservations,
    })

    const verification = await verifyRuntimeConsistency(client, {
      restaurantId: RESTAURANT_ID,
      phase,
      plan,
      envProfile: ENV_PROFILE,
      runObserved: tracker.totals,
    })
    setRuntimeVerification(tracker, verification)
    recordRuntimeStep(tracker, 'consistency-verifier', {
      ok: verification.ok,
      runIssueCount: verification.runConsistency.issues.length,
      runWarningCount: verification.runConsistency.warnings.length,
      dayIssueCount: verification.dayHealth.issues.length,
      dayWarningCount: verification.dayHealth.warnings.length,
    })

    const artifact = writeRuntimeArtifact({ outputDir: RUNTIME_ARTIFACT_DIR, tracker })

    console.log('─'.repeat(50))
    console.log(`📝 Artifact: ${join(RUNTIME_ARTIFACT_DIR, `last-${ENV_PROFILE}.json`)}`)
    console.log(`📊 Runtime totals: ${artifact.totals.orders} orders, $${artifact.totals.revenue.toFixed(2)} revenue, ${artifact.totals.attendanceEvents} attendance events`)
    console.log(`🧪 Run consistency: ${verification.runConsistency.ok ? 'OK' : 'ISSUES'} (${verification.runConsistency.issues.length} issues, ${verification.runConsistency.warnings.length} warnings)`)
    console.log(`🩺 Day health: ${verification.dayHealth.ok ? 'OK' : 'ISSUES'} (${verification.dayHealth.issues.length} issues, ${verification.dayHealth.warnings.length} warnings)`)
    console.log('✅ Simulation complete\n')
  } catch (err) {
    writeRuntimeArtifact({ outputDir: RUNTIME_ARTIFACT_DIR, tracker, status: 'error', error: err })
    console.error('❌ Error:', err.message)
    throw err
  } finally {
    await client.end()
  }
}

main().catch(err => { console.error(err); process.exit(1) })
