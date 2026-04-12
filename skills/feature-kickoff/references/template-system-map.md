# System Map — [Feature Name]

> Mapa de archivos reales, tablas, endpoints, y servicios involucrados. Solo lo verificado con Glob/Grep — nada inventado.

**Feature:** [nombre de la feature]  
**Fecha:** [YYYY-MM-DD]  
**Servicio(s) involucrado(s):** [pos_bot_api / pos_order_api / pos_front / etc.]

---

## Archivos clave

| Archivo | Líneas relevantes | Rol en la feature |
|---|---|---|
| `path/to/controller.ts` | L45-L120 | Entry point HTTP |
| `path/to/service.ts` | L1-L80 | Lógica de negocio |
| `path/to/model.ts` | completo | ORM model |
| `path/to/migration.ts` | — | Schema de DB |

## Tablas de base de datos

### Tablas existentes que se tocan

```sql
-- tabla: [nombre_tabla]
-- columnas relevantes:
id          serial primary key
[campo]     [tipo]   -- [descripción]
[campo]     [tipo]   -- [descripción]
created_at  timestamp
```

### Tablas nuevas a crear (si aplica)

```sql
-- tabla: [nombre_tabla_nueva]
[campo]     [tipo]   -- [descripción]
```

## Endpoints HTTP involucrados

| Método | Path | Controlador | Autenticación |
|---|---|---|---|
| POST | `/api/[recurso]` | `[Controller].[method]` | JWT / bot-secret / ninguna |
| GET  | `/api/[recurso]/:id` | `[Controller].[method]` | JWT |

## Flujo de datos

```
[Origen] → [Transformación] → [Destino]

Ejemplo:
WhatsApp → impulsobotwhats → POST /api/bot/message
  → classify.ts → execute.ts → [Action]
  → DB write → reply
```

## Servicios externos

| Servicio | Cómo se usa | Config (env var) |
|---|---|---|
| OpenAI | chatLLM() en llm_client.ts | `OPENAI_API_KEY` |
| Railway PostgreSQL | Lucid ORM | `PG_*` vars |
| Qdrant | RAG embeddings | `QDRANT_URL` |

## Puntos de entrada para tests

> Dónde arranca una prueba de esta feature (para el test plan posterior).

- [ ] Endpoint: `POST /api/[ruta]` con body `{...}`
- [ ] Script: `scripts/run-bot-test.sh [restaurant_id] [phone] "[mensaje]"`
- [ ] Unit: `node ace test --filter "[TestName]"`
