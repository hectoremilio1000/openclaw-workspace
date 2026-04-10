# GrowthSuite One — Shell Unificado

> **Proposito:** Definir como se ve y funciona GrowthSuite como un solo producto operativo.
> **Principio:** Un restaurante opera desde UNA sola app, no desde 4.
> **Version:** v1.0 — 2026-04-09
> **Estado:** PROPUESTA — validar con Hector antes de implementar

---

## 1. Vision

**Hoy:** 4 apps separadas (Admin, Comandero, Caja, Monitor)
**Manana:** 1 app con 5 workspaces internos

El usuario abre GrowthSuite. No piensa "cual app abro".
Piensa "que necesito hacer" y el sistema lo lleva ahi.

---

## 2. Inspiracion: lo mejor de Soft Restaurant + lo mejor de GrowthSuite

### De Soft Restaurant tomamos:
- Todo en un solo lugar
- Barra de acceso rapido a operaciones criticas (F7 Comedor, F8 Domicilio, etc)
- Ver cuentas abiertas + detalle de orden en la misma pantalla
- No hay que "saltar" entre apps para operar

### De GrowthSuite conservamos:
- UI moderna, responsive, web-first
- Dashboard con KPIs en tiempo real
- Sidebar con navegacion clara por modulos
- Roles y permisos por usuario
- Cerebro/IA integrado

### Lo que NO copiamos de Soft Restaurant:
- Estetica Windows legacy
- Dependencia de instalacion local
- Ausencia de responsividad (no funciona en tablet)

---

## 3. Arquitectura del Shell

```
┌─────────────────────────────────────────────────────────────┐
│  HEADER: Logo + Restaurante + Usuario + Rol + Notificaciones│
├──────┬──────────────────────────────────────────────────────┤
│      │                                                      │
│  D   │                                                      │
│  O   │              WORKSPACE ACTIVO                        │
│  C   │                                                      │
│  K   │     (cambia segun el modo seleccionado)              │
│      │                                                      │
│  L   │                                                      │
│  A   │                                                      │
│  T   │                                                      │
│  E   │                                                      │
│  R   │                                                      │
│  A   │                                                      │
│  L   │                                                      │
│      │                                                      │
├──────┴──────────────────────────────────────────────────────┤
│  BARRA RAPIDA: [+ Orden] [Cobrar] [Inventario] [Cerebro]   │
└─────────────────────────────────────────────────────────────┘
```

---

## 4. Los 5 Workspaces

### 🟢 OPERACION (Piso)
**Quien lo usa:** Mesero, Capitan, Hostess
**Que ve:**
- Mapa de mesas (areas: salon, terraza, barra)
- Estado de cada mesa (libre, ocupada, por cobrar, reservada)
- Click en mesa → abrir cuenta → agregar productos
- Lista de cuentas abiertas (como Soft Restaurant)
- Detalle de orden activa

**Acciones principales:**
- Abrir cuenta/mesa
- Tomar pedido (buscar producto, agregar, modificar)
- Enviar comanda a cocina
- Transferir mesa
- Juntar/separar cuentas

### 🔵 CAJA
**Quien lo usa:** Cajero
**Que ve:**
- Cuentas listas para cobrar
- Metodos de pago (efectivo, tarjeta, mixto)
- Propina
- Facturacion rapida
- Corte X / Corte Z
- Historial de movimientos del turno

**Acciones principales:**
- Cobrar cuenta
- Aplicar descuento (con autorizacion)
- Abrir/cerrar turno
- Retiro/deposito
- Imprimir ticket

### 🟡 INVENTARIO
**Quien lo usa:** Chef, Encargado de almacen, Dueno
**Que ve:**
- Dashboard de stock (niveles criticos arriba)
- Insumos por grupo
- Conteo fisico guiado
- Ordenes de compra pendientes
- Recetas enlazadas a productos

