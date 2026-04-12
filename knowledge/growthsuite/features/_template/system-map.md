# System Map — [Feature Name]

> Last updated: YYYY-MM-DD

## Runtime

| Componente | Stack | Puerto local | URL producción |
|---|---|---|---|
| Backend | AdonisJS 6 | 33XX | https://...-production.up.railway.app |
| Frontend | React/Vite | 5XXX | https://....vercel.app |

## Fuentes de datos

| Tabla | DB | Descripción |
|---|---|---|
| ... | pos_app | ... |

## Lectura (queries)

```
GET /api/... → controller → model → response
```

## Mutación (writes)

```
POST /api/... → middleware → validate → execute → event_log → response
```

## Repos / archivos clave

| Archivo | Propósito |
|---|---|
| `pos-app/.../controller.ts` | ... |
| `pos-front/.../Component.tsx` | ... |
