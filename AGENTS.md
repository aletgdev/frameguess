# AGENTS.md

Guía para agentes de IA que trabajan en **Frame Guess**. Léela entera antes de tocar código.

## 1. Proyecto

Juego diario para adivinar una película o un videojuego a partir de un fotograma. Cada fallo desbloquea una pista nueva (otro fotograma, año, género, director, sinopsis). Todos los jugadores comparten el mismo reto cada día.

- **Modos:** diario, infinito y versus en tiempo real (2 jugadores).
- **Datos:** TMDB (películas) e IGDB/RAWG (videojuegos). Solo se guardan IDs y URLs, nunca copias de imágenes.
- **Objetivo:** proyecto de portfolio, desplegado en VPS propio con Docker.

## 1b. Reparto de roles

### Backend: lo programa el usuario
- El usuario escribe el código del backend. El agente actúa como **revisor y mentor**.
- **Por defecto el agente NO modifica código del backend.** Puede:
  - Revisar el código y señalar bugs, riesgos de seguridad y problemas de rendimiento.
  - Corregir errores **proponiendo el cambio** (fragmento o diff) en la respuesta.
  - Dar alternativas con sus pros y contras, sin imponerlas.
  - Explicar el porqué de cada sugerencia de forma breve.
- **Solo edita archivos del backend cuando el usuario lo pida de forma explícita** (por ejemplo, "hazlo", "aplica el cambio"). Una sugerencia aceptada no equivale a permiso para tocar más código.
- Si detecta una violación de las reglas críticas (sección 5), debe avisar siempre, aunque nadie haya preguntado.

### Frontend: lo hace el agente
- El agente construye el frontend (`apps/web`), siguiendo la guía de diseño de abajo.
- **Usa las skills de frontend/diseño disponibles** (por ejemplo `frontend-design`) antes de escribir la interfaz, para evitar un aspecto genérico.
- Antes de codificar, define una dirección visual: personalidad, paleta, tipografía y estilo de componentes. Mantén esa coherencia en toda la app.
- Debe sentirse como un juego de cine/videojuegos, no como una plantilla: evita gradientes morados genéricos, tarjetas idénticas y fuentes por defecto.
- **Responsive obligatorio y mobile-first.** Se prueba en móvil, tablet y escritorio.
- Accesibilidad básica: contraste suficiente, foco visible, navegación por teclado y `alt`/`aria` donde corresponda.
- Estados cuidados: carga, error y vacío en cada pantalla. Animaciones con propósito (el desenfoque progresivo del fotograma es la pieza central).
- El frontend solo consume la API existente; si necesita un endpoint nuevo o un cambio de contrato, **lo propone al usuario** en lugar de modificar el backend.

## 2. Stack

| Capa | Tecnología |
|---|---|
| Backend | Node + Express + TypeScript |
| Base de datos | Supabase (PostgreSQL gestionado) + Prisma |
| Gestor de paquetes | pnpm (workspaces) |
| Caché / estado | Redis |
| Tiempo real | Socket.IO |
| Validación | Zod |
| Frontend | React + Vite + TypeScript + Tailwind + TanStack Query |
| Tests | Vitest + Supertest |
| Despliegue | Docker Compose (api, web, redis) + GitHub Actions |
| Reverse proxy | Nginx ya instalado en el host del VPS (fuera de Docker) |

Usa **solo pnpm**: nada de `npm` ni `yarn`, y no commitees `package-lock.json` ni `yarn.lock` (solo `pnpm-lock.yaml`).

No añadas frameworks o librerías nuevas sin justificarlo. Prioriza tecnologías mainstream. **No uses Rust, NestJS ni Next.js.**

## 3. Estructura

```
/
├── apps/
│   ├── api/                  # Backend Express
│   │   ├── src/
│   │   │   ├── config/       # env, db, redis
│   │   │   ├── modules/      # auth, challenges, guesses, titles, versus, stats
│   │   │   ├── jobs/         # cron: generar reto de mañana
│   │   │   ├── middlewares/  # auth, rateLimit, errorHandler, validate
│   │   │   └── lib/          # clientes TMDB / IGDB
│   │   └── prisma/
│   └── web/                  # Frontend React + Vite
├── pnpm-workspace.yaml
├── docker-compose.yml
├── AGENTS.md
└── README.md
```

Cada módulo del backend sigue el patrón `routes → controller → service`. La lógica de negocio va **solo** en `service`.

## 4. Comandos

```bash
pnpm install                   # instalar dependencias
docker compose up -d redis     # servicios locales (la BD es Supabase)
pnpm dev:api                   # backend en modo desarrollo
pnpm dev:web                   # frontend en modo desarrollo
pnpm test                      # todos los tests
pnpm lint                      # ESLint
pnpm typecheck                 # tsc --noEmit
pnpm exec prisma migrate dev   # crear/aplicar migración
```

Antes de dar una tarea por terminada, deben pasar `lint`, `typecheck` y `test`.

## 5. Reglas críticas (no negociables)

