---
tags: [research, ai, claude, reverse-engineering, security]
date: 2026-04-01
source: Claude Code npm source map leak
---

# Analisis del Source Code de Claude Code

El codigo fuente de la CLI de Claude Code se filtro via un source map en el registro npm. Este es un analisis completo de lo que contiene.

## Arquitectura General

Claude Code es una aplicacion **TypeScript/React** que corre en terminal usando un motor de rendering customizado basado en Ink. Usa **Bun** como runtime/bundler y **Zustand** para state management.

### Subsistemas principales

| Subsistema | Directorio | Descripcion |
|---|---|---|
| Tools | `tools/` | 45+ herramientas que el modelo puede usar (bash, file edit, grep, agents, etc.) |
| Commands | `commands/` | 100+ comandos CLI para el usuario |
| Skills | `skills/` | Skills bundled y custom loadables |
| Agent System | `tools/AgentTool/` | Spawn de agentes AI en paralelo |
| Bridge | `bridge/` | Conexion bidireccional CLI <-> claude.ai |
| MCP | `services/mcp/` | Model Context Protocol - integracion con tools externos |
| API Client | `services/api/` | Cliente para la API de Claude con retry, streaming, caching |
| State | `state/` | Zustand store con settings, permisos, UI state, bridge status |
| Ink Engine | `ink/` | Motor de rendering terminal customizado (50 archivos) |
| Permissions | `utils/permissions/` | Modos: auto, interactive, bypass, restricted |
| Analytics | `services/analytics/` | Feature flags via GrowthBook, telemetria |
| Plugins | `plugins/` | Sistema de plugins extensible |

### Entry points
- `main.tsx` - Inicializacion principal (803KB)
- `entrypoints/init.ts` - Init CLI
- `entrypoints/cli.tsx` - Command handling
- `replLauncher.tsx` - Lanzador de sesion REPL

---

## Features Internas No Publicadas

### KAIROS (Assistant Mode)
- **200+ archivos** lo referencian
- Es un modo "asistente" de larga duracion (daemon)
- Feature gates: `KAIROS`, `KAIROS_BRIEF`, `KAIROS_CHANNELS`, `KAIROS_GITHUB_WEBHOOKS`, `KAIROS_PUSH_NOTIFICATION`, `KAIROS_DREAM`
- **Solo para empleados de Anthropic** (ant-only, dead code elimination en builds externos)
- Incluye sistema "Dream" - consolidacion automatica de memoria

### ULTRAPLAN (Planificacion Avanzada)
- Comando en `commands/ultraplan.tsx`
- Exploracion multi-agente con timeout de 30 minutos
- Ejecucion de tareas con agentes remotos
- Variable de entorno `ULTRAPLAN_PROMPT_FILE` para override en dev

### Agent Teams
- Feature futura con gating por plan de suscripcion
- Unica referencia: `"Agent Teams is not yet available on your plan."`

### Coordinator Mode
- Orquestacion multi-agente ("swarms")
- Directorio `coordinator/`

### Buddy System
- Sistema de compañero visual (mascota/sprite)
- No es un "modo" de operacion como tal

---

## Codenames Internos

| Codename | Referencia |
|---|---|
| **Capybara** | Modelo interno. Variantes: `capybara-v2-fast`, `capybara-v8` |
| **Tengu** | Prefijo para feature flags y eventos (`tengu_kairos`, `tengu_ultraplan_model`, `tengu_harbor`) |
| **Numbat** | Modelo referenciado en comentarios de migracion |
| **Fennec** | Modelo anterior (migracion fennec -> opus) |

### Sistema "Undercover" (`utils/undercover.ts`)
Automaticamente limpia codenames internos y nombres de proyectos cuando se detecta que vas a commitear a un repo publico. Ironicamente, este sistema existe para prevenir exactamente lo que paso con este leak.

---

## Modelos en el Codigo

### Modelos actuales
- `claude-opus-4-6` (Opus 4.6 - frontier actual)
- `claude-sonnet-4-6` (Sonnet 4.6)
- `claude-haiku-4-5-20251001`

### Modelos historicos referenciados
- `claude-opus-4-5-20251101`
- `claude-opus-4-1-20250805`
- `claude-opus-4-20250514`
- `claude-sonnet-4-5-20250929`
- `claude-sonnet-4-20250514`
- `claude-3-7-sonnet-20250219`

> **NOTA:** NO hay referencias a Opus 4.7 ni Sonnet 4.8 como afirmaban en el foro. Eso es inventado.

---

## Telemetria y Analytics

