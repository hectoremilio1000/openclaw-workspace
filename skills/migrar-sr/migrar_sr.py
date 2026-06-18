#!/usr/bin/env python3
"""
migrar_sr.py — Migrador SoftRestaurant → GrowthSuite (insert-only, atómico por turno).

DISEÑO (ver SKILL.md):
  - Se conecta a PG con el rol RESTRINGIDO `migrador_llorona` (SELECT + INSERT acotado).
    El rol hace IMPOSIBLE borrar/actualizar — la garantía "nunca borrar" es de la BD,
    no del código. Por eso este script NO hace UPDATE: computa todo en Python y hace
    INSERT del valor final (compute-then-insert).
  - UNA transacción por turno: BEGIN…COMMIT con toda la cascada. Falla → ROLLBACK →
    el turno queda como si nunca empezó (sin medio-turnos).
  - Refs (productos, usuarios, mesas, áreas, formas de pago) se RESUELVEN contra id=5
    existente; NO se crean (el rol no puede crear users/products).
  - Hora CORRECTA: SR es local America/Mexico_City (fijo -06, sin DST desde 2022).

MODOS:
  --dry-run (default): lee SR + id=5, computa, imprime el REPORTE DEL GATE §2.5. CERO escritura.
  --commit          : escribe (requiere confirmación). Snapshot + ledger antes.
  --turnos a,b,c    : turnos SR específicos. Si se omite, auto-detecta el gap
                      (turnos cerrados con apertura posterior al último shift de id=5).

CONEXIÓN (por env):
  SR_HOST SR_USER SR_PASS SR_DB         (SoftRestaurant via WinRM/NTLM)
  PGHOST PGPORT PGUSER PGPASSWORD PGDATABASE   (libpq estándar; PGUSER=migrador_llorona)
  RESTAURANT_ID                          (default 5)
"""
import os, sys, re, json, argparse, warnings
from datetime import datetime, timezone
warnings.filterwarnings("ignore")
import winrm
import psycopg2

# ── Config ──────────────────────────────────────────────────────────────────
SR_HOST = os.environ.get('SR_HOST', '100.83.103.9')   # IP Tailscale de aidee
SR_DB   = os.environ.get('SR_DB', 'softrestaurant11')
# Credenciales SR por ENV (NO hardcodear — no se commitean). Si faltan, aborta.
SR_USER = os.environ.get('SR_USER')
SR_PASS = os.environ.get('SR_PASS')
if not SR_USER or not SR_PASS:
    raise SystemExit("Faltan SR_USER / SR_PASS en el entorno (export antes de correr). "
                     "Ver credenciales en sync_llorona.py local — NO se guardan en este archivo.")
RESTAURANT_ID = int(os.environ.get('RESTAURANT_ID', '5'))
MX_TZ = '-06:00'  # America/Mexico_City, fijo desde 2022 (sin DST)

SR_TO_GS_CODE = {'EF':'CASH','VISA':'VISA','MC':'MC','AMEX':'AMEX','08':'08',
                 'CR':'CR','DLL':'DLL','VAL':'VAL','CARD':'CARD'}

# ── SoftRestaurant (read-only via WinRM → sqlcmd) ───────────────────────────
def sr_session():
    return winrm.Session(SR_HOST, auth=(SR_USER, SR_PASS), transport='ntlm',
                         read_timeout_sec=120, operation_timeout_sec=110)

def sr_query(s, sql, columns, retries=3):
    ps_sql = sql.replace('"', '`"')
    ps = f'$q = "{ps_sql}"\nsqlcmd -S "localhost\\NATIONALSOFT" -E -d {SR_DB} -Q $q -s"|" -W -h -1'
    last = None
    for attempt in range(retries):
        try:
            r = s.run_ps(ps); break
        except Exception as e:
            last = e
            if attempt == retries - 1: raise
            import time; time.sleep(5 * (attempt + 1)); s = sr_session()
    out = r.std_out.decode('latin-1', errors='replace').strip()
    rows = []
    for ln in out.split('\n'):
        ln = ln.strip()
        if not ln or 'rows affected' in ln.lower() or ln.startswith('('): continue
        vals = [v.strip() if v.strip() != 'NULL' else None for v in ln.split('|')]
        if len(vals) >= len(columns):
            rows.append(dict(zip(columns, vals[:len(columns)])))
    return rows