1. **El servidor nunca envía la respuesta del reto antes de que acabe.** Solo la devuelve cuando el jugador acierta o agota los 6 intentos.
2. **El servidor es la autoridad.** El cliente nunca decide si un intento es correcto, ni el ganador en versus.
3. **Valida toda entrada con Zod** en la frontera de la API.
4. **Rate limiting** obligatorio en `/guess`, `/titles/search` y `/auth/*`.
5. **Nunca commitees secretos.** Usa variables de entorno y mantén `.env.example` actualizado. Las claves de Supabase (`service_role` y la contraseña de la BD) viven **solo en el backend**; el frontend nunca las ve.
6. **Respeta los límites y términos de las APIs externas:** cachea en Redis y no descargues imágenes.

## 6. Convenciones de código

- TypeScript en modo `strict`. Prohibido `any` salvo justificación en un comentario.
- Nombres de archivos en `kebab-case`; clases/tipos en `PascalCase`; variables y funciones en `camelCase`.
- Funciones pequeñas con una sola responsabilidad. Evita duplicar lógica.
- Errores mediante una clase `AppError` y el middleware `errorHandler`. No uses `try/catch` suelto en controllers.
- Respuestas de la API en JSON con formato consistente: `{ data }` o `{ error: { code, message } }`.
- Fechas en UTC. El reto diario cambia a las 00:00 UTC.
- Comentarios solo cuando explican el **porqué**, no el qué.
- Frontend: componentes funcionales, hooks para la lógica, estado del servidor con TanStack Query (no lo dupliques en estado local).

## 7. Base de datos

- La BD es **Supabase** (PostgreSQL gestionado). No hay contenedor de Postgres en el proyecto.
- Prisma se conecta con dos URLs: `DATABASE_URL` (pooler, para la app) y `DIRECT_URL` (conexión directa, para migraciones).
- Cambios de esquema **siempre** mediante migración de Prisma. No edites la BD a mano ni desde el panel de Supabase.
- Activa RLS en las tablas por seguridad, aunque el acceso normal sea solo desde el backend.
- Tablas principales: `users`, `titles`, `daily_challenges`, `attempts`, `results`, `streaks`.
- Índice `pg_trgm` sobre `titles(name)` para el autocompletado.
- No elimines migraciones ya aplicadas.

## 8. Tiempo real (versus)

- Una sala por código; el estado vive en Redis con TTL.
- Eventos en `snake_case` (`join_room`, `guess`, `round_end`).
- El servidor valida cada evento y emite el resultado a ambos jugadores.
- Limpia salas y listeners al desconectar para evitar fugas.

## 9. Tests

- Obligatorios para: lógica de intentos y pistas, selección del reto diario, rachas y validaciones.
- Un test por comportamiento; nombres descriptivos (`devuelve 409 si se superan 6 intentos`).
- Mockea TMDB/IGDB. Los tests no deben hacer llamadas de red reales.
- Todo bug corregido incluye un test que lo reproduzca.

## 10. Git y entrega

- Ramas: `feat/…`, `fix/…`, `chore/…`.
- Commits pequeños en formato Conventional Commits: `feat(guesses): limitar a 6 intentos`.
- No hagas push directo a `main`; todo va por PR con CI en verde.
- Actualiza el `README.md` si cambias comandos, variables de entorno o arquitectura.

## 10b. Despliegue

- `docker-compose.yml` contiene **solo** `api`, `web` y `redis`. **No incluyas Nginx ni Postgres en Docker** (la BD es Supabase).
- Nginx ya está instalado en el VPS y actúa como reverse proxy hacia los puertos expuestos por los contenedores.
- Expón los puertos solo en `127.0.0.1` (por ejemplo `127.0.0.1:3000:3000`) para que únicamente Nginx pueda acceder.
- No modifiques la configuración de Nginx del servidor desde el repo; si hace falta un cambio, indícalo como paso manual.
- Para Socket.IO, el proxy debe permitir el upgrade de WebSocket (`Upgrade` y `Connection`).

## 11. Variables de entorno (`.env.example`)

```
DATABASE_URL=        # Supabase, conexión por pooler
DIRECT_URL=          # Supabase, conexión directa (migraciones)
REDIS_URL=
JWT_SECRET=
TMDB_API_KEY=
IGDB_CLIENT_ID=
IGDB_CLIENT_SECRET=
CORS_ORIGIN=
```

## 12. Cómo trabajar

1. Lee el código existente y reutiliza lo que ya hay antes de crear algo nuevo.
2. Respeta el reparto de la sección 1b: backend = revisar y proponer; frontend = construir. Haz cambios mínimos y enfocados en la tarea; no refactorices por tu cuenta.
3. Si algo es ambiguo, pregunta antes de asumir.
4. Al terminar, resume qué cambiaste, qué probaste y qué queda pendiente.

## 13. Definición de "hecho"

- [ ] Cumple lo pedido y las reglas críticas de la sección 5
- [ ] `lint`, `typecheck` y `test` pasan
- [ ] Tests añadidos o actualizados
- [ ] Migraciones incluidas si cambió el esquema
- [ ] README / `.env.example` actualizados si procede
- [ ] Sin secretos ni código muerto
