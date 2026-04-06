# GrowthSuite POS - Arquitectura

## Stack
- **Backend**: AdonisJS v6 (TypeScript), Lucid ORM, PostgreSQL
- **Frontend**: React + Vite (TypeScript)
- **WhatsApp**: Meta Cloud API (impulsobotwhats = Express gateway)
- **Deploy**: Vercel (fronts), Railway (backends/cloud sync)

## Backends (pos-app/)

| Servicio | Puerto | Función |
|---|---|---|
| **pos_auth_api** | - | Auth central: login JWT, users, roles, permisos, fingerprints, attendance, kiosk devices, approvals, bot admin panel |
| **pos_order_api** | - | Core operativo: áreas, mesas, layout, órdenes, productos/categorías, modifiers, KDS, folio series, reportes ventas, receipts, facturas públicas |
| **pos_cash_api** | - | Caja: turnos, cortes X/Z, movimientos efectivo, propinas, payment methods, closures, SSE (Transmit) |
| **pos_bot_api** | - | Bot AI: pipeline (receive→classify→route→execute→persist→reply), LLM, RAG, intents, actions, conversations, feedback, scheduled reports |
| **pos_inventory_api** | - | Inventario completo: items, presentaciones, proveedores, warehouses, stock counts, recetas/BOM, compras, mermas, movimientos |
| **pos_centro_control_api** | - | SaaS control: planes, suscripciones, invoices, Stripe/MercadoPago webhooks, dashboard KPIs, restaurants admin |
| **pos_delivery_api** | - | Delivery (scaffold): webhooks Uber Eats/Rappi, providers OAuth, órdenes delivery, menu sync |
| **pos_reservation_api** | - | Reservaciones: widget público, types, schedules, guests, bot integration |
| **pos_website_api** | - | Website builder: configs, change requests, bot insights, public widget |
| **pos_facturapi** | - | Facturación electrónica (CFDI) |
| **pos_print_proxy** | - | Proxy de impresión: recibe print jobs con token verification |
| **impulsobotwhats** | - | WhatsApp gateway (Express): recibe webhooks Meta → forwards a pos_bot_api/bot/message |

## Fronts (pos-front/)

| App | Función |
|---|---|
| **pos_admin_front** | Panel owner/admin: config restaurant, catálogo, usuarios, bot assistant, reportes |
| **pos_cash_front** | Interfaz cajero: turnos, cobros, cortes |
| **pos_comandero_front** | Comandero meseros: mesas, órdenes, kiosk pairing |
| **pos_centro_front** | Centro de control SaaS: multi-restaurant admin |
| **pos_monitor_front** | KDS/monitor cocina |
| **pos_bot_simulator** | Simulador del bot para testing |
| **pos_website_template** | Template website restaurante |

Extras: **front_pos_facturas** (facturación admin UI)

## Flujo WhatsApp (cómo se conecta)

```
Cliente WhatsApp
    │
    ▼
Meta Cloud API webhook
    │
    ▼
impulsobotwhats (Express gateway, Railway)
  ├── GET /whatsapp → verificación webhook Meta
  └── POST /whatsapp → recibe mensaje
        ├── Valida firma HMAC (x-hub-signature-256)
        ├── Rate limit por IP
        ├── Dedup por providerMessageId
        ├── Extrae texto (text/interactive)
        └── POST pos_bot_api/bot/message
              headers: { x-bot-secret: BOT_SHARED_SECRET }
              body: { phone, text, provider: 'whatsapp', providerMessageId }
                │
                ▼
          pos_bot_api pipeline:
            1. receive → identifica restaurante por phone, carga conversación
            2. classify → LLM clasifica intent
            3. route → mapea intent a handler
            4. execute → ejecuta (RAG QA, reportes, acciones)
            5. persist → guarda conversación
            6. reply → retorna { replies: [...] }
                │
                ▼
          impulsobotwhats envía cada reply via Meta sendText()
```

## Auth Model
- **JWT** para panel admin/owner (pos_auth_api emite tokens)
- **Kiosk auth** para dispositivos POS (pairing por código)
- **Service token** (POS_INTERNAL_TOKEN) para comunicación inter-servicio (bot→order, bot→cash, bot→inventory, bot→reservation)
- **Bot secret** (x-bot-secret header) para impulsobotwhats→pos_bot_api

## Bot Pipeline (pos_bot_api)
```
receive → classify → route → execute → persist → reply
```
- **Actions**: cancel_product, close_shift, reopen_order, late_arrivals_report, supplies_purchases_report, sales_comparison_report
- **RAG**: document chunks con TF-IDF + reranker
- **LLM**: structured output para clasificación
- **Dialog manager**: flujos multi-turno (awaiting_report_date, etc.)
- **Channel profiles**: diferentes comportamientos por canal

## Inter-service Communication
- pos_bot_api → pos_order_api (/api/bot/*) via service token: reportes, órdenes, void items
- pos_bot_api → pos_cash_api: close shift
- pos_bot_api → pos_inventory_api (/internal/bot/*): purchases summary
- pos_bot_api → pos_reservation_api (/api/bot/*): availability, reserve, today
- pos_delivery_api → pos_order_api: inyectar órdenes delivery
- pos_auth_api: centraliza todo auth, bot admin config, AI context

## Known Issues (from README_PENDIENTES)
1. pos_centro_control_api: planes/suscripciones sin auth
2. pos_auth_api: kiosk admin endpoints públicos
3. Approvals endpoint sin rate limit (brute force risk)
4. Bot envs faltantes para close_shift/supplies_purchases
5. pos_inventory_api: POS_INTERNAL_TOKEN no en .env
6. front_pos_facturas: VITE_API_BASE mismatch
7. Comandero: kiosk unpair URL wrong env var
8. pos_cash_api: JWT secret naming inconsistency
9. Credenciales en repo
10. Bot: single shared secret, no scopes
11. Bot CORS wide open
12. env.ts vs .env.example desalineación
