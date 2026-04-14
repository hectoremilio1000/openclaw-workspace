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

export async function verifyRuntimeConsistency(db, { restaurantId, phase, plan, envProfile }) {
  const businessDate = mxDateString()
  const issues = []
  const warnings = []

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
    if (openShiftCount > 0) issues.push(`close phase ended with ${openShiftCount} open shift(s)`)
  } else if (openShiftCount === 0) {
    issues.push(`phase ${phase} has no open shift`)
  } else if (openShiftCount > 1) {
    issues.push(`phase ${phase} has ${openShiftCount} open shifts`)
  }

  if (closedShiftWithOpenOrders > 0) {
    issues.push(`${closedShiftWithOpenOrders} open-order records attached to closed shifts`)
  }

  if (impossiblePayments > 0) {
    issues.push(`${impossiblePayments} settled payments look impossible vs order totals`)
  }

  if (orders > 0 && checkIns === 0) {
    issues.push(`orders exist (${orders}) but there are no attendance check-ins for ${businessDate}`)
  }

  if (checkOuts > checkIns) {
    issues.push(`attendance has more check-outs (${checkOuts}) than check-ins (${checkIns})`)
  }

  if (negativeInventoryItems > 0) {
    warnings.push(`${negativeInventoryItems} inventory items have negative cumulative balance`)
  }

  const [expectedSalesMin, expectedSalesMax] = plan?.expectedSalesRange ?? [0, 0]
  if (revenue < expectedSalesMin) {
    warnings.push(`revenue ${revenue.toFixed(2)} is below expected min ${expectedSalesMin}`)
  }
  if (expectedSalesMax > 0 && revenue > expectedSalesMax * 1.15) {
    warnings.push(`revenue ${revenue.toFixed(2)} is above expected max ${expectedSalesMax}`)
  }

  const [expectedOrdersMin, expectedOrdersMax] = plan?.expectedOrdersRange ?? [0, 0]
  if (orders < expectedOrdersMin) {
    warnings.push(`orders ${orders} are below expected min ${expectedOrdersMin}`)
  }
  if (expectedOrdersMax > 0 && orders > Math.round(expectedOrdersMax * 1.15)) {
    warnings.push(`orders ${orders} are above expected max ${expectedOrdersMax}`)
  }

  if (phase !== 'close' && openOrders > Math.max(20, Math.round(orders * 0.75))) {
    warnings.push(`open orders remain high for ${phase}: ${openOrders}/${orders}`)
  }

  if (phase === 'close' && openOrders > 0) {
    issues.push(`close phase ended with ${openOrders} open orders for the day`)
  }

  return {
    ok: issues.length === 0,
    businessDate,
    envProfile,
    phase,
    summary: {
      orders,
      revenue: Math.round(revenue * 100) / 100,
      openOrders,
      checkIns,
      checkOuts,
      openShiftCount,
      negativeInventoryItems,
    },
    issues,
    warnings,
  }
}
