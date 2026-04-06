# 🌐 Módulo "Página Web" — Diseño Detallado v2

## Resumen

Un módulo dentro del Centro de Control que permite generar páginas web para restaurantes con un click. Usa una plantilla Next.js parametrizable (basada en `lloronaNext180223`) y deploya automáticamente a Vercel.

**Filosofía:** No somos Durable (generar y olvidar). Somos un **Webflow vertical para restaurantes** — sitio conectado al POS, al bot, a las reservaciones y al inventario. Todo vivo y aprendiendo.

**Diferenciador vs Wix/Squarespace/Durable:** Ellos generan sitios genéricos. Nosotros generamos un sitio conectado a datos reales del restaurante que se actualizan solos.

---

## 1. Arquitectura General

```
┌─────────────────────────────────────────────────────────┐
│  Centro de Control (pos_centro_front : 5004)            │
│  Nueva sección: "Páginas Web" en sidebar                │
│  → Wizard de configuración                              │
│  → IA genera borradores de contenido (tú apruebas)     │
│  → Insights del Bot → sugerencias para la web           │
│  → Solicitudes de cambio del dueño                      │
│  → Preview en vivo                                      │
│  → Botón "Crear / Re-deployar"                          │
└──────────────────┬──────────────────────────────────────┘
                   │ API calls
                   ▼
┌─────────────────────────────────────────────────────────┐
│  pos_website_api (nuevo microservicio AdonisJS)         │
│  → CRUD configuración de sitio                          │
│  → Genera contenido con IA (borradores para revisión)   │
│  → Solicitudes de cambio (mini-kanban)                  │
│  → Insights del bot (preguntas frecuentes → sugerencias)│
│  → Genera proyecto Next.js desde plantilla              │
│  → Llama Vercel API para deploy                         │
│  → Guarda estado del deploy (URL, status, dominio)      │
└────────┬──────────────────┬─────────────────────────────┘
         │ Vercel API       │ APIs internas (tiempo real)
         ▼                  ▼
┌────────────────┐  ┌──────────────────────────────────────┐
│  Vercel        │  │  Microservicios existentes           │
│  → Proyecto    │  │  → pos_inventory_api (menú/precios)  │
│    por rest.   │  │  → pos_reservation_api (widget)      │
│  → Subdominio  │  │  → pos_bot_api (base conocimiento)   │
│  → CDN/SSL     │  │  → pos_auth_api (perfil restaurante) │
└────────────────┘  └──────────────────────────────────────┘
```

### Capas de datos (estático vs dinámico)

| Capa | Qué contiene | Cómo se actualiza |
|------|-------------|-------------------|
| **Estática (deploy)** | Diseño, colores, estructura, textos About, SEO, hero images, galería | Re-deploy desde Centro de Control |
| **Dinámica (API runtime)** | Menú, precios, disponibilidad de reservaciones, horarios | Tiempo real desde microservicios — el dueño actualiza su POS y la web cambia sola |
| **IA-sugerida** | FAQ, contenido SEO, landing pages, mejoras basadas en el bot | Bot sugiere → tú apruebas en Centro de Control → re-deploy |

---

## 2. Base de Datos

### Tabla `website_configs`

