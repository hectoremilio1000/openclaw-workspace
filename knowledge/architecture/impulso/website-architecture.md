---
tags: [impulso, architecture, nextjs, website]
---

# Impulso Restaurantero — Website Architecture

> Como esta construido el sitio web de Impulso Restaurantero.
> Relacionado: [[projects/impulso/current-state|Estado actual]], [[projects/impulso/tech-stack|Tech Stack]]

## Stack

- **Framework:** Next.js 15.5 con `output: "export"` (static site generation)
- **Styling:** Tailwind CSS + Ant Design + Styled Components + Framer Motion
- **Deploy:** Vercel (static files)
- **Backend:** 3 APIs AdonisJS en Railway
- **Pagos:** MercadoPago SDK

## Arquitectura general

```
                    ┌──────────────────────────┐
                    │  VERCEL                   │
                    │  Static Export (HTML/JS)   │
                    │  impulsorestaurantero.com  │
                    └──────────┬───────────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                 ▼
    ┌─────────────────┐ ┌──────────────┐ ┌──────────────┐
    │ API Principal    │ │ Blog API     │ │ Traspasos API│
    │ (Railway)        │ │ (Railway)    │ │ (Railway)    │
    │                  │ │              │ │              │
    │ • prospects      │ │ • posts      │ │ • traspasos  │
    │ • questions      │ │ • slugs      │ │ • detalles   │
    │ • plans          │ │              │ │              │
    │ • payments       │ │              │ │              │
    │ • EMAIL SENDING  │ │              │ │              │
    └─────────────────┘ └──────────────┘ └──────────────┘
```

## Flujo de paginas

```
/ (Home)
├── Modal de entrada (sessionStorage, 1 vez por sesion)
│   └── CTA → abre formulario de cita
├── Banner "DARME UNA CITA SIN COSTO"
│   └── Modal con form → POST /prospectsmeeting → email automatico
├── Casos de estudio (cards con videos YouTube)
├── Calendly embebido (inline widget)
├── About section (+$150MP ganancias, +350 clientes)
├── 4 cards de contenido (Iniciar restaurante, 3 Modelos, Anuncios, Secretos)
├── Testimonios section
└── WhatsApp flotante (wa.me/5215531491808)

/prueba (Quiz IA)
├── Pregunta inicial: Planeacion u Operando
├── GET /questionsByContext/:contexto → preguntas dinamicas
├── Checkboxes/radio por pregunta
├── Modal de datos personales
└── POST /prospectsWithRecommendations → email con recomendaciones → /gracias

/demogratis
└── Formulario con campos → ❌ HANDLER VACIO (bug)

/comolohacemos
└── 11 subpaginas de modulos de servicio

/casosexito
├── Grid de casos
└── /casosexitos/lalloronacantina (caso individual detallado)

/blog
├── Grid de posts (desde Blog API Railway)
└── /blog/[slug] (post individual)

/plans
└── Grid de planes (desde API /plans) → MercadoPago checkout

/traspasos
└── Lista de restaurantes en traspaso

/contacto → ❌ VACIA (bug)
/gracias → Thank you page
```

## Componentes compartidos

| Componente | Donde se usa | Descripcion |
|-----------|-------------|-------------|
| `NavBarEs` | Home | Nav transparente con scroll effect |
| `NavBarBlack` | Todas las demas paginas | Nav fondo negro fijo |
| `WhatsappButton` | Todas las paginas | Boton flotante verde |
| `CasosEstudio` | Home | Cards de casos con video |
| `About` | Home | Section "sobre nosotros" |
| `MySwiper` | Home | Carousel/banner principal (dynamic import, no SSR) |
| `InlineWidget` | Home | Calendly embebido |

## Sistema de emails

El backend en Railway envia emails automaticos cuando alguien llena un formulario:

- **Remitente:** `no-reply@impulsorestaurantero.com`
- **Trigger:** `POST /prospectsmeeting`
- **Contenido:** Confirmacion de solicitud + promesa de contacto para meeting
- **Estado:** ✅ Funcionando en produccion (verificado 2026-04-13)

## Tracking y analytics

```
GTM-M676V953 (Google Tag Manager)
├── Google Analytics (via gtag)
├── Facebook Pixel (lib/fpixel.js)
└── TikTok Pixel (tiktok-pixel package)
```

Cada formulario trackea `origin` para atribucion:
- `"citaenvivo"` → modal/banner del Home
- `"inteligenciaArtificial"` → quiz en /prueba
- `"demoGratis"` → formulario /demogratis
- `"CasosExitoModaldemogratis"` → modal desde casos de exito
