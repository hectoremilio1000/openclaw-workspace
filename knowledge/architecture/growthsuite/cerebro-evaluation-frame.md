# GrowthSuite Cerebro — Marco de Evaluación

> **Propósito:** definir cómo se evalúa cualquier pieza del cerebro antes de considerarla correcta.
> **Estado:** activo / obligatorio

---

## 1. Identidad del producto

```txt
GrowthSuite
El cerebro operativo del restaurante
Responde, detecta, recomienda y ayuda a ejecutar
para vender más, proteger utilidad y operar más fácil
```

Esto no es marketing decorativo. Es el criterio de diseño y validación.

Toda feature del cerebro debe ayudar a por lo menos uno de estos 3 objetivos:
- **Aumentar ventas**
- **Proteger utilidad**
- **Facilitar operación**

---

## 2. Loop obligatorio

Toda feature del cerebro debe caber en este loop:

```txt
datos → estado → diagnóstico → respuesta/acción → impacto
```

### Qué significa cada caja
- **Datos:** hechos crudos del negocio (órdenes, stock, reservaciones, descuentos, cancelaciones)
- **Estado:** la foto estructurada del restaurante en un momento dado
- **Diagnóstico:** lo que merece atención, comparativos, anomalías, focos rojos
- **Respuesta/acción:** lo que el sistema responde, recomienda o ayuda a ejecutar
- **Impacto:** lo que cambió después y cómo se mide

Si algo no cabe claramente en una de estas cajas, está mal planteado.

---

## 3. Separación estricta de capas

Nunca mezclar conceptualmente:

### Canales
Dónde interactúa el usuario con el cerebro.
- WhatsApp
- POS Admin
- Llamadas
- Web
- Email/SMS

### Dominios
Sobre qué razona el cerebro.
- Ventas
- Reservaciones
- Inventario
- Productos
- Descuentos
- Cancelaciones
- Caja
- Clientes
- Marketing

### Sistemas conectados
De dónde vienen o a dónde van los datos/acciones.
- POS
- OpenTable
- Delivery apps
- CRM
- Página web
- ERP/PMS
- Task systems
- Computer use (futuro)

**Regla:** un mismo documento o feature puede tocar varias capas, pero no debe confundirlas.

---

## 4. Qué debe hacer el cerebro mejor que un modelo generalista

El baseline de comparación es **`openai-codex/gpt-5.4`** como modelo generalista.

Toda nueva pieza del cerebro debe compararse contra dos cosas:

1. **Ground truth del sistema**
   - ¿Los datos son correctos?
2. **Baseline generalista**
   - ¿Qué respondería Codex 5.4 sin la capa especializada?

### El cerebro debe ganar en:
- contexto del negocio
- estructura gerencial
- diagnóstico útil
- capacidad de priorización
- siguiente paso accionable

### El cerebro NO debe perder en:
- exactitud
- claridad
- concisión
- confiabilidad

---

## 5. Regla de comportamiento esperada

Cuando el cerebro responde, idealmente debe seguir esta secuencia:

1. **Responder la pregunta directamente**
2. **Agregar comparativo o contexto**
3. **Agregar diagnóstico si aplica**
4. **Sugerir siguiente acción si aporta valor**

### Ejemplo
Pregunta:
> ¿Cómo van los descuentos hoy?

#### Respuesta pobre / baseline débil
> Hoy llevas $3,200 en descuentos.

#### Respuesta esperada del cerebro
> Hoy llevas $3,200 en descuentos, 78% arriba de lo normal para este día. La mayor parte se concentra en el turno noche. ¿Quieres el desglose por mesero?

---

## 6. Criterios de validación de cualquier feature

Antes de aprobar una pieza del cerebro, responde estas preguntas:

### A. Arquitectura
- ¿A qué caja del loop pertenece?
- ¿A cuál de los 3 objetivos sirve?
- ¿Qué dominio cubre?
- ¿Qué canal la expone?
- ¿Qué sistema conectado toca?

### B. Datos
- ¿La fuente de datos es real y confiable?
- ¿Los números coinciden con la DB?
- ¿Hay dataset suficiente para probarlo?

### C. Comportamiento
- ¿Responde mejor que el baseline generalista?
- ¿Suena como gerente operativo y no como SQL con chat?
- ¿No alucina ni inventa contexto?

### D. Producto
- ¿Ayuda a vender más, proteger utilidad o facilitar operación?
- ¿Es algo que el usuario realmente usaría?
- ¿Reduce fricción operativa?

---

## 7. Orden recomendado de construcción

Para evitar humo, construir siempre en este orden:

1. **Queries / tools**
2. **Estado**
3. **Diagnóstico**
4. **Respuesta**
5. **Proactividad**
6. **Impacto / logs / formalización**

### Regla crítica
No intentar que el LLM reemplace datos, estado o diagnóstico.
El LLM sintetiza, explica, prioriza y conversa.
No es la verdad del negocio.

---

## 8. Cómo usar este marco

Cada vez que se construya una función, query, endpoint, prompt o flujo del cerebro:

1. evaluar contra este documento
2. evaluar contra el baseline `openai-codex/gpt-5.4`
3. evaluar contra datos reales del restaurante de prueba

Si falla en cualquiera de las 3, no está listo.