def parse_dt(val):
    """SR datetime (naive local Mexico_City) → ISO con offset -06. Maneja /Date(ms)/."""
    if val is None or val == '' or val == 'None': return None
    if isinstance(val, str) and '/Date(' in val:
        ms = int(re.search(r'/Date\((-?\d+)', val).group(1))
        return datetime.fromtimestamp(ms / 1000, tz=timezone.utc).astimezone().isoformat()
    s = str(val).split('.')[0].strip()          # quita milisegundos
    return f"{s}{MX_TZ}"                          # adjunta tz Mexico (hora CORRECTA)

def f(x, d=0.0):
    try: return float(x)
    except (TypeError, ValueError): return d

# ── GrowthSuite (PG, rol restringido) ───────────────────────────────────────
def pg_connect():
    return psycopg2.connect()  # toma PGHOST/PGUSER/PGPASSWORD/PGDATABASE del entorno

def build_ref_maps(pg, sr):
    """Resuelve refs SR→id=5 desde lo EXISTENTE. No crea nada."""
    cur = pg.cursor()
    cur.execute("SELECT code, id FROM products WHERE restaurant_id=%s AND code IS NOT NULL", (RESTAURANT_ID,))
    prod_map = {str(c): i for c, i in cur.fetchall()}
    cur.execute("SELECT email, id FROM users WHERE restaurant_id=%s", (RESTAURANT_ID,))
    user_map = {}
    for email, uid in cur.fetchall():
        if email and email.startswith('sr') and '@' in email:
            user_map[email.split('@')[0][2:]] = uid
    cur.execute("SELECT code, id FROM tables WHERE restaurant_id=%s AND code IS NOT NULL", (RESTAURANT_ID,))
    table_map = {str(c): i for c, i in cur.fetchall()}
    cur.execute("SELECT name, id FROM areas WHERE restaurant_id=%s", (RESTAURANT_ID,))
    area_by_name = {n: i for n, i in cur.fetchall()}
    area_rows = sr_query(sr, "SELECT idarearestaurant, descripcion FROM areasrestaurant", ['idarearestaurant','descripcion'])
    area_map = {str(r['idarearestaurant']).strip(): area_by_name.get(str(r['descripcion']).strip())
                for r in area_rows if r.get('idarearestaurant')}
    cur.execute("SELECT id, code FROM payment_methods")
    gs_pm = {c: i for i, c in cur.fetchall()}
    pm_map = {sr: gs_pm[gs] for sr, gs in SR_TO_GS_CODE.items() if gs in gs_pm}
    # station: usa la config de los shifts MÁS RECIENTES de id=5 (consistencia)
    cur.execute("""SELECT master_station_id FROM shifts WHERE restaurant_id=%s AND master_station_id IS NOT NULL
                   ORDER BY opened_at DESC LIMIT 1""", (RESTAURANT_ID,))
    row = cur.fetchone(); master_station_id = row[0] if row else None
    cur.execute("""SELECT cs.cash_station_id FROM cash_sessions cs JOIN shifts s ON cs.shift_id=s.id
                   WHERE s.restaurant_id=%s AND cs.cash_station_id IS NOT NULL
                   ORDER BY s.opened_at DESC LIMIT 1""", (RESTAURANT_ID,))
    row = cur.fetchone(); cash_station_id = row[0] if row else master_station_id
    cur.execute("SELECT id FROM users WHERE full_name ILIKE %s AND full_name <> '' "
                "AND restaurant_id=%s ORDER BY id LIMIT 1", ('%%', RESTAURANT_ID))
    return dict(prod=prod_map, user=user_map, table=table_map, area=area_map, pm=pm_map,
                master_station_id=master_station_id, cash_station_id=cash_station_id)

