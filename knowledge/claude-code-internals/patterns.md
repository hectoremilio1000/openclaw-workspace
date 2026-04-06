---
tags: [programming, patterns, ai, architecture, reference]
date: 2026-04-01
source: Claude Code source analysis
---

# Patrones Utiles del Source de Claude Code

Patrones de arquitectura y codigo extraidos del source code de Claude Code que son reutilizables en proyectos propios.

## 1. Seguridad de Tokens via File Descriptors

En vez de pasar tokens por env vars (que cualquier child process hereda), usar file descriptors:

```typescript
// Prioridad: env var -> file descriptor -> well-known file
// FD solo es legible por el proceso que lo hereda directamente
// No cruza boundaries de shell/tmux
const fd = process.env.CLAUDE_CODE_WEBSOCKET_AUTH_FILE_DESCRIPTOR
const token = fs.readFileSync(`/dev/fd/${fd}`, 'utf-8') // macOS/BSD
// o: fs.readFileSync(`/proc/self/fd/${fd}`, 'utf-8')   // Linux
```

**Aplicacion:** Cualquier app que spawne subprocesos y necesite pasar credenciales de forma segura.

## 2. Token Refresh con Generation Counter

Evita race conditions en refresh de tokens con un contador de generacion:

```typescript
let generation = 0

async function scheduleRefresh(currentGen: number) {
  // Si la generacion cambio, este refresh ya es stale
  if (currentGen !== generation) return

  const newToken = await refreshToken()
  if (currentGen !== generation) return // double check post-await

  applyToken(newToken)
  scheduleNextRefresh(currentGen)
}

function cancelSession() {
  generation++ // Invalida todos los refreshes pendientes
}
```

**Aplicacion:** Cualquier sistema con token refresh async y multiples sesiones.

## 3. Feature Flags con Dead Code Elimination

```typescript
// Build-time constant que el bundler puede eliminar
if (process.env.USER_TYPE === 'ant') {
  // Este codigo se elimina completamente en builds externos
  enableInternalFeature()
}
```

**Aplicacion:** Mantener features internas en el mismo codebase sin que aparezcan en builds publicos.

## 4. Scrubbing de Secrets en Subprocesos

```typescript
function getCleanEnv(): NodeJS.ProcessEnv {
  const env = { ...process.env }

  // Remover secrets conocidos
  const sensitivePatterns = [
    /^AWS_/,
    /^GITHUB_TOKEN$/,
    /^GH_TOKEN$/,
    /SECRET/i,
    /PASSWORD/i,
    /API_KEY/i,
  ]

  for (const key of Object.keys(env)) {
    if (sensitivePatterns.some(p => p.test(key))) {
      delete env[key]
    }
  }

  return env
}
```

**Aplicacion:** CI/CD pipelines, GitHub Actions, cualquier sistema que ejecute codigo externo.

## 5. Task Lifecycle Management

```typescript
type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'killed'

interface Task {
  id: string
  status: TaskStatus
  abortController: AbortController
  output: string[]
}

// Transiciones validas
// pending -> running -> completed | failed
// any -> killed (via abort)
```

**Aplicacion:** Orquestacion de agentes AI, job queues, sistemas de tareas.

## 6. Retry con Backoff Exponencial

El patron de `withRetry.ts` - no reintentar ciegamente, sino con estrategia:

- Retry solo en errores transitorios (429, 500, 503)
- Backoff exponencial con jitter
- Max retries configurable
- Timeout global ademas de per-request

**Aplicacion:** Cualquier cliente HTTP contra APIs externas.

## 7. Prompt Engineering de Produccion

Estructura del system prompt de Claude Code:
1. **Identidad y capacidades** - Que es y que puede hacer
2. **Herramientas disponibles** - Lista con descripciones
3. **Reglas de comportamiento** - Cuando pedir confirmacion, que evitar
4. **Contexto del entorno** - OS, shell, directorio, git status
5. **Instrucciones de formato** - Como responder, estilo

**Aplicacion:** Cualquier agente AI que construyas. El system prompt de `constants/prompts.ts` es la mejor referencia publica que existe.

## 8. Bridge Bidireccional (CLI <-> Web)

Patron de sincronizacion entre dos interfaces:
- WebSocket con reconnection logic
- Estados: connecting -> connected -> reconnecting -> disconnected
- Session sharing con IDs
- Permission callbacks cross-interface

**Aplicacion:** Apps hibridas terminal + web, collaborative tools.

## 9. Sanitizacion "Undercover"

Sistema para limpiar automaticamente informacion interna antes de que salga del sistema:

```typescript
const BLOCKED_STRINGS = ['capybara', 'internal-model-v2', ...]

function sanitize(text: string): string {
  for (const blocked of BLOCKED_STRINGS) {
    text = text.replaceAll(blocked, '[REDACTED]')
  }
  return text
}
```

**Aplicacion:** Cualquier sistema que genere texto que podria contener informacion sensible (logs, commits, outputs publicos).

## 10. MCP (Model Context Protocol) como Patron de Extension

En vez de hardcodear integraciones, usar un protocolo estandar:
- Servidor MCP expone "tools" con schema JSON
- Cliente descubre tools dinamicamente
- Auth via OAuth independiente por servidor
- Permite plugins de terceros sin modificar el core

**Aplicacion:** Cualquier app que necesite ser extensible con integraciones externas.

---

## Archivos de referencia en el source

Para consulta futura, los archivos mas valiosos del source code estan en:
`/Users/hectorvelasquez/Downloads/src/`

- `constants/prompts.ts` - System prompt (54KB)
- `services/api/claude.ts` - API client (125KB)
- `services/api/withRetry.ts` - Retry strategies (28KB)
- `tools/AgentTool/AgentTool.tsx` - Agent spawning
- `bridge/replBridge.ts` - WebSocket bridge (100KB)
- `services/mcp/client.ts` - MCP client (119KB)
- `utils/undercover.ts` - Sanitizacion de codenames
- `utils/sessionIngressAuth.ts` - Token security via FD
- `utils/subprocessEnv.ts` - Env var scrubbing
