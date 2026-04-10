# Como Programar con Agentes IA

> Reglas destiladas de meses trabajando con Claude Code y Codex en produccion.
> Si Jampier va a usar agentes IA para programar, que lea esto primero.

---

## 1. El agente NO es un junior que ejecuta ordenes ciegas

El agente es un **par programmer con amnesia**. Sabe programar bien, pero no sabe nada de tu contexto.

**Tu trabajo:** darle contexto claro antes de cada tarea.
**Su trabajo:** ejecutar con calidad dentro de ese contexto.

---

## 2. Reglas de oro (SIEMPRE aplican)

### Antes de tocar codigo
- [ ] **Lee antes de editar.** Nunca modifiques un archivo sin leerlo primero.
- [ ] **Entiende antes de cambiar.** Si no entiendes que hace el codigo actual, no lo toques.
- [ ] **Plan corto primero.** Archivos que tocas, que cambia, por que. Espera aprobacion.

### Al escribir codigo
- [ ] **Cambios minimos.** Solo las lineas necesarias. Cero reformateo de lineas no relacionadas.
- [ ] **Sin scope creep.** Si encuentras un bug fuera de alcance, lo apuntas — no lo arreglas.
- [ ] **Sin abstracciones especulativas.** Solo abstrae cuando ya hay 3 casos de uso reales.
- [ ] **Promise.all para queries independientes.** Nunca serialices consultas que no dependen entre si.
- [ ] **Reusa archivos existentes.** No crees utilidades duplicadas; agrega metodos a controladores existentes.

### Al commitear
- [ ] **Branch:** `hector_dev/<descripcion>` (o el prefijo del equipo).
- [ ] **Commits convencionales:** `feat(scope): titulo` + body con el POR QUE.
- [ ] **Nunca push sin autorizacion.** Siempre pregunta antes.
- [ ] **Corre build, no solo typecheck.** `node ace build` (Adonis) o `npm run build` (Vite).
- [ ] **Staging especifico.** Nada de `git add -A`. Agrega archivos concretos.

### Seguridad (NO NEGOCIABLE)
- [ ] **Nunca introduzcas inyeccion SQL, XSS, command injection.**
- [ ] **Nunca commites secrets** (.env, API keys, passwords).
- [ ] **Nunca borres .env.production** — son esenciales para Vercel builds.
- [ ] **`trash` > `rm`.** Recuperable > gone forever.
- [ ] **Nunca `git push --force`** sin autorizacion explicita.

---

## 3. Como darle contexto al agente

### Lo que funciona
```
"En pos_bot_api/app/bot/actions/, crea una nueva action llamada 
create_product.ts siguiendo el mismo patron que cancel_product.ts. 
Debe tener wizard de 5 pasos: nombre → categoria → precio → 
area de impresion → confirmar. Usa el API de pos_order_api 
para crear el producto."
```

### Lo que NO funciona
```
"Agrega la funcion de crear productos"
```

**Regla:** mientras mas contexto das, mejor resultado.

---

## 4. Tools del agente: que usar y que no

| Tarea | Herramienta correcta | Herramienta incorrecta |
|-------|---------------------|----------------------|
| Leer archivo | `read` tool | `cat`, `head`, `tail` |
| Editar archivo | `edit` tool | `sed`, `awk` |
| Escribir archivo | `write` tool | `echo`, heredoc |
| Buscar en archivos | `grep` tool | `rg`, `find` via shell |
| Ejecutar comando | `exec` tool | Solo cuando realmente necesita shell |

**Por que:** los tools dedicados son mas seguros, trazables y no fallan por escapado de caracteres.

---

## 5. Modos de trabajo

### Plan Mode 🧠
- **Cuando:** "planea", "analiza", "que opinas"
- **Regla:** CERO ejecucion. Solo lee, analiza, propone.
- **Salida:** plan con archivos, cambios, riesgos.

### Execution Mode ⚡
- **Cuando:** "ejecuta", "hazlo", "dale"
- **Prerequisito:** plan aprobado.
- **Regla:** ejecuta autonomamente, verifica, reporta.

### Chat Mode 💬 (default)
- **Cuando:** conversacion normal.
- **Regla:** paso a paso con aprobacion.

---

## 6. Errores comunes de agentes (y como evitarlos)

| Error | Solucion |
|-------|----------|
| Crea archivos nuevos innecesarios | "Agrega el metodo al controlador existente, no crees un archivo nuevo" |
| Reformatea codigo no relacionado | "Solo toca las lineas que necesitas cambiar" |
| Hace scope creep | "Solo lo que te pedi, nada mas" |
| Dice "todo bien" cuando algo fallo | "Muestra el output exacto del build/test" |
| Commitea sin verificar | "Corre `node ace build` antes de commitear" |
| Usa `any` en TypeScript | "Tipos estrictos, justifica cada `any`" |
| Serializa queries independientes | "Usa Promise.all cuando las queries no dependen entre si" |

---

## 7. Pattern: Feature Flags para todo lo nuevo

Toda feature nueva detras de un feature flag:

```ts
// app/brain/config.ts
export const BRAIN_ENABLED = process.env.BRAIN_ENABLED === 'true'
```

```ts
// donde se usa
if (BRAIN_ENABLED) {
  return brainResponse(input)
} else {
  return legacyBotResponse(input)
}
```

**Por que:**
- Deploy sin riesgo
- Rollback instantaneo (cambiar variable, no deploy)
- Pruebas con 1 restaurante antes de todos

---

## 8. Pattern: Strangler Fig (migracion gradual)

Nunca reescribas todo de golpe. Migra pieza por pieza:

1. Construye lo nuevo al lado de lo viejo
2. Feature flag activa lo nuevo para 1 restaurante
3. Si funciona 7 dias → activa para todos
4. Si falla → desactiva el flag, arregla, repite
5. Cuando todo esta migrado → borra lo viejo en 1 commit

Ver detalle completo: `knowledge/agent-patterns/strangler-fig.md`

---

## 9. Pattern: Policy Engine para acciones sensibles

Cualquier accion que toque dinero, inventario o clientes DEBE pasar por validacion determinística ANTES de ejecutar:

```
usuario pide → LLM decide tool → Policy Engine valida → ejecuta (o rechaza)
```

El LLM decide QUE hacer.
El Policy Engine decide SI se puede.

Nunca confies en el LLM para validar permisos, montos o multi-tenant.

Ver detalle: `knowledge/agent-patterns/policy-engine.md`

---

## 10. Donde guardar el conocimiento

| Tipo | Donde |
|------|-------|
| Patron reutilizable | `knowledge/agent-patterns/` |
| Decision cerrada | `knowledge/decisions/YYYY-MM-DD-slug.md` |
| Regla de programacion | `knowledge/programming/` |
| Arquitectura de sistema | `knowledge/architecture/` |
| Nota temporal | `memory/YYYY-MM-DD.md` |

**Regla:** si vale la pena recordarlo en 3 meses, va en `knowledge/`. Si es volatil, va en `memory/`.
