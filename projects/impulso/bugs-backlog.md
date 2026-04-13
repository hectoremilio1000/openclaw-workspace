---
tags: [impulso, bugs, backlog, priority]
---

# Impulso Restaurantero — Bugs Backlog

> Lista priorizada de bugs a arreglar en el sitio web.
> Relacionado: [[projects/impulso/current-state|Estado actual]], [[knowledge/architecture/impulso/website-architecture|Arquitectura]]

## Criticos (perdiendo leads)

### BUG-1: /demogratis — Formulario no envia nada
- **Archivo:** `pages/demogratis.js:6-8`
- **Problema:** `handleFormSubmit` solo hace `e.preventDefault()`, no envia datos
- **Impacto:** Todo lead que llega a esta pagina se pierde
- **Fix:** Conectar al endpoint `POST /prospectsmeeting` como en index.js

### BUG-2: /contacto — Pagina completamente vacia
- **Archivo:** `pages/contacto.js`
- **Problema:** Solo renderiza NavBar, nada mas
- **Impacto:** Lead perdido si alguien llega por Google o navegacion
- **Fix:** Agregar formulario de contacto + info basica (WhatsApp, email, Calendly)

### BUG-3: Select "Como te enteraste" — values incorrectos
- **Archivo:** `pages/demogratis.js:104`
- **Problema:** Instagram tiene `value="tiktok"`, ultima opcion dice "Youtube" con `value="otro"`
- **Impacto:** Datos de atribucion falsos — no sabes de donde vienen los leads
- **Fix:** Cambiar Instagram a `value="instagram"`, ultima opcion a texto/value correcto

## Medios (UX rota)

### BUG-4: Botones sin accion en Home
- **Archivo:** `pages/index.js`
- **Problema:** "DESCARGAR AHORA" (3 Modelos PDF) y "SOLICITAR AHORA" (Secretos) no hacen nada
- **Impacto:** CTAs muertos, usuario confundido
- **Fix:** Linkear a /prueba, a un PDF, o abrir modal de captura

### BUG-5: /plans — Grid vacio si API no responde
- **Archivo:** `pages/plans.js`
- **Problema:** No hay estado de error ni loading visible si la API falla
- **Impacto:** Pagina vacia sin explicacion
- **Fix:** Agregar loading spinner y mensaje de error

### BUG-6: Email hardcodeado en plans.js
- **Archivo:** `pages/plans.js:37`
- **Problema:** `email: "jampierv127@gmail.com"` hardcodeado en el payload de pago
- **Impacto:** Todos los pagos se asocian a un email incorrecto
- **Fix:** Usar email del usuario logueado o del formulario

## Menores (mejoras)

### BUG-7: Copyright 2024 en footer
- **Problema:** Dice "Copyright 2024", deberia ser 2024-2026 o dinamico
- **Fix:** `new Date().getFullYear()`

### BUG-8: Meta tags usan "of:title" en vez de "og:title"
- **Archivo:** `pages/index.js:169`
- **Problema:** `name="of:title"` no es un meta tag valido (deberia ser `og:title`)
- **Impacto:** Open Graph no funciona correctamente al compartir
- **Fix:** Cambiar `of:` a `og:`
