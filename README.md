# 📚 Shelfy

> Tu biblioteca personal: lo que has leído, lo que estás leyendo, lo que quieres leer y lo que quieres comprar — con progreso por páginas, tus propias categorías, reseñas, estadísticas y un feed de lo que lee la gente que sigues.

[![Demo en vivo](https://img.shields.io/badge/demo-en%20vivo-brightgreen)](https://shelfy-reads.vercel.app)
![Angular](https://img.shields.io/badge/Angular-22-DD0031?logo=angular&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-3178C6?logo=typescript&logoColor=white)
![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.5-6DB33F?logo=springboot&logoColor=white)
![Java](https://img.shields.io/badge/Java-21-ED8B00?logo=openjdk&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon-4169E1?logo=postgresql&logoColor=white)
![License](https://img.shields.io/badge/license-MIT-blue)

**[🔗 Probar Shelfy](https://shelfy-reads.vercel.app)** — cuenta de prueba ya cargada con libros, categorías y reseñas: `demo@shelfy.app` / `shelfy123` (o regístrate gratis en unos segundos).

> El backend está en el plan gratuito de Render: si lleva un rato dormido, la primera petición puede tardar hasta un minuto en despertar. Es normal, no un error.

---

## 📖 Qué es

Shelfy es una aplicación fullstack de biblioteca personal: cada usuario gestiona sus propios libros,
categorías, reseñas y notas, en su propio idioma y con el tema que prefiera. También tiene una capa
social opcional — buscar a otros usuarios por alias, seguirlos para ver su biblioteca y sus
reseñas, recibir una notificación cuando alguien te sigue, y un feed con lo último que ha leído o
reseñado la gente que sigues —, pensada como un vistazo tipo Goodreads/Leero sin perder el control
de quién ve qué: sin seguidor, nada es visible.

Este repositorio es el **frontend** (Angular). El backend (API REST en Spring Boot) vive en
[**shelfy-backend**](https://github.com/costanna/shelfy-backend).

<!--
📸 Añade aquí 2-3 capturas de pantalla o un GIF corto: la estantería con filtros,
el detalle de un libro con sus reseñas, y el modo oscuro. Es lo primero que mira
cualquiera que abra este README.
-->

## ✨ Funcionalidades

- **Cuenta propia** con registro e inicio de sesión (JWT), verificación por email y recuperación de contraseña.
- **Gestión de libros**: título, autor, portada, sinopsis, páginas, saga y número dentro de ella, formato (físico/ebook/audiolibro) — añadir, editar, eliminar.
- **Estados de lectura**: *quiero leer*, *leyendo*, *leído*, *quiero comprar*, con filtros por estado, categoría y texto libre, ordenación (recientes, título, autor, páginas) y dos vistas — Tarjetas y Estantería (solo portadas, al estilo visual de Goodreads).
- **Progreso de lectura por páginas**: mientras un libro está en *leyendo*, actualiza "por qué página vas" desde su ficha y verás una barra de progreso ahí y en la tarjeta.
- **Volver a leer un libro**: un botón en la ficha reabre un libro ya terminado (pasa a *leyendo* de nuevo) sin perder el rastro de cuándo lo leíste la primera vez — queda en su historial de lecturas.
- **Categorías propias**: cada usuario crea las suyas (p. ej. "fantasía", "pendientes de Sant Jordi") y las asigna libremente; hay 8 por defecto al registrarse, y un botón para añadir las que falten si ya tenías cuenta.
- **Reseñas**: puntuación de 0.5 a 5 estrellas (con medias) y texto de opinión por libro, visibles para su autor y para quien le siga.
- **Notas privadas** por libro, solo visibles para ti.
- **Importar/exportar tu biblioteca en CSV**, desde Ajustes — útil para llevártela a otro sitio o como copia de seguridad.
- **Buscar y seguir a otros usuarios** por alias: seguir a alguien revela toda su biblioteca y sus reseñas (o nada, si no le sigues) — ver [`/people`](src/app/features/people).
- **Notificaciones**: un aviso (con contador) cuando alguien empieza a seguirte, desde la campana de la cabecera.
- **Feed de actividad** (`/feed`): lo último que ha empezado, terminado o reseñado la gente que sigues.
- **Foto de perfil**: se sube desde Ajustes (PNG/JPEG/WEBP, máx. 5 MB — el backend la recorta a cuadrado y la redimensiona), y aparece también en la cabecera como acceso directo a Ajustes.
- **Añadir un libro escaneando su ISBN** con la cámara del móvil, o buscándolo a mano: título, autor, páginas, portada y sinopsis se rellenan solos (API pública de Open Library).
- **Buscar un libro por título o autor** (al estilo Goodreads) para añadirlo sin teclear nada a mano: se elige de una lista de resultados con portada y año, y el formulario se rellena solo. Dos fuentes a elegir: Open Library (siempre activa) y Google Books limitado a España (opcional, hace falta una clave gratuita — ver "Configuración").
- **Recomendaciones**: sugerencias de libros del autor que más lees, listas para añadir con un clic.
- **Objetivo de lectura anual**: márcate cuántos libros quieres leer este año y sigue el progreso.
- **Estadísticas de lectura**: cuántos libros llevas leídos, cuántos leyendo ahora mismo, cuántos terminaste cada mes (con una página de detalle por mes) y cuántos días te costó cada uno.
- **Calendario de lectura interactivo**: marca qué libro(s) leíste cada día directamente sobre un calendario mensual (al estilo Leero) — independiente del rango de inicio/fin del libro, para llevar el día a día. Muestra también la racha actual y el récord de días seguidos. Estadísticas ya no es de solo lectura: se puede eliminar cualquier día marcado desde una lista por libro, y editar o borrar el rango de inicio/fin de cada libro sin salir de la página.
- **Instalable como app** (PWA) en el móvil o el escritorio, con funcionamiento offline básico; también existe un envoltorio Android nativo (TWA) — ver [shelfy-android](https://github.com/costanna/shelfy-android).
- **Aviso si el servidor tarda**: como el backend gratuito de Render se duerme tras un rato de inactividad, un aviso avisa cuando una petición lleva unos segundos en curso en vez de dejarte mirando una pantalla en blanco.
- **Modo claro / oscuro / según el sistema**, con la preferencia guardada en la cuenta (te sigue entre dispositivos).
- **Español, catalán e inglés**, cambiables al vuelo, sin recargar la página.
- **Mostrar/ocultar la contraseña** al escribirla, en inicio de sesión, registro y restablecer contraseña.

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
- **Preferencias solo de este dispositivo en `localStorage`**: la vista de libros (Tarjetas/Estantería) no se guarda en la cuenta como el tema o el idioma — es una comodidad de "cómo lo veo aquí", no algo que tenga sentido sincronizar entre dispositivos.

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

**Búsqueda por Google Books (opcional):** la pestaña "Google Books (España)" del buscador de
libros solo aparece si hay una clave configurada — sin ella, la app funciona igual, solo con Open
Library. Para activarla:

1. En [Google Cloud Console](https://console.cloud.google.com/), crea un proyecto (o usa uno que
   ya tengas) y habilita la **Books API**.
2. En **APIs y servicios → Credenciales**, crea una **clave de API**. Restríngela a la Books API y,
   en "Restricciones de la aplicación", a **referentes HTTP** con tu dominio (p. ej.
   `https://shelfy-reads.vercel.app/*`) — es una clave que viaja al navegador, así que restringirla
   evita que otra web la use en tu cuota.
3. En Vercel, **Project Settings → Environment Variables**, añade `GOOGLE_BOOKS_API_KEY` con esa
   clave (entorno Production) y vuelve a desplegar.

`npm run build` la inyecta en `environment.prod.ts` en tiempo de compilación
(`scripts/set-env.js`, vía el hook `prebuild` de npm) — la clave nunca se guarda en el repo, solo
en la variable de entorno de Vercel. La cuota gratuita de Google (1000 peticiones/día) es de sobra
para uso personal.

### Internacionalización y tema

- **Idiomas**: `en` / `ca` / `es`, textos en `src/assets/i18n/*.json`, gestionados con [`LanguageService`](src/app/core/services/language.service.ts).
- **Tema**: claro / oscuro / según el sistema, aplicado con `data-theme` en `<html>` desde [`ThemeService`](src/app/core/services/theme.service.ts) (CSS custom properties en `src/styles/_tokens.scss`).
- Ambos se cambian desde el header o desde **Ajustes** (`/settings`), la única pantalla donde se puede elegir explícitamente "según el sistema".

### Estructura del proyecto

```text
src/app/
├── core/           servicios, modelos, guards e interceptores HTTP compartidos
├── layout/         cabecera (con notificaciones) y pie de la aplicación
├── shared/         componentes reutilizables (tarjetas, badges, spinner, toasts…)
└── features/
    ├── auth/       login, registro, verificación de email, recuperar contraseña
    ├── books/      listado, detalle, formulario, reseñas, notas y recomendaciones
    ├── categories/ gestión de categorías propias
    ├── feed/       actividad de la gente que sigues
    ├── people/     buscar usuarios, perfil público y seguir
    ├── stats/      estadísticas, calendario, objetivo de lectura y detalle por mes
    └── settings/   ajustes de cuenta, tema, idioma e importar/exportar CSV
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

## 📱 App instalable

Shelfy es una PWA (`ngsw-config.json`, `public/manifest.webmanifest`): se puede instalar desde el
navegador tanto en el móvil como en el escritorio, con funcionamiento offline básico. Además, el
mismo frontend se envuelve como app Android nativa vía TWA (*Trusted Web Activity*, con
[Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap)) sin tocar el backend ni el código
Angular — ver [shelfy-android](https://github.com/costanna/shelfy-android).

## 📄 Licencia

[MIT](./LICENSE)