### Que SI trackean
- Eventos `tengu_*` (feature usage, API calls, errors)
- Si la operacion de "continue" (resume session) fue exitosa y duracion
- Uso de herramientas (nombres sanitizados para MCP tools)
- Feedback surveys y transcript sharing
- Metricas de costo y tokens

### Que NO trackean (en el build publico)
- **No hay tracking de groserías** o palabras especificas
- **No logean tu codigo** a menos que actives `OTEL_LOG_USER_PROMPTS`
- **No logean detalles de tools** a menos que actives `OTEL_LOG_TOOL_DETAILS=1`

### Frustration Detection
- Existe `useFrustrationDetection` pero es **ANT-ONLY**
- La implementacion fue stripped del build externo
- Solo ofrece compartir transcripcion para feedback

### Protecciones de PII
- Tool names de MCP sanitizados como 'mcp_tool'
- Tipo `AnalyticsMetadata_I_VERIFIED_THIS_IS_NOT_CODE_OR_FILEPATHS` para verificacion
- User prompts solo se logean con env var explicita

---

## Sistema de Seguridad (Lo mas impresionante)

### Proteccion de Tokens
1. **File Descriptors** - Tokens pasan via FD entre procesos (no cruzan shell/tmux boundaries)
2. **Token Stripping** - Se remueve `CLAUDE_CODE_OAUTH_TOKEN` del env de child processes
3. **Selective Injection** - Solo `CLAUDE_CODE_SESSION_ACCESS_TOKEN` se pasa a hijos
4. **Token Refresh via stdin** - Pipe aislado parent-child, no env vars

### Trusted Device System
- Enrollment via `POST /auth/trusted_devices`
- Security tier `ELEVATED` en el servidor
- Header `X-Trusted-Device-Token` en cada request
- Almacenado en **Keychain del OS** (macOS)
- Expiracion rolling de 90 dias

### JWT Refresh Proactivo
- Refresh automatico **5 minutos antes** de expiracion
- Generation counter para invalidar refreshes stale
- Retry con backoff exponencial (max 3 fallos)
- Fallback de 30 minutos para sesiones largas

### Protecciones Adicionales
- **Path traversal prevention**: IDs validados con `/^[a-zA-Z0-9_-]+$/`
- **GitHub Actions scrubbing**: Secrets y API keys removidos del env de subprocesos
- **Channel server verification**: 7 gates secuenciales (capability, runtime, auth, policy, session, marketplace, allowlist)
- **XML injection prevention**: Metadata keys validadas con regex estricto

---

## Valor Practico para Programadores

### Archivos clave para estudiar

| Archivo | Por que |
|---|---|
| `constants/prompts.ts` (54KB) | System prompt completo. Oro puro si trabajas con LLMs |
| `tools/AgentTool/` | Patron de referencia para construir sistemas de agentes |
| `services/api/claude.ts` (125KB) | Retry logic, streaming, error recovery profesional |
| `utils/undercover.ts` | Como sanitizar codenames antes de commits publicos |
| `services/api/withRetry.ts` (28KB) | Estrategias de retry sofisticadas |
| `bridge/` | Patron de bridge bidireccional CLI <-> web |
| `services/mcp/client.ts` (119KB) | Implementacion de referencia de MCP client |

### Patrones reutilizables
- **Seguridad de tokens**: File descriptors > env vars para credenciales
- **Feature flags**: GrowthBook + dead code elimination con `process.env.USER_TYPE`
- **Agent orchestration**: Task lifecycle (pending -> running -> completed/failed/killed)
- **Prompt engineering**: Como estructurar system prompts de produccion
- **Error recovery**: Retry con backoff + generation counters para invalidacion

---

## Claims del Foro: Fact Check

| Claim | Veredicto |
|---|---|
| Opus 4.7 / Sonnet 4.8 | FALSO - no existen en el codigo |
| Codename "Capibara" = Mythos | PARCIAL - Capybara existe pero no se llama Mythos |
| KAIROS (memoria largo plazo) | VERDADERO - sistema extenso, ant-only |
| ULTRAPLAN | VERDADERO - planificacion multi-agente |
| Buddy Mode | PARCIAL - es un sprite companion, no un "modo" |
| Agent Teams | VERDADERO pero minimo (1 referencia) |
| Tracking de groserías | EXAGERADO - frustration detection existe pero sin tracking de palabras |
| Tracking de "continuar" | ENGAÑOSO - trackea session resume, no la palabra |
| Proteccion anti-robo de tokens | VERDADERO y muy sofisticado |
| Verificacion de cliente legitimo | VERDADERO - Trusted Device Token system |
