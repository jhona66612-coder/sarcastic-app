# SlothBot: mascota y asistente por voz

La mascota está disponible después de iniciar sesión, en el botón flotante de todas las secciones. Respira, parpadea y anima la boca mientras lee su respuesta. Respeta la preferencia del sistema de reducir movimiento.

## Uso

1. Abre SlothBot y toca el micrófono.
2. Autoriza el micrófono cuando el navegador o el sistema lo solicite.
3. Habla en español. Al terminar la frase, se envía la transcripción y se ejecuta la instrucción.
4. Revisa el resultado y usa «Ver tareas» o «Ver agenda» para abrirlo.

Puedes cancelar mientras escucha, escribir una orden, editar la transcripción si no se reconoció una frase completa y apagar «Responder en voz alta». Cerrar la mascota detiene escucha y voz. Una orden ya enviada puede terminar aunque cierres el panel.

Las eliminaciones requieren una confirmación visible. Si falla la conexión, usa «Comprobar o reintentar instrucción»: reutiliza el identificador original y evita crear registros duplicados.

## Ejemplos en el modo de órdenes directas

| Acción | Ejemplo |
| --- | --- |
| Crear tarea | Crea la tarea estudiar química mañana con prioridad alta |
| Reservar un horario y crear tarea | Recuérdame estudiar mañana a las cinco de la tarde durante dos horas |
| Varias tareas | Crea la tarea comprar pan y crea la tarea estudiar mañana |
| Completar tarea | Completa la tarea estudiar química |
| Cambiar fecha | Mueve la tarea estudiar química al viernes |
| Renombrar | Renombra la tarea estudiar química como repasar química |
| Prioridad | Pon la prioridad de la tarea repasar química en alta |
| Estado | Marca la tarea repasar química como pendiente |
| Eliminar | Elimina la tarea repasar química |
| Consultar | Qué tareas pendientes tengo mañana |
| Crear evento | Programa una reunión con Ana mañana de 15 a 17 |
| Mover evento | Mueve el evento reunión con Ana al lunes a las 10:00 |
| Consultar agenda | Dime mi agenda de mañana |
| Enfoque | Inicia enfoque de veinticinco minutos |
| Detener enfoque | Interrumpe el enfoque |
| Alarma diaria | Pon una alarma a las siete de la mañana |
| Desactivar alarma | Desactiva la alarma de las siete |
| Actividad diaria | Registra mi actividad de hoy |
| Día libre | Registra un día libre mañana |
| Sarcasmo | Pon sarcasmo en 4 |
| Progreso | Dime mi progreso |
| Navegación | Abre mi agenda |

Las fechas usan la zona horaria del dispositivo, enviada explícitamente al servidor. Si pides una tarea con hora se crean una tarea y un evento con el mismo título; no se sincronizan entre sí después de crearlos. Los eventos duran una hora si no indicas duración. Las alarmas son diarias, no alarmas para una sola fecha. En Android/iOS se intenta activar su notificación local; si falta permiso, se explica cómo hacerlo. En web se guarda la alarma, pero no se promete que sonará con la página cerrada.

El modo básico reconoce estas familias de órdenes; no es un modelo conversacional general. Para peticiones ambiguas debes indicar el título completo o abrir la sección. La mascota no realiza acciones fuera de la aplicación, no publica mensajes sociales ni modifica credenciales. No se admite recurrencia de tareas/eventos.

## Conversación con IA opcional

El servidor reutiliza la integración Anthropic existente. Configura `ANTHROPIC_API_KEY` y un `AI_MODEL` válido en **Render → sarcastic-api → Environment**. Nunca pongas la clave en Expo, en el navegador, en GitHub ni en una variable `EXPO_PUBLIC_*`.

Sin clave funciona el intérprete local de órdenes en español, con acciones reales sobre Supabase. Con clave, el modelo propone acciones de un catálogo cerrado. El servidor comprueba permisos, campos, fechas e identificadores y aplica las acciones; el modelo no ejecuta SQL. Si el proveedor rechaza la petición, se intenta el intérprete básico y se indica el cambio de modo.

## Web, Android e iOS

- Web: HTTPS en Render, reconocimiento mediante Web Speech API cuando el navegador lo ofrece. Chrome o Edge suelen ser la opción más compatible. Si no existe soporte se mantiene la entrada por texto. La disponibilidad también depende del micrófono, permisos, red y servicio de reconocimiento.
- Android/iOS: `expo-speech-recognition` tiene configuración de permisos en `app.json`. **Se necesita una nueva compilación nativa**; el módulo no está incluido en Expo Go. En Expo Go se conserva el asistente por texto.
- Para compilar nativamente se puede usar EAS; el proyecto requiere configurar su cuenta, identificadores y firma. En un entorno nativo preparado también sirve `npx expo run:android` o `npx expo run:ios`. No basta una actualización JavaScript para añadir este módulo a un binario anterior.
- La respuesta hablada usa `expo-speech`. En iOS el modo silencio puede impedir escucharla.

El reconocimiento puede usar los servidores del navegador o sistema operativo. La app no persiste grabaciones de audio; envía texto al backend. Las órdenes aplicadas y las respuestas aparecen en el historial de SlothBot. La configuración de IA opcional envía el texto y un contexto acotado de la cuenta a Anthropic.

## Servidor y verificación

- `GET /api/v1/assistant/capabilities` informa del modo y acciones.
- `POST /api/v1/assistant/command` recibe `request_id` UUID, `message` y `time_zone` IANA. Una aclaración puede incluir `previous_message`.
- Para confirmar una eliminación envía `confirmation_token` con el mismo UUID y zona horaria. La firma vence a los cinco minutos y está vinculada a esa cuenta e instrucción.
- El registro de idempotencia usa `ai_analyses` con tipo `assistant_command`; no requiere migraciones y no aparece en la lista de análisis.
- Las acciones compuestas comparten una transacción PostgreSQL y un bloqueo por cuenta. Si una falla, todas se revierten.
- La interfaz notifica a las pantallas activas para volver a cargar sus datos.

Desde `backend`:

```sh
npm run test:assistant
npm run test:assistant:integration
```

La integración requiere las variables de backend y acceso a Supabase. Crea dos cuentas temporales, verifica autenticación, aislamiento, rollback, reintentos concurrentes, XP, alarmas y confirmaciones, y elimina sus propios registros al finalizar. No usa el modelo de pago.

Desde `mobile`, con Node compatible con Expo 58:

```sh
npx tsc --noEmit
npx expo lint
npm run build:web
```

El export web se publica en `backend/public`, junto al servidor Express existente en Render.

Referencias: [Expo Speech](https://docs.expo.dev/versions/v58.0.0/sdk/speech/), [expo-speech-recognition](https://github.com/jamsch/expo-speech-recognition), [Web Speech API](https://developer.mozilla.org/en-US/docs/Web/API/SpeechRecognition).
