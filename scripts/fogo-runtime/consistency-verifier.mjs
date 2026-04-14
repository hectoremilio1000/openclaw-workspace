function mxDateString(date = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

function num(value) {
  return Number(value || 0)
}

function buildRunConsistency({ phase, plan, runObserved, daySnapshot }) {
  const issues = []
  const warnings = []

  const orders = num(runObserved.orders)
  const revenue = num(runObserved.revenue)
  const checkIns = num(runObserved.checkIns)
  const checkOuts = num(runObserved.checkOuts)
  const shiftsOpened = num(runObserved.shiftsOpened)
  const shiftsClosed = num(runObserved.shiftsClosed)
  const inventoryPurchases = num(runObserved.inventoryPurchases)
  const inventoryConsumptions = num(runObserved.inventoryConsumptions)
  const inventoryWaste = num(runObserved.inventoryWaste)

  const [expectedSalesMin, expectedSalesMax] = plan?.expectedSalesRange ?? [0, 0]
  const [expectedOrdersMin, expectedOrdersMax] = plan?.expectedOrdersRange ?? [0, 0]

  if (phase !== 'close' && shiftsOpened === 0 && orders > 0 && num(daySnapshot.openShiftCount) === 0) {
    warnings.push(`run created ${orders} orders without opening a new shift in this execution`)
  }

  if (phase === 'close' && shiftsClosed === 0) {
    warnings.push('close run did not close a shift in this execution')
  }

  if (orders > 0 && checkIns === 0 && phase !== 'close' && num(daySnapshot.checkIns) === 0) {
    warnings.push(`run created ${orders} orders without new attendance check-ins in this execution`)
  }

  if (checkOuts > checkIns && phase !== 'close') {
    issues.push(`run has more check-outs (${checkOuts}) than check-ins (${checkIns})`)
  }

  if (revenue < expectedSalesMin) {
    warnings.push(`run revenue ${revenue.toFixed(2)} is below expected min ${expectedSalesMin}`)
  }
  if (expectedSalesMax > 0 && revenue > expectedSalesMax * 1.15) {
    warnings.push(`run revenue ${revenue.toFixed(2)} is above expected max ${expectedSalesMax}`)
  }

  if (orders < expectedOrdersMin) {
    warnings.push(`run orders ${orders} are below expected min ${expectedOrdersMin}`)
  }
  if (expectedOrdersMax > 0 && orders > Math.round(expectedOrdersMax * 1.15)) {
    warnings.push(`run orders ${orders} are above expected max ${expectedOrdersMax}`)
  }

  if (phase === 'close' && inventoryWaste === 0) {
    warnings.push('close run did not record waste movements in this execution')
  }

  if (phase === 'lunch' && inventoryPurchases === 0 && inventoryConsumptions === 0) {
    warnings.push('lunch run did not move inventory in this execution')
  }

  return {
    ok: issues.length === 0,
    summary: {
      orders,
      revenue: Math.round(revenue * 100) / 100,
      checkIns,
      checkOuts,
      shiftsOpened,
      shiftsClosed,
      inventoryPurchases,
      inventoryConsumptions,
      inventoryWaste,
    },
    issues,
    warnings,
  }
}

export async function verifyRuntimeConsistency(db, { restaurantId, phase, plan, envProfile, runObserved }) {
  const businessDate = mxDateString()
  const dayIssues = []
  const dayWarnings = []

  const [openShiftRes, closedShiftWithOpenOrdersRes, impossiblePaymentsRes, attendanceRes, inventoryNegativeRes, ordersRes] = await Promise.all([
    db.query(`SELECT count(*)::int AS c FROM shifts WHERE restaurant_id = $1 AND status = 'OPEN'`, [restaurantId]),
    db.query(`
      SELECT count(*)::int AS c
      FROM shifts s
      JOIN orders o ON o.shift_id = s.id
      WHERE s.restaurant_id = $1
        AND s.status = 'CLOSED'
        AND o.status NOT IN ('closed', 'void')
    `, [restaurantId]),
    db.query(`
      SELECT count(*)::int AS c
      FROM payments p
      JOIN orders o ON o.id = p.order_id
      WHERE o.restaurant_id = $1
        AND p.status = 'settled'
        AND (p.amount <= 0 OR p.amount > (COALESCE(o.total, 0) * 1.5 + 5))
    `, [restaurantId]),
    db.query(`
      SELECT
        count(*) FILTER (WHERE event_type = 'check_in')::int AS checkins,
        count(*) FILTER (WHERE event_type = 'check_out')::int AS checkouts
      FROM attendance_events
      WHERE restaurant_id = $1 AND event_date = $2
    `, [restaurantId, businessDate]),
    db.query(`
      SELECT count(*)::int AS c
      FROM (
        SELECT inventory_item_id, COALESCE(sum(quantity_base), 0) AS balance
        FROM inventory_movements
        WHERE restaurant_id = $1
        GROUP BY inventory_item_id
      ) balances
      WHERE balance < 0
    `, [restaurantId]).catch(() => ({ rows: [{ c: 0 }] })),
    db.query(`
      SELECT
        count(*)::int AS orders,
        COALESCE(sum(total), 0)::numeric AS revenue,
        count(*) FILTER (WHERE status = 'open')::int AS open_orders
      FROM orders
      WHERE restaurant_id = $1
        AND ((created_at AT TIME ZONE 'America/Mexico_City')::date = $2)
    `, [restaurantId, businessDate]),
  ])

  const openShiftCount = num(openShiftRes.rows[0]?.c)
  const closedShiftWithOpenOrders = num(closedShiftWithOpenOrdersRes.rows[0]?.c)
  const impossiblePayments = num(impossiblePaymentsRes.rows[0]?.c)
  const checkIns = num(attendanceRes.rows[0]?.checkins)
  const checkOuts = num(attendanceRes.rows[0]?.checkouts)
  const negativeInventoryItems = num(inventoryNegativeRes.rows[0]?.c)
  const orders = num(ordersRes.rows[0]?.orders)
  const revenue = num(ordersRes.rows[0]?.revenue)
  const openOrders = num(ordersRes.rows[0]?.open_orders)

  if (phase === 'close') {
    if (openShiftCount > 0) dayIssues.push(`close phase ended with ${openShiftCount} open shift(s)`)
  } else if (openShiftCount === 0) {
    dayIssues.push(`phase ${phase} has no open shift in day state`)
  } else if (openShiftCount > 1) {
    dayIssues.push(`phase ${phase} has ${openShiftCount} open shifts in day state`)
  }

  if (closedShiftWithOpenOrders > 0) {
    dayIssues.push(`${closedShiftWithOpenOrders} open-order records attached to closed shifts`)
  }

  if (impossiblePayments > 0) {
    dayIssues.push(`${impossiblePayments} settled payments look impossible vs order totals`)
  }

  if (orders > 0 && checkIns === 0) {
    dayIssues.push(`orders exist (${orders}) but there are no attendance check-ins for ${businessDate}`)
  }

  if (checkOuts > checkIns) {
    dayIssues.push(`attendance has more check-outs (${checkOuts}) than check-ins (${checkIns})`)
  }

  if (negativeInventoryItems > 0) {
    dayWarnings.push(`${negativeInventoryItems} inventory items have negative cumulative balance`)
  }

  if (phase !== 'close' && openOrders > Math.max(20, Math.round(orders * 0.75))) {
    dayWarnings.push(`open orders remain high for ${phase}: ${openOrders}/${orders}`)
  }

  if (phase === 'close' && openOrders > 0) {
    dayIssues.push(`close phase ended with ${openOrders} open orders for the day`)
  }

  const daySnapshot = { openShiftCount, checkIns, checkOuts, orders, revenue, openOrders, negativeInventoryItems }
  const runConsistency = buildRunConsistency({ phase, plan, runObserved, daySnapshot })

  return {
    ok: runConsistency.ok && dayIssues.length === 0,
    businessDate,
    envProfile,
    phase,
    runConsistency,
    dayHealth: {
      ok: dayIssues.length === 0,
      summary: {
        ...daySnapshot,
        revenue: Math.round(revenue * 100) / 100,
      },
      issues: dayIssues,
      warnings: dayWarnings,
    },
    issues: [...runConsistency.issues, ...dayIssues],
    warnings: [...runConsistency.warnings, ...dayWarnings],
  }
}
