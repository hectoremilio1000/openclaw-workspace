# 📋 Pendientes GrowthSuite

> Última actualización: 2026-04-07

---

## 🖥️ POS Admin todo-en-uno (modo solo-operador)

**Status:** Idea / decisión de producto pendiente
**Origen:** Héctor — muchos restaurantes pequeños los opera **una sola persona con una laptop**. Hoy tendría que abrir 3-4 apps distintas (Admin + Comandero + Caja + Monitor + Reservaciones). Eso no escala para el segmento chico.

**Idea base:** Que **Pos Admin** sea capaz de hostear, dentro de la misma app, las interfaces de:
- Comandero (tomar pedidos en mesa)
- Caja (cobrar, cortar)
- Monitor de cocina (KDS)
- Reservaciones (hostess / capitán)

Así un operador solo abre **Admin**, y desde un menú lateral o pestañas cambia a la vista que necesita en ese momento. Una computadora, una app, un login.

### Por qué tiene sentido
- **Restaurantes pequeños (1 persona):** taquerías, cafeterías, fondas, food trucks. No quieren 4 dispositivos ni 4 apps.
- **Onboarding más simple:** "abre admin y empieza", vs "empareja tu comandero, luego empareja tu caja, luego empareja tu monitor".
- **Costo de hardware bajo:** una laptop vieja basta.
- **No rompe nada para los grandes:** los que ya usan kiosk pairing para Comandero/Caja/Monitor en tablets siguen igual. Esto es una vista adicional, no un reemplazo.
- **Ya tenemos los componentes:** los fronts de comandero, caja y monitor existen. Hay que decidir si los importamos como módulos o los reusamos como iframes/microfrontends.

### Opciones de implementación (a decidir)
1. **Microfrontend / module federation:** Admin carga dinámicamente los bundles de comandero/caja/monitor. Más limpio, más trabajo de build.
2. **Monorepo + import directo:** mover los componentes de comandero/caja/monitor a un paquete compartido y montarlos dentro de Admin como rutas.
3. **Iframes:** la más rápida y fea. Cada front sigue siendo independiente y Admin los embebe. Problemas de auth, eventos, performance.
4. **Reescribir vistas "lite" dentro de Admin:** versiones simplificadas pensadas para 1 operador, no para staff dedicado. Más control de UX, más mantenimiento.

**Mi voto inicial:** opción 2 (monorepo + import) para comandero/caja/monitor, porque ya viven en el mismo grupo de repos. Reservaciones puede ir como módulo nativo de Admin desde el principio.

### Reservaciones dentro de Admin
Dos sub-casos:
- **Modo hostess (puesto dedicado):** una compu en la entrada con Admin abierto en la vista de reservaciones, calendario del día, walk-ins, asignación de mesa. Puede ser una vista full-screen.
- **Modo capitán / dueño:** dentro del flujo de Admin normal, una sección para crear/editar/confirmar reservas, ver el día, mover mesas, marcar no-shows.

Las dos vistas comparten el mismo backend (`pos_reservaciones_api`), solo cambia el shell. Esto resuelve el caso de hostess sin tener que mantener una app separada.

### Qué hay que decidir
- [ ] ¿Modo todo-en-uno se activa por **plan** (ej. plan Starter), por **toggle** del dueño, o siempre disponible?
- [ ] ¿Permisos del operador solo? (probablemente un rol nuevo: "Operador solo" con todos los permisos relevantes)
- [ ] Técnica de integración: microfrontend vs monorepo vs iframe vs reescritura
- [ ] ¿Reservaciones en Admin reemplaza al front actual de reservaciones o convive?
- [ ] ¿Impresión de ticket en modo solo-operador? (la misma laptop debe imprimir comanda + ticket de cobro)
- [ ] Hardware mínimo soportado oficialmente
- [ ] ¿Hay que repensar pairing/kiosk para este modo? (probablemente NO se usa pairing, solo login normal)

### Conexión con la nota de dominios
- Comandero / Caja / Monitor / Reservaciones (modo hostess) → **OPERACIÓN**
- Reservaciones como herramienta de promover horarios bajos → **VENTAS**
- Esta consolidación no crea un nuevo dominio, solo reempaqueta varios features de OPERACIÓN en un shell unificado para un segmento específico.

### Referencias
- [[Pendientes - Features divididos por dominio (Ventas, Costos, Operacion)]]
- TOOLS.md → fronts de admin / comandero / caja / monitor / reservaciones

---

## 🧩 Inventario como módulo aparte (revisar con Jampier)

**Status:** Idea / decisión arquitectónica pendiente
**Origen:** Conversación con Jampier — él propone que Inventario viva como **módulo separado** del POS core, no embebido.

**Mi postura inicial:** **Tiene razón, sí va aparte.** Pero hay que aterrizar el cómo antes de mover código.

### Por qué sí debería ir aparte
- **Dominio distinto:** Inventario es COSTOS, el POS core es OPERACIÓN/VENTAS (ver nota de división por dominios). Mezclarlo ensucia ambos.
- **Ciclo de vida diferente:** El POS se usa cada minuto del servicio; inventario se usa 1-2 veces al día (entrada de mercancía, conteo, cierre). No tienen por qué compartir deploy.
- **Equipo distinto:** Quien hace inventario (almacenista, chef) no es quien usa el comandero (mesero). Permisos y UX divergen.
- **Schema pesado:** Recetas, BOM, mermas, conteos, lotes, caducidades, proveedores, órdenes de compra → es un mundo entero. No debe contaminar el schema de orders/cash.
- **Ya está separado a nivel API:** `pos_inventory_api` ya vive en su propio Railway service. Falta consolidar la separación a nivel datos, fronts y dominio.

