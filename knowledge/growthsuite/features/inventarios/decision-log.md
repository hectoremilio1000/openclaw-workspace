# Decision Log — Inventarios

> Registro de decisiones de diseño y arquitectura.

---

## [2026-04-12] Inventarios se documenta como feature transversal, no solo microservicio

**Decisión:** tratar inventarios como feature de producto que cruza backend, bot, simulación, docs y futura UX, en vez de verlo solo como `pos_inventory_api`.

**Motivo:** el valor del feature no sale solo del CRUD del inventario; sale de combinar source of truth, interpretación operativa y acciones seguras.

**Impacto:** cualquier trabajo nuevo de inventarios debe partir de capability map + system map + action layer antes de código.

---

## [2026-04-12] El brain de inventarios debe priorizar safe degradation sobre falsa precisión

**Decisión:** cuando no exista soporte fuerte para consumo, faltantes o anomalías finas, responder con degradación útil y segura, no con detalle inventado.

**Motivo:** inventario es uno de los dominios con más riesgo de alucinación operativa.

**Impacto:** primero deterministic routing y queries reales; después wording/LLM.

---

## [2026-04-12] Las mutaciones de inventario no salen directo del LLM

**Decisión:** cualquier acción de inventario de nivel C/D/E debe pasar por policy engine, autorización y validaciones explícitas.

**Motivo:** inventario toca operación real, costo y potencialmente dinero.

**Impacto:** el brain puede recomendar, preparar y resumir, pero no debe ejecutar writes sensibles sin capa adicional.

---

## [2026-04-12] No reescribir pos_inventory_api — los endpoints ya existen

**Decisión:** el microservicio ya tiene 28 controllers y ~131 endpoints. El trabajo no es construir backend nuevo sino: (1) seedear datos en Fogo, (2) conectar bot a los `/internal` endpoints, (3) agregar tools LLM tipadas, (4) mejorar UI.

**Motivo:** al auditar `start/routes.ts` se confirmó que todos los dominios (catálogos, proveedores, compras, stock, conteos, mermas, recetas, consumo) ya tienen endpoints funcionales. El gap es de datos y conexión, no de endpoints faltantes.

**Impacto:** el implementation plan se reorienta a 4 semanas de integración, no de construcción. Evita el antipatrón de construir endpoints duplicados.

**Contexto:** decisión tomada el 2026-04-12 al reescribir los docs de inventario con datos reales del código.
