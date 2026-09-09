# Orientación del repo

Mapa práctico de "dónde toco qué". Complementa a `README.md` (boilerplate de React Router), `AGENTS.md` (reglas no negociables de arquitectura) y `DESIGN.md` (el "por qué" de las decisiones de stack). Este documento no repite esas explicaciones: da rutas de archivo verificadas y recetas concretas.

## 1. Estructura de dominios (`app/<dominio>/`)

Dominios públicos: `app/home/`, `app/works/`, `app/contact/`. Dominio privado: `app/admin/`. Transversal: `app/shared/`.

Cada dominio sigue Atomic Design, pero no todos usan las mismas capas:

| Capa | Responsabilidad |
|---|---|
| `api/` | Loaders/actions que llaman al backend (`serverFetch`) y devuelven datos tipados con zod. |
| `atoms/` | Primitivas visuales puras, sin lógica de negocio (ej. `home/atoms/hero-orb.tsx`). |
| `molecules/` | Composición de atoms + UI compartida; es donde vive la mayoría de las secciones visuales. |
| `organisms/` | Composición de varias molecules con orquestación propia. Solo existe en `works/` (`works/organisms/project-drawer.tsx`). |
| `pages/` | Función de composición presentacional pura que arma la página a partir de props tipadas; recibe los datos del loader, no los pide ella misma. |
| `schema.ts` | Tipos/esquemas zod compartidos entre `api/` y las vistas del dominio. |

Ejemplo (`app/home/`):
```
app/home/api/featured.ts
app/home/atoms/hero-orb.tsx
app/home/molecules/*.tsx        (6 secciones "bento")
app/home/pages/home.tsx
app/home/schema.ts
```

`app/works/` es el único dominio con `organisms/` (`project-drawer.tsx`, usado en el detalle de proyecto).

`app/admin/` (ver §6) usa solo `api/`, `molecules/`, `pages/` (a veces `components/`) — sin `organisms/`.

## 2. `app/shared/` — qué hay y cuándo usarlo

```
app/shared/animation/           presets de animación (motion), prefers-reduced-motion
app/shared/i18n/                configuración i18next + locales (ver §4)
app/shared/lib/cn.ts            merge de clases tailwind
app/shared/lib/cookies.ts
app/shared/lib/fetch-client/    cliente HTTP hacia el backend (ver §5)
app/shared/stores/              zustand: locale, session, toasts, ui
app/shared/swr/                 fetcher + keys de SWR
app/shared/ui/atoms/            atoms reutilizables entre dominios (avatar, tag, status-badge, micro-label, etc.)
app/shared/ui/molecules/        molecules reutilizables (headers/footers públicos, admin-header, admin-sidebar, drawer, pagination, locale-switcher)
```

Aparte, `app/components/ui/*` son los primitivos generados por shadcn/base-ui (button, dialog, field, input, select, tabs...) — es otra carpeta, no `app/shared/ui`. `shared/ui/atoms` y `shared/ui/molecules` son la capa propia del proyecto construida encima de esos primitivos.

**Regla práctica**: si un componente/hook/store se usa en 2+ dominios (o en público y admin), va a `app/shared/`. Si es específico de un dominio (aunque sea genérico en apariencia), se queda en `app/<dominio>/atoms|molecules`.

## 3. Routing (`app/routes.ts`)

- Las rutas públicas se generan con una factory `publicRoutes(lang: "en" | "es")` y se montan **dos veces**: una vez bajo `prefix("es", ...)` y otra en la raíz (inglés por defecto). Cada ruta tiene un `id` explícito namespaced (`es-<sufijo>`) para evitar colisiones, porque ambos idiomas comparten los mismos archivos de ruta.
- Árbol público: `layout("routes/_public.tsx")` envuelve `index`, `route("works")`, `route("works/:slug")`, `route("contact")`.
- **El admin vive en `/administration-panel/*`**, no en `/admin/*` (aunque las carpetas de dominio sí se llaman `app/admin/*`). Está montado con `prefix("administration-panel", [...])` y un comentario explícito: "Admin surface (no i18n in scope)".
- Árbol admin: `layout("routes/admin.tsx")` → `index`, `auth`, `auth/logout`, `projects` (index/new/:id), `reviews` (index/:id), `contact` (index/:id).

