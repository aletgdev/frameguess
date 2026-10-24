# Frame Guess

Monorepo pnpm para el juego Frame Guess.

## Aplicaciones

- `apps/api`: API Express con TypeScript, Zod, Prisma, Redis y Socket.IO.
- `apps/web`: aplicación React con Vite, Tailwind CSS y TanStack Query.

## Desarrollo local

1. Copia `.env.example` a `.env` y completa las credenciales necesarias.
2. Ejecuta `pnpm install`.
3. Inicia cada aplicación con `pnpm dev:api` o `pnpm dev:web`.

La API expone `GET /health`. La web envía las peticiones bajo `/api` al origen indicado por `VITE_API_ORIGIN`.

La base de datos es Supabase y Redis se ejecuta localmente. No hay contenedores de PostgreSQL ni Nginx en este proyecto.
