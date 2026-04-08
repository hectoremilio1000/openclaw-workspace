# 🛠️ Proceso — Cómo construimos features en GrowthSuite

> **Para:** Héctor + Jampier
> **Fecha:** 2026-04-08
> **Status:** Proceso estándar, vivo (se ajusta con el tiempo)

---

## 🎯 La idea

Tener un **proceso simple y repetible** para construir cualquier feature nuevo de GrowthSuite, sin reinventar la rueda en cada uno y sin quedarnos atascados en discusiones eternas.

La regla: **no copiamos, pero tampoco partimos de cero.** Nos paramos sobre los hombros de lo mejor que ya existe en el mercado y lo adaptamos a nuestro contexto (restaurantes de LATAM, multi-tenant, multi-rol, con bot/WhatsApp).

---

## 🔁 El flujo (6 pasos)

### 1. Conversación inicial Héctor ↔ Jampier
- Definimos **qué debe hacer** el feature a grandes rasgos.
- Definimos **quién lo usa** (dueño, capitán, hostess, cajero, mesero, chef, cliente final).
- Definimos **en qué dominio vive**: Ventas / Costos / Operación (ver `[[Pendientes - Features divididos por dominio (Ventas, Costos, Operacion)]]`).
- Definimos **el mínimo viable**: la versión más chica que sirva en un restaurante real.
- Salida: bullets cortos, nada de specs de 40 páginas.

### 2. Benchmark: Jampier le pregunta a la IA por el mejor referente del mercado
- Jampier usa la IA para investigar **quién lo hace mejor hoy** en ese feature.
- Ejemplos de referentes por feature:
  - **Reservaciones** → OpenTable, Resy, SevenRooms
  - **CRM / clientes** → Toast CRM, Square Loyalty, HubSpot light
  - **Inventario / compras** → MarketMan, BlueCart
  - **KDS / cocina** → Toast KDS, Square KDS
  - **Delivery apps integration** → Otter, Deliverect, Cuboh
  - **Pagos / caja** → Square, Toast, Clover
  - **Marketing / WhatsApp** → Yalo, Zenvia
- Extraemos **qué hace bien** cada uno: flujos, pantallas, lógica de negocio, edge cases.
- **No se copia la UI pixel por pixel**, se copia el modelo mental de cómo resuelven el problema.
- Salida: notas cortas o captures con "así lo hace OpenTable, así Resy, así es mejor para nosotros".

### 3. Jampier lo ejecuta en `dev` adaptado a nosotros
- Jampier construye una primera versión funcional **en el branch `dev`**, nunca directo a `main`.
- Adapta el referente a:
  - Nuestro stack (Adonis + React + PostgreSQL + Railway/Vercel)
  - Nuestro modelo multi-tenant (`restaurant_id`)
  - Nuestros roles (Dueño, Capitán, Mesero, Cajero, Chef, Hostess)
  - Nuestro contexto LATAM (español, facturación SAT, propinas, WhatsApp)
- Regla: **salir rápido con algo tocable**, no pulir de más en la primera pasada.
- Deploy automático a Railway/Vercel de `dev` para poder probarlo en ambiente real.

### 4. Revisión Héctor ↔ Jampier sobre la versión en `dev`
- Probamos la versión en `dev` **juntos o en paralelo**.
- Héctor la usa como dueño/operador real.
- Anotamos en el PR o en una nota de vault:
  - Qué funciona bien ✅
  - Qué falta ❌
  - Qué se ve distinto a como lo imaginamos 🔄
  - Qué edge cases rompe 🐞
- Salida: lista concreta de cambios a hacer antes de ir a `main`.

### 5. Jampier aplica los cambios sobre los comentarios
- Jampier itera sobre los comentarios en el mismo branch de `dev`.
- Cada iteración vive en `dev` para poder seguir probando.
- Iteramos hasta que Héctor diga **"ya está listo para main"**.

