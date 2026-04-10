# Patrones AdonisJS v6 — GrowthSuite

> Reglas especificas para programar en AdonisJS v6 (TypeScript) con Lucid ORM.
> Aplican a todos los microservicios de pos-app.

---

## 1. Estructura de microservicios

```
pos-app/
├── pos_auth_api/       (puerto 3340, login, roles, kiosk pairing)
├── pos_order_api/      (puerto 3341, ordenes, productos, mesas)
├── pos_cash_api/       (puerto 3342, pagos, caja, cortes)
├── pos_bot_api/        (puerto 3357, bot WhatsApp, cerebro)
├── pos_inventory_api/  (puerto 3344, insumos, stock, recetas, proveedores)
├── pos_centro_control_api/ (puerto 3343, multirestaurant management)
├── pos_reservation_api/    (puerto 3347, reservaciones)
├── pos_website_api/        (puerto 3348, pagina web del restaurante)
└── pos_delivery_api/       (puerto 3346, delivery)
```

Cada microservicio es un proyecto AdonisJS independiente con su propio `package.json`, migraciones y modelos.

## 2. Build y verificacion

```bash
# SIEMPRE corre build, no solo typecheck
node ace build

# Si usas Ace commands:
node ace migration:run
node ace migration:status
```

**Nunca declares "listo" sin correr `node ace build`.**

## 3. Modelos Lucid

```ts
// Usar decorators de @adonisjs/lucid/orm
import { BaseModel, column, belongsTo, hasMany } from '@adonisjs/lucid/orm'

export default class Product extends BaseModel {
  public static table = 'products' // siempre explicito

  @column({ isPrimary: true })
  declare id: number

  @column()
  declare restaurantId: number // camelCase en modelo, snake_case en DB

  @column.dateTime({ autoCreate: true })
  declare createdAt: DateTime
}
```

### Reglas de modelos
- Siempre declarar `public static table = '...'` explicitamente
- Usar `declare` (no `!:`) para propiedades
- `columnName` solo cuando difiere del camelCase auto-convertido
- Relaciones con types importados de `@adonisjs/lucid/types/relations`

## 4. Migraciones

```ts
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'business_events'

  async up() {
    this.schema.createTable(this.tableName, (table) => {
      table.bigIncrements('id')
      table.integer('restaurant_id').notNullable()
        .references('id').inTable('restaurants')
      table.string('event_type', 50).notNullable()
      table.timestamp('occurred_at').notNullable()
      table.timestamp('created_at').defaultTo(this.now())

      // Indices SIEMPRE al crear la tabla
      table.index(['restaurant_id', 'occurred_at'])
      table.index(['restaurant_id', 'event_type', 'occurred_at'])
    })
  }

  async down() {
    this.schema.dropTable(this.tableName)
  }
}
```

### Reglas de migraciones
- Timestamp como prefijo del nombre (Adonis lo hace automatico)
- Indices en la misma migracion (no separados)
- `restaurant_id` en TODA tabla nueva (multi-tenant)
- `created_at` y `updated_at` siempre

## 5. Queries: Promise.all para independientes

```ts
// ✅ CORRECTO: queries independientes en paralelo
const [ventas, descuentos, cancelaciones] = await Promise.all([
  getVentasHoy(restaurantId),
  getDescuentosHoy(restaurantId),
  getCancelacionesHoy(restaurantId),
])

// ❌ INCORRECTO: queries independientes en serie
const ventas = await getVentasHoy(restaurantId)
const descuentos = await getDescuentosHoy(restaurantId)
const cancelaciones = await getCancelacionesHoy(restaurantId)
```

## 6. Multi-tenant: SIEMPRE filtrar por restaurant_id

```ts
// ✅ CORRECTO
const orders = await Order.query()
  .where('restaurant_id', restaurantId) // SIEMPRE primer filtro
  .where('created_at', '>=', startDate)

// ❌ INCORRECTO (cross-tenant leak)
const orders = await Order.query()
  .where('created_at', '>=', startDate) // falta restaurant_id!
```

**Esta regla es NO NEGOCIABLE.** Ver: `knowledge/agent-patterns/multi-tenant-isolation.md`

## 7. Controladores: reusa, no dupliques

```ts
// ✅ CORRECTO: agrega metodo al controlador existente
// products_controller.ts
async createFromWizard({ request, auth }: HttpContext) { ... }

// ❌ INCORRECTO: crear controlador nuevo para 1 metodo
// product_wizard_controller.ts
async create({ request, auth }: HttpContext) { ... }
```

## 8. Respuesta API consistente

```ts
// Siempre devolver estructura consistente
return response.ok({ data: result })
return response.created({ data: newRecord })
return response.badRequest({ error: 'Mensaje claro' })
return response.notFound({ error: 'Recurso no encontrado' })
```

## 9. Campos numericos de la DB

**Ojo:** PostgreSQL devuelve `decimal`/`numeric` como strings.
Siempre convertir en el modelo:

```ts
const dec = {
  prepare: (v: number | null) => (v === null ? v : String(v)),
  consume: (v: any) => (v === null ? null : Number(v)),
}

@column({ columnName: 'qty_base', ...dec })
declare qtyBase: number
```

## 10. Variables de entorno

- `.env` = desarrollo local (localhost URLs)
- `.env.production` = produccion (Railway URLs)
- NUNCA mezclar
- NUNCA borrar `.env.production`
- Al agregar servicio nuevo: agregar URL en AMBOS archivos