def user_by_name_map(pg):
    cur = pg.cursor()
    cur.execute("SELECT UPPER(full_name), id FROM users WHERE restaurant_id=%s", (RESTAURANT_ID,))
    return {n: i for n, i in cur.fetchall()}

# ── Detección del gap ───────────────────────────────────────────────────────
def detect_gap_turnos(pg, sr):
    """Turnos SR CERRADOS cuya apertura es posterior al último shift de id=5."""
    cur = pg.cursor()
    cur.execute("SELECT MAX(opened_at) FROM shifts WHERE restaurant_id=%s", (RESTAURANT_ID,))
    last = cur.fetchone()[0]
    last_str = last.astimezone(timezone.utc).strftime('%Y-%m-%d %H:%M:%S') if last else '1900-01-01'
    # comparar en UTC para evitar el bug de TZ de los datos viejos
    rows = sr_query(sr,
        "SELECT idturno, CONVERT(varchar,apertura,120) ap, CONVERT(varchar,cierre,120) ci "
        "FROM turnos WHERE cierre IS NOT NULL ORDER BY idturno", ['idturno','ap','ci'])
    gap = []
    for r in rows:
        # apertura SR es local -06 → a UTC para comparar contra last (UTC)
        ap_utc = (datetime.fromisoformat(parse_dt(r['ap'])).astimezone(timezone.utc)
                  .strftime('%Y-%m-%d %H:%M:%S'))
        if ap_utc > last_str:
            gap.append(str(r['idturno']).strip())
    return gap

# ── Construcción de un turno (en memoria) ───────────────────────────────────
def load_turno(sr, turno_id):
    """Trae todo lo de un turno desde SR y lo arma en una estructura."""
    t = sr_query(sr, f"SELECT idturno, fondo, CONVERT(varchar,apertura,120) ap, "
                     f"CONVERT(varchar,cierre,120) ci, cajero FROM turnos WHERE idturno={turno_id}",
                 ['idturno','fondo','ap','ci','cajero'])
    if not t: return None
    t = t[0]
    cheques = sr_query(sr, f"SELECT folio, CONVERT(varchar,fecha,120) fecha, mesa, nopersonas, idmesero, pagado, cancelado, "
                           f"idarearestaurant, descuento, descuentoimporte, idtipodescuento, "
                           f"subtotalsinimpuestos, totalimpuesto1, propina FROM cheques WHERE idturno={turno_id} ORDER BY folio",
                       ['folio','fecha','mesa','nopersonas','idmesero','pagado','cancelado','idarearestaurant',
                        'descuento','descuentoimporte','idtipodescuento','subtotalsinimpuestos','totalimpuesto1','propina'])
    folios = [str(c['folio']).strip() for c in cheques]
    det_by, pay_by = {}, {}
    if folios:
        lo, hi = min(int(x) for x in folios), max(int(x) for x in folios)
        for d in sr_query(sr, f"SELECT foliodet, movimiento, cantidad, idproducto, descuento, precio, "
                              f"impuesto1, preciosinimpuestos, modificador, mitad, comentario FROM cheqdet "
                              f"WHERE foliodet>={lo} AND foliodet<={hi} ORDER BY foliodet, movimiento",
                          ['foliodet','movimiento','cantidad','idproducto','descuento','precio','impuesto1',
                           'preciosinimpuestos','modificador','mitad','comentario']):
            det_by.setdefault(str(d['foliodet']).strip(), []).append(d)
        for p in sr_query(sr, f"SELECT folio, idformadepago, importe, propina FROM chequespagos "
                             f"WHERE folio>={lo} AND folio<={hi} ORDER BY folio",
                         ['folio','idformadepago','importe','propina']):
            pay_by.setdefault(str(p['folio']).strip(), []).append(p)
    movs = sr_query(sr, f"SELECT folio, tipo, importe, CONVERT(varchar,fecha,120) fecha, pagodepropina, "
                        f"pagodecomision FROM movtoscaja WHERE idturno={turno_id} AND cancelado=0",
                    ['folio','tipo','importe','fecha','pagodepropina','pagodecomision'])
    decls = sr_query(sr, f"SELECT idformadepago, importedeclarado FROM declaracioncajero WHERE idturno={turno_id}",
                     ['idformadepago','importedeclarado'])
    return dict(turno=t, cheques=cheques, det_by=det_by, pay_by=pay_by, movs=movs, decls=decls)

