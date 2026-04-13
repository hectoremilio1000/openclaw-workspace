---
tags: [decision, impulso, marketing, instagram, leads]
---

# Decision: Reboot del marketing de Impulso Restaurantero

- **Fecha:** 2026-04-13
- **Decidido por:** Hector
- **Estado:** APROBADO — en ejecucion

## Contexto

Impulso Restaurantero tiene un sitio web funcional con multiples mecanismos de captura de leads, pero:
- El contenido de Instagram no esta generando leads de forma sistematica
- Hay bugs criticos en formularios (demogratis roto, contacto vacio)
- No hay estrategia de contenido documentada
- No hay email nurture sequence post-captura
- Hector quiere dos lineas: plataforma SaaS + asesoria personal

## Decision

Arrancar marketing en serio con dos objetivos paralelos:

### 1. Generar leads para la plataforma Impulso (SaaS)
- Contenido educativo en Instagram → link en bio → quiz IA → email → Calendly → cliente
- Arreglar bugs del sitio que pierden leads

### 2. Generar leads para asesoria personal de Hector
- Posicionar a Hector como autoridad en el espacio restaurantero
- Crear landing especifica de asesoria
- Lives y contenido 1-a-1

## Acciones inmediatas

- [ ] Fix bugs criticos: demogratis handler, contacto vacio, select values
- [ ] Crear contenido para Instagram (reels educativos, carruseles caso de exito)
- [ ] Documentar todo el conocimiento de Impulso en [[knowledge/architecture/impulso/website-architecture|OpenClaw]]
- [ ] Crear landings especificas: /asesoria, /checklist, /taller

## Que se descarto

- **Invertir en ads sin arreglar bugs primero** — tirar dinero si los forms no funcionan
- **Hacer rewrite del sitio** — el sitio funciona, solo necesita fixes puntuales
- **Separar completamente Impulso de GrowthSuite** — comparten stack, patterns y aprendizajes

## Relacion con GrowthSuite

Impulso Restaurantero es el brazo de **marketing y adquisicion** de clientes.
GrowthSuite POS es el **producto** que se entrega.

```
Instagram → Impulso (lead gen) → Asesoria/Demo → GrowthSuite POS (producto)
```

Los aprendizajes de marketing de Impulso alimentan la estrategia de GrowthSuite y viceversa.

## Referencias

- [[projects/impulso/current-state|Estado actual de Impulso]]
- [[projects/impulso/marketing-strategy|Estrategia de marketing]]
- [[knowledge/architecture/impulso/lead-gen-flows|Flujos de lead gen]]
- [[knowledge/architecture/impulso/website-architecture|Arquitectura del sitio]]
