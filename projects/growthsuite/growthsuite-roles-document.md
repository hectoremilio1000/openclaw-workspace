# GrowthSuite POS — Sistema de Roles y Permisos

## Arquitectura

El sistema implementa **RBAC granular** (Role-Based Access Control) con:

- **36 permisos** organizados en 8 categorías
- **14 módulos** del panel de administración
- **Permisos configurables por restaurante** — el dueño puede personalizar permisos desde Settings → Permisos sin tocar código
- **Autorización por PIN** — acciones sensibles requieren PIN del dueño (one-time, per-action)
- **Multi-tenant** — cada restaurante puede tener overrides independientes

---

## Roles del Sistema

| Rol | Nivel | Descripción | Admin | Comandero | Caja |
|-----|-------|-------------|-------|-----------|------|
| **Super Admin** | 99 | Soporte técnico / plataforma | ✅ | ✅ | ✅ |
| **Admin** | 10 | Administrador de plataforma | ✅ | ✅ | ✅ |
| **Dueño (Owner)** | 9 | Dueño del restaurante — acceso total, puede autorizar con PIN | ✅ Todo | ✅ | ✅ |
| **Gerente (Manager)** | 8 | Gestión operativa completa excepto configuración y website | ✅ 11 módulos | ✅ | ✅ |
| **Capitán (Captain)** | 7 | Supervisión de piso — cobrar, descuentos hasta 30%, transferir mesas | ✅ 3 módulos | ✅ | ❌ |
| **Chef** | 3 | Cocina — inventario, productos (solo ver), consulta cuentas | ✅ 4 módulos | ❌ | ❌ |
| **Cajero (Cashier)** | 2 | Operación de caja — cobrar, turnos, cajón | ❌ | ❌ | ✅ |
| **Marketing** | 2 | Solo reservaciones | ✅ 2 módulos | ❌ | ❌ |
| **Mesero (Waiter)** | 1 | Crear órdenes, ver propias, ver productos | ❌ | ✅ | ❌ |

---

## Permisos por Rol (Detalle)

### 🔑 Dueño (Owner) — 36/36 permisos

**Caja:** open_shift, close_shift, corte_x, charge, deposit, withdraw, open_drawer, reprint
**Descuentos:** apply (hasta 100%), courtesy
**Inventario:** view, manage
**Órdenes:** create, view (todas), cancel, void, reopen, split, merge, transfer, move_items
**Productos:** view, create, edit, delete, suspend
**Reportes:** sales, cash, financial, inventory
**Configuración:** view, manage
**Usuarios:** view, manage, assign_roles
**Especial:** authorize.others (puede autorizar con PIN)

### 👔 Gerente (Manager) — 26 permisos

Todo lo del dueño EXCEPTO:
- ❌ settings (ver/administrar)
- ❌ users.manage, users.assign_roles
- ❌ orders.split, orders.merge, orders.reopen, orders.void
- ❌ products.delete
- ❌ authorize.others

### 🎖️ Capitán (Captain) — 7 permisos

- cash.charge, cash.deposit, cash.withdraw
- discounts.apply (máximo **30%**)
- orders.view (todas), orders.transfer
- products.view

### 👨‍🍳 Chef — 6 permisos

- inventory.view, inventory.manage
- orders.view (turno actual)
- products.view, products.suspend
- reports.inventory

### 💰 Cajero (Cashier) — 8 permisos

- cash.open_shift, cash.close_shift, cash.charge, cash.open_drawer
- orders.create, orders.view (turno actual)
- products.view

**Sin:** descuentos, retiros, depósitos, reimpresión, cancelaciones

### 📣 Marketing — 1 permiso

- orders.view (turno actual)

**Solo accede a:** Dashboard (readonly) + Reservaciones

### 🍽️ Mesero (Waiter) — 3 permisos

- orders.create, orders.view (solo propias)
- products.view

---

## Módulos del Panel Admin

| Módulo | Owner | Manager | Captain | Chef | Marketing | Cashier | Waiter |
|--------|-------|---------|---------|------|-----------|---------|--------|
| Dashboard | full | full | readonly | readonly | readonly | ❌ | ❌ |
| Reportes Ventas | full | full | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reportes Caja | full | full | ❌ | ❌ | ❌ | ❌ | ❌ |
| Reportes Financieros | full | full | ❌ | ❌ | ❌ | ❌ | ❌ |
| Áreas y Mesas | full | full | ❌ | ❌ | ❌ | ❌ | ❌ |
| Usuarios | full | full | ❌ | ❌ | ❌ | ❌ | ❌ |
| Configuración | full | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Consulta Cuentas | full | full | readonly | readonly | ❌ | ❌ | ❌ |
| Reservaciones | full | full | full | ❌ | full | ❌ | ❌ |
| Website | full | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Productos/Catálogo | full | full | ❌ | readonly | ❌ | ❌ | ❌ |
| Inventario | full | full | ❌ | full | ❌ | ❌ | ❌ |
| Turnos | full | full | ❌ | ❌ | ❌ | ❌ | ❌ |
| Bot WhatsApp | full | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

---

## Enforcement (Dónde se aplican)

### Panel Admin (pos_admin_front)
- Sidebar dinámico por módulos asignados al rol
- Roles sin módulos ven mensaje "No tienes permisos para entrar" (ej: cajero, mesero)

### Comandero (pos_comandero_front)
- Descuentos limitados al `max_value` del permiso `discounts.apply`
- Cancelar productos requiere permiso `orders.cancel` (si no, pide autorización PIN del dueño)
- Reabrir cuentas requiere `orders.reopen`

### Caja (pos_cash_front)
- Movimientos de efectivo gateados por `cash.deposit` / `cash.withdraw`
- Corte X requiere `cash.corte_x`
- Cerrar turno requiere `cash.close_shift`

### Backend (pos_auth_api)
- Login de kiosk valida rol permitido por tipo de dispositivo
- Endpoint `/api/authorize` valida PIN del dueño para acciones sensibles
- Permisos se cargan en JWT del kiosk login

---

## Personalización (Settings → Permisos)

El dueño puede desde el panel:
1. Seleccionar cualquier rol
2. Habilitar/deshabilitar permisos individuales
3. Ajustar valores máximos (ej: descuento del capitán de 30% a 50%)
4. Agregar/quitar módulos del admin
5. Los cambios son **por restaurante** — no afectan a otros restaurantes

---

## Tablas de Base de Datos

```
roles                    — id, name, code, level, restaurant_id (NULL = sistema)
permissions              — code, category, name, description, value_type
role_permissions         — role_id, perm_code, allowed, max_value, scope_value, restaurant_id
role_modules             — role_id, module_code, access_level
authorization_logs       — user_id, authorizer_id, permission, context, restaurant_id
users.authorization_pin  — PIN hasheado para autorizar acciones
```

---

## Migraciones

```
1772350000001_extend_roles_table
1772350000002_extend_permissions_table
1772350000003_extend_role_permissions_table
1772350000004_add_authorization_pin_to_users
1772350000005_create_role_modules_table
1772350000006_create_authorization_logs_table
1772350000007_fix_role_permissions_pk
```

Seed de datos: 36 permisos, 8 roles, defaults por rol, módulos por rol.
