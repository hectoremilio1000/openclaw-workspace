# Implementation Plan — [Feature Name]

> Pasos ordenados y verificables. Cada paso tiene: qué archivo toca, qué cambia, y cómo saber que funcionó. No empezar el siguiente paso sin verificar el anterior.

**Feature:** [nombre de la feature]  
**Fecha:** [YYYY-MM-DD]  
**Estimado:** [N horas / días]  
**Branch:** `hector_dev/[feature-slug]`

---

## Pre-requisitos

- [ ] Branch creado: `git checkout -b hector_dev/[feature-slug]`
- [ ] DB local disponible: `psql -U pos_user pos_app` responde
- [ ] Servicio corriendo: `node ace serve --watch`
- [ ] [Otro prerequisito si aplica]

---

## Paso 1 — [Título del paso]

**Archivo(s):** `path/to/file.ts`  
**Tipo de cambio:** Nuevo archivo / Modificación / Migración DB  
**Riesgo:** Bajo / Medio / Alto

### Qué hacer

[Descripción precisa de qué escribir o cambiar. Si es código nuevo, mostrar el fragmento clave o la firma.]

```typescript
// Ejemplo de lo que va aquí
export async function [nombreFuncion](...) {
  // lógica
}
```

### Verificación

```bash
# Comando para confirmar que este paso funcionó
[comando de verificación]
```

**Resultado esperado:** [qué output o behavior indica éxito]

---

## Paso 2 — [Título del paso]

**Archivo(s):** `path/to/file.ts`  
**Tipo de cambio:** [tipo]  
**Riesgo:** [nivel]

### Qué hacer

[descripción]

### Verificación

```bash
[comando]
```

**Resultado esperado:** [descripción]

---

## Paso N — [Título del paso]

> (repetir bloque para cada paso)

---

## Paso final — Smoke test completo

### Build

```bash
# Backend AdonisJS
node ace build

# Frontend (si aplica)
npm run build
```

### Test funcional

```bash
# Prueba manual o con el test harness
scripts/run-bot-test.sh [restaurant_id] [phone] "[mensaje de prueba]"
```

**Resultado esperado:** [descripción de la respuesta correcta]

### Test de regresión

```bash
# Asegurarse de que no se rompió nada previo
scripts/run-suite-v2.sh [restaurant_id] [phone] A
```

**Resultado esperado:** Cat A score ≥ [score anterior]

---

## Brain Integration

### Business Brain (estado del negocio)

- **Variables que agrega a s_t:** [ej: `reservas_pendientes`, `tasa_cancelacion_hoy`]
- **Reglas de diagnóstico:** [ej: "si reservas_pendientes > capacidad × 0.9 → alerta ocupación"]
- **Insights que puede generar:** [ej: "Tienes 3 mesas sin confirmar para las 8pm"]

### Product Brain (conocimiento del producto)

- **Flujos procedimentales nuevos:** [ej: "Crear reserva desde WhatsApp: paso 1…"]
- **Preguntas ¿cómo hago X? que debe saber responder:** [ej: "¿Cómo bloqueo una mesa?", "¿Cómo cancelo una reserva?"]
- **Pantallas/pasos del panel que debe conocer:** [ej: "Panel → Reservaciones → Nueva Reserva → campos X, Y, Z"]
- **Diferencia flujo WhatsApp vs Panel:** [ej: "WhatsApp: confirmación vía mensaje. Panel: confirmación visual en grid"]

### Action Brain (acciones)

| Tool | Nivel | Output | Confirmación requerida |
|---|---|---|---|
| `[tool_name]` | A / B / C / D | insight / guía / acción | sí / no |

- **Nivel A — consultar:** lectura pura, sin side effects
- **Nivel B — sugerir:** propone pero no ejecuta
- **Nivel C — ejecutar seguro:** escribe datos, reversible fácilmente
- **Nivel D — sensible:** toca dinero / inventario / cancelaciones — requiere confirmación explícita

### Métricas de impacto

- **ΔJ (impacto en el negocio):** [ej: "Reduce no-shows en ~15% con confirmación automática"]
- **ΔP (productividad):** [ej: "Ahorra ~20min/día al hostess en confirmaciones manuales"]
- **Cómo se mide:** [ej: `SELECT COUNT(*) FROM reservations WHERE status='no_show' GROUP BY week`]

---

## Checklist antes del commit

- [ ] `node ace build` pasa sin errores
- [ ] TypeScript sin errores (`tsc --noEmit`)
- [ ] Smoke test manual pasado
- [ ] Suite de regresión: score no bajó
- [ ] `.env.production` NO fue modificado
- [ ] No hay `console.log` de debug en el código
- [ ] Multi-tenant: caso G12 probado (cross-tenant rechaza)

## Rollback

Si algo sale mal después del deploy:

```bash
# Opción 1: revert commit
git revert HEAD

# Opción 2: feature flag (si existe)
# Cambiar BOT_V2_ENABLED_RESTAURANTS=[] en Railway
```
