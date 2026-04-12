#!/usr/bin/env node
/**
 * Clone Fogo de Chão (r40) from production DB to LOCAL DB.
 * Keeps restaurant_id=40 (same as prod) so simulator works without remapping.
 * 
 * Run: NODE_PATH=/tmp/node_modules node scripts/clone-fogo-to-local.mjs
 */

import pg from 'pg'
const { Client } = pg

const PROD_URL = 'postgresql://postgres:ZksggoNJFXzWqLlTslzxWmFLZaVRXCVw@trolley.proxy.rlwy.net:20722/railway'
const LOCAL_URL = 'postgresql://pos_user:pos_pass@127.0.0.1:5432/pos_app'
const R = 40

async function main() {
  const prod = new Client({ connectionString: PROD_URL })
  const local = new Client({ connectionString: LOCAL_URL })
  await prod.connect()
  await local.connect()
  console.log('🔗 Connected to prod + local\n')

  // ── 1. Restaurant ──
  const existing = await local.query('SELECT id FROM restaurants WHERE id = $1', [R])
  if (existing.rows.length === 0) {
    const { rows: [restaurant] } = await prod.query('SELECT * FROM restaurants WHERE id = $1', [R])
    if (!restaurant) throw new Error('Restaurant r40 not found in prod')
    await local.query(`
      INSERT INTO restaurants (id, slug, name, legal_name, address_line1, city, state, phone, email, timezone, currency, plan, status, pairing_code, created_at, updated_at)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
      ON CONFLICT (id) DO NOTHING
    `, [
      R, restaurant.slug, restaurant.name, restaurant.legal_name,
      restaurant.address_line1, restaurant.city, restaurant.state, restaurant.phone,
      restaurant.email, restaurant.timezone, restaurant.currency, restaurant.plan,
      restaurant.status, restaurant.pairing_code, restaurant.created_at, restaurant.updated_at
    ])
    console.log(`✅ Restaurant r${R} cloned`)
  } else {
    console.log(`ℹ️ Restaurant r${R} already exists locally`)
  }

  // Helper: clone simple table keeping same IDs
  async function cloneTable(table, cols, where = `restaurant_id = ${R}`) {
    const { rows } = await prod.query(`SELECT * FROM ${table} WHERE ${where} ORDER BY id`)
    let created = 0, skipped = 0
    for (const row of rows) {
      const existing = await local.query(`SELECT id FROM ${table} WHERE id = $1`, [row.id])
      if (existing.rows.length > 0) { skipped++; continue }
      const colList = cols.map(c => c)
      const vals = cols.map(c => row[c])
      const placeholders = cols.map((_, i) => `$${i + 1}`)
      try {
        await local.query(
          `INSERT INTO ${table} (${colList.join(',')}) VALUES (${placeholders.join(',')})`,
          vals
        )
        created++
      } catch (e) {
        console.log(`  ⚠️ ${table} id=${row.id}: ${e.message.slice(0, 80)}`)
      }
    }
    // Fix sequence after inserting with explicit IDs
    if (created > 0) {
      try {
        await local.query(`SELECT setval(pg_get_serial_sequence('${table}', 'id'), (SELECT MAX(id) FROM ${table}))`)
      } catch (e) { /* no serial sequence */ }
    }
    console.log(`  ${table}: ${created} created, ${skipped} existing`)
    return rows
  }

  // ── 2. Roles (needed by users) ──
  const { rows: prodRoles } = await prod.query('SELECT DISTINCT role_id FROM users WHERE restaurant_id = $1 AND role_id IS NOT NULL', [R])
  for (const { role_id } of prodRoles) {
    const exists = await local.query('SELECT id FROM roles WHERE id = $1', [role_id])
    if (exists.rows.length === 0) {
      const { rows: [role] } = await prod.query('SELECT * FROM roles WHERE id = $1', [role_id])
      if (role) {
        await local.query(
          'INSERT INTO roles (id, name, code, created_at, updated_at) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING',
          [role.id, role.name, role.code || role.name, role.created_at, role.updated_at]
        )
        console.log(`  role: ${role.name} (id=${role.id})`)
      }
    }
  }
  try {
    await local.query("SELECT setval(pg_get_serial_sequence('roles', 'id'), (SELECT MAX(id) FROM roles))")
  } catch(e) {}

  // ── 3. Areas ──
  await cloneTable('areas', ['id', 'name', 'restaurant_id', 'created_at', 'updated_at'])

  // ── 4. Services ──
  await cloneTable('services', ['id', 'name', 'restaurant_id', 'sort_order', 'created_at', 'updated_at'])

  // ── 5. Cash stations ──
  await cloneTable('cash_stations', ['id', 'name', 'restaurant_id', 'code', 'kind', 'created_at', 'updated_at'])

  // ── 6. Tables ──
  const { rows: tables } = await prod.query('SELECT * FROM tables WHERE restaurant_id = $1 ORDER BY id', [R])
  let tablesCreated = 0
  for (const t of tables) {
    const exists = await local.query('SELECT id FROM tables WHERE id = $1', [t.id])
    if (exists.rows.length > 0) continue
    try {
      await local.query(
        `INSERT INTO tables (id, restaurant_id, area_id, code, capacity, status, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8) ON CONFLICT DO NOTHING`,
        [t.id, R, t.area_id, t.code, t.capacity || 4, t.status || 'available', t.created_at, t.updated_at]
      )
      tablesCreated++
    } catch (e) { console.log(`  ⚠️ table ${t.code}: ${e.message.slice(0, 80)}`) }
  }
  try { await local.query("SELECT setval(pg_get_serial_sequence('tables', 'id'), (SELECT MAX(id) FROM tables))") } catch(e) {}
  console.log(`  tables: ${tablesCreated} created, ${tables.length - tablesCreated} existing`)

  // ── 7. Product categories ──
  await cloneTable('product_categories', ['id', 'name', 'restaurant_id', 'code', 'created_at', 'updated_at'])

  // ── 8. Product groups ──
  await cloneTable('product_groups', ['id', 'name', 'restaurant_id', 'category_id', 'code', 'created_at', 'updated_at'])

  // ── 9. Products ──
  const { rows: products } = await prod.query('SELECT * FROM products WHERE restaurant_id = $1 ORDER BY id', [R])
  let prodsCreated = 0
  for (const p of products) {
    const exists = await local.query('SELECT id FROM products WHERE id = $1', [p.id])
    if (exists.rows.length > 0) continue
    try {
      await local.query(
        `INSERT INTO products (id, name, base_price, restaurant_id, group_id, is_enabled, created_at, updated_at, price_gross, image_key, code, tax_rate, print_area)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) ON CONFLICT DO NOTHING`,
        [p.id, p.name, p.base_price, R, p.group_id, p.is_enabled !== false, p.created_at, p.updated_at, p.price_gross || p.base_price, p.image_key, p.code, p.tax_rate || 0.16, p.print_area]
      )
      prodsCreated++
    } catch (e) { console.log(`  ⚠️ product ${p.name}: ${e.message.slice(0, 80)}`) }
  }
  try { await local.query("SELECT setval(pg_get_serial_sequence('products', 'id'), (SELECT MAX(id) FROM products))") } catch(e) {}
  console.log(`  products: ${prodsCreated} created, ${products.length - prodsCreated} existing`)

  // ── 10. Users ──
  const { rows: users } = await prod.query('SELECT * FROM users WHERE restaurant_id = $1 ORDER BY id', [R])
  let usersCreated = 0
  for (const u of users) {
    const exists = await local.query('SELECT id FROM users WHERE id = $1', [u.id])
    if (exists.rows.length > 0) continue
    try {
      await local.query(
        `INSERT INTO users (id, full_name, email, password_hash, restaurant_id, role_id, status, is_schedulable, phone, created_at, updated_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT DO NOTHING`,
        [u.id, u.full_name, u.email, u.password_hash || '$2a$10$placeholder', R, u.role_id, u.status || 'active', u.is_schedulable !== false, u.phone, u.created_at, u.updated_at]
      )
      usersCreated++
    } catch (e) { console.log(`  ⚠️ user ${u.full_name}: ${e.message.slice(0, 80)}`) }
  }
  try { await local.query("SELECT setval(pg_get_serial_sequence('users', 'id'), (SELECT MAX(id) FROM users))") } catch(e) {}
  console.log(`  users: ${usersCreated} created, ${users.length - usersCreated} existing`)

  // ── 11. Payment methods (global) ──
  const { rows: methods } = await prod.query('SELECT * FROM payment_methods ORDER BY id')
  let pmCreated = 0
  for (const m of methods) {
    const exists = await local.query('SELECT id FROM payment_methods WHERE id = $1', [m.id])
    if (exists.rows.length > 0) continue
    try {
      await local.query(
        'INSERT INTO payment_methods (id, name, code, is_active, created_at, updated_at) VALUES ($1,$2,$3,$4,$5,$6) ON CONFLICT DO NOTHING',
        [m.id, m.name, m.code || m.name, m.is_active !== false, m.created_at, m.updated_at]
      )
      pmCreated++
    } catch (e) {}
  }
  try { await local.query("SELECT setval(pg_get_serial_sequence('payment_methods', 'id'), (SELECT MAX(id) FROM payment_methods))") } catch(e) {}
  console.log(`  payment_methods: ${pmCreated} created`)

  await prod.end()
  await local.end()
  console.log('\n✅ Fogo de Chão r40 cloned to local (same IDs as prod — no mapping needed)')
}

main().catch(e => { console.error('❌ Error:', e); process.exit(1) })
