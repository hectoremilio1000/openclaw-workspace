---
tags: [impulso, project, marketing, website]
---

# Impulso Restaurantero — Current State

> **Snapshot vivo del proyecto.** Leer PRIMERO para aterrizar rapido.
>
> **Ultima actualizacion:** 2026-04-13 (sesion Claude Code)

## Que es Impulso Restaurantero

Movimiento/plataforma para duenos de restaurantes en Mexico.
- **Pitch:** "Crecemos las ventas de tu restaurante"
- **Fundado:** 2024
- **Clientes:** +1,000 restauranteros, +350 activos
- **Precio:** suscripcion mensual (planes dinamicos desde API)
- **Resultados claim:** +$150M MXN en ganancias generadas

## Stack tecnico

| Capa | Tecnologia | Donde |
|------|-----------|-------|
| Frontend | Next.js 15 (static export) | Vercel |
| Styling | Tailwind + Ant Design + Styled Components | - |
| API principal | AdonisJS | Railway (`impulsorestauranteromercado-production.up.railway.app`) |
| Blog API | AdonisJS | Railway (`adonisimpulsoblogapi-production-d482.up.railway.app`) |
| Traspasos API | AdonisJS | Railway (`adonisimpulsoapipage-production-57d9.up.railway.app`) |
| Imagenes | AWS S3 (`imagenesrutalab.s3.amazonaws.com`) |  |
| Analytics | GTM + Google Analytics + Facebook Pixel + TikTok Pixel | - |
| Scheduling | Calendly (embebido) | - |
| Pagos | MercadoPago SDK | - |
| Dominio | impulsorestaurantero.com (Banahosting DNS → Vercel) | - |

## Repo

- **Ruta local:** `~/proyectos/nextjs/next-impulso-website`
- **GitHub:** `github.com/hectoremilio1000/next-impulso-website`
- **Dev:** `npm run dev -- -p 7001`

## Env vars

| Variable | Local | Produccion |
|----------|-------|-----------|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8001/api` | `https://impulsorestauranteromercado-production.up.railway.app/api` |
| `NEXT_PUBLIC_BLOG_API` | `https://adonisimpulsoblogapi-production-d482.up.railway.app/` | `https://adonisimpulsoblogapi-production-d482.up.railway.app/api` |
| `NEXT_PUBLIC_TRASPASOS_API` | `http://localhost:53107` | `https://adonisimpulsoapipage-production-57d9.up.railway.app/api` |

## Paginas del sitio

### Funcionan correctamente
- `/` — Home con modal de entrada, banner CTA, Calendly, WhatsApp
- `/casosexito` — Casos de estudio con videos YouTube
- `/comolohacemos` — 11 modulos de servicio
- `/prueba` — Quiz IA con preguntas dinamicas (depende de API)
- `/gracias` — Thank you page
- `/blog` — Blog con posts desde Railway API

### Con bugs (2026-04-11)
- `/demogratis` — **Form no envia nada** (handleFormSubmit vacio)
- `/contacto` — **Pagina completamente vacia** (solo NavBar)
- `/plans` — **Grid vacio en prod** si API no responde
- Select "Como te enteraste" — Instagram tiene value="tiktok", Youtube duplicado
- Botones "Descargar" y "Solicitar" en Home — sin accion

## 11 Modulos de servicio

1. Destaca en Internet (SEO/Marketing Digital)
2. Llena tu Restaurante (Reservaciones)
3. Punto de Venta (POS 24/7)
4. Recursos Humanos con IA
5. Programa de Lealtad
6. Permisos y Asesoria Legal
7. Financiamiento
8. Encuestas de Servicio
9. Inventarios Inteligentes
10. Monitoreo con IA
11. Estudio de Mercado con IA

## Lead generation actual

Ver detalle completo: [[knowledge/architecture/impulso/lead-gen-flows|Flujos de Lead Gen]]

| Mecanismo | Estado | Endpoint | Email |
|-----------|--------|----------|-------|
| Modal de entrada (Home) | ✅ Funciona | `POST /prospectsmeeting` | ✅ Envia desde no-reply@impulsorestaurantero.com |
| Banner "Cita sin costo" (Home) | ✅ Funciona | `POST /prospectsmeeting` | ✅ Envia |
| Quiz IA (`/prueba`) | ✅ Funciona | `POST /prospectsWithRecommendations` | ✅ Envia con recomendaciones |
| Demo gratis (`/demogratis`) | ❌ Roto | Handler vacio | ❌ |
| Calendly (Home) | ✅ Embebido | calendly.com/clientes-impulsorestaurantero | Via Calendly |
| WhatsApp flotante | ✅ Funciona | wa.me/5215531491808 | N/A |

### Email automatico (verificado 2026-04-13)
- **Remitente:** no-reply@impulsorestaurantero.com
- **Asunto:** "Impulso Restaurantero: Nos pondremos en contacto pronto para el meeting"
- **Contenido:** Confirmacion con nombre del prospecto + promesa de contacto para meeting
- **Estado:** ✅ Funcionando en produccion

## Instagram

- **Handle:** @impulsorestaurantero
- **Link en sitio:** Si (header, footer)
- **Contenido:** pendiente de analisis detallado (Instagram bloquea scraping)

## Documentacion relacionada

- [[knowledge/architecture/impulso/website-architecture|Arquitectura del sitio]]
- [[knowledge/architecture/impulso/lead-gen-flows|Flujos de lead generation]]
- [[projects/impulso/marketing-strategy|Estrategia de marketing]]
- [[projects/impulso/instagram-content-plan|Plan de contenido Instagram]]
- [[projects/impulso/bugs-backlog|Backlog de bugs]]
- [[knowledge/decisions/2026-04-13-impulso-marketing-reboot|Decision: Reboot marketing]]
- [[knowledge/programming/nextjs-static-export-patterns|Patrones Next.js static export]]

## Siguiente paso

- [ ] Fix bugs criticos — ver [[projects/impulso/bugs-backlog|bugs backlog]]
- [ ] Crear landing pages especificas para campanas Instagram
- [ ] Ejecutar [[projects/impulso/instagram-content-plan|plan de contenido]] Instagram
- [ ] Blog con contenido SEO real (solo 1 post de muestra)
- [ ] Email nurture sequence post-captura