**Acciones principales:**
- Hacer conteo fisico (wizard)
- Crear insumo nuevo (wizard)
- Crear producto con receta (wizard)
- Generar pedido a proveedor
- Ver merma / desperdicios

### ⚙️ ADMIN
**Quien lo usa:** Dueno, Gerente
**Que ve:**
- Dashboard KPIs (lo que hoy es el Admin)
- Reportes (ventas, meseros, productos, cancelaciones)
- Catalogo (categorias, grupos, productos, modificadores)
- Usuarios y roles
- Configuracion del restaurante
- Reservaciones

**Acciones principales:**
- Ver reportes
- Editar catalogo
- Gestionar usuarios
- Configurar areas/mesas/impresoras
- Ver reservaciones

### 🧠 CEREBRO
**Quien lo usa:** Dueno, Gerente
**Que ve:**
- Feed de alertas y diagnosticos
- Briefing del dia
- Anomalias detectadas
- Sugerencias de accion
- Historial de interacciones
- Chat con el cerebro (como WhatsApp pero dentro del admin)

**Acciones principales:**
- Leer briefing
- Actuar sobre alertas
- Preguntar al cerebro
- Ver impacto de acciones pasadas

---

## 5. Dock Lateral (siempre visible)

```
┌──────┐
│  🏠  │  Home / Resumen del dia
├──────┤
│  🍽️  │  Operacion (Piso)
├──────┤
│  💰  │  Caja
├──────┤
│  📦  │  Inventario
├──────┤
│  ⚙️  │  Admin
├──────┤
│  🧠  │  Cerebro
├──────┤
│      │
│      │
├──────┤
│  👤  │  Perfil / Cerrar sesion
└──────┘
```

**Comportamiento:**
- Siempre visible (colapsado a iconos en tablet, expandido en desktop)
- El workspace activo se resalta
- Badge de notificacion en Cerebro cuando hay alertas
- Badge en Operacion cuando hay mesas por atender
- Badge en Caja cuando hay cuentas por cobrar

---

## 6. Home — "Hoy en tu restaurante"

La primera pantalla al abrir GrowthSuite. NO es solo un dashboard de numeros.
Es un **centro de mando operativo**.

```
┌─────────────────────────────────────────────────────────────┐
│  🏠 HOY EN TU RESTAURANTE           Jueves 10 Abril 2026   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐           │
│  │ Ventas hoy  │ │ Mesas       │ │ Ticket      │           │
│  │ $45,200     │ │ 8 abiertas  │ │ promedio    │           │
│  │ +12% vs mar │ │ 3 por cobrar│ │ $680        │           │
│  └─────────────┘ └─────────────┘ └─────────────┘           │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ ⚡ ACCIONES RAPIDAS                                  │   │
│  │                                                      │   │
│  │  [🍽️ Tomar orden]  [💰 Cobrar]  [📦 Hacer conteo]  │   │
│  │  [➕ Nuevo producto] [📋 Reporte] [🧠 Pregunta]     │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
│  ┌─────────────────────────┐ ┌──────────────────────────┐   │
│  │ 🧠 CEREBRO DICE:        │ │ 📅 PROXIMAS HORAS       │   │
│  │                         │ │                          │   │
│  │ ⚠️ Descuentos 78%      │ │ 14:00 Reserva 6 pax     │   │
│  │    arriba de lo normal  │ │ 15:00 Grupo 12 pax      │   │
│  │                         │ │ 16:00 Cierre turno 1    │   │
│  │ 📦 Stock camaron bajo  │ │                          │   │
│  │    al 20%, pedir hoy   │ │                          │   │
│  │                         │ │                          │   │
│  │ ✅ Ventas van bien      │ │                          │   │
│  │    12% arriba del martes│ │                          │   │
│  │    promedio             │ │                          │   │
│  └─────────────────────────┘ └──────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ 👥 EQUIPO EN TURNO                                   │   │
│  │ Meseros: Carlos, Ana, Pedro  │  Cajeros: Maria       │   │
│  │ Cocina: Chef Juan            │  Barra: Luis          │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 7. Modo Tablet vs Modo Estacion Fija

### Tablet (iPad / Android tablet)
- Dock lateral colapsado (solo iconos)
- Navegacion por gestos (swipe entre workspaces)
- Teclado numerico para cantidades
- Botones grandes, touch-friendly
- Un solo workspace visible a la vez
- **Restaurante chico:** una sola tablet rota entre modos
- **Restaurante grande:** cada tablet fija en un workspace

### Desktop / Estacion Fija
- Dock lateral expandido (iconos + texto)
- Sidebar de navegacion dentro del workspace
- Puede tener paneles side-by-side
- Keyboard shortcuts (como los F-keys de Soft Restaurant)
- **Estacion de caja:** workspace Caja por default
- **Estacion de cocina:** workspace Monitor por default
- **Oficina gerente:** workspace Admin/Cerebro por default

### Kiosk Mode (estacion dedicada)
- Se "bloquea" en un workspace
- No muestra el dock completo
- Solo el workspace asignado + Home
- PIN para cambiar de workspace
- Ejemplo: tablet de mesero solo ve Operacion

---

## 8. Como conviven los workspaces

### Flujo tipico: Servicio completo

```
MESERO                    CAJERO                    DUENO
  │                         │                         │
  ▼                         │                         │
