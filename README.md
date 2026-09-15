# Shelfy — Frontend

App web para organizar lecturas: libros leídos, pendientes, por comprar, categorías propias y
reseñas. Modo oscuro e idiomas EN / CA / ES.

**Stack:** Angular 22 (standalone components, sin NgModules) · TypeScript estricto · ngx-translate

Consume la API de [shelfy-backend](https://github.com/costanna/shelfy-backend).

---

## Arrancar en local

Necesita el backend corriendo (por defecto en `http://localhost:8080`, ver su README).

```bash
npm install
npm start
```

Levanta en `http://localhost:4200`. Usa el usuario de ejemplo del backend
(`demo@shelfy.app` / `shelfy123`) si lo arrancas con el perfil `local`.

Otros comandos:

| Comando | Qué hace |
|---|---|
| `npm run build` | Build de producción en `dist/shelfy-frontend/browser` |
| `npm run watch` | Build de desarrollo en modo watch |
| `npm test` | Tests unitarios |

---

## Configuración

La URL del backend se fija en los ficheros de entorno, no por variable de entorno (Angular resuelve
esto en tiempo de build):

| Fichero | Se usa con | `apiUrl` por defecto |
|---|---|---|
| `src/environments/environment.ts` | `npm start` / `ng serve` | `http://localhost:8080/api` |
| `src/environments/environment.prod.ts` | `ng build --configuration production` | `https://shelfy-backend.onrender.com/api` |

Antes de desplegar, actualiza `environment.prod.ts` con la URL real del Web Service del backend en
Render.

---

## Internacionalización y tema

- **Idiomas:** `en` / `ca` / `es`, textos en `src/assets/i18n/*.json`, gestionados con
  [`LanguageService`](src/app/core/services/language.service.ts) (ngx-translate por debajo).
- **Tema:** claro / oscuro / según el sistema, aplicado con `data-theme` en `<html>` desde
  [`ThemeService`](src/app/core/services/theme.service.ts) (CSS custom properties en
  `src/styles/_tokens.scss`).
- Ambas preferencias se guardan en `localStorage` para que se apliquen antes del primer render, y
  si hay sesión iniciada también se sincronizan con la cuenta vía
  `PATCH /api/users/me/preferences`, así que viajan con el usuario entre dispositivos.
- Se cambian desde el desplegable de idioma y el botón de tema del header, o desde la pantalla
  **Ajustes** (`/settings`), que además es el único sitio donde se puede elegir explícitamente
  "según el sistema".

---

## Estructura del proyecto

```text
src/app/
├── core/           servicios, modelos, guards e interceptores HTTP compartidos
├── layout/         cabecera de la aplicación
├── shared/          componentes reutilizables (tarjetas, badges, spinner, toasts…)
└── features/
    ├── auth/        login y registro
    ├── books/        listado, detalle, formulario y reseñas
    ├── categories/   gestión de categorías propias
    └── settings/     ajustes de cuenta, tema e idioma
```

Cada pantalla se carga con `loadComponent` en [`app.routes.ts`](src/app/app.routes.ts) para no
inflar el bundle inicial.

---

## Desplegar en Render

### Opción rápida — Blueprint

Este repo incluye [`render.yaml`](./render.yaml). En el dashboard: **New → Blueprint** → conecta
`shelfy-frontend`. Crea el Static Site con el build command y el publish directory ya rellenos.

### Opción manual

1. **New → Static Site** → conecta este repositorio.
2. Build command: `npm run build`
3. Publish directory: `dist/shelfy-frontend/browser`
4. Antes de desplegar (o antes de cada redeploy si cambia), actualiza `apiUrl` en
   `environment.prod.ts` con la URL del backend, y `CORS_ALLOWED_ORIGINS` en el backend con la URL
   que Render asigne a este Static Site.

Al ser contenido estático, el frontend no "duerme" como el backend en el plan Free — solo el
Web Service del backend lo hace.

---

## Desplegar en Vercel

Vercel solo vale para este repo (frontend estático) — el backend Spring Boot sigue necesitando
Render (u otro hosting con servicio persistente), Vercel no lo soporta.

Este repo incluye [`vercel.json`](./vercel.json) con el build command, el directorio de salida y
el *rewrite* de SPA ya configurados. En el dashboard de Vercel: **Add New → Project** → importa
`shelfy-frontend` y despliega; no hace falta tocar nada más.

Igual que con Render: antes de desplegar, actualiza `apiUrl` en `environment.prod.ts` con la URL
del backend, y añade la URL que te dé Vercel a `CORS_ALLOWED_ORIGINS` en el backend.
