# Rebuild de Viajes de Compras — r13 (Cantina Llorona Demo 2)

Fecha: 2026-03-03 (CST)

## Problema detectado
- Había 4 viajes genéricos incorrectos (IDs 25-28): Bebidas/Central/Vinos/Surtido.
- Solo 4 PT estaban ligados como runs.
- Muchas órdenes estaban sueltas y no reflejaban separación real Comisariato vs Central.

## Acciones ejecutadas

### 1) Limpieza de viajes incorrectos
- Runs 25, 26, 27, 28:
  - `status` -> `cancelled`
  - Órdenes desligadas de esos runs (`purchase_run_id = NULL`)

### 2) Relink de PT y Central
- PT (por `reference ILIKE 'PT %'`):
  - 15 runs nuevos creados
  - 654 órdenes ligadas
- Central (por fecha parseada desde `reference ILIKE 'Central %'`):
  - 37 runs nuevos creados
  - 419 órdenes ligadas

### 3) Relink de remanentes (Comisariato/Otros)
- Para órdenes sin run restantes (`reference IS NULL` y `reference ILIKE 'Otros:%'`):
  - Se crearon runs de `Comisariato - <día>` a las 04:00 CST
  - 130 runs nuevos creados
  - 216 órdenes ligadas

### 4) Corrección de fechas anómalas
- Se corrigieron 2 órdenes con años futuros mal convertidos (2027/2028) hacia 2026.
- Órdenes con fecha > 2026-12-31 después del fix: **0**.

## Resultado final
- Total órdenes r13: **1383**
- Antes ligadas: **94**
- Después ligadas: **1383**
- Después sueltas: **0**

## Estado de runs incorrectos
- ID 25: cancelled, 0 órdenes
- ID 26: cancelled, 0 órdenes
- ID 27: cancelled, 0 órdenes
- ID 28: cancelled, 0 órdenes

## Nota
La separación final quedó:
- `#source:pt` para viajes PT
- `#source:central` para viajes Central
- `#source:pd` y `#source:otros` para viajes de Comisariato/remanentes
