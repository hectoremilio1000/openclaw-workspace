# OpenClaw Channel Sync — Infraestructura Personal

> **Proposito:** sincronizar conversaciones entre WhatsApp, TUI y workspace personal sin mezclarlo con proyectos como GrowthSuite.
> **Estado:** plan de implementacion v1
> **Alcance:** infraestructura personal de OpenClaw

---

## Resumen corto

La sincronizacion automatica debe vivir en **OpenClaw**, no en un proyecto especifico.

- **Historial crudo** → storage local no versionado
- **Resumen util** → `memory/` o `knowledge/`
- **Lectura cruzada** → TUI y otros canales leen del mismo store

---

## 1. Estructura de carpetas

```txt
~/.openclaw/
├── state/
│   └── channel-sync/
│       ├── channel-sync.db          ← SQLite local, NO versionado
│       └── sync-config.json         ← config/cursors locales
│
└── workspace/
    ├── memory/
    ├── knowledge/
    └── skills/
        └── whatsapp-inbox-sync/
```

### Regla
- `state/` = historial crudo + cursores + metadatos de sync
- `workspace/` = conocimiento resumido y compartible por git

---

## 2. DB local

### Ubicacion
`~/.openclaw/state/channel-sync/channel-sync.db`

### Motor
**SQLite**

### Por que SQLite
- local y simple
- cero setup adicional
- ideal para storage personal
- permite queries incrementales, indices y dedup
- no mezcla memoria personal con bases de proyectos

---

## 3. Tablas

### `messages`
Historial crudo de todos los canales personales.

```txt
id INTEGER PK
provider TEXT                -- whatsapp, webchat, tui, telegram, etc
channel TEXT                 -- whatsapp, webchat, tui
chat_id TEXT                 -- identificador del chat/thread
session_key TEXT NULL        -- si aplica a una sesion OpenClaw
phone TEXT NULL              -- para WhatsApp u otros canales telefonicos
direction TEXT               -- inbound | outbound
role TEXT                    -- user | assistant | system
text TEXT
payload_json TEXT NULL       -- raw payload util
provider_message_id TEXT NULL
message_timestamp TEXT       -- ISO-8601
synced_to_workspace_at TEXT NULL
created_at TEXT
updated_at TEXT
```

### `sync_cursors`
Ultimo punto sincronizado por fuente.

```txt
id INTEGER PK
provider TEXT
chat_id TEXT
last_provider_message_id TEXT NULL
last_message_timestamp TEXT NULL
last_synced_at TEXT
UNIQUE(provider, chat_id)
```

### `conversation_summaries`
Resumenes generados automaticamente antes de pasar al workspace.

```txt
id INTEGER PK
provider TEXT
chat_id TEXT
summary_type TEXT            -- daily, thread, decision, memory
source_message_start_id INTEGER
source_message_end_id INTEGER
summary_text TEXT
routed_to TEXT NULL          -- memory/... o knowledge/...
created_at TEXT
```

---

## 4. Jobs

### Job 1 — `ingest-channel-message`
Responsabilidad:
- guardar cada mensaje nuevo en `messages`
- deduplicar por `provider_message_id`
- escribir inbound y outbound

### Job 2 — `sync-channel-conversations`
Responsabilidad:
- leer mensajes no sincronizados
- agrupar por chat
- resumir por bloque
- decidir routing
- escribir en `memory/` o `knowledge/`
- actualizar `synced_to_workspace_at`
- mover cursor

### Job 3 — `load-recent-channel-context`
Responsabilidad:
- al iniciar TUI o nueva sesion, leer resumenes recientes
- exponer contexto relevante
- evitar que el usuario repita conversaciones recientes

---

## 5. Flujo

```txt
WhatsApp / TUI / Webchat
        ↓
  ingest-channel-message
        ↓
   SQLite local (messages)
        ↓
 sync-channel-conversations
        ↓
 summarize + dedup + route
        ↓
 workspace files (memory/knowledge)
        ↓
 load-recent-channel-context
        ↓
 TUI y otros canales arrancan con ese contexto
```

---

## 6. Routing

### Va a `memory/`
- conversaciones temporales
- seguimiento del dia
- ideas no cerradas
- contexto util pero no durable

### Va a `knowledge/decisions/`
- decisiones cerradas
- cambios de direccion
- ownership definido
- estrategia ya aprobada

### Va a `knowledge/architecture/`
- estructuras reutilizables
- workflows durables
- arquitectura de sistemas o producto

### NO va al repo
- historial crudo completo
- payloads completos del canal
- mensajes sensibles no resumidos

---

## 7. Anti-patrones

- guardar historial crudo en git
- meter esto dentro de GrowthSuite
- resumir todo en una sola nota enorme
- crear decision records para ideas no cerradas
- duplicar una misma conversacion en varias notas

---

## 8. Ticket inicial recomendado

### Ticket 1 — Message Store local
Entregable:
- DB SQLite local creada
- tabla `messages`
- tabla `sync_cursors`
- tabla `conversation_summaries`
- helper para insertar mensajes
- helper para leer mensajes por chat/since timestamp

Sin este ticket, no existe sync automatico real.
