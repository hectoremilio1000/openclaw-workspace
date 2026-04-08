# 📋 Pendiente — Dividir features de GrowthSuite por dominio

> **Para:** Jampier
> **De:** Héctor
> **Fecha:** 2026-04-07
> **Status:** Propuesta para discutir y aterrizar
> **Contexto:** Después de mergear customer unification (PR #54 / #55), necesitamos una regla clara para que cualquier feature nueva tenga "casa" y no quede mezclado con otras capas.

---

## 🎯 La idea

A partir de ahora, **todo feature nuevo de GrowthSuite vive en uno (y solo uno) de estos 3 dominios**:

| # | Dominio | Pregunta clave |
|---|---------|----------------|
| 1 | **VENTAS** | ¿Esto trae más dinero / más clientes / más ticket? |
| 2 | **COSTOS** | ¿Esto reduce gastos / merma / fuga / overhead? |
| 3 | **OPERACIÓN** | ¿Esto hace que el restaurante funcione mejor día a día? |

### Por qué esta división
- Le da claridad al producto: cada feature responde a una palanca de negocio real
- Facilita priorizar: si no encaja en ninguno, probablemente no debería existir
- Facilita vender: el pitch al restaurantero se vuelve directo
- Facilita medir impacto: cada dominio tiene su propio KPI

### Regla de oro
Si un feature parece encajar en 2 dominios → **se divide en 2 features distintas**, no se mezcla.

---

## 🟢 1. VENTAS

### Definición
Todo lo que **trae dinero al restaurante o aumenta el ticket promedio**.

### Pregunta filtro
> "¿Esto convierte más visitas, más ticket, o más recurrencia?"

### Features candidatos
- **Delivery apps** (Rappi, UberEats, DiDi, Hugo) → **VENTAS**
  - Recibir órdenes
  - Sincronizar menú
  - Reportes consolidados
  - Comisiones por plataforma
- **Reservaciones** → VENTAS (ocupa mesas que estarían vacías)
- **Cupones / promociones** → VENTAS
- **Customers / CRM** → VENTAS (retención = ventas recurrentes)
- **WhatsApp marketing** → VENTAS
- **Tienda online / website** → VENTAS
- **Programa de lealtad** → VENTAS
- **Gift cards** → VENTAS
- **Pricing dinámico** (happy hour, descuentos por hora) → VENTAS
- **Ventas a domicilio propio** → VENTAS

### KPI del dominio
- Revenue total
- Ticket promedio
- Frecuencia de visita
- Tasa de conversión (visita → orden)
- Customer lifetime value

---

## 🔴 2. COSTOS

### Definición
Todo lo que **reduce gastos, merma, fuga, comisiones, o desperdicio**.

### Pregunta filtro
> "¿Esto baja un costo real medible del restaurante?"

### Features candidatos
- **Inventario físico vs sistema** (stock counts) → COSTOS
- **Compras / proveedores** → COSTOS
- **Recetas / food cost** → COSTOS
- **Merma tracking** → COSTOS
- **Comparativo de proveedores** → COSTOS
- **Alertas de descuentos anómalos** → COSTOS (fuga interna)
- **Cancelaciones tracking** → COSTOS (fuga)
- **Voids tracking por mesero** → COSTOS (fuga)
- **Comisiones de delivery apps** → COSTOS (visibilidad de cuánto te quedas vs lo que llega)
- **Margen real por platillo** → COSTOS
- **Energy / utilities tracking** (futuro) → COSTOS

### KPI del dominio
- Food cost %
- Merma %
- Costo por orden
- Margen bruto
- % de fuga (voids + descuentos no autorizados)

---

## 🟡 3. OPERACIÓN

### Definición
Todo lo que **hace que el restaurante funcione bien día a día**, sin que necesariamente toque ventas o costos directos.

### Pregunta filtro
> "¿Esto hace que la cocina, la caja, los meseros o el dueño operen mejor / más rápido / sin fricción?"

### Features candidatos
- **POS comandero** → OPERACIÓN
- **Caja / corte X** → OPERACIÓN
- **Monitor de cocina (KDS)** → OPERACIÓN
- **Manejo de turnos / shifts** → OPERACIÓN
- **Pairing / kiosk setup** → OPERACIÓN
- **Roles y permisos** → OPERACIÓN
- **Áreas / mesas** → OPERACIÓN
- **Asistencia del personal** → OPERACIÓN
- **Notificaciones operativas** (alertas de turno sin abrir, etc.) → OPERACIÓN
- **Briefings diarios** → OPERACIÓN (apoya al dueño en su día a día)
- **Facturación / SAT** → OPERACIÓN (cumplimiento)

### KPI del dominio
- Tiempo promedio de preparación
- Tiempo de mesa
- Errores de cocina
- Disponibilidad de turnos
- Adopción del POS por el staff

---

## 🔀 Casos que se dividen entre 2 dominios

A veces parece que un feature toca varios dominios. La regla es **partirlo en sub-features**:

### Ejemplo: Delivery Apps
| Sub-feature | Dominio |
|-------------|---------|
| Recibir órdenes desde Rappi/UberEats | VENTAS |
| Sincronizar menú con plataformas | OPERACIÓN |
| Ver comisiones reales que pagas | COSTOS |
| Reportes consolidados de ventas multi-canal | VENTAS |
| Tiempo de preparación por canal | OPERACIÓN |

### Ejemplo: Customers / CRM
| Sub-feature | Dominio |
|-------------|---------|
| Tabla customers unificada | OPERACIÓN (fundación de datos) |
| Historial de visitas de un cliente | VENTAS (retención) |
| Cupones por cliente | VENTAS |
| Datos fiscales del cliente | OPERACIÓN (facturación) |

### Ejemplo: Reservaciones
| Sub-feature | Dominio |
|-------------|---------|
| Tomar y confirmar reservación | OPERACIÓN |
| Promover horarios de baja ocupación | VENTAS |
| Detectar no-shows | COSTOS (fuga de mesa potencial) |

---

## 🛠️ Cómo se aplica esto en el código

### Por convención, no por carpeta
No es necesario reorganizar el monorepo en `src/sales/`, `src/costs/`, `src/operations/` (sería un gran refactor). 

Lo que sí hay que hacer:
- **Cada PR debe declarar a qué dominio pertenece** (en el título o body)
- Ejemplo: `feat(VENTAS): wire delivery apps menu sync`
- **Cada feature en el roadmap se etiqueta con el dominio**
- En docs/specs, usar el dominio como tag

### Ejemplo de tags en commits/PRs
```
feat(ventas): add delivery menu sync
fix(costos): correct food cost computation
chore(operacion): refactor shift state machine
```

---

## 📊 Cómo debe verse el roadmap visualmente

```
┌─────────────────────────────────────────────────────────┐
│  GROWTHSUITE ROADMAP                                    │
├─────────────────┬─────────────────┬─────────────────────┤
│  🟢 VENTAS      │  🔴 COSTOS      │  🟡 OPERACIÓN       │
├─────────────────┼─────────────────┼─────────────────────┤
│  Delivery apps  │  Inventario     │  POS comandero      │
│  Cupones        │  Compras        │  Caja / corte X     │
│  CRM clientes   │  Food cost      │  KDS cocina         │
│  Reservas       │  Merma tracking │  Turnos / shifts    │
│  Promociones    │  Fuga voids     │  Roles / permisos   │
│  Gift cards     │  Comisiones     │  Áreas / mesas      │
│  Loyalty        │  Margen real    │  Facturación        │
│  Marketing WA   │                 │  Briefings ops      │
└─────────────────┴─────────────────┴─────────────────────┘
```

---

## ✅ Lo que necesito de Jampier

1. **Discutir esta clasificación** — ¿estás de acuerdo con los 3 dominios? ¿propones otro?
2. **Validar los casos divididos** — ¿delivery apps tiene sentido dividirlo así?
3. **Decidir convención de tags en commits/PRs**
4. **Aplicar el filtro a features pendientes** que tengamos:
   - Delivery apps → con la división propuesta arriba
   - CRM completo → ¿qué partes son ventas vs operación?
   - Marketing module → seguro ventas, pero ¿toca operación?
5. **Decidir si hay un 4to dominio que se nos esté escapando** (ej. cumplimiento legal, multi-sucursal, integraciones)

---

## 🧠 Conexión con la visión técnica

Esto se alinea con la separación que ya tenemos en arquitectura:

- **Track A — Core POS seguro** = mayormente OPERACIÓN
- **Track B — Brain read-only** = lee de los 3 dominios para generar insight
- **Track C — Actions bridge** = ejecuta acciones en los 3 dominios con confirmación

Y con la función objetivo del cerebro (ver `cerebro-mathematical-blueprint.md`):
```
J(t) = Revenue(t)         ← VENTAS
     + Margin(t)          ← VENTAS - COSTOS
     − Waste(t)           ← COSTOS
     − Leakage(t)         ← COSTOS
     − Friction(t)        ← OPERACIÓN
```

Los 3 dominios **son exactamente los componentes de la función objetivo**. No es casualidad — es la misma idea expresada en lenguaje de producto vs lenguaje matemático.

---

## 📎 Referencias internas
- [[Pendientes GrowthSuite]]
- [[00 - Mapa de Vision]]
- [[GrowthSuite - 3 Pilares Reconstruidos]]
- [[Palancas de Ventas - Restaurantes]]
- `knowledge/architecture/growthsuite/cerebro-mathematical-blueprint.md`
- `docs/jampier-review-customers-brain-boundary.md`
- `knowledge/decisions/2026-04-07-customer-unification-merge-boundary.md`