### 6. PR de `dev` → `main`
- Se abre el PR `dev → main`.
- Héctor revisa por última vez.
- Si está OK → merge a `main` → deploy a producción.
- **Regla de Héctor:** NO usar `--delete-branch` en el merge, conservar las ramas.
- **Regla de Héctor:** NO pushear/mergear sin autorización explícita.

---

## 📋 Reglas fijas del proceso

1. **Siempre empezamos con referente del mercado.** Nadie empieza de cero.
2. **Dev primero, main después.** Cero cambios directos a `main`.
3. **Iteramos sobre código funcionando**, no sobre wireframes infinitos.
4. **Un feature = un dominio.** (Ventas, Costos u Operación. Si toca 2, se parte.)
5. **Adaptación a LATAM no es opcional.** Español, SAT, propinas, WhatsApp, roles mexicanos.
6. **No copiamos UI pixel-perfect.** Copiamos el modelo mental, no el diseño visual.
7. **Naming de branches:** `hector_dev/<feature>` o `jampier_dev/<feature>`.
8. **Commits descriptivos con tag de dominio:** `feat(ventas): ...`, `feat(costos): ...`, `feat(operacion): ...`.

---

## 💡 Por qué este proceso funciona

- **Rápido:** no discutimos tres semanas, en una tarde hay algo tocable.
- **Inspirado pero propio:** no reinventamos la rueda pero tampoco somos clones.
- **Bajo riesgo:** todo pasa por `dev` con deploy real antes de llegar a prod.
- **Auditable:** cada feature deja su rastro en PRs, notas y docs.
- **Escalable a más devs:** el día que entre alguien nuevo, el proceso ya existe.

---

## 🧪 Ejemplo aplicado: Reservaciones

### Paso 1 — Conversación
Héctor: "quiero reservaciones que le sirvan a un restaurante familiar de LATAM, sin inventar. Multi-rol: hostess y capitán."
Jampier: "ok, mínimo viable = calendario del día + walk-ins + asignar mesa + marcar llegada/no-show."
Dominio: **OPERACIÓN** (con vista secundaria de VENTAS para promover horarios bajos).

### Paso 2 — Benchmark
Jampier pregunta a la IA: *"¿cómo maneja OpenTable el flujo de reservación + asignación de mesa + walk-ins vs Resy y SevenRooms?"*
Extrae:
- OpenTable → calendario + time slots + tables + waitlist
- Resy → diseño más moderno, mismo modelo
- SevenRooms → más CRM, guarda preferencias del cliente
**Decisión:** tomar el modelo de OpenTable como base, agregar notas del cliente como SevenRooms light.

### Paso 3 — Implementación en `dev`
Jampier arma:
- Backend: `pos_reservaciones_api` con calendario, slots, tables, status
- Frontend: vista de hostess en `/reservaciones`
- Integra con `customers` (que ya existe post-unification)
- Deploy a `posreservacionesapi-dev.up.railway.app`

### Paso 4 — Revisión Héctor
Héctor prueba en dev:
- ✅ Calendario se ve bien
- ✅ Walk-ins funcionan
- ❌ Falta marcar no-shows explícitamente
- ❌ La vista de hostess debería estar dentro de Admin (ver `[[Pendientes GrowthSuite]]` → POS Admin todo-en-uno)
- 🔄 El diseño de mesas debe jalar el layout de `areas`/`tables` existente

### Paso 5 — Iteración
Jampier ajusta, re-deploy a `dev`, volvemos a probar. Iteramos 1-3 veces.

### Paso 6 — Merge
PR `dev → main`, Héctor aprueba, merge sin borrar rama, deploy a prod.

---

## 🔗 Notas relacionadas
- [[Pendientes GrowthSuite]]
- [[Pendientes - Features divididos por dominio (Ventas, Costos, Operacion)]]
- `knowledge/decisions/2026-04-07-customer-unification-merge-boundary.md`
- `projects/growthsuite/current-state.md`
- `USER.md` (reglas del usuario: no push sin permiso, no `--delete-branch`, naming `hector_dev/*`)