def compute_cheque(ch, det_by):
    """Recalcula montos de un cheque. Usa IVA REAL de SR (totalimpuesto1), no 16% fijo."""
    folio = str(ch['folio']).strip()
    items = det_by.get(folio, [])
    subtotal = sum(f(i['preciosinimpuestos']) * f(i['cantidad'], 1) for i in items)
    disc_pct = f(ch['descuento']); disc_amt = f(ch['descuentoimporte'])
    if disc_amt <= 0 and disc_pct > 0:
        disc_amt = subtotal * (disc_pct / 100.0)
    net = subtotal - disc_amt
    tax = f(ch['totalimpuesto1'])                 # IVA real del cheque (mejora vs 16% fijo)
    if tax <= 0: tax = net * 0.16                  # fallback solo si SR no lo trae
    total = net + tax
    return dict(folio=int(folio), items=items, subtotal=round(subtotal,2), discount=round(disc_amt,2),
                tax=round(tax,2), total=round(net+tax,2), net=round(net,2),
                is_courtesy=disc_pct >= 100)

# ── Reporte del gate §2.5 ───────────────────────────────────────────────────
def gate_report(sr, refs, ubn, turnos):
    print("\n" + "="*70)
    print(f"  REPORTE DE MIGRACIÓN (GATE §2.5) — restaurant_id={RESTAURANT_ID}")
    print("="*70)
    grand = dict(cheques=0, items=0, ventas=0.0, propinas=0.0, desc=0.0)
    unmatched_meseros, unmatched_prods, unknown_pm = set(), set(), set()
    for tid in turnos:
        data = load_turno(sr, tid)
        if not data:
            print(f"\n  ⚠️  Turno {tid}: NO existe en SR — se salta."); continue
        t = data['turno']
        cajero = str(t.get('cajero','')).strip()
        cajero_ok = "✓" if ubn.get(cajero.upper()) else "✗ SIN MATCH"
        nv = npr = ntip = ndesc = 0.0; ncheq = nitems = 0
        for ch in data['cheques']:
            c = compute_cheque(ch, data['det_by'])
            ncheq += 1; nitems += len(c['items'])
            nv += c['net']; ntip += sum(f(p['propina']) for p in data['pay_by'].get(str(c['folio']),[]))
            ndesc += c['discount']
            m = str(ch.get('idmesero','')).strip()
            if m and not refs['user'].get(m): unmatched_meseros.add(m)
            for i in c['items']:
                pid = str(i.get('idproducto','')).strip()
                if pid and not refs['prod'].get(pid): unmatched_prods.add(pid)
            for p in data['pay_by'].get(str(c['folio']),[]):
                if str(p.get('idformadepago','')).strip() not in refs['pm']:
                    unknown_pm.add(str(p.get('idformadepago','')).strip())
        print(f"\n  Turno {tid}  | cajero: {cajero} {cajero_ok}")
        print(f"    apertura {t['ap']}  cierre {t['ci']}  fondo ${f(t['fondo']):,.2f}")
        print(f"    {ncheq} cheques · {nitems} ítems · ventas netas ${nv:,.2f} · propinas ${ntip:,.2f} · desc ${ndesc:,.2f}")
        grand['cheques']+=ncheq; grand['items']+=nitems; grand['ventas']+=nv
        grand['propinas']+=ntip; grand['desc']+=ndesc
    print("\n  " + "-"*66)
    print(f"  TOTAL A MIGRAR: {len(turnos)} turnos · {grand['cheques']} cheques · {grand['items']} ítems")
    print(f"    ventas netas ${grand['ventas']:,.2f} · propinas ${grand['propinas']:,.2f} · descuentos ${grand['desc']:,.2f}")
    if unmatched_meseros: print(f"  ⚠️  Meseros SIN match (waiter_id quedará NULL): {sorted(unmatched_meseros)}")
    if unmatched_prods:   print(f"  ⚠️  Productos SIN match (product_id NULL): {len(unmatched_prods)} → {sorted(unmatched_prods)[:10]}")
    if unknown_pm:        print(f"  ⚠️  Formas de pago desconocidas (pagos se SALTAN): {sorted(unknown_pm)}")
    if not (unmatched_meseros or unmatched_prods or unknown_pm):
        print("  ✓ Todas las refs (meseros, productos, formas de pago) resuelven contra id=5.")
    print("="*70)
    print("  DRY-RUN: no se escribió nada. Para aplicar: revisar arriba y correr con --commit.")
    print("="*70 + "\n")