```sql
CREATE TABLE website_configs (
  id              SERIAL PRIMARY KEY,
  restaurant_id   INT NOT NULL REFERENCES restaurants(id) UNIQUE,
  
  -- Identidad
  slug            VARCHAR(100) UNIQUE NOT NULL,
  site_name       VARCHAR(255),
  tagline         VARCHAR(500),
  description     TEXT,                          -- SEO meta description
  
  -- Contenido (auto-llenado desde perfil Asistente IA)
  concept         TEXT,
  cuisine_type    VARCHAR(255),
  city            VARCHAR(255),
  address         TEXT,
  phone           VARCHAR(50),
  email           VARCHAR(255),
  
  -- Textos generados por IA (borradores aprobados por admin)
  about_text      TEXT,                          -- texto About aprobado
  seo_title       VARCHAR(255),
  seo_description TEXT,
  
  -- Branding
  logo_url        VARCHAR(500),
  favicon_url     VARCHAR(500),
  primary_color   VARCHAR(20) DEFAULT '#000000',
  accent_color    VARCHAR(20) DEFAULT '#D4A574',
  font_family     VARCHAR(100) DEFAULT 'Inter',
  
  -- Media
  hero_images     JSONB DEFAULT '[]',            -- [{url, alt, order}]
  gallery_images  JSONB DEFAULT '[]',            -- [{url, alt, category}]
  hero_video_url  VARCHAR(500),
  
  -- Menú (fuente: estático O dinámico)
  menu_source     VARCHAR(20) DEFAULT 'static',  -- 'static' | 'api' | 'pdf'
  menu_sections   JSONB DEFAULT '[]',            -- solo si menu_source='static'
  menu_pdf_url    VARCHAR(500),                  -- solo si menu_source='pdf'
  -- si menu_source='api' → la plantilla jala de pos_inventory_api en runtime
  
  -- Horarios
  schedule        JSONB DEFAULT '{}',
  
  -- Social
  social_links    JSONB DEFAULT '{}',
  
  -- Reservaciones
  reservation_enabled   BOOLEAN DEFAULT true,
  reservation_slug      VARCHAR(100),
  
  -- FAQ (generado desde insights del bot)
  faq_items       JSONB DEFAULT '[]',            -- [{question, answer, source, approved}]
  
  -- SEO / Analytics
  google_analytics_id   VARCHAR(50),
  facebook_pixel_id     VARCHAR(50),
  tiktok_pixel_id       VARCHAR(50),
  meta_keywords         TEXT,
  
  -- Secciones habilitadas
  sections_enabled  JSONB DEFAULT '["hero","about","menu","gallery","reservations","faq","contact","footer"]',
  
  -- Landing pages para ads
  landing_pages   JSONB DEFAULT '[]',            -- [{slug, title, utm_source, utm_medium, cta_text, headline, description, image_url}]
  
  -- Legal
  privacy_policy_url    VARCHAR(500),            -- auto-generado (LFPDPPP México)
  
  -- Deploy
  vercel_project_id     VARCHAR(100),
  vercel_deploy_url     VARCHAR(500),
  vercel_project_url    VARCHAR(500),
  custom_domain         VARCHAR(255),
  deploy_status         VARCHAR(20) DEFAULT 'draft',  -- draft | building | live | error
  deploy_error          TEXT,
  last_deployed_at      TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla `website_change_requests` (solicitudes del dueño)

```sql
CREATE TABLE website_change_requests (
  id              SERIAL PRIMARY KEY,
  restaurant_id   INT NOT NULL REFERENCES restaurants(id),
  
  title           VARCHAR(500) NOT NULL,         -- "Cambiar foto del hero"
  description     TEXT,                          -- detalle de lo que quiere
  source          VARCHAR(50) DEFAULT 'manual',  -- 'manual' | 'whatsapp' | 'pos_admin'
  status          VARCHAR(20) DEFAULT 'pending', -- pending | in_progress | done | rejected
  priority        VARCHAR(20) DEFAULT 'normal',  -- low | normal | high
  
  admin_notes     TEXT,                          -- notas tuyas
  completed_at    TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ DEFAULT NOW(),
  updated_at      TIMESTAMPTZ DEFAULT NOW()
);
```

### Tabla `website_bot_insights` (sugerencias del bot)

```sql
CREATE TABLE website_bot_insights (
  id              SERIAL PRIMARY KEY,
  restaurant_id   INT NOT NULL REFERENCES restaurants(id),
  
  insight_type    VARCHAR(50) NOT NULL,          -- 'faq' | 'highlight_dish' | 'add_section' | 'landing_page' | 'seo'
  title           VARCHAR(500) NOT NULL,         -- "87 personas preguntaron por estacionamiento"
  suggestion      TEXT NOT NULL,                 -- "Agregar FAQ: ¿Tienen estacionamiento? Sí, estacionamiento..."
  data            JSONB DEFAULT '{}',            -- datos de soporte (conteos, queries del bot, etc.)
  
  status          VARCHAR(20) DEFAULT 'pending', -- pending | approved | rejected | applied
  applied_at      TIMESTAMPTZ,
  
  created_at      TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 3. Wizard del Admin (Centro de Control)

### Paso 1: Datos Básicos
**Auto-llenado desde perfil del restaurante + Asistente IA.**

| Campo | Fuente automática | Editable |
|-------|-------------------|----------|
| Nombre del sitio | `restaurant.name` | ✅ |
| Slug (subdominio) | auto-generado del nombre | ✅ |
| Concepto | Asistente IA → `concept` | ✅ |
| Tipo de cocina | Asistente IA → `cuisine_type` | ✅ |
| Dirección | Asistente IA → `city/address` | ✅ |
| Teléfono | restaurante config | ✅ |
| Email | restaurante config | ✅ |
| Horarios | editable por día | ✅ |
| **Texto About** | 🤖 **IA genera borrador** desde concepto + diferenciadores + tono de marca | ✅ Tú apruebas/editas |
| **SEO Title** | 🤖 **IA genera** desde nombre + tipo cocina + ciudad | ✅ Tú apruebas/editas |
| **SEO Description** | 🤖 **IA genera** desde concepto + público objetivo | ✅ Tú apruebas/editas |

**Botón:** "🤖 Generar contenido con IA" → genera borradores → los ves inline → editas si quieres → guardas.

### Paso 2: Branding

| Campo | Input |
|-------|-------|
| Logo | Upload (S3) |
| Favicon | Upload o auto-genera del logo |
| Color primario | Color picker |
| Color acento | Color picker |
| Fuente | Dropdown (Inter, Playfair Display, Montserrat, Cormorant Garamond, Poppins) |

### Paso 3: Media

| Campo | Input |
|-------|-------|
| Imágenes hero (1-5) | Upload con drag & drop, reordenar |
| Video portada | URL de YouTube/Vimeo o upload |
| Galería (0-20) | Upload con categorías (Platillos, Ambiente, Eventos) |
| **Alt text** | 🤖 **IA genera automáticamente** por imagen (accesibilidad + SEO) |

### Paso 4: Menú

**Tres fuentes (radio buttons):**

| Opción | Descripción |
|--------|------------|
| **📡 Dinámico (API)** | Jala del inventario en `pos_inventory_api` en tiempo real. El dueño actualiza precios/platillos en su POS y la web se actualiza sola. **Recomendado.** |
| **📋 Estático** | Tú armas secciones + platillos manualmente en el wizard. |
| **📄 PDF** | Sube un PDF del menú. Simple pero no SEO-friendly. |

### Paso 5: Integraciones

| Campo | Input |
|-------|-------|
| Reservaciones | Toggle on/off + auto-conecta widget existente del `pos_reservation_api` |
| Google Analytics | ID (opcional) |
| Facebook Pixel | ID (opcional) |
| TikTok Pixel | ID (opcional) |
| Instagram | URL |
| Facebook | URL |
| TikTok | URL |
| Google Maps | URL o Place ID |
| TripAdvisor | URL |

### Paso 6: Campañas (Landing Pages para Ads)

| Campo | Input |
|-------|-------|
| Toggle "¿Hace ads?" | Sí/No |
| **Google Ads** | Toggle → genera `/google` + `/gracias-google` con UTM `?utm_source=google&utm_medium=cpc` |
| **Facebook Ads** | Toggle → genera `/facebook` + `/gracias-facebook` |
| **TikTok Ads** | Toggle → genera `/tiktok` + `/gracias-tiktok` |
| Headline por canal | Editable (IA sugiere basado en público objetivo) |
| CTA text | Editable (default: "Reserva ahora") |

Cada landing page incluye:
- Hero image + headline + CTA de reservación
- Pixel fire en la página de gracias (conversión tracking)
- UTM params pre-configurados

**💰 Esto se puede cobrar como add-on en tus planes.**

### Paso 7: Preview & Deploy

- **Preview en vivo** — renderiza la plantilla con los datos en un iframe
- **Checklist pre-deploy:**
  - ✅ Logo subido
  - ✅ Al menos 1 hero image
  - ✅ Texto About aprobado
  - ✅ Menú configurado
  - ✅ Aviso de privacidad (auto-generado)
- **Botón "Crear Página Web"** → genera proyecto → deploya a Vercel
- Muestra URL: `{slug}.growthsuite.com`
- Opción para dominio custom después

---

## 4. Tabs por Restaurante (post-creación)

Una vez creada la página, la vista por restaurante tiene 4 tabs:

### Tab 1: Configuración
El mismo wizard, pero para editar. Cualquier cambio → botón "Re-deployar".

### Tab 2: Insights del Bot 🤖

Muestra sugerencias generadas automáticamente desde la Base de Conocimiento y las interacciones del bot del restaurante.

```
┌──────────────────────────────────────────────────────────────────┐
│  💡 Insights del Bot                               3 pendientes  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  📊 FAQ: "¿Tienen estacionamiento?"                   87 veces  │
│  Sugerencia: Agregar a FAQ → "Sí, contamos con                  │
│  estacionamiento en Calle Donceles #28, a 50m del restaurante"  │
│  [Aprobar y agregar]  [Editar]  [Descartar]                     │
│                                                                  │
│  ⭐ Platillo destacado: Tacos de camarón             +52% mencionado │
│  Sugerencia: Destacar como "Platillo estrella" en el hero       │
│  [Aprobar]  [Descartar]                                         │
│                                                                  │
│  💳 Info faltante: Métodos de pago                    23 preguntas │
│  Sugerencia: Agregar badges (Visa/MC/Amex/efectivo) al footer   │
│  [Aprobar]  [Descartar]                                         │
│                                                                  │
│  🎯 Landing sugerida: 40% reservaciones vienen de Google        │
│  Sugerencia: Crear landing page optimizada para Google Ads      │
│  [Crear landing]  [Descartar]                                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Flujo de generación de insights:**
1. `pos_bot_api` registra queries y respuestas del bot
2. Un job periódico (cron o batch) analiza las preguntas frecuentes
3. Agrupa por tema → genera insight + sugerencia → guarda en `website_bot_insights`
4. Tú los ves en Centro de Control → apruebas → se aplica al sitio → re-deploy

### Tab 3: Solicitudes del Dueño

Mini-kanban de cambios que pide el dueño del restaurante:

```
┌──────────────────────────────────────────────────────────────────┐
│  📝 Solicitudes                                    2 pendientes  │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  🔴 Pendiente                                                    │
│  ├── "Cambiar foto del hero por la nueva del patio"    Hace 2d  │
│  └── "Agregar menú de temporada de Cuaresma"           Hace 1d  │
│                                                                  │
│  🟡 En proceso                                                   │
│  └── (vacío)                                                     │
│                                                                  │
│  🟢 Completado                                                   │
│  ├── "Actualizar horario de domingos"                  15 Feb   │
│  └── "Agregar link de TripAdvisor"                     10 Feb   │
│                                                                  │
│  [+ Nueva solicitud]                                             │
└──────────────────────────────────────────────────────────────────┘
```

**Fuentes de solicitudes:**
- **Manual:** tú las creas desde Centro de Control
- **WhatsApp:** el dueño te manda mensaje, tú lo conviertes en solicitud
- **POS Admin (futuro):** el dueño desde su panel → "Solicitar cambio en mi web"

### Tab 4: Deploys

Historial de deployments:

```
┌──────────────────────────────────────────────────────────────────┐
│  🚀 Deploys                                                      │
├──────────────────────────────────────────────────────────────────┤
│  ✅ Live    22 Feb 2026 14:30    "Agregada sección FAQ"          │
│  ✅ Live    18 Feb 2026 10:15    "Actualizado hero image"        │
│  ✅ Live    15 Feb 2026 09:00    "Creación inicial"              │
│                                                                  │
│  URL: https://cafe-de-tacuba.growthsuite.com                     │
│  Dominio custom: www.cafedetacuba.com.mx (✅ activo)             │
│                                                                  │
│  [Re-deployar]  [Ver en Vercel]                                  │
└──────────────────────────────────────────────────────────────────┘
```

---

## 5. Plantilla Next.js Parametrizable

### Estructura del template (`pos_website_template/`):

```
pos_website_template/
├── next.config.js
├── tailwind.config.js          ← colores dinámicos desde site.config
├── package.json
├── site.config.json            ← SE GENERA POR RESTAURANT (datos estáticos)
├── lib/
│   ├── api.js                  ← cliente para APIs dinámicas (menú, reservaciones)
│   └── config.js               ← lee site.config.json
├── pages/
│   ├── index.js                ← Landing principal
│   ├── menu.js                 ← Menú (estático o dinámico vía API)
│   ├── reservar.js             ← Widget de reservaciones embebido
│   ├── galeria.js              ← Galería de fotos
│   ├── contacto.js             ← Mapa + horarios + formulario
│   ├── faq.js                  ← Preguntas frecuentes (generado por bot)
│   ├── privacidad.js           ← Aviso de privacidad (auto-generado LFPDPPP)
│   ├── gracias.js              ← Página post-conversión (genérica)
│   ├── gracias-google.js       ← Conversión Google Ads
│   ├── gracias-facebook.js     ← Conversión Facebook Ads
│   ├── gracias-tiktok.js       ← Conversión TikTok Ads
│   ├── google.js               ← Landing page Google Ads
│   ├── facebook.js             ← Landing page Facebook Ads
│   └── tiktok.js               ← Landing page TikTok Ads
├── components/
│   ├── Layout/                 ← NavBar + Footer (con badges de pago si aplica)
│   ├── Hero/                   ← Slider/video de portada
│   ├── About/                  ← Concepto, historia (texto aprobado por admin)
│   ├── MenuPreview/            ← Vista previa del menú en home
│   ├── MenuFull/               ← Menú completo (estático o fetch de API)
│   ├── Gallery/                ← Grid de fotos con lightbox
│   ├── Reservations/           ← Widget embebido de pos_reservation_api
│   ├── FAQ/                    ← Preguntas frecuentes (datos del bot)
│   ├── Contact/                ← Mapa + info + horarios
│   ├── LandingHero/            ← Hero específico para landing pages de ads
│   ├── SEOHead/                ← Meta tags dinámicos + structured data (Restaurant schema)
│   └── Analytics/              ← GA, FB Pixel, TikTok Pixel (condicionales)
├── public/
│   └── (favicon, manifest, robots.txt)
└── styles/
    └── globals.css
```

### `site.config.json` (generado por el API):

```json
{
  "siteName": "La Llorona",
  "tagline": "Cantina Mexicana desde 1912",
  "seoTitle": "La Llorona | Cantina Mexicana Tradicional en el Centro Histórico CDMX",
  "seoDescription": "Restaurante histórico de cocina mexicana tradicional fundado en 1912. Reserva tu mesa en el Centro Histórico de la Ciudad de México.",
  "aboutText": "Más de 110 años de historia ininterrumpida...",
  "concept": "Fundado en 1912 por Dionisio Mollinedo...",
  "cuisineType": "Mexicana tradicional",
  "address": "Calle de Tacuba 28, Cuauhtémoc, 06010",
  "city": "Ciudad de México",
  "phone": "+52 55 5521 2345",
  "email": "reservas@lallorona.mx",
  "schedule": {
    "mon": { "open": "08:00", "close": "23:00" },
    "tue": { "open": "08:00", "close": "23:00" },
    "wed": { "open": "08:00", "close": "23:00" },
    "thu": { "open": "08:00", "close": "23:00" },
    "fri": { "open": "08:00", "close": "00:00" },
    "sat": { "open": "08:00", "close": "00:00" },
    "sun": { "open": "08:00", "close": "22:00" }
  },
  "branding": {
    "logoUrl": "https://s3.../logo.png",
    "primaryColor": "#1a1a2e",
    "accentColor": "#d4a574",
    "fontFamily": "Playfair Display"
  },
  "heroImages": [
    { "url": "https://s3.../hero1.jpg", "alt": "Fachada colonial de La Llorona en el Centro Histórico" },
    { "url": "https://s3.../hero2.jpg", "alt": "Interior con vitrales y pinturas coloniales" }
  ],
  "heroVideoUrl": null,
  "galleryImages": [
    { "url": "https://s3.../g1.jpg", "alt": "Tacos de camarón rebozado", "category": "Platillos" },
    { "url": "https://s3.../g2.jpg", "alt": "Mezcal artesanal con chapulín", "category": "Bebidas" }
  ],
  "menu": {
    "source": "api",
    "apiUrl": "https://api.growthsuite.com/api/inventory/public/la-llorona",
    "sections": [],
    "pdfUrl": null
  },
  "reservation": {
    "enabled": true,
    "widgetUrl": "https://api.growthsuite.com/api/w/la-llorona"
  },
  "faq": [
    { "question": "¿Tienen estacionamiento?", "answer": "Sí, contamos con estacionamiento en Calle Donceles #28, a 50 metros del restaurante." },
    { "question": "¿Aceptan tarjeta de crédito?", "answer": "Sí, aceptamos Visa, Mastercard, American Express y efectivo." },
    { "question": "¿Tienen menú para niños?", "answer": "Sí, contamos con opciones especiales para los pequeños." }
  ],
  "social": {
    "instagram": "https://instagram.com/lallorona",
    "facebook": "https://facebook.com/lallorona",
    "tiktok": "https://tiktok.com/@lallorona",
    "googleMaps": "https://maps.google.com/...",
    "tripadvisor": "https://tripadvisor.com/..."
  },
  "analytics": {
    "googleAnalyticsId": "G-XXXXX",
    "facebookPixelId": "123456",
    "tiktokPixelId": "789012"
  },
  "landingPages": {
    "google": {
      "enabled": true,
      "headline": "La mejor comida mexicana tradicional en el Centro Histórico",
      "ctaText": "Reserva tu mesa",
      "utm": { "source": "google", "medium": "cpc" }
    },
    "facebook": {
      "enabled": true,
      "headline": "¿Buscas un lugar único para cenar? Descubre La Llorona",
      "ctaText": "Reserva ahora",
      "utm": { "source": "facebook", "medium": "paid" }
    },
    "tiktok": {
      "enabled": false
    }
  },
  "legal": {
    "privacyPolicyUrl": "/privacidad",
    "businessName": "La Llorona Cantina Mexicana S.A. de C.V."
  },
  "sectionsEnabled": ["hero", "about", "menu", "gallery", "reservations", "faq", "contact", "footer"]
}
```

### Datos dinámicos (runtime, no en site.config)

La plantilla hace fetch en runtime (ISR/SSR o client-side) para:

| Dato | Endpoint | Frecuencia |
|------|----------|-----------|
| Menú + precios | `GET /api/inventory/public/{slug}` | ISR cada 1h |
| Disponibilidad reservaciones | `GET /api/w/{slug}/availability` | Client-side (tiempo real) |
| Horarios especiales | `GET /api/website/{slug}/schedule` | ISR cada 6h |

Esto significa que si el dueño actualiza un precio en su POS, **la web lo refleja en máximo 1 hora sin re-deploy.**

---

## 6. IA: Copiloto de Contenido (nunca auto-publica)

### Qué genera la IA:

| Contenido | Input (fuente) | Output | Quién aprueba |
|-----------|----------------|--------|---------------|
| Texto About | Concepto + diferenciadores + tono de marca (Asistente IA) | Párrafos descriptivos | Tú |
| SEO Title | Nombre + tipo cocina + ciudad | `<title>` tag | Tú |
| SEO Description | Concepto + público objetivo | `<meta description>` | Tú |
| Alt text de imágenes | Imagen subida | Texto descriptivo | Auto (revisable) |
| FAQ | Preguntas frecuentes del bot | Pregunta + respuesta | Tú |
| Headlines de landing pages | Público objetivo + tipo cocina + canal (Google/FB/TikTok) | Texto headline | Tú |
| Aviso de privacidad | Nombre fiscal, dirección, giro | Texto legal LFPDPPP | Auto-generado |

### Regla de oro:
**La IA genera borradores. Tú revisas y apruebas. Nunca se publica contenido IA sin tu OK.**

---

## 7. Deploy Flow (pos_website_api)

```
1. Admin configura en wizard → POST /api/websites (guarda en DB)
2. Admin hace click "Crear/Re-deployar"
3. API genera site.config.json con los datos aprobados
4. API copia plantilla a directorio temporal (/tmp/website-{slug}-{timestamp})
5. Inyecta site.config.json
6. Ejecuta: vercel --prod --token $VERCEL_TOKEN --scope growthsuite
7. Parsea output → obtiene URL del deployment
8. Actualiza DB: vercel_project_id, deploy_url, deploy_status='live'
9. Retorna URL al frontend
10. (Si hay custom domain configurado) → vercel domains add {domain}
```

### Variables de entorno en Vercel (por proyecto):
```
NEXT_PUBLIC_API_BASE_URL=https://api.growthsuite.com
NEXT_PUBLIC_RESTAURANT_SLUG=la-llorona
NEXT_PUBLIC_GA_ID=G-XXXXX
NEXT_PUBLIC_FB_PIXEL_ID=123456
NEXT_PUBLIC_TIKTOK_PIXEL_ID=789012
```

---

## 8. Sidebar del Centro de Control

Agregar en el grupo "Operaciones":

```tsx
{
  key: "/paginas-web",
  icon: <GlobalOutlined />,
  label: "Páginas Web",
}
```

### Vista lista (`/paginas-web`):

```
┌──────────────────────────────────────────────────────────────────────────┐
│  🌐 Páginas Web                                          [+ Nueva]      │
├──────┬──────────────────────┬────────────┬──────────────┬───────────────┤
│  ID  │  Restaurante         │  Estado    │  URL         │  Acciones     │
├──────┼──────────────────────┼────────────┼──────────────┼───────────────┤
│  5   │  La Llorona          │  🟢 Live   │  la-llor...  │  [Editar]     │
│  7   │  Café de Tacuba      │  🟢 Live   │  cafe-de...  │  [Editar]     │
│  6   │  Impulso Coffee      │  ⚪ Draft  │  —           │  [Configurar] │
│  8   │  Jampier             │  —         │  —           │  [Crear]      │
└──────┴──────────────────────┴────────────┴──────────────┴───────────────┘
```

---

## 9. Seguridad y Privacidad

| Control | Implementación |
|---------|---------------|
| **Datos de comensales nunca en web estática** | Reservaciones son via widget (API), no se guardan en el sitio |
| **IA no se entrena con datos de clientes** | Solo usa perfil del restaurante (público) |
| **HTTPS obligatorio** | Vercel lo incluye gratis (Let's Encrypt) |
| **Aviso de privacidad** | Auto-generado conforme LFPDPPP (México) |
| **Alt text para accesibilidad** | IA genera, mejora WCAG compliance |
| **Structured data (Schema.org)** | Restaurant schema para Google (SEO) |

---

## 10. Fases de Implementación

### Fase 1 — MVP (3-4 días)
- [ ] Migración DB: `website_configs`
- [ ] `pos_website_api`: CRUD config + endpoint de deploy (Vercel CLI)
- [ ] Plantilla Next.js parametrizable (simplificada de lloronaNext)
  - [ ] Hero, About, Menú (estático), Galería, Reservaciones (widget), Contacto, Footer
  - [ ] `site.config.json` driven
  - [ ] Tailwind con colores dinámicos
  - [ ] SEO (meta tags, sitemap, robots)
- [ ] `pos_centro_front`: sección "Páginas Web" con wizard de 7 pasos
- [ ] Deploy automático a Vercel
- [ ] Auto-llenado desde perfil del restaurante

### Fase 2 — IA + Dinámico (1-2 semanas)
- [ ] Generación de contenido con IA (About, SEO, alt text)
- [ ] Menú dinámico desde `pos_inventory_api` (ISR)
- [ ] Landing pages para ads (Google, Facebook, TikTok)
- [ ] Preview en vivo dentro del wizard
- [ ] Aviso de privacidad auto-generado
- [ ] Migración: `website_change_requests`
- [ ] Tab de solicitudes de cambio (mini-kanban)

### Fase 3 — Bot Insights (2-3 semanas)
- [ ] Migración: `website_bot_insights`
- [ ] Job que analiza queries del bot → genera insights
- [ ] Tab "Insights del Bot" con approve/reject
- [ ] FAQ auto-generado desde insights aprobados
- [ ] Structured data (Restaurant schema) para Google

### Fase 4 — Futuro
- [ ] Múltiples plantillas/temas
- [ ] Custom domains desde el wizard
- [ ] Blog/noticias
- [ ] Analytics dashboard (visitas, conversiones) dentro de Centro de Control
- [ ] A/B testing de landing pages
- [ ] Editor visual (drag & drop secciones)
- [ ] POS Admin: solicitud de cambios directa del dueño

---

## 11. Stack Técnico

| Componente | Tech |
|-----------|------|
| API | AdonisJS 6 (TypeScript) — como tus otros microservicios |
| DB | PostgreSQL (misma instancia, schema `public`) |
| Frontend admin | React + Ant Design + React Router (como `pos_centro_front`) |
| Plantilla web | Next.js 14 + Tailwind CSS + Framer Motion |
| Deploy | Vercel (CLI en Fase 1, API en Fase 2+) |
| Storage media | S3 (bucket existente: `imagenesrutalab`) |
| CDN | Vercel Edge Network (incluido) |
| IA contenido | OpenAI API (o Anthropic) via `pos_bot_api` existente |

---

## 12. Endpoints del API (`pos_website_api`)

```
# CRUD
GET    /api/websites                     → lista todos los sitios
GET    /api/websites/:restaurantId       → config de un sitio
POST   /api/websites                     → crear config
PUT    /api/websites/:id                 → actualizar config
DELETE /api/websites/:id                 → eliminar config

# Deploy
POST   /api/websites/:id/deploy          → generar + deployar a Vercel
GET    /api/websites/:id/deploy-status   → status del último deploy

# IA
POST   /api/websites/:id/generate-content → genera borradores con IA
POST   /api/websites/:id/generate-alt-text → genera alt text para imágenes

# Solicitudes de cambio
GET    /api/websites/:id/requests         → lista solicitudes
POST   /api/websites/:id/requests         → crear solicitud
PUT    /api/websites/:id/requests/:reqId  → actualizar status

# Bot Insights
GET    /api/websites/:id/insights         → lista insights
PUT    /api/websites/:id/insights/:insId  → aprobar/rechazar insight
POST   /api/websites/:id/insights/generate → trigger manual de análisis

# Público (para la plantilla en runtime)
GET    /api/website/public/:slug/config   → config pública (sin datos sensibles)
GET    /api/website/public/:slug/schedule → horarios actualizados
```
