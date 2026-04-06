# GrowthSuite POS — Sistema de Roles y Permisos v2

> Documento de diseño validado con el dueño del producto. Basado en AWS IAM, Google Cloud IAM, GitHub Organizations, Auth0 RBAC, SoftRestaurant, y decisiones del wizard del 28 de febrero de 2026.

---

## 1. Principios de diseño (tomados de los grandes)

| Fuente | Lo que tomamos |
|---|---|
| **AWS IAM** | Permisos atómicos `recurso.acción`, conditions/limits (descuento ≤ 30%) |
| **Google Cloud IAM** | Roles predefinidos + custom, roles por organización (restaurante) |
| **GitHub Orgs** | Vista diferenciada por rol — lo que no necesitas, no lo ves |
| **Auth0 RBAC** | Roles por restaurante (multi-tenant), least privilege |
| **SoftRestaurant** | Descuento máximo por perfil, autorización temporal con PIN, CRUD por catálogo |

**Principio clave:** los permisos son defaults que vienen configurados, pero **el owner puede reconfigurar todo** desde Settings → Permisos sin tocar código.

---

## 2. Estado actual

```
roles: 7 fijos con level (waiter=1, cashier=2, captain=7, manager=8, owner=9, admin=10, superadmin=99)
permissions: 3 definidos (ORDER_CREATE, DISCOUNT_APPLY, PAYMENT_CHARGE) — NINGUNO asignado
role_permissions: VACÍA
catalog_permissions: VACÍA
role_payment_methods: VACÍA

Problema: todo se controla con if (level >= X). No hay granularidad real.
```

---

## 3. Modelo de datos

### 3.1 Tablas existentes — cambios

```sql
-- roles: agregar restaurant_id para roles custom
ALTER TABLE roles ADD COLUMN restaurant_id INTEGER REFERENCES restaurants(id);
-- restaurant_id = NULL → rol del sistema (global)
-- restaurant_id = 5   → rol custom de ese restaurante

-- permissions: agregar value_type y category
ALTER TABLE permissions ADD COLUMN value_type VARCHAR(20) DEFAULT 'boolean';
ALTER TABLE permissions ADD COLUMN category VARCHAR(50);
-- value_type: 'boolean' | 'number' | 'scope'

-- role_permissions: agregar max_value, scope_value, config y restaurant_id
ALTER TABLE role_permissions ADD COLUMN max_value NUMERIC;
ALTER TABLE role_permissions ADD COLUMN scope_value VARCHAR(20);
ALTER TABLE role_permissions ADD COLUMN config JSONB DEFAULT '{}';
ALTER TABLE role_permissions ADD COLUMN restaurant_id INTEGER REFERENCES restaurants(id);
-- restaurant_id = NULL → default global para ese rol
-- restaurant_id = 5   → override del owner de ese restaurante

-- users: agregar authorization_pin para el owner
ALTER TABLE users ADD COLUMN authorization_pin VARCHAR(10);
-- Solo el owner lo usa. Es diferente al PIN de login (ese ya existe).
```

### 3.2 Tablas nuevas

```sql
-- Módulos visibles por rol (controla UI del admin)
CREATE TABLE role_modules (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  module_code VARCHAR(50) NOT NULL,
  access_level VARCHAR(20) DEFAULT 'none', -- 'full', 'readonly', 'none'
  restaurant_id INTEGER REFERENCES restaurants(id), -- NULL = default, con valor = override
  UNIQUE (role_id, module_code, restaurant_id)
);

-- Log de autorizaciones temporales
CREATE TABLE authorization_logs (
  id SERIAL PRIMARY KEY,
  restaurant_id INTEGER NOT NULL REFERENCES restaurants(id),
  requested_by INTEGER NOT NULL REFERENCES users(id),
  authorized_by INTEGER NOT NULL REFERENCES users(id),
  permission_code VARCHAR(100) NOT NULL,
  context JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3.3 Cómo funciona el override por restaurante

```
role_permissions:
  role_id=captain, perm=discounts.apply, max_value=30, restaurant_id=NULL  ← DEFAULT (todos)
  role_id=captain, perm=discounts.apply, max_value=50, restaurant_id=5    ← La Llorona override