Archivos reales en `app/routes/*.tsx` (17 archivos): `_public.tsx` (layout público: detecta locale de la URL, inicializa i18next), `_public._index.tsx`, `_public.works.tsx`, `_public.works.$slug.tsx`, `_public.contact.tsx`, `admin.tsx` (layout admin + guard de auth), `admin._index.tsx`, `admin.auth.tsx`, `admin.auth.logout.tsx`, `admin.projects.tsx` + `._index`/`.new`/`.$id`, `admin.reviews.tsx` + `._index`/`.$id`, `admin.contact.tsx` + `._index`/`.$id`.

Los archivos de ruta suelen ser **shims delgados**: re-exportan `default`/`meta`/`action`/`loader` desde el dominio correspondiente (ej. `admin.auth.tsx` solo reexporta de `~/admin/auth/pages/login` y `~/admin/auth/api/login`). La lógica real vive en `app/<dominio>/pages|api/`.

> Nota: existen archivos de ruta para `admin.reviews.*` y `admin.contact.*`, pero las carpetas `app/admin/reviews/` y `app/admin/contact/` todavía no existen (solo hay `app/admin/auth/` y `app/admin/projects/`). Es superficie pendiente de construir.

## 4. i18n

Locales: `app/shared/i18n/locales/en/{admin,common,contact,home,works}.json` y `.../es/{common,contact,home,works}.json` — **no existe `es/admin.json`**: el admin es solo en inglés por diseño (`meta()` también fija `robots: noindex, nofollow`).

Internamente todo vive bajo un único namespace i18next `common` (`common.home`, `common.works`, etc.), porque las llamadas usan `t('home.hero.subhead')` como convención de prefijo de clave, no el argumento de namespace de i18next.

**Convención "brand flourish" (ADR-6)**: algunas etiquetas cortas en mayúsculas (`MicroLabel`, `app/shared/ui/atoms/micro-label.tsx`) son parte de la identidad visual "Aurelian" y se dejan **fijas, sin pasar por i18n**, mientras que el resto de la copy (títulos, cuerpo) sí se traduce normalmente. Cada uso fijo lleva un comentario `BRAND FLOURISH` en el archivo. Ocurrencias verificadas:

- `app/shared/ui/atoms/micro-label.tsx` — comentario canónico de la regla.
- `app/home/molecules/contact-cta.tsx` — micro-label "CONTACTO" fija.
- `app/home/molecules/metrics-bento.tsx` — "[ Precision Metrics ]" fija.
- `app/home/molecules/expanded-about-bento.tsx` — "SOBRE MÍ"/"About" fija (el resto del texto sí se traduce).
- `app/home/molecules/selected-works-bento.tsx` — "PROYECTOS"/"Selected Works" fija.
- `app/home/molecules/hero-profile-card.tsx` — "Technical Strategist" fija.
- `app/home/molecules/testimonials-split.tsx` — "[ Client Voices ]" fija.

**Regla práctica**: si vas a agregar una etiqueta corta tipo eyebrow con `MicroLabel`, decide primero si es identidad de marca (fija, con comentario `BRAND FLOURISH` citando ADR-6) o copy contextual (va a `locales/{en,es}/<namespace>.json`).

## 5. Relación con el backend (`../roonder-portfolio-backend`)

Todo el tráfico pasa por `app/shared/lib/fetch-client/`:

- `core.ts` — motor de request agnóstico de entorno. `requestCore<S>(init, env)`; antepone `/api/v1` a URLs relativas, agrega headers (bearer, Content-Type), `credentials: 'include'`, reintenta una vez ante 401 vía `env.refresh()`, valida la respuesta con un schema zod opcional.
- `server.ts` — `serverFetch<S>(request, init)`, usado en loaders/actions del servidor. Reenvía la cookie `Cookie` entrante, usa la cookie `access` como bearer, resuelve la URL relativa contra `API_BASE_URL` (env var).
- `client.ts` — `clientFetch<S>(init)`, para el navegador. Inyecta `Authorization: Bearer <token>` desde `useSessionStore` (excepto en `/auth/login|refresh|logout`).
- `errors.ts` — clase `ApiError` + `API_ERROR_KIND` (`unauthorized|forbidden|notFound|conflict|throttled|validation|server|network`), mapea el envelope de error del backend (`{statusCode, error, message, ...}`).
- `refresh.ts` — refresh single-flight (dedupe de 401 concurrentes).
- `get-session.ts` — `getSession(request)`: llama `GET /api/v1/auth/profile`, redirige a `/administration-panel/auth?next=...` si falla.