### Cómo hacerlo (a revisar)
1. **Backend:** `pos_inventory_api` ya existe → confirmar que NO comparta tablas con `pos_order_api` salvo por FKs read-only (ej. `product_id`).
2. **Schema:** decidir si vive en el mismo PostgreSQL con prefijo (`inv_*`) o en su propia DB. Empezar con prefijo + schema separado de Postgres (`CREATE SCHEMA inventory`) — más limpio y permite extracción futura.
3. **Frontend:** ¿front propio (`pos-front-inventory.vercel.app`) o módulo dentro del Admin? Mi voto: **front propio** para el día a día del almacenista, + vista resumen embebida en Admin para el dueño.
4. **Auth:** reusar `pos_auth_api`, pero con roles específicos (Almacenista, Chef de compras, Auditor de inventario).
5. **Eventos cruzados:** definir contrato de eventos POS → Inventario:
   - `order.completed` → descontar receta del stock
   - `void.applied` → revertir descuento
   - `stock.low` → alerta al chef
   Hacerlo vía cola (Redis/BullMQ) o webhooks internos, NO joins SQL directos.
6. **Costo unitario:** decidir método (PEPS, promedio ponderado, último costo). Esto define toda la matemática del food cost.
7. **Recetas (BOM):** ¿viven en Inventario o en Productos del POS? Mi voto: **en Inventario**, y el POS solo tiene `product_id`. La receta es un detalle de costos, no de venta.

### Lo que hay que decidir con Jampier
- [ ] ¿DB separada o schema separado en la misma DB?
- [ ] ¿Front propio o módulo dentro de Admin?
- [ ] ¿Recetas viven en Inventario o en Productos?
- [ ] ¿Método de costeo? (PEPS / promedio / último)
- [ ] ¿Cómo manejamos sincronización de stock en tiempo real con caja/comandero?
- [ ] ¿Qué hacemos con `pos-inventory-api-production-bba3`? Está usando una URL rara — confirmar que es el bueno y limpiar el viejo.
- [ ] ¿Multi-almacén desde el día 1 o lo dejamos para v2?

### Conexión con la nota de dominios
Esto encaja perfecto con la división **Ventas / Costos / Operación**: inventario **es** el módulo principal del dominio COSTOS. Si lo metemos al POS, rompemos la separación que estamos proponiendo.

### Referencias
- [[Pendientes - Features divididos por dominio (Ventas, Costos, Operacion)]]
- TOOLS.md → `pos-inventory-api-production-bba3.up.railway.app`
- TOOLS.md → `pos-inventory-api-dev.up.railway.app`

---

## 🔴 Urgente

### Roles por restaurante (Opción B)
**Status:** Quick fix deployado (PR #51), rediseño pendiente

**Problema:** Los roles son globales (`restaurant_id = null`). Todos los restaurantes ven los 11 roles incluyendo Churrasqueiro, Jefe de Barra, etc. Un taquero ve "Churrasqueiro" — no tiene sentido.

**Fix temporal (ya hecho):**
- Churrasqueiro movido a `restaurant_id = 40` (Fogo) en prod y dev
- Backend filtrado: `GET /api/roles` ahora devuelve globales + custom del restaurante
- PR #51 pendiente de merge a dev → main

**Rediseño pendiente (Opción B):**
1. Al crear restaurante → clonar 7 roles estándar (Dueño, Gerente, Capitán, Chef, Mesero, Cajero, Hostess) con `restaurant_id = N`
2. `GET /api/roles` filtra por `restaurant_id` del usuario
3. El dueño puede crear roles custom desde Permisos (ya existe con `base_role_id`)
4. Templates por tipo de negocio (Opción C) para multi-vertical futuro

**Opciones descartadas:**
- Opción A (is_default flag): No escala, sigue siendo global
- Frontend filter: Esconde para todos incluyendo Fogo

**Contexto técnico:**
```ts
// Fix actual en roles_controller.ts
const query = Role.query()
  .where(q => {
    q.whereNull('restaurant_id')
      .orWhere('restaurant_id', user.restaurantId)
  })
  .orderBy('level', 'desc')
```

```sql
-- DB changes ya aplicados
-- Prod: UPDATE roles SET restaurant_id = 40 WHERE code = 'churrasqueiro'
-- Dev:  UPDATE roles SET restaurant_id = 9  WHERE code = 'churrasqueiro'
```

---

### devJampier55 — Unificación de clientes (NO MERGEAR AÚN)
**Status:** Code review completado, 8 issues encontrados

**Issues críticos:**
1. 🔴 `coupon_redemptions` tabla no existe en prod → endpoints de cupones dan 500
2. 🔴 Migraciones duplicadas de coupons (009 vs 012) → conflictos
3. 🟡 Modelo Customer incompleto (sin campos fiscales)
4. 🟡 DELETE customer falla con RESTRICT FK
5. 🟢 Customer duplicado inline en reservation model
6. 🟡 snake_case vs camelCase en respuestas de guests
7. 🟢 Race condition en stats de customer
8. 🟡 Falta unique por tax_id para dedup fiscal

**Acción:** Comunicar a Jampier los issues 1 y 2 para que los corrija antes de mergear.

---

## 🟡 Próximos

- [ ] Mergear PR #51 (roles filter) a dev → main
- [ ] Configurar Finca Robles completo (usuarios, menú, etc.)
- [ ] Resolver issues de devJampier55 con Jampier
- [ ] Rediseño completo de roles (Opción B) cuando haya tiempo

---

## Links
- [[00 - Mapa de Vision]]
- [[GrowthSuite - 3 Pilares Reconstruidos]]
