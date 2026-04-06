# Claude Code — Internals & Patterns

Lo que aprendimos estudiando el source code de Claude Code, ubicado localmente en `~/Downloads/src/` (no sincronizado, es el tar extraído del paquete oficial de Anthropic).

## Archivos clave estudiados
- `QueryEngine.ts` — motor principal de query
- `Task.ts` — modelo de task
- `Tool.ts` — modelo base de tool
- `assistant/` — loop del agente
- `services/api/claude.ts` — cliente al modelo
- `utils/model/` — routing de modelos
- `constants/prompts.ts` — prompts del sistema

## Archivos de conocimiento en esta carpeta
- **`knowledge.md`** — destilado de alto nivel: cómo funciona, qué patrones usa, por qué es tan efectivo
- **`architecture.md`** — análisis técnico detallado del source
- **`patterns.md`** — patrones extraíbles y cómo aplicarlos a tu propio agente

## Cómo usar este conocimiento

Cuando diseñes un agente nuevo, **lee estos 3 archivos primero**. La razón:

Claude Code es uno de los agentes más usados en producción del mundo. Sus decisiones de diseño están validadas por millones de interacciones reales. No hay mejor referencia práctica.

## Lecciones destiladas (TL;DR)

1. **Tool-calling > keywords.** El LLM decide qué tool usar viendo schemas tipados, no matcheando texto.
2. **Tools aislados con context propio.** Cada tool tiene su propia ventana de contexto.
3. **Paralelización agresiva.** Múltiples tools en paralelo cuando no hay dependencia.
4. **Validación determinística antes de ejecución.** Los tools validan input con schemas estrictos ANTES de correr lógica.
5. **System prompt pequeño pero denso.** No un wall of text — reglas operativas concretas.
6. **Errores como datos, no excepciones.** Un error de tool se devuelve como resultado del tool, no como crash.
7. **Loop simple.** El agente es: `while not done: plan → call tool → observe result → plan again`.