🍽️ Operacion               │                         │
  │ Abre mesa 5             │                         │
  │ Toma pedido             │                         │
  │ Envia comanda           │                         │
  │ ...                     │                         │
  │ Cliente pide cuenta     │                         │
  │                         ▼                         │
  │                    💰 Caja                        │
  │                      │ Ve cuenta de mesa 5        │
  │                      │ Cobra: tarjeta + propina   │
  │                      │ Imprime ticket             │
  │                      │                            │
  │                      │                            ▼
  │                      │                    ⚙️ Admin / 🧠 Cerebro
  │                      │                      │ Ve ventas del dia
  │                      │                      │ Recibe alerta descuentos
  │                      │                      │ Revisa briefing
  │                      │                      │ Pide reporte meseros
  ▼                      ▼                      ▼
```

### Flujo tipico: Inventario

```
ENCARGADO                                    DUENO
  │                                            │
  ▼                                            │
📦 Inventario                                  │
  │ Entra a "Hacer conteo"                     │
  │ Selecciona almacen: Cocina                 │
  │ Cuenta insumo por insumo                   │
  │ Confirma diferencias                       │
  │ Aplica ajuste                              │
  │                                            ▼
  │                                    🧠 Cerebro
  │                                      │ Detecta faltante critico
  │                                      │ Sugiere pedido a proveedor
  │                                      │ Dueno confirma
  │                                      │ Se genera orden de compra
  ▼                                      ▼
