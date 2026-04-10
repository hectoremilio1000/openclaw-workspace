# Decision: Channel sync personal vive en OpenClaw, no en GrowthSuite

- **Fecha:** 2026-04-10
- **Decidido por:** Hector
- **Estado:** APROBADO

## Contexto

Se quiere sincronizar automaticamente conversaciones entre WhatsApp y OpenClaw TUI para cualquier tema, no solo GrowthSuite.
Eso incluye memoria personal, continuidad entre canales y lectura posterior desde el TUI.

## Decision

La infraestructura de sincronizacion conversacional debe vivir en **OpenClaw personal**.

No debe vivir en:
- `pos_bot_api`
- bases de datos de GrowthSuite
- repos de producto especificos

## Storage split

### Historial crudo
- vive en storage local no versionado
- ubicacion recomendada: `~/.openclaw/state/channel-sync/channel-sync.db`
- motor recomendado: SQLite

### Resumen util / conocimiento durable
- vive en el workspace versionado
- rutas: `memory/`, `knowledge/`, `knowledge/decisions/`, `knowledge/architecture/`

## Por que

- Es una necesidad personal/cross-project, no una feature de GrowthSuite
- Evita mezclar conversaciones personales con software de clientes
- Evita subir historial crudo a GitHub
- Permite que TUI, WhatsApp y otros canales lean del mismo sistema

## Consecuencias

- El primer ticket tecnico es crear un message store local en OpenClaw
- El skill `whatsapp-inbox-sync` se vuelve la capa de routing/summarization
- Luego se agrega lectura incremental y sync automatico al workspace
