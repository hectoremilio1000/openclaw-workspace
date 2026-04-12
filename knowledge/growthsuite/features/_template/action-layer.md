# Action Layer — [Feature Name]

> Last updated: YYYY-MM-DD
> Niveles de riesgo: A (solo lectura) → E (irreversible, dinero real)

## Nivel A — Solo lectura

| Acción | Endpoint | Reversible |
|---|---|---|
| Ver X | GET /api/... | N/A |

## Nivel B — Escribe pero reversible

| Acción | Endpoint | Cómo revertir |
|---|---|---|
| Crear X | POST /api/... | DELETE /api/... |

## Nivel C — Escribe con efectos secundarios menores

| Acción | Endpoint | Efecto secundario |
|---|---|---|
| ... | ... | ... |

## Nivel D — Toca dinero / inventario (requiere Policy Engine)

| Acción | Endpoint | Validaciones requeridas |
|---|---|---|
| ... | ... | monto_limit, idempotency_key |

## Nivel E — Irreversible / crítico

| Acción | Endpoint | Quién puede ejecutar |
|---|---|---|
| ... | ... | owner only |