```

---

## 9. Navegacion interna de cada workspace

### 🍽️ Operacion
```
Operacion/
├── Mapa de mesas (default)
├── Lista de cuentas abiertas
├── Cuenta activa (detalle + productos)
├── Buscar producto (para agregar a cuenta)
└── Delivery / Para llevar
```

### 💰 Caja
```
Caja/
├── Cuentas por cobrar (default)
├── Cobro activo (metodos, propina, factura)
├── Movimientos del turno
├── Corte X
├── Corte Z / Cierre de turno
└── Retiros y depositos
```

### 📦 Inventario
```
Inventario/
├── Dashboard de stock (default)
├── Insumos (lista, crear, editar)
├── Conteo fisico (wizard)
├── Ordenes de compra
├── Recetas
├── Proveedores
└── Merma / Desperdicios
```

### ⚙️ Admin
```
Admin/
├── Dashboard KPIs (default)
├── Reportes/
│   ├── Ventas
│   ├── Productos
│   ├── Meseros
│   ├── Cancelaciones
│   └── Descuentos
├── Catalogo/
│   ├── Categorias
│   ├── Grupos
│   ├── Productos
│   └── Modificadores
├── Usuarios y roles
├── Mesas y areas
├── Reservaciones
├── Configuracion
└── Pagina web
```

### 🧠 Cerebro
```
Cerebro/
├── Feed de hoy (default)
│   ├── Briefing del dia
│   ├── Alertas activas
│   └── Sugerencias
├── Chat (preguntale al cerebro)
├── Historial de acciones
├── Impacto (que cambio despues)
└── Configuracion de alertas
```

---

## 10. Permisos por rol

| Workspace | Dueno | Gerente | Cajero | Mesero | Chef | Hostess |
|-----------|-------|---------|--------|--------|------|---------|
| 🏠 Home | ✅ completo | ✅ completo | ✅ basico | ✅ basico | ✅ basico | ✅ basico |
| 🍽️ Operacion | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ |
| 💰 Caja | ✅ | ✅ | ✅ | ❌ | ❌ | ❌ |
| 📦 Inventario | ✅ | ✅ | ❌ | ❌ | ✅ conteos | ❌ |
| ⚙️ Admin | ✅ | ✅ parcial | ❌ | ❌ | ❌ | ❌ |
| 🧠 Cerebro | ✅ | ✅ parcial | ❌ | ❌ | ❌ | ❌ |

---

## 11. Que flujo entra primero

### Orden de implementacion sugerido:

**Fase 1 — Shell base + Home**
- Layout unificado con dock
- Home "Hoy en tu restaurante"
- Navegacion entre workspaces (aunque esten vacios)
- Login → detectar rol → mostrar workspaces permitidos

**Fase 2 — Operacion (lo mas critico)**
- Mapa de mesas
- Abrir cuenta
- Tomar pedido
- Enviar comanda
- Lista de cuentas abiertas

**Fase 3 — Caja**
- Cobro de cuenta
- Metodos de pago
- Corte X
- Abrir/cerrar turno

**Fase 4 — Admin (migrar lo existente)**
- Mover dashboard actual al workspace Admin
- Reportes existentes
- Catalogo existente
- Usuarios

**Fase 5 — Inventario**
- Dashboard de stock
- Wizards (conteo, crear insumo, crear producto)
- Ordenes de compra

**Fase 6 — Cerebro (visual)**
- Feed de alertas
- Briefing en Home
- Chat integrado
- Panel de sugerencias

---

## 12. Principios de diseno

1. **Una accion, un lugar.** No hay 3 formas de llegar a lo mismo.
2. **Lo urgente arriba.** Alertas, mesas por atender, cuentas por cobrar.
3. **Wizards para lo complejo.** Crear producto, hacer inventario, generar pedido.
4. **Touch-first.** Botones grandes, swipe, scroll vertical.
5. **Offline-capable.** Las operaciones criticas deben funcionar sin internet.
6. **Cerebro visible, no invasivo.** Panel lateral o badge, nunca popup.
7. **0 a productivo en 30 segundos.** Login → Home → primera accion.

---

## 13. Diferencia clave vs Soft Restaurant

| Aspecto | Soft Restaurant | GrowthSuite One |
|---------|-----------------|-----------------|
| Plataforma | Windows desktop | Web (tablet + desktop) |
| Navegacion | Menu bar + F-keys | Dock lateral + acciones rapidas |
| Inventario | Modulo separado pero mismo sistema | Workspace integrado con wizards |
| Inteligencia | Ninguna | Cerebro con diagnostico y sugerencias |
| Movilidad | Solo en estacion fija | Tablet, celular, desktop |
| Diseno | Legacy, funcional pero feo | Moderno, touch-first |
| Lo que comparten | TODO vive en un solo lugar | TODO vive en un solo lugar |

---

## 14. La pregunta mas importante

> ¿El restaurante SIENTE que todo su negocio vive aqui?

Si la respuesta es si, el producto esta bien.
Si la respuesta es "tengo que abrir otra cosa", hay que corregir.

Eso es GrowthSuite One.
