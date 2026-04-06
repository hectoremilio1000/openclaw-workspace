# CLAUDE.md — Global Rules (Héctor)

These rules apply to **every** Claude Code session, in every project, on this machine.

---

## 1. Cómo trabajar conmigo (Héctor)

- **Aprobación previa SIEMPRE.** Antes de cualquier cambio en código, archivos, configuración o comandos destructivos: presenta plan corto (qué archivos, qué cambia, por qué) y espera mi OK explícito.
- **Diagnóstico primero, cambios mínimos.** Nunca cambios "a ciegas". Lee antes de editar.
- **Sin scope creep.** Si encuentras algo fuera del alcance acordado, lo apuntas — no lo arreglas sin permiso.
- **No reformatees código no relacionado.** Solo tocas las líneas necesarias.
- **No me digas solo la razón.** Dime cómo lo hacen los pros (Stripe, Google, Shopify). Engineering practices reales, no opiniones.
- **Comunicación concisa.** Bullet points > párrafos. Densidad > volumen.
- **Reporta resultados fielmente.** Si algo no funciona, lo dices claro. Nada de "todo bien" cuando no.

## 2. Git y deploys (NO NEGOCIABLE)

- **Branches:** siempre `hector_dev/<descriptive-name>` (ej: `hector_dev/fix-bot-cross-tenant-g12`).
- **NUNCA push/merge sin autorización explícita mía.** Siempre preguntas antes.
- **NUNCA `--delete-branch`** al hacer PR merge con `gh`. Conserva las ramas.
- **Verifica branch antes de commitear** con `git branch --show-current`.
- **Commits convencionales** con body descriptivo.

## 3. Archivos protegidos

- **NUNCA modifiques `.env` files** durante branch sync, rebase, merge o PR prep.
- **NUNCA borres `.env.production`** — están commiteados y son esenciales para Vercel builds.
- `.env` = localhost (dev local). `.env.production` = Railway URLs (producción). Nunca mezcles.
- **`trash` > `rm`** (recuperable > gone forever).

## 4. Testing y build antes de declarar "listo"

- Backend AdonisJS: corre `node ace build` y verifica que compile.
- Frontend Vite: corre `npm run build` antes de cualquier commit.
- TypeScript: `tsc --noEmit` para verificar tipos.
- Si los tests existen, los corres. Si fallan, no commiteas.

## 5. Estilo de código

- **Promise.all** para queries independientes (no las serialices innecesariamente).
- **Reusa archivos/controladores existentes** antes de crear utilidades duplicadas.
- **No abstracciones especulativas.** Solo abstrae cuando ya hay 3 casos de uso reales.
- **Tipos estrictos.** No `any` salvo justificación.

## 6. Tools y skills

- **Prefiere tools dedicados sobre shell.** Si existe un MCP/skill que hace lo que necesitas, úsalo en vez de bash.
- **Lee SKILL.md** del skill antes de usarlo.
- **Para coding agents (Claude Code, Codex):** úsalos para tareas grandes. Para edits puntuales, edita directo.

## 7. Modelo mental de mis productos

Mi proyecto principal es **GrowthSuite POS** en `~/proyectos/growthsuite`. Cuando trabajes ahí, lee primero el `CLAUDE.md` específico del proyecto — tiene reglas más detalladas (env vars, URLs de Railway, arquitectura del bot, etc.).

## 8. Cuando tengas dudas

- Si no estás seguro de qué quiero, **pregunta**.
- Si una instrucción mía contradice algo en estos archivos, **pregunta** antes de actuar.
- Es mejor 1 pregunta extra que 1 cambio mal hecho que toca revertir.

---

_Última actualización: 2026-04-06 (Héctor + OpenClaw session)_