# ── Fase de carga (commit) — insert-only, atómica por turno ─────────────────
def insert_turno(pg, refs, ubn, data):
    """Inserta UN turno completo. El caller hace commit()/rollback() (atomicidad).
    Lanza excepción si algo falla. Devuelve dict de resultados."""
    t = data['turno']
    apertura = parse_dt(t['ap']); cierre = parse_dt(t['ci'])
    cajero_uid = ubn.get(str(t.get('cajero', '')).strip().upper())
    fondo = f(t['fondo'])
    cur = pg.cursor()

    # Idempotencia: si ya existe un shift con esa apertura, saltar el turno entero.
    cur.execute("SELECT id FROM shifts WHERE restaurant_id=%s AND opened_at=%s", (RESTAURANT_ID, apertura))
    ex = cur.fetchone()
    if ex:
        return dict(turno=t['idturno'], skipped='shift ya existe', shift_id=ex[0])

    # ── precompute (stats del shift + caja) ──
    computed = []
    sales_count = 0; sales_amount = 0.0; tips_amount = 0.0; net_total = 0.0; cash_sale = 0.0; cash_tip = 0.0
    for ch in data['cheques']:
        c = compute_cheque(ch, data['det_by'])
        pays = data['pay_by'].get(str(c['folio']), [])
        for p in pays:
            amt = f(p['importe']); prop = f(p['propina'])
            sales_amount += amt; tips_amount += prop
            if str(p['idformadepago']).strip() == 'EF':
                cash_sale += amt; cash_tip += prop
        net_total += c['total']
        cancel = str(ch.get('cancelado', '0')) == '1'
        if not cancel: sales_count += 1
        computed.append((ch, c, pays, cancel))

    mov_in = mov_out = tip_payout = comm_payout = 0.0
    for m in data['movs']:
        amt = f(m['importe']); tipo = str(m.get('tipo', '1')).strip()
        if str(m.get('pagodepropina', '0')) == '1':  tip_payout += amt
        elif str(m.get('pagodecomision', '0')) == '1': comm_payout += amt
        elif tipo == '2': mov_in += amt
        else: mov_out += amt
    expected_cash = round(fondo + cash_sale + cash_tip + mov_in - mov_out - tip_payout - comm_payout, 2)
    closing_cash = round(sum(f(d['importedeclarado']) for d in data['decls']
                             if str(d.get('idformadepago', '')).strip() == 'EF'), 2)

    # 1. shift (stats ya computadas — sin UPDATE posterior)
    cur.execute("""INSERT INTO shifts (restaurant_id, master_station_id, user_id, opened_at, closed_at,
        status, sales_count, sales_amount, tips_amount, refunds_amount, net_sales_amount)
        VALUES (%s,%s,%s,%s,%s,'CLOSED',%s,%s,%s,0,%s) RETURNING id""",
        (RESTAURANT_ID, refs['master_station_id'], cajero_uid, apertura, cierre,
         sales_count, round(sales_amount, 2), round(tips_amount, 2), round(net_total, 2)))
    shift_id = cur.fetchone()[0]

    # 2. cash_session (expected_cash computado)
    cur.execute("""INSERT INTO cash_sessions (shift_id, cash_station_id, cash_user_id, opening_cash,
        expected_cash, closing_cash, opened_at, closed_at, status, difference)
        VALUES (%s,%s,%s,%s,%s,%s,%s,%s,'CLOSED',%s) RETURNING id""",
        (shift_id, refs['cash_station_id'], cajero_uid, fondo, expected_cash, closing_cash,
         apertura, cierre, round(closing_cash - expected_cash, 2)))
    cash_session_id = cur.fetchone()[0]

    # 3. orders + items + payments (cashier_id = cajero del turno, NO el mesero → nunca se pierde un pago)
    n_orders = n_items = n_pay = 0
    for ch, c, pays, cancel in computed:
        waiter_id = refs['user'].get(str(ch.get('idmesero', '')).strip())
        table_id = refs['table'].get(str(ch.get('mesa', '')).strip())
        area_id = refs['area'].get(str(ch.get('idarearestaurant', '')).strip())
        personas = int(f(ch.get('nopersonas'), 1)) or 1
        opened = parse_dt(ch['fecha'])
        status = 'void' if cancel else 'closed'
        tip = round(sum(f(p['propina']) for p in pays), 2)
        cur.execute("""INSERT INTO orders (restaurant_id, cash_station_id, shift_id, table_id, waiter_id,
            status, opened_at, closed_at, subtotal, tax, total, tip, persons, area_id,
            folio_series, folio_number, print_count, reopen_count, "tableName", service_id,
            tip_collected_total, tip_paid_total, is_courtesy, discount_amount)
            VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,%s,'SR',%s,0,0,%s,1,0,0,%s,%s) RETURNING id""",
            (RESTAURANT_ID, refs['cash_station_id'], shift_id, table_id, waiter_id, status,
             opened, opened, c['subtotal'], c['tax'], c['total'], tip, personas, area_id,
             c['folio'], str(ch.get('mesa', '')).strip(), c['is_courtesy'], c['discount']))
        order_id = cur.fetchone()[0]; n_orders += 1
        for i in c['items']:
            qty = f(i['cantidad'], 1); base = f(i['preciosinimpuestos'])
            is_mod = bool(i.get('modificador') and str(i.get('modificador', '0')) != '0')
            half = int(f(i.get('mitad'), 0)); rate = f(i.get('impuesto1'), 16) or 16
            comment = (str(i.get('comentario')).strip() or None) if i.get('comentario') else None
            ipct = f(i.get('descuento')); idisc = round(base * qty * ipct / 100.0, 2) if ipct > 0 else 0
            cur.execute("""INSERT INTO order_items (order_id, product_id, qty, unit_price, total, notes,
                discount_amount, status, "isModifier", "isCompositeProductMain", half, tax_rate, base_price, is_courtesy)
                VALUES (%s,%s,%s,%s,%s,%s,%s,%s,%s,false,%s,%s,%s,%s)""",
                (order_id, refs['prod'].get(str(i.get('idproducto', '')).strip()), qty, round(base, 2),
                 round(base * qty, 2), comment, idisc, 'cancelled' if cancel else 'prepared',
                 is_mod, half, rate, round(base, 2), bool(c['is_courtesy'] or ipct >= 100)))
            n_items += 1
        for p in pays:
            pm_id = refs['pm'].get(str(p.get('idformadepago', '')).strip())
            if not pm_id: continue  # forma desconocida → saltar (se avisó en el gate)
            cur.execute("""INSERT INTO payments (order_id, payment_method_id, amount, currency, status,
                paid_at, shift_id, cash_station_id, cashier_id, kind)
                VALUES (%s,%s,%s,'MXN','settled',%s,%s,%s,%s,'SALE')""",
                (order_id, pm_id, f(p['importe']), opened, shift_id, refs['cash_station_id'], cajero_uid))
            n_pay += 1
            if f(p['propina']) > 0:
                cur.execute("""INSERT INTO payments (order_id, payment_method_id, amount, currency, status,
                    paid_at, shift_id, cash_station_id, cashier_id, kind)
                    VALUES (%s,%s,%s,'MXN','settled',%s,%s,%s,%s,'TIP')""",
                    (order_id, pm_id, f(p['propina']), opened, shift_id, refs['cash_station_id'], cajero_uid))
                n_pay += 1

    # 4. cash_movements
    n_mov = 0
    for m in data['movs']:
        amt = f(m['importe']); tipo = str(m.get('tipo', '1')).strip()
        if str(m.get('pagodepropina', '0')) == '1':   mt, mc, rs = 'PAYOUT', 'TIP_PAYOUT', 'Pago de propina'
        elif str(m.get('pagodecomision', '0')) == '1': mt, mc, rs = 'OUT', 'COMMISSION_PAYOUT', 'Pago de comisión'
        elif tipo == '2':                              mt, mc, rs = 'IN', 'REPLENISH', 'Depósito a caja'
        else:                                          mt, mc, rs = 'OUT', 'PETTY_EXPENSE', 'Retiro de caja'
        cur.execute("""INSERT INTO cash_movements (shift_id, station_id, type, amount, reason,
            movement_code, paid_to_user_id, created_at) VALUES (%s,%s,%s,%s,%s,%s,NULL,%s)""",
            (shift_id, refs['cash_station_id'], mt, amt, rs, mc, parse_dt(m['fecha'])))
        n_mov += 1

    # 5-7. shift_totals / services / categories (INSERT…SELECT acotado al shift — sin UPDATE)
    cur.execute("""INSERT INTO shift_totals (shift_id, payment_method_id, sales_count, sales_amount,
        tips_amount, refunds_amount, net_sales_amount, created_at, updated_at)
        SELECT %s, p.payment_method_id, COUNT(*) FILTER (WHERE p.kind='SALE'),
               COALESCE(SUM(p.amount) FILTER (WHERE p.kind='SALE'),0),
               COALESCE(SUM(p.amount) FILTER (WHERE p.kind='TIP'),0), 0,
               COALESCE(SUM(p.amount) FILTER (WHERE p.kind='SALE'),0), NOW(), NOW()
        FROM payments p WHERE p.shift_id=%s GROUP BY p.payment_method_id""", (shift_id, shift_id))
    cur.execute("""INSERT INTO shift_total_services (shift_id, service_id, sales_count, sales_amount, created_at, updated_at)
        SELECT %s, COALESCE(o.service_id,1), COUNT(*)::int, SUM(o.total::numeric), NOW(), NOW()
        FROM orders o WHERE o.shift_id=%s AND o.status='closed' GROUP BY COALESCE(o.service_id,1)""", (shift_id, shift_id))
    cur.execute("""INSERT INTO shift_total_categories (shift_id, category_id, sales_count, sales_amount, created_at, updated_at)
        SELECT %s, c.id, COALESCE(SUM(oi.qty),0)::int,
               COALESCE(SUM(COALESCE(oi.total, oi.qty*oi.unit_price)),0)::numeric(12,2), NOW(), NOW()
        FROM order_items oi JOIN orders o ON o.id=oi.order_id JOIN products p ON p.id=oi.product_id
        JOIN product_groups g ON g.id=p.group_id JOIN product_categories c ON c.id=g.category_id
        WHERE o.shift_id=%s AND o.status='closed' GROUP BY c.id""", (shift_id, shift_id))

    # 8. declarations (expected = SALE+TIP settled del método; fresh shift → sin upsert)
    n_decl = 0
    for d in data['decls']:
        pm_id = refs['pm'].get(str(d.get('idformadepago', '')).strip())
        if not pm_id: continue
        declared = f(d['importedeclarado'])
        cur.execute("SELECT COALESCE(SUM(amount),0) FROM payments WHERE shift_id=%s AND payment_method_id=%s AND status='settled'",
                    (shift_id, pm_id))
        expected = f(cur.fetchone()[0])
        cur.execute("""INSERT INTO shift_declarations (shift_id, payment_method_id, expected_amount, declared_amount,
            difference_amount, is_final, cash_session_id, created_at, updated_at)
            VALUES (%s,%s,%s,%s,%s,true,%s,NOW(),NOW())""",
            (shift_id, pm_id, round(expected, 2), round(declared, 2), round(declared - expected, 2), cash_session_id))
        n_decl += 1

    return dict(turno=t['idturno'], shift_id=shift_id, cash_session_id=cash_session_id, orders=n_orders,
                items=n_items, payments=n_pay, movements=n_mov, declarations=n_decl,
                expected_cash=expected_cash, closing_cash=closing_cash)

