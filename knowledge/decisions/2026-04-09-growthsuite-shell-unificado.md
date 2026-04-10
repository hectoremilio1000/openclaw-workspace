# Decision: GrowthSuite pasa a Shell Unificado

- **Fecha:** 2026-04-09
- **Decidido por:** Hector
- **Estado:** APROBADO

---

## Contexto

GrowthSuite hoy tiene 4 apps frontend separadas:
- Admin (pos_admin_front)
- Comandero (pos_comandero_front)
- Caja (pos_cash_front)
- Monitor (pos_monitor_front)

Esto genera friccion porque:
- Restaurantes pequeños necesitan operar todo desde 1 tablet
- El usuario tiene que saber "cual app abro" para cada tarea
- No hay sensacion de "todo mi negocio vive aqui"
- Competidores como Soft Restaurant (legacy pero funcional) dan esa experiencia unificada

## Decision

GrowthSuite se mueve a un **shell unico con workspaces internos**.

1 app → 5 workspaces: Operacion, Caja, Inventario, Admin, Cerebro

El dock lateral siempre esta visible. El usuario cambia de workspace sin salir de la app.

## Por que

- Restaurantes chicos: 1 tablet, 1 persona rota entre funciones
- Restaurantes grandes: cada estacion se bloquea en 1 workspace (kiosk mode)
- El cerebro necesita vivir DENTRO de la experiencia operativa, no solo en WhatsApp
- La competencia legacy ya ofrece "todo en un lugar" — nosotros debemos hacerlo mejor

## Que se descarto

- **Mantener 4 apps separadas:** genera friccion, dificulta integracion del cerebro
- **Hacer una sola app sin workspaces:** demasiadas funciones en un solo menu, confuso
- **Fusionar primero Comandero + Caja:** no resuelve el problema de fondo

## Consecuencias

- Frontend debe rediseñarse con layout unificado (shell + dock + workspaces)
- Las 4 apps actuales se migran gradualmente como workspaces internos
- Login → deteccion de rol → mostrar workspaces permitidos
- Kiosk mode para estaciones dedicadas
- Home operacional ("Hoy en tu restaurante") como pantalla de inicio

## Documento de referencia

`knowledge/architecture/growthsuite/growthsuite-one-shell.md`
