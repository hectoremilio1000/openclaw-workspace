# System Map — Inventarios

> Last updated: 2026-04-12

## Runtime

| Componente | Stack | Puerto local | URL producción |
|---|---|---|---|
| Inventory API | Node/AdonisJS | 3344 | https://pos-inventory-api-production-bba3.up.railway.app |
| Bot / Brain runtime | Node/AdonisJS | 3357 | https://pos-bot-api-production.up.railway.app |
| Admin / Centro de Control | React/Vite | 5XXX | https://pos-front-admin.vercel.app |
| OpenClaw orchestration | OpenClaw | N/A | N/A |
| Demo simulator | Node script | N/A | Workspace runner |

## Fuentes de datos

| Tabla | DB | Descripción |
|---|---|---|
| `inventory_items` | railway | Catálogo base de insumos |
| `inventory_presentations` | railway | Presentaciones/unidades |
| `inventory_warehouses` | railway | Almacenes |
| `inventory_recipes` | railway | Relación producto → consumo de insumos |
| `inventory_movements` | railway | Entradas/salidas/ajustes con costo |
| `purchase_orders` | railway | Compras / abastecimiento |
| `suppliers` | railway | Proveedores |

## Lectura (queries)

```text
Pregunta de inventario
  -> pos_bot_api/app/brain/*
  -> query layer / joins / agregados
  -> estado / diagnóstico
  -> structured answer o safe degradation
```

## Mutación (writes)

```text
Admin/Bot action
  -> policy engine / autorización
  -> pos_inventory_api endpoint
  -> validate
  -> write movement / order / adjustment
  -> audit/event log
  -> response
```

## Repos / archivos clave

| Archivo | Propósito |
|---|---|
| `pos-app/pos_inventory_api/...` | Runtime principal de inventario |
| `pos-app/pos_bot_api/app/brain/pipeline.ts` | Routing de preguntas del brain |
| `workspace/scripts/fogo-simulator.mjs` | Generación de actividad demo con inventario |
| `knowledge/architecture/growthsuite/fogo-demo-simulator-architecture.md` | Fuente de verdad del simulador |
| `knowledge/architecture/growthsuite/brain-policy-layer.md` | Reglas del brain para routing/degradación |

## Ownership práctico

- **Source of truth de inventario:** `pos_inventory_api`
- **Interpretación conversacional:** `pos_bot_api`
- **Orquestación y cron:** OpenClaw
- **Estado demo / actividad sintética:** Fogo simulator
- **UI operativa futura:** Admin / Centro de Control
