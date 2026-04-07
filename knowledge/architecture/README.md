# Architecture Docs

> **Para qué sirve:** documentos de arquitectura formales con diagramas, modelos de datos, contratos de API, y diseños de sistemas.

## Diferencia con otras carpetas del hub

| Carpeta | Para qué |
|---------|----------|
| `agent-patterns/` | Patrones reutilizables y atemporales (Strangler Fig, Policy Engine, etc.) |
| `decisions/` | Decisiones puntuales en el tiempo (ADRs con fecha y contexto) |
| **`architecture/`** | **Diagramas y diseños vivos de sistemas concretos** |
| `claude-code-internals/` | Análisis de código de terceros (referencia externa) |

## Convención de nombres

```
architecture/
├── README.md
├── growthsuite/
│   ├── overview.md                  ← visión global del sistema
│   ├── multi-tenant-isolation.md    ← cómo funciona el aislamiento
│   ├── bot-v1-current.md            ← estado actual del bot
│   ├── bot-v2-target.md             ← target architecture
│   └── data-flows.md                ← cómo fluye la data entre microservicios
├── openclaw-workspace/
│   └── knowledge-hub-design.md      ← cómo funciona ESTE hub
└── _templates/
    └── architecture-doc-template.md
```

## Cuándo crear un doc aquí

- Diseñas un sistema nuevo desde cero
- Documentas cómo funciona un sistema existente para que otro agente lo entienda
- Capturas un diagrama de flujo de data, llamadas, o estados
- Defines un contrato entre componentes (API, eventos, schemas)

## Cuándo NO crear un doc aquí

- Es una decisión puntual → va en `decisions/`
- Es un patrón reutilizable → va en `agent-patterns/`
- Es estado vivo del proyecto → va en `projects/<proyecto>/current-state.md`
- Es código → va en su propio repo
