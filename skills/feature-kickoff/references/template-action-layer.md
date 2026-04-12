# Action Layer — [Feature Name]

> Acciones exactas a implementar. Cada acción tiene firma tipada, inputs, outputs, y side effects. Sin ambigüedad.

**Feature:** [nombre de la feature]  
**Fecha:** [YYYY-MM-DD]

---

## Convenciones

- Tipos en TypeScript estricto (sin `any`)
- Side effects listados explícitamente (DB writes, API calls, eventos emitidos)
- "Reversible" = se puede deshacer sin pérdida de datos
- "Risk level" = low (solo lectura) / medium (escribe DB) / high (dinero, cancelaciones, estados críticos)

---

## Acción 1 — [NombreAccion]

**Archivo destino:** `app/[ruta]/[archivo].ts`  
**Risk level:** low / medium / high  
**Reversible:** Sí / No

### Firma

```typescript
async function [nombreAccion](
  input: {
    restaurantId: number
    [campo]: [Tipo]
    [campo]: [Tipo]
  },
  context: {
    userId?: number
    phone?: string
  }
): Promise<{
  success: boolean
  data: [TipoRespuesta]
  error?: string
}>
```

### Inputs

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| `restaurantId` | `number` | Sí | Must match JWT claim (anti G12) |
| `[campo]` | `[tipo]` | Sí/No | [regla de validación] |

### Outputs (success)

```typescript
{
  success: true,
  data: {
    [campo]: [valor],
    [campo]: [valor]
  }
}
```

### Outputs (error)

```typescript
{
  success: false,
  error: "[mensaje legible para el bot]"
}
```

### Side effects

- [ ] DB write: `INSERT INTO [tabla] (...) VALUES (...)`
- [ ] DB write: `UPDATE [tabla] SET ... WHERE id = ?`
- [ ] API call: `POST [servicio externo]`
- [ ] Evento emitido: `[nombre_evento]` con payload `{...}`
- [ ] Ninguno (read-only)

### Casos de borde

- **Si restaurantId no existe:** retornar error `"Restaurante no encontrado"`
- **Si [condición]:** [comportamiento esperado]
- **Si [condición]:** [comportamiento esperado]

---

## Acción 2 — [NombreAccion]

> (repetir bloque para cada acción)

---

## Política de autorización

> Quién puede ejecutar cada acción. Basado en rol del JWT o lógica de negocio.

| Acción | Owner | Admin | Waiter | Cashier | Bot (sin auth) |
|---|---|---|---|---|---|
| [Acción 1] | ✅ | ✅ | ❌ | ❌ | ❌ |
| [Acción 2] | ✅ | ❌ | ❌ | ❌ | ✅ |

## Multi-tenant safety checklist

- [ ] Cada query filtra por `restaurant_id`
- [ ] `restaurant_id` viene del JWT, no del body
- [ ] Tests incluyen caso G12 (cross-tenant debe fallar)
