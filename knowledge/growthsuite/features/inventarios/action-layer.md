# Action Layer — Inventarios

> Last updated: 2026-04-12
> Niveles de riesgo: A (solo lectura) → E (irreversible, dinero real)

## Nivel A — Solo lectura

| Acción | Endpoint | Reversible |
|---|---|---|
| Ver stock actual | GET /api/inventory/... | N/A |
| Ver movimientos recientes | GET /api/inventory/movements | N/A |
| Ver insumos con riesgo | GET /api/inventory/alerts | N/A |
| Preguntar al brain por estado de inventario | POST /api/bot/message | N/A |

## Nivel B — Escribe pero reversible

| Acción | Endpoint | Cómo revertir |
|---|---|---|
| Crear insumo | POST /api/inventory/items | Desactivar/eliminar si no tiene uso |
| Crear presentación | POST /api/inventory/presentations | Editar o borrar antes de uso operativo |
| Crear proveedor | POST /api/inventory/suppliers | Editar o desactivar |

## Nivel C — Escribe con efectos secundarios menores

| Acción | Endpoint | Efecto secundario |
|---|---|---|
| Ajuste manual de stock | POST /api/inventory/adjustments | Cambia existencias y trazabilidad |
| Alta de receta | POST /api/inventory/recipes | Afecta consumos futuros |
| Editar relación producto-insumo | PUT /api/inventory/recipes/:id | Cambia cálculo de consumo |

## Nivel D — Toca dinero / inventario (requiere Policy Engine)

| Acción | Endpoint | Validaciones requeridas |
|---|---|---|
| Registrar compra | POST /api/inventory/purchase-orders | autorización, proveedor válido, idempotency, monto |
| Recibir mercancía | POST /api/inventory/receptions | autorización, referencia compra, auditoría |
| Ajuste por merma | POST /api/inventory/waste | motivo, autorización, evidencia opcional |
| Brain sugiere write de inventario | action layer futuro | confirmación humana + policy engine |

## Nivel E — Irreversible / crítico

| Acción | Endpoint | Quién puede ejecutar |
|---|---|---|
| Cierre/afectación financiera definitiva de compra | endpoint futuro | owner/admin autorizado |
| Borrado destructivo de historial de movimientos | no debería existir directo | owner only + auditoría |
| Reconciliación masiva de inventario con impacto contable | flujo futuro | owner/controller financiero |

## Regla de diseño

Para inventarios, el brain puede recomendar antes de ejecutar.
Las mutaciones nivel C/D/E no deben salir directo del LLM. Deben pasar por policy engine, validaciones e intención explícita del usuario.
