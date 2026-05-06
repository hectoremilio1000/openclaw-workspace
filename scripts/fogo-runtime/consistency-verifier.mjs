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

function buildRunConsistency({ serviceWindow, runType, plan, runObserved, daySnapshot }) {
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

  // Only warn about no open shift during service windows that require one
  const serviceWindows = ['LUNCH', 'AFTERNOON', 'DINNER']
  if (serviceWindows.includes(serviceWindow) && shiftsOpened === 0 && orders > 0 && num(daySnapshot.openShiftCount) === 0) {
    warnings.push(`run created ${orders} orders without opening a new shift in this execution`)
  }

  if (serviceWindow === 'CLOSE' && shiftsClosed === 0) {
    warnings.push('close run did not close a shift in this execution')
  }

  if (orders > 0 && checkIns === 0 && serviceWindow !== 'CLOSE' && num(daySnapshot.checkIns) === 0) {
    warnings.push(`run created ${orders} orders without new attendance check-ins in this execution`)
  }

  // Only flag checkOuts > checkIns if checkOuts exceed total check-ins for the day
  if (checkOuts > num(daySnapshot.checkIns) && serviceWindow !== 'CLOSE') {
    issues.push(`run check-outs (${checkOuts}) exceed total day check-ins (${num(daySnapshot.checkIns)})`)
  }

  // revenue = 0 only warns during active service windows (not PREP/CLOSE/maintenance)
  if (revenue < expectedSalesMin && runType === 'window' && serviceWindows.includes(serviceWindow)) {
    warnings.push(`run revenue ${revenue.toFixed(2)} is below expected min ${expectedSalesMin}`)
  }
  if (expectedSalesMax > 0 && revenue > expectedSalesMax * 1.15) {
    warnings.push(`run revenue ${revenue.toFixed(2)} is above expected max ${expectedSalesMax}`)
  }

  // orders = 0 only warns during active service windows
  if (orders < expectedOrdersMin && runType === 'window' && serviceWindows.includes(serviceWindow)) {
    warnings.push(`run orders ${orders} are below expected min ${expectedOrdersMin}`)
  }
  if (expectedOrdersMax > 0 && orders > Math.round(expectedOrdersMax * 1.15)) {
    warnings.push(`run orders ${orders} are above expected max ${expectedOrdersMax}`)
  }

  if (serviceWindow === 'CLOSE' && inventoryWaste === 0) {
    warnings.push('close run did not record waste movements in this execution')
  }

  if (serviceWindow === 'LUNCH' && inventoryPurchases === 0 && inventoryConsumptions === 0) {
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

export async function verifyRuntimeConsistency(db, { restaurantId, businessDate: inputBusinessDate, serviceWindow, shiftId, runType, plan, envProfile, runObserved }) {
  const businessDate = inputBusinessDate || mxDateString()
  const dayIssues = []
  const dayWarnings = []

  // Use shift_id for order queries when available, fall back to date-based
  const ordersQuery = shiftId
    ? db.query(`
        SELECT count(*)::int AS orders, COALESCE(sum(total), 0)::numeric AS revenue,
               count(*) FILTER (WHERE status = 'open')::int AS open_orders
        FROM orders WHERE restaurant_id = $1 AND shift_id = $2
      `, [restaurantId, shiftId])
    : db.query(`
        SELECT count(*)::int AS orders, COALESCE(sum(total), 0)::numeric AS revenue,
               count(*) FILTER (WHERE status = 'open')::int AS open_orders
        FROM orders WHERE restaurant_id = $1
          AND ((created_at AT TIME ZONE 'America/Mexico_City')::date = $2)
      `, [restaurantId, businessDate])

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
    ordersQuery,
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

  // Only require open shift during active service windows
  const activeWindows = ['LUNCH', 'AFTERNOON', 'DINNER']
  if (serviceWindow === 'CLOSE') {
    if (openShiftCount > 0) dayIssues.push(`close ended with ${openShiftCount} open shift(s)`)
  } else if (activeWindows.includes(serviceWindow) && openShiftCount === 0) {
    dayIssues.push(`${serviceWindow} has no open shift in day state`)
  } else if (openShiftCount > 1) {
    dayIssues.push(`${serviceWindow} has ${openShiftCount} open shifts in day state`)
  }

  if (closedShiftWithOpenOrders > 0) {
    dayIssues.push(`${closedShiftWithOpenOrders} open-order records attached to closed shifts`)
  }

  if (impossiblePayments > 0) {
    dayIssues.push(`${impossiblePayments} settled payments look impossible vs order totals`)
  }

  // Only flag missing check-ins during active service windows
  if (orders > 0 && checkIns === 0 && activeWindows.includes(serviceWindow)) {
    dayIssues.push(`orders exist (${orders}) but there are no attendance check-ins for ${businessDate}`)
  }

  // Only issue if checkOuts exceed total day check-ins
  if (checkOuts > checkIns && checkOuts > 0) {
    dayWarnings.push(`attendance has more check-outs (${checkOuts}) than check-ins (${checkIns}) for the day`)
  }

  if (negativeInventoryItems > 0) {
    dayWarnings.push(`${negativeInventoryItems} inventory items have negative cumulative balance`)
  }

  if (serviceWindow !== 'CLOSE' && openOrders > Math.max(20, Math.round(orders * 0.75))) {
    dayWarnings.push(`open orders remain high for ${serviceWindow}: ${openOrders}/${orders}`)
  }

  if (serviceWindow === 'CLOSE' && openOrders > 0) {
    dayIssues.push(`close ended with ${openOrders} open orders for the day`)
  }

  const daySnapshot = { openShiftCount, checkIns, checkOuts, orders, revenue, openOrders, negativeInventoryItems }
  const runConsistency = buildRunConsistency({ serviceWindow, runType: runType || 'window', plan, runObserved, daySnapshot })

  return {
    ok: runConsistency.ok && dayIssues.length === 0,
    businessDate,
    envProfile,
    serviceWindow,
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
