# Decision Log — Inventarios

> Registro de decisiones de diseño y arquitectura.

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
