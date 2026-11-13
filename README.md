# ToxicApp

Abre la [aplicación compartida](https://sarcastic-api.onrender.com) desde el teléfono o el navegador. Crea una cuenta o entra con tu correo o usuario. Los cambios pasan por la [API de Render](https://sarcastic-api.onrender.com/api/v1/health) y se guardan en el proyecto Supabase `sarcastic-dev`.

## Ramas del equipo

| Integrante | Rama | Módulo |
| --- | --- | --- |
| Teran | `codex/teran` | Bienvenida, registro, sesión, navegación y conexión con Render |
| Morales | `feat/morales` | Inicio, tareas y mentor SlothBot |
| Mamani | `codex/mamani` | Agenda, eventos y sesiones de enfoque |
| Aguilar | `codex/aguilar` | Rachas, días libres, comodines y roast semanal |
| Alanoca | `codex/alanoca` | Social, retos, clasificación, amistades y publicaciones |
| Lorena | `codex/lorena` | Alarmas QR, cámara, avisos locales e historial |
| Nacho | `codex/nacho` | Perfil, preferencias, inventario, logros y notificaciones |

Clona el repositorio, ejecuta `git fetch origin` y cambia a tu rama con `git switch <rama>`. Envía los cambios con `git push` y abre un pull request hacia `main`. Cada integrante necesita acceso de escritura al repositorio para subir sus propios cambios.

## Desarrollo móvil

Usa Node 24.3 o superior de la serie 24. Desde `mobile`, ejecuta `npm ci` y `npm start`. Para abrir en navegador usa `npm run web`. El cliente usa el servicio compartido por defecto. Puedes cambiarlo con `EXPO_PUBLIC_API_URL`, como indica `mobile/.env.example`.

El cliente móvil usa Expo SDK 58. En Android e iOS las alarmas pueden programar un aviso diario al permitir notificaciones en el dispositivo. La cámara permite escanear un QR temporal mostrado desde otro dispositivo con la misma cuenta. En web se puede mostrar el código o validarlo manualmente. El QR emitido por la aplicación vence en una hora y sirve para un uso. Las sanciones son parte del tema del diseño y la aplicación no realiza cargos monetarios.

## Publicar y verificar

Desde `mobile` ejecuta `npx tsc --noEmit`, `npm run lint` y `npm run build:web`. Este último comando regenera `backend/public`. Incluye la exportación en el commit de integración. El servicio existente de Render sirve esa carpeta y la API Express desde el mismo origen. La ruta `/api/v1/db-check` comprueba la conexión con PostgreSQL.

Render conserva `DATABASE_URL` y `JWT_SECRET` en el entorno del servidor. SlothBot usa respuestas locales si falta `ANTHROPIC_API_KEY`. Las migraciones de desarrollo están en `database/migrations`. La migración 003 completa los datos iniciales de cuentas antiguas de forma idempotente.
