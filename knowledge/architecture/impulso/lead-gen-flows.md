---
tags: [impulso, architecture, marketing, leads]
---

# Impulso Restaurantero — Lead Generation Flows

> Todos los flujos de captura de leads del sitio web.
> Relacionado: [[projects/impulso/marketing-strategy|Estrategia de Marketing]], [[knowledge/architecture/impulso/website-architecture|Arquitectura del sitio]]

## Mapa de flujos

```
┌─────────────────────────────────────────────────────────────────┐
│                    FUENTES DE TRAFICO                           │
│  Instagram │ Facebook │ TikTok │ Google │ WhatsApp │ Referidos  │
└──────┬──────────┬─────────┬────────┬────────┬─────────┬────────┘
       │          │         │        │        │         │
       ▼          ▼         ▼        ▼        ▼         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PUNTOS DE ENTRADA                            │
│                                                                 │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐          │
│  │ Home     │ │ /prueba  │ │/demogratis│ │ /blog    │          │
│  │ Modal +  │ │ Quiz IA  │ │ Form     │ │ SEO      │          │
│  │ Banner   │ │          │ │ ❌ ROTO  │ │ Content  │          │
│  └────┬─────┘ └────┬─────┘ └──────────┘ └────┬─────┘          │
│       │             │                          │                │
└───────┼─────────────┼──────────────────────────┼────────────────┘
        │             │                          │
        ▼             ▼                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                    CAPTURA DE DATOS                              │
│                                                                 │
│  Flow 1: Cita         Flow 2: Quiz IA       Flow 3: Calendly   │
│  ┌───────────────┐   ┌───────────────┐      ┌──────────────┐   │
│  │ nombre        │   │ planeacion/   │      │ Calendly     │   │
│  │ apellido      │   │ operando      │      │ embebido     │   │
│  │ email         │   │     ↓         │      │ en Home      │   │
│  │ whatsapp      │   │ preguntas     │      │              │   │
│  │ origin        │   │ dinamicas     │      │ (no captura  │   │
│  │     ↓         │   │     ↓         │      │  en nuestra  │   │
│  │ POST /api/    │   │ nombre+email  │      │  DB)         │   │
│  │ prospectsm..  │   │ +whatsapp     │      └──────────────┘   │
│  └───────┬───────┘   │     ↓         │                         │
│          │           │ POST /api/    │      Flow 4: WhatsApp   │
│          │           │ prospectsW..  │      ┌──────────────┐   │
│          │           └───────┬───────┘      │ wa.me/       │   │
│          │                   │              │ 5215531491808│   │
│          │                   │              │              │   │
│          │                   │              │ (no captura  │   │
│          │                   │              │  en DB)      │   │
│          │                   │              └──────────────┘   │
└──────────┼───────────────────┼──────────────────────────────────┘
           │                   │
           ▼                   ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PROCESAMIENTO                                │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Backend Railway (AdonisJS)                              │   │
│  │                                                          │   │
│  │  1. Guarda prospect en DB                                │   │
│  │  2. Envia email automatico desde                         │   │
│  │     no-reply@impulsorestaurantero.com                    │   │
│  │  3. (Quiz) Genera recomendaciones con IA                 │   │
│  │  4. (Quiz) Envia email con recomendaciones               │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└──────────────────────────┬──────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    POST-CAPTURA                                  │
│                                                                 │
│  ✅ Email automatico al prospecto                               │
│  ✅ Redirect a /gracias                                         │
│  ❌ NO hay email nurture sequence (oportunidad)                 │
│  ❌ NO hay retargeting configurado (pixels si, landings no)     │
│  ❌ NO hay CRM / pipeline de seguimiento visible                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Estado de cada flujo (verificado 2026-04-13)

| # | Flujo | Estado | Endpoint | Email | Notas |
|---|-------|--------|----------|-------|-------|
| 1 | Modal Home (cita) | ✅ Funciona | `POST /prospectsmeeting` | ✅ Envia | origin: "citaenvivo" |
| 2 | Banner Home (cita) | ✅ Funciona | `POST /prospectsmeeting` | ✅ Envia | Mismo modal que #1 |
| 3 | Quiz IA (/prueba) | ✅ Funciona | `POST /prospectsWithRecommendations` | ✅ Envia | origin: "inteligenciaArtificial" |
| 4 | Demo gratis | ❌ Roto | Ninguno | ❌ | handleFormSubmit vacio |
| 5 | Calendly | ✅ Funciona | Calendly externo | Via Calendly | No captura en nuestra DB |
| 6 | WhatsApp | ✅ Funciona | wa.me directo | N/A | No captura en nuestra DB |
| 7 | Contacto | ❌ Vacio | Ninguno | ❌ | Pagina sin contenido |

## Datos que capturamos por flujo

| Campo | Cita (Flow 1-2) | Quiz (Flow 3) | Demo (Flow 4) |
|-------|-----------------|----------------|----------------|
| first_name | ✅ | ✅ | ✅ |
| last_name | ✅ | ✅ | ✅ |
| email | ✅ | ✅ | ✅ |
| whatsapp | ✅ | ✅ | ✅ |
| restaurant_name | ❌ | ❌ | ✅ |
| how_did_you_find_us | ❌ | ❌ | ✅ (bug en values) |
| quiz responses | ❌ | ✅ | ❌ |
| origin tracking | ✅ | ✅ | ✅ |

## Oportunidades de mejora

1. **Arreglar /demogratis** — leads perdidos
2. **Arreglar /contacto** — pagina muerta
3. **Fix select values** — Instagram=tiktok (atribucion falsa)
4. **Email nurture sequence** — 3-5 emails despues del primer contacto
5. **Landing especifica para Instagram** — link en bio optimizado
6. **Lead magnet** — PDF/checklist a cambio de email (captura leads tibios)
7. **Retargeting pages** — pixels estan pero no hay landings dedicadas
