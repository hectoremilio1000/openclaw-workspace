# Reglas de TypeScript

> Aplican a todo proyecto TypeScript en GrowthSuite (backend y frontend).

---

## 1. Tipos estrictos

```ts
// ✅ CORRECTO
function getOrder(id: number): Promise<Order | null> { ... }

// ❌ INCORRECTO
function getOrder(id: any): Promise<any> { ... }
```

- No usar `any` salvo justificacion explicita
- Preferir `unknown` sobre `any` cuando no sabes el tipo
- Usar union types: `string | null` en vez de optional ambiguo

## 2. Imports

```ts
// ✅ Usar imports de tipo cuando solo necesitas el tipo
import type { BelongsTo, HasMany } from '@adonisjs/lucid/types/relations'

// ✅ Usar path aliases del proyecto
import Product from '#models/product'

// ❌ No usar rutas relativas profundas
import Product from '../../../models/product.js'
```

## 3. Enums: preferir union types

```ts
// ✅ Preferir
type Severity = 'low' | 'medium' | 'high' | 'critical'

// ❌ Evitar (a menos que necesites reverse mapping)
enum Severity { Low, Medium, High, Critical }
```

## 4. Error handling

```ts
// ✅ Try-catch con tipo especifico
try {
  await doThing()
} catch (err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  console.error('doThing failed:', message)
}

// ❌ Catch silencioso
try { await doThing() } catch {}
```

## 5. Null checks

```ts
// ✅ Explicit null check
const order = await Order.find(id)
if (!order) return response.notFound({ error: 'Order not found' })

// ❌ Assume it exists
const order = await Order.findOrFail(id) // solo si 404 es un error del programador
```

## 6. Zod para validacion de input externo

```ts
import { z } from 'zod'

const CreateProductSchema = z.object({
  name: z.string().min(1).max(100),
  price: z.number().positive(),
  categoryId: z.number().int().positive(),
})

// Validar
const input = CreateProductSchema.parse(request.body())
```

## 7. No abstracciones prematuras

```ts
// ✅ 3 lineas similares estan bien
const ventas = await getVentas(rid)
const descuentos = await getDescuentos(rid)
const cancelaciones = await getCancelaciones(rid)

// ❌ No crear un "framework" para 3 queries
const metrics = await runQueries(['ventas', 'descuentos', 'cancelaciones'], rid)
```

Solo abstrae cuando tienes 3+ casos de uso reales, no hipoteticos.
