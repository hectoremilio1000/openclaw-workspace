---
tags: [programming, nextjs, patterns, frontend, impulso]
---

# Next.js Static Export Patterns

> Patrones aprendidos del sitio de Impulso Restaurantero (`output: "export"`).
> Aplican a cualquier proyecto Next.js con static export.

## Env vars se bakean en build time

Con `output: "export"`, las variables `NEXT_PUBLIC_*` se incrustan en el JS al hacer `next build`.

```
npm run dev    → lee .env + .env.local
next build     → lee .env + .env.production
```

**Implicacion:** si construyes con `.env` que apunta a localhost, el sitio en produccion va a llamar a localhost. Siempre verificar que `.env.production` tenga las URLs correctas.

## Dynamic imports para componentes pesados

```js
const MySwiper = dynamic(() => import("../components/SwiperPrueba"), {
  ssr: false,
});
```

Usar `ssr: false` para componentes que dependen de `window` (carousels, calendly, etc).

## Calendly embebido

```jsx
import { InlineWidget } from "react-calendly";
// Se renderiza inline, no como popup
```

No necesita API key. El widget carga directo de Calendly.

## Formularios con tracking de origin

```js
const data = {
  first_name, last_name, email, whatsapp,
  origin: "citaenvivo"  // trackear de donde viene el lead
};
await axios.post(`${apiUrl}/prospectsmeeting`, data);
```

Cada formulario debe tener un `origin` distinto para medir atribucion.

## Modal con sessionStorage (mostrar 1 vez)

```js
useEffect(() => {
  const seen = sessionStorage.getItem("seenEntryModal");
  if (!seen) {
    setShowEntryModal(true);
    sessionStorage.setItem("seenEntryModal", "1");
  }
}, []);
```

`sessionStorage` = se resetea al cerrar tab. `localStorage` = persiste.

## Images con unoptimized

```js
// next.config.js
images: { unoptimized: true }
```

Obligatorio con `output: "export"` porque no hay server para optimizar imagenes.

## Sitemap automatico

```js
// package.json
"postbuild": "next-sitemap --config next-sitemap.config.js"
```

Se genera automaticamente despues de cada build.