Query para saber el permiso del capitán en restaurante 5:
  SELECT * FROM role_permissions
  WHERE role_id = captain AND perm_code = 'discounts.apply'
    AND (restaurant_id IS NULL OR restaurant_id = 5)
  ORDER BY restaurant_id NULLS LAST  -- override gana sobre default
  LIMIT 1;
```

---

## 4. Permisos definidos (~32)

| Código | Descripción | Tipo | Categoría |
|---|---|---|---|
| `orders.create` | Crear órdenes/cuentas | boolean | orders |
| `orders.view` | Ver órdenes | scope (own/shift/all) | orders |
| `orders.cancel` | Cancelar productos | boolean | orders |
| `orders.void` | Anular cuenta completa | boolean | orders |
| `orders.reopen` | Reabrir cuenta cerrada | boolean | orders |
| `orders.transfer` | Cambiar mesa | boolean | orders |
| `orders.move_items` | Mover productos entre cuentas | boolean | orders |
| `orders.split` | Dividir cuenta | boolean | orders |
| `orders.merge` | Juntar cuentas | boolean | orders |
| `discounts.apply` | Aplicar descuento | number (max %) | discounts |
| `discounts.courtesy` | Aplicar cortesía (100%) | boolean | discounts |
| `cash.charge` | Cobrar cuentas | boolean | cash |
| `cash.open_shift` | Abrir turno | boolean | cash |
| `cash.close_shift` | Cerrar turno | boolean | cash |
| `cash.withdraw` | Retiro de caja | boolean | cash |
| `cash.deposit` | Depósito a caja | boolean | cash |
| `cash.open_drawer` | Abrir cajón | boolean | cash |
| `cash.reprint` | Reimprimir ticket | boolean | cash |
| `cash.corte_x` | Ver Corte X | boolean | cash |
| `products.view` | Ver catálogo | boolean | products |
| `products.create` | Crear productos | boolean | products |
| `products.edit` | Editar productos | boolean | products |
| `products.delete` | Eliminar productos | boolean | products |
| `products.suspend` | Suspender (86) | boolean | products |
| `users.view` | Ver lista de empleados | boolean | users |
| `users.manage` | Crear/editar/eliminar empleados | boolean | users |
| `users.assign_roles` | Asignar roles | boolean | users |
| `reports.sales` | Reportes de ventas | boolean | reports |
| `reports.cash` | Reportes de caja | boolean | reports |
| `reports.inventory` | Reportes de inventario | boolean | reports |
| `reports.financial` | Reportes financieros | boolean | reports |
| `inventory.view` | Ver inventario | boolean | inventory |
| `inventory.manage` | Movimientos, compras, conteos | boolean | inventory |
| `settings.view` | Ver configuración | boolean | system |
| `settings.manage` | Modificar configuración | boolean | system |
| `authorize.others` | Autorizar acciones de otros (PIN) | boolean | system |

---

## 5. Matriz de permisos por rol (defaults validados)

> Estos son los defaults al crear un restaurante. El owner los puede cambiar desde Settings → Permisos.

| Permiso | Mesero | Cajero | Capitán | Gerente | Owner |
|---|---|---|---|---|---|
| `orders.create` | ✅ | ✅ | ❌ | ✅ | ✅ |
| `orders.view` | **own** | **shift** | **all** | **all** | **all** |
| `orders.cancel` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `orders.void` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `orders.reopen` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `orders.transfer` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `orders.move_items` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `orders.split` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `orders.merge` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `discounts.apply` | **0%** | **0%** | **30%** | **100%** | **100%** |
| `discounts.courtesy` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `cash.charge` | ❌ | ✅ | ✅ | ✅ | ✅ |
| `cash.open_shift` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `cash.close_shift` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `cash.withdraw` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `cash.deposit` | ❌ | ❌ | ✅ | ✅ | ✅ |
| `cash.open_drawer` | ❌ | ✅ | ❌ | ✅ | ✅ |
| `cash.reprint` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `cash.corte_x` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `products.view` | ✅ | ✅ | ✅ | ✅ | ✅ |
| `products.create` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `products.edit` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `products.delete` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `products.suspend` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `users.view` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `users.manage` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `users.assign_roles` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `reports.sales` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `reports.cash` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `reports.inventory` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `reports.financial` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `inventory.view` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `inventory.manage` | ❌ | ❌ | ❌ | ✅ | ✅ |
| `settings.view` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `settings.manage` | ❌ | ❌ | ❌ | ❌ | ✅ |
| `authorize.others` | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 6. Acceso a frontends por rol

| Rol | Admin | Comandero | Caja | Monitor |
|---|---|---|---|---|
| Mesero | ❌ | ✅ (crea cuentas, toma órdenes) | ❌ | ❌ |
| Cajero | ❌ | ❌ | ✅ (cobra, abre/cierra turno) | ❌ |
| Capitán | ✅ (3 secciones) | ✅ (ve todo, no crea cuentas) | ❌ | ❌ |
| Gerente | ✅ (10 secciones) | ✅ | ✅ | ✅ |
| Owner | ✅ (todo) | ✅ | ✅ | ✅ |

### Módulos del admin por rol

| Módulo | Capitán | Gerente | Owner |
|---|---|---|---|
| Dashboard ventas | ✅ readonly | ✅ full | ✅ full |
| Consulta de cuentas | ✅ readonly | ✅ full | ✅ full |
| Turnos/cortes | ❌ | ✅ full | ✅ full |
| Productos | ❌ | ✅ full | ✅ full |
| Empleados | ❌ | ✅ full | ✅ full |
| Áreas y mesas | ❌ | ✅ full | ✅ full |
| Inventario | ❌ | ✅ full | ✅ full |
| Reportes ventas | ❌ | ✅ full | ✅ full |
| Reportes caja | ❌ | ✅ full | ✅ full |
| Reportes financieros | ❌ | ✅ full | ✅ full |
| Reservaciones | ✅ full | ✅ full | ✅ full |
| Settings → Permisos | ❌ | ❌ | ✅ full |
| Bot WhatsApp | ❌ | ❌ | ✅ full |
| Website | ❌ | ❌ | ✅ full |

---

## 7. Autorización temporal con PIN

### Quién autoriza
**Solo el owner.** El owner tiene un `authorization_pin` (6 dígitos) además de su email/password.

### Cuándo se activa
Cuando alguien intenta una acción que NO tiene permiso:
- Mesero quiere cancelar → modal pide PIN del owner
- Capitán quiere descuento > 30% → modal pide PIN del owner
- Cualquiera intenta algo fuera de su rol → modal pide PIN del owner

### Flujo
```
1. Usuario intenta acción sin permiso
2. Frontend muestra modal: "Autorización requerida — PIN del dueño"
3. Owner ingresa su PIN de 6 dígitos
4. Frontend → POST /api/authorize
   { "pin": "123456", "permission": "orders.cancel", "context": {...} }