Patrón típico en `api/*.ts` de cada dominio (ver `app/home/api/featured.ts`, `app/works/api/works.ts`, `app/contact/api/contact.ts`):
```ts
const result = await serverFetch(request, {
  url: "/api/v1/projects?pageSize=10",
  schema: projectsResponseSchema,
});
```
Errores tipo `notFound` se traducen a resultados discriminados (`{ ok: false, notFound: true }`) en vez de lanzar excepción, para que la ruta pueda renderizar un boundary 404.

Dominios del backend (`../roonder-portfolio-backend/src/`): `auth/`, `projects/`, `reviews/`, `contact/`, más `common/`, `config/`, `database/`, `cli/`. Cada módulo público (`projects`, `reviews`, `contact`) tiene un controller público de solo lectura/envío y un `*-admin.controller.ts` separado para el CRUD autenticado — esto mapea 1:1 con las 4 subsecciones del admin (`auth`, `projects`, `reviews`, `contact`).

## 6. Superficie de admin (`app/admin/`)

Estructura actual (recursiva):
```
app/admin/auth/api/{login,logout}.ts
app/admin/auth/components/sign-out-button.tsx
app/admin/auth/pages/login.tsx
app/admin/auth/schema.ts
app/admin/projects/api/projects.ts
app/admin/projects/molecules/{admin-project-card,admin-project-confirm-modal,admin-project-form}.tsx
app/admin/projects/pages/{edit,list,new,overview}.tsx
app/admin/projects/schema.ts
```
(`reviews/` y `contact/` aún no tienen carpeta de dominio — ver nota en §3.)

Diferencias estructurales frente a lo público:
- **Sin i18n**: no hay `es/admin.json`; el layout marca `robots: noindex, nofollow`.
- **Guard de auth en el propio layout**, no en un archivo de guard separado: `app/routes/admin.tsx` exime `/administration-panel/auth` y, para el resto, llama a `getSession(request)`; si falla, redirige a `/administration-panel/auth?next=<path>`. Las rutas hijas (ej. `admin.projects.tsx`) confían en que el guard del padre ya corrió.
- **Shell propio**: `AdminHeader`, `AdminSidebar`, `MobileTabBar` (en `app/shared/ui/molecules/`), distinto del `PublicHeader`/`PublicFooter`/`BottomNavDock` público.
- Sin capa `organisms/`.

## 7. Recetas rápidas

**Quiero cambiar un copy (texto traducible)** → edita el JSON correspondiente en `app/shared/i18n/locales/{en,es}/<namespace>.json`. Si es una `MicroLabel` marcada `BRAND FLOURISH`, no la toques como i18n: edítala directo en el componente (es intencional que quede fija, ADR-6).

**Quiero cambiar el layout del home** → `app/home/pages/home.tsx` (composición de las secciones); las secciones individuales están en `app/home/molecules/*.tsx`.

**Quiero agregar/editar un campo de un formulario** → mira `app/contact/molecules/contact-form.tsx` como referencia: `react-hook-form` + `zodResolver` sobre `app/contact/schema.ts`, componentes `Field`/`FieldLabel`/`FieldError` de `app/components/ui/`, envío con `useFetcher().submit(...)`.

**Quiero agregar una llamada nueva al backend** → crea/edita un archivo en `app/<dominio>/api/*.ts` usando `serverFetch` (patrón en `app/home/api/featured.ts` o `app/works/api/works.ts`), con schema zod de respuesta.

**Quiero agregar una ruta admin nueva** → 1) agrega el módulo en `app/admin/<subdominio>/` (api/molecules/pages), 2) crea el shim en `app/routes/admin.<subdominio>.tsx` (y `._index`/`.$id`/`.new` si aplica), 3) regístralo en `app/routes.ts` dentro del árbol `prefix("administration-panel", ...)`. El guard de auth ya corre en `admin.tsx`, no hace falta repetirlo.

**Quiero agregar una ruta pública nueva** → agrégala dentro de la factory `publicRoutes(lang)` en `app/routes.ts` (se registra automáticamente para `en` y `es`), crea el shim en `app/routes/_public.<nombre>.tsx`, y el dominio correspondiente en `app/<dominio>/`.

**Quiero un componente reusable entre dominios** → ponlo en `app/shared/ui/atoms/` o `app/shared/ui/molecules/` según el nivel, no lo dupliques en cada dominio.
