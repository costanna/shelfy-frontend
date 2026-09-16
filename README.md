# 📚 Shelfy

> Tu biblioteca personal: lo que has leído, lo que estás leyendo, lo que quieres leer y lo que quieres comprar — con tus propias categorías y tus propias reseñas.

[![Demo en vivo](https://img.shields.io/badge/demo-en%20vivo-brightgreen)](https://shelfy-frontend-six.vercel.app)
![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-6DB33F?logo=springboot&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

**[🔗 Probar Shelfy](https://shelfy-frontend-six.vercel.app)** — cuenta de prueba ya cargada con libros, categorías y reseñas: `demo@shelfy.app` / `shelfy123` (o regístrate gratis en unos segundos).

> El backend está en el plan gratuito de Render: si lleva un rato dormido, la primera petición puede tardar hasta un minuto en despertar. Es normal, no un error.

---

## 📖 Qué es

Shelfy es una aplicación fullstack de biblioteca personal: cada usuario gestiona sus propios libros,
categorías y reseñas, en su propio idioma y con el tema que prefiera. También tiene una capa social
opcional — buscar a otros usuarios por alias y seguirlos para ver su biblioteca y sus reseñas —,
pensada como un vistazo tipo Goodreads sin perder el control de quién ve qué: sin seguidor, nada es
visible.

Este repositorio es el **frontend** (Angular). El backend (API REST en Spring Boot) vive en
[**shelfy-backend**](https://github.com/costanna/shelfy-backend).

<!--
📸 Añade aquí 2-3 capturas de pantalla o un GIF corto: la estantería con filtros,
el detalle de un libro con sus reseñas, y el modo oscuro. Es lo primero que mira
cualquiera que abra este README.
-->

## ✨ Funcionalidades

- **Cuenta propia** con registro e inicio de sesión (JWT).
- **Gestión de libros**: título, autor, portada, sinopsis, páginas — añadir, editar, eliminar.
- **Estados de lectura**: *quiero leer*, *leyendo*, *leído*, *quiero comprar*, con filtros por estado, por categoría y por texto libre.
- **Categorías propias**: cada usuario crea las suyas (p. ej. "fantasía", "pendientes de Sant Jordi") y las asigna libremente.
- **Reseñas**: puntuación de 0.5 a 5 estrellas (con medias) y texto de opinión por libro, visibles para su autor y para quien le siga.
- **Buscar y seguir a otros usuarios** por alias: seguir a alguien revela toda su biblioteca y sus reseñas (o nada, si no le sigues) — ver [`/people`](src/app/features/people).
- **Foto de perfil**: se sube desde Ajustes (PNG/JPEG/WEBP, máx. 5 MB — el backend la recorta a cuadrado y la redimensiona), y aparece también en la cabecera como acceso directo a Ajustes.
- **Añadir un libro escaneando su ISBN** con la cámara del móvil, o buscándolo a mano: título, autor, páginas, portada y sinopsis se rellenan solos (API pública de Open Library).
- **Estadísticas de lectura**: cuántos libros llevas leídos, cuántos terminaste cada mes y cuántos días te costó cada uno, entre la fecha de inicio y la de fin que le pongas al libro.
- **Calendario de lectura interactivo**: marca qué libro(s) leíste cada día directamente sobre un calendario mensual (al estilo Leero) — independiente del rango de inicio/fin del libro, para llevar el día a día. Muestra también la racha actual y el récord de días seguidos. Estadísticas ya no es de solo lectura: se puede eliminar cualquier día marcado desde una lista por libro, y editar o borrar el rango de inicio/fin de cada libro sin salir de la página.
- **Modo claro / oscuro / según el sistema**, con la preferencia guardada en la cuenta (te sigue entre dispositivos).
- **Español, catalán e inglés**, cambiables al vuelo, sin recargar la página.

## 🛠️ Cómo está hecho

| | |
|---|---|
| **Frontend** | Angular 22 · *standalone components*, sin `NgModule` · TypeScript estricto · `ngx-translate` |
| **Backend** | Spring Boot 3.5 · Java 21 · Spring Data JPA · Spring Security con JWT |
| **Base de datos** | PostgreSQL (Neon) |
| **Despliegue** | Vercel (frontend) · Render (backend, Docker) — ambos con *Infrastructure as Code* ([`vercel.json`](./vercel.json), [`render.yaml`](./render.yaml)) |

Algunas decisiones concretas, por si son de interés:

- **Carga perezosa por pantalla** (`loadComponent` en cada ruta) para no inflar el bundle inicial — ver [`app.routes.ts`](src/app/app.routes.ts).
- **Aislamiento por usuario en el backend**: pedir un recurso de otra cuenta devuelve `404`, no `403`, para no filtrar que ese recurso existe.
- **Tema e idioma con doble persistencia**: se aplican al instante desde `localStorage` (antes del primer render) y se sincronizan con la cuenta vía `PATCH /api/users/me/preferences` si hay sesión iniciada.
- **Angular Signals** de punta a punta para el estado de los servicios (`AuthService`, `ThemeService`, `LanguageService`...), sin librerías externas de estado.
- **Integración con una API externa sin librería de terceros**: `BookLookupService` llama a Open Library con `fetch` directamente (no `HttpClient`), para no arrastrar el interceptor que añade el JWT de la app a toda petición saliente.
- **Nombres de mes en el idioma activo sin datos de locale de Angular**: la sección "libros por mes" de Estadísticas usa `Intl.DateTimeFormat` directamente con el idioma de `LanguageService`, en vez de registrar `LOCALE_ID`/`registerLocaleData` solo para eso.
- **Visibilidad social sin duplicar datos**: no hay una copia "pública" de libros o reseñas — el backend calcula al vuelo si el visitante puede verlos (`propio || le sigue`) y el frontend simplemente pinta lo que reciba (biblioteca completa o página bloqueada).

## 🚀 Arrancar en local

```bash
npm install
npm start
```

Necesita el backend corriendo en `http://localhost:8080` — ver [shelfy-backend](https://github.com/costanna/shelfy-backend#-arrancar-en-local) para levantarlo con datos de ejemplo en un solo comando.

<details>
<summary><strong>Más detalles: configuración, i18n/tema, estructura del proyecto, despliegue</strong></summary>

### Configuración

La URL del backend se fija en tiempo de build, no por variable de entorno:

| Fichero | Se usa con | `apiUrl` |
|---|---|---|
| `src/environments/environment.ts` | `npm start` | `http://localhost:8080/api` |
| `src/environments/environment.prod.ts` | `npm run build` | el backend en Render |

### Internacionalización y tema

- **Idiomas**: `en` / `ca` / `es`, textos en `src/assets/i18n/*.json`, gestionados con [`LanguageService`](src/app/core/services/language.service.ts).
- **Tema**: claro / oscuro / según el sistema, aplicado con `data-theme` en `<html>` desde [`ThemeService`](src/app/core/services/theme.service.ts) (CSS custom properties en `src/styles/_tokens.scss`).
- Ambos se cambian desde el header o desde **Ajustes** (`/settings`), la única pantalla donde se puede elegir explícitamente "según el sistema".

### Estructura del proyecto

```text
src/app/
├── core/           servicios, modelos, guards e interceptores HTTP compartidos
├── layout/         cabecera de la aplicación
├── shared/         componentes reutilizables (tarjetas, badges, spinner, toasts…)
└── features/
    ├── auth/       login y registro
    ├── books/      listado, detalle, formulario y reseñas
    ├── categories/ gestión de categorías propias
    ├── people/     buscar usuarios, perfil público y seguir
    └── settings/   ajustes de cuenta, tema e idioma
```

### Desplegar

**Vercel** (recomendado para el frontend): el repo incluye [`vercel.json`](./vercel.json) ya
configurado — en el dashboard, **Add New → Project** → importa este repositorio y despliega, sin
tocar nada más. Solo hay que mantener `apiUrl` en `environment.prod.ts` apuntando al backend, y
`CORS_ALLOWED_ORIGINS` en el backend apuntando a la URL que dé Vercel.

**Render** (alternativa): el repo también incluye [`render.yaml`](./render.yaml) para desplegarlo
como Static Site vía Blueprint (**New → Blueprint**), con el build command y el publish directory
ya rellenos.

</details>

## 🗺️ Próximos pasos

El mismo frontend Angular está pensado para envolverse con **Ionic + Capacitor** y generar una app
móvil nativa (iOS/Android) sin tocar el backend.

## 📄 Licencia

[MIT](./LICENSE)
