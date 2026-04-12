# Implementation Plan — Módulo Operación (Admin POS)

> Last updated: 2026-04-12 | Status: in-progress

## Objetivo

Módulo Operación integrado en el Centro de Control (admin) con UX del comandero.  
El dueño/administrador puede ver y gestionar el salón en tiempo real desde el admin.

## Lo que se construyó hoy (2026-04-12)

### Frontend (`pos-front/pos_centro_front/`)

| Componente | Descripción | Status |
|---|---|---|
| Header estilo comandero | Barra superior con nombre del restaurante, mesa activa, estado | done |
| Grid de cuentas (mesas) | Vista de todas las mesas con estado (libre/ocupada/en-cobro) | done |
| Modal "Abrir cuenta" | Formulario para abrir nueva cuenta con mesa, mesero, comensales | done |
| `CapturaComanda` | Componente para agregar productos a la orden (búsqueda, cantidades) | done |
| `OrderPanel` | Panel lateral con 12 acciones: dividir, cobrar, descuento, imprimir, etc. | done |

### Backend (`pos-app/pos_centro_control_api/` o similar)

| Tarea | Descripción | Status |
|---|---|---|
| Rutas admin para operación | Endpoints para leer/crear/modificar cuentas desde el admin | done |

## Alcance

### Sí entra en este plan (construido o en construcción)
- Ver grid de mesas con estado en tiempo real
- Abrir cuenta desde admin
- Capturar comanda (agregar/quitar productos)
- Ver resumen de la orden en OrderPanel
- 12 acciones disponibles en el panel (aunque varias son UI sin lógica aún)

### No entra todavía (pendiente, fuera de scope actual)
- Cobro real (flujo de pago, cierre de cuenta)
- Descuentos aplicados (UI existe, lógica falta)
- Imprimir ticket (UI existe, integración con impresora falta)
- Juntar cuentas (merge de dos mesas)
- Traspasar cuenta (cambio de mesa)
- Split por persona con cálculo automático
- Cancelación con motivo y auditoría

## Backend

| Tarea | Archivo | Status |
|---|---|---|
| Rutas operación admin | `start/routes.ts` | done |
| Controlador cuentas | `app/controllers/operacion_controller.ts` | done |
| Controlador comanda admin | `app/controllers/comanda_admin_controller.ts` | done |

## Frontend

| Tarea | Archivo | Status |
|---|---|---|
| Grid de mesas | `src/components/Operacion/GridCuentas.tsx` | done |
| Modal abrir cuenta | `src/components/Operacion/ModalAbrirCuenta.tsx` | done |
| Captura comanda | `src/components/Operacion/CapturaComanda.tsx` | done |
| Order panel | `src/components/Operacion/OrderPanel.tsx` | done |
| Header comandero | `src/components/Operacion/HeaderOperacion.tsx` | done |

## Orden de ejecución (próximos pasos)

1. Cobro real — integrar flujo de pago desde admin (efectivo, tarjeta, mixto)
2. Descuentos — conectar UI con endpoint de descuentos
3. Imprimir — integrar con servicio de impresión existente
4. Juntar cuentas — endpoint merge + UI
5. Traspasar cuenta — endpoint transfer + UI
6. Cancelaciones — con motivo, auditoría en `bot_events`

## Decisiones de diseño

- **UX del comandero** reutilizada en admin para reducir curva de aprendizaje y evitar duplicar código de componentes.
- **12 acciones en OrderPanel** definidas desde el inicio para claridad del scope, aunque la mayoría son stubs hasta completar backend.
- Backend admin usa las mismas tablas que el POS (no duplica datos), solo agrega rutas con middleware de autenticación admin.