def run_commit(pg, sr, refs, ubn, turnos):
    ledger = []
    for tid in turnos:
        data = load_turno(sr, tid)
        if not data:
            print(f"  Turno {tid}: no existe en SR — saltado")
            ledger.append(dict(turno=tid, error='no existe en SR')); continue
        try:
            res = insert_turno(pg, refs, ubn, data)
            pg.commit()                      # ← atomicidad: commit por turno
            print(f"  ✅ Turno {tid}: {res}")
            ledger.append(res)
        except Exception as e:
            pg.rollback()                    # ← falla → turno como si nunca empezó
            print(f"  ❌ Turno {tid} ROLLBACK: {e}")
            ledger.append(dict(turno=tid, error=str(e)))
    rng = f"{turnos[0]}-{turnos[-1]}" if turnos else "none"
    path = os.path.join(os.path.dirname(os.path.abspath(__file__)), f"ledger_migrar_sr_{RESTAURANT_ID}_{rng}.json")
    with open(path, 'w') as fh:
        json.dump(ledger, fh, indent=2, default=str)
    print(f"\nLedger escrito: {path}")
    return ledger

# ── main ────────────────────────────────────────────────────────────────────
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--commit', action='store_true', help='escribe (default: dry-run)')
    ap.add_argument('--turnos', help='lista de idturno SR separada por coma; omitir = auto-gap')
    args = ap.parse_args()

    sr = sr_session()
    pg = pg_connect()
    print(f"Conectado a PG como '{pg.get_dsn_parameters().get('user')}' / db '{pg.get_dsn_parameters().get('dbname')}'")
    refs = build_ref_maps(pg, sr)
    ubn = user_by_name_map(pg)
    print(f"Refs resueltas: {len(refs['prod'])} productos, {len(refs['user'])} meseros, "
          f"{len(refs['table'])} mesas, {len(refs['pm'])} formas de pago. "
          f"master_station={refs['master_station_id']} cash_station={refs['cash_station_id']}")

    turnos = ([t.strip() for t in args.turnos.split(',')] if args.turnos
              else detect_gap_turnos(pg, sr))
    if not turnos:
        print("No hay turnos en el gap. Nada que migrar."); return
    print(f"Turnos objetivo: {turnos}")

    if not args.commit:
        gate_report(sr, refs, ubn, turnos)
        return

    print("\n*** MODO COMMIT — escritura real (insert-only, atómica por turno) ***")
    # Snapshot antes de escribir (solo si se pide explícitamente — p.ej. contra prod).
    snap_dir = os.environ.get('MIGRAR_SNAPSHOT_DIR')
    if snap_dir:
        import subprocess
        os.makedirs(snap_dir, exist_ok=True)
        p = pg.get_dsn_parameters()
        url = f"postgresql://{p['user']}@{p['host']}:{p['port']}/{p['dbname']}"
        out = os.path.join(snap_dir, f"pre_migrar_sr_{p['dbname']}_{turnos[0]}-{turnos[-1]}.dump")
        print(f"  Snapshot → {out}")
        subprocess.run(['pg_dump', '-Fc', url, '-f', out], check=True,
                       env={**os.environ, 'PGPASSWORD': p.get('password', os.environ.get('PGPASSWORD', ''))})
        print("  Snapshot OK.")
    else:
        print("  (sin snapshot: MIGRAR_SNAPSHOT_DIR no seteado — OK en sandbox, OBLIGATORIO en prod)")
    run_commit(pg, sr, refs, ubn, turnos)

if __name__ == '__main__':
    main()
