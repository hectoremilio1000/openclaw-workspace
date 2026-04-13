---
tags: [impulso, tech, nextjs, vercel, railway]
---

# Impulso Restaurantero — Tech Stack

> Referencia rapida de la arquitectura tecnica del sitio web.

## Arquitectura

```
┌─────────────────────────────────────────────┐
│  VERCEL (Frontend)                          │
│  Next.js 15 — Static Export                 │
│  impulsorestaurantero.com                   │
│                                             │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐   │
│  │ Home     │ │ Prueba   │ │ Blog     │   │
│  │ (modal,  │ │ (quiz    │ │ (posts   │   │
│  │  Calendly│ │  IA)     │ │  API)    │   │
│  │  WhatsApp│ │          │ │          │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘   │
└───────┼─────────────┼────────────┼──────────┘
        │             │            │
        ▼             ▼            ▼
┌───────────────┐ ┌──────────────────────────┐
│  Railway API  │ │  Railway Blog API        │
│  (AdonisJS)   │ │  (AdonisJS)              │
│               │ │                          │
│ /prospectsm.. │ │ /api/posts               │
│ /prospectsW.. │ │ /api/posts/:slug         │
│ /questions..  │ │                          │
│ /plans        │ └──────────────────────────┘
│ /testpayment  │
│               │ ┌──────────────────────────┐
│               │ │  Railway Traspasos API   │
└───────────────┘ │  (AdonisJS)              │
                  │ /api/traspasos           │
                  └──────────────────────────┘
```

## APIs y endpoints

### API Principal (impulsorestauranteromercado)
| Endpoint | Metodo | Uso |
|----------|--------|-----|
| `/prospectsmeeting` | POST | Captura leads (cita sin costo) |
| `/prospectsWithRecommendations` | POST | Quiz IA + recomendaciones |
| `/questionsByContext/:contexto` | GET | Preguntas del quiz (planeacion/operando) |
| `/plans` | GET | Lista de planes/precios |
| `/testpayment` | POST | Crear preferencia MercadoPago |

### Blog API (adonisimpulsoblogapi)
| Endpoint | Metodo | Uso |
|----------|--------|-----|
| `/api/posts` | GET | Lista de posts del blog |
| `/api/posts/:slug` | GET | Post individual |

### Traspasos API (adonisimpulsoapipage)
| Endpoint | Metodo | Uso |
|----------|--------|-----|
| `/api/traspasos` | GET | Lista de traspasos disponibles |
| `/api/traspasos/:id` | GET | Traspaso individual |

## Dependencias clave

- **next** 15.5.2 — Framework
- **react** 18.2.0 — UI
- **tailwindcss** 3.2.7 — Styling
- **antd** 5.20.1 — UI components
- **axios** 1.7.7 — HTTP
- **react-calendly** 4.1.1 — Scheduling
- **framer-motion** 11.3.28 — Animations
- **swiper** 11.0.6 — Carousels
- **next-sitemap** 4.0.6 — SEO

## Tracking

| Pixel | ID |
|-------|---|
| Google Tag Manager | GTM-M676V953 |
| Facebook Pixel | via fbq (lib/fpixel.js) |
| TikTok Pixel | via tiktok-pixel package |

## DNS

```
impulsorestaurantero.com
  A record → 76.76.21.21 (Vercel)
  
www.impulsorestaurantero.com
  CNAME → cname.vercel-dns.com (Vercel)
  
Nameservers: Banahosting (ns9081/ns9082.banahosting.com)
```