5. Backend valida PIN + que ese usuario tenga authorize.others + el permiso
6. Si OK → EJECUTA la acción (no da permiso temporal, solo ejecuta esa vez)
7. Guarda en authorization_logs (quién pidió, quién autorizó, qué acción)
```

### Una autorización = una acción
No hay permisos temporales. Cada cancelación, cada descuento fuera de rango, requiere su propio PIN.

### Log visible
El owner ve el historial en admin: "Hoy hubo 5 autorizaciones — 3 cancelaciones, 2 descuentos."

---

## 8. Bot de WhatsApp

El bot **solo responde al owner**. No checa permisos de otros roles porque nadie más lo usa.

---

## 9. Configuración de permisos por el owner

### Ubicación
Admin → Settings → Permisos

### Lo que puede hacer
- Ver los roles con sus permisos actuales (toggles y sliders)
- Cambiar permisos de roles del sistema (ej: poner capitán a 50% de descuento)
- Cambiar qué módulos ve cada rol en admin
- Crear roles custom nuevos (clonar de uno existente + ajustar)

### Multi-tenant
Los cambios que hace el owner de La Llorona solo aplican a La Llorona. Los demás restaurantes mantienen sus defaults o sus propios overrides.

---

## 10. Plan de implementación

### Fase 1: Permisos en la BD (semana 1)
- Migración: `restaurant_id` en `roles`, `value_type`/`category` en `permissions`, `max_value`/`scope_value`/`restaurant_id` en `role_permissions`
- Seed: poblar 32 permisos + role_permissions defaults
- Migración: `authorization_pin` en `users`
- Migración: crear tabla `role_modules` + seed defaults
- Endpoint `GET /api/me` devuelve permisos + módulos del usuario

### Fase 2: Permisos en el backend (semana 2)
- Middleware `checkPermission('orders.cancel')` en auth API
- Validar descuento ≤ max_value en order API
- Validar cancelación solo con permiso en order API
- Proteger todos los endpoints sensibles

### Fase 3: Vista diferenciada (semana 3)
- Sidebar dinámico en pos_admin basado en `modules` de `/api/me`
- Capitán: ve dashboard (readonly), cuentas (readonly), reservaciones
- Gerente: ve 10 secciones
- Capitán en comandero: ve todas las cuentas pero no crea
- Hook `usePermissions()` → `can()`, `maxValue()`, `modules`

### Fase 4: Autorización con PIN (semana 4)
- Endpoint `POST /api/authorize` (valida PIN, ejecuta acción, loguea)
- Crear tabla `authorization_logs`
- Modal de autorización en comandero y caja
- Vista del historial de autorizaciones en admin

### Fase 5: Settings → Permisos (semana 5)
- UI en admin: Settings → Permisos
- Lista de roles con toggles (boolean) y sliders (descuento %)
- Selector de módulos visibles por rol
- Override guardado con `restaurant_id` en `role_permissions` y `role_modules`
- Crear rol custom: nombre + clonar de base + ajustar permisos

---

## Decisiones del wizard (28 feb 2026)

| Pregunta | Decisión |
|---|---|
| Roles multi-restaurante por usuario | No. Un usuario tiene un rol en un restaurante. |
| Capitán crea cuentas | No. Solo supervisa. |
| Capitán cobra | Sí. |
| Capitán descuento max | 30% (default, owner puede cambiar) |
| Capitán cancela | No. Solo el owner (o gerente con permiso). |
| Capitán divide cuentas | No. Muy delicado. |
| Capitán junta cuentas | No. Igual de delicado que dividir. |
| Mesero divide cuentas | No. Pide al capitán (que tampoco puede — solo owner). |
| Cajero entra a admin | No. Solo pos_cash. |
| Cajero descuentos | No. 0%. |
| Cajero retiros/depósitos | No. Solo cobra, abre/cierra turno, abre cajón. |
| Gerente anula cuentas | No. Solo owner. |
| Gerente config restaurante | No. Solo owner. |
| Formas de pago por rol | No. Todos los que cobran usan todas. |
| Quién autoriza con PIN | Solo el owner. |
| PIN de autorización | Separado (authorization_pin en users). Owner usa PIN para autorizar en tablets, email/password para admin. |
| Owner puede editar roles del sistema | Sí. Los permisos se overridean por restaurante. |
| Bot respeta permisos | No. Solo el owner lo usa. |
| Log de autorizaciones visible | Sí. En admin. |
| Roles custom desde inicio | Sí. Al crear restaurante se seedean con defaults. Owner ajusta desde Settings. |

---

_Documento v2 — 28 de febrero de 2026_
