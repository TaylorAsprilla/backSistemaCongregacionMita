# Centro de notificaciones

Notificaciones internas de CMAR LIVE: cada usuario ve **solo las suyas** (el usuario sale siempre del JWT).
Primera fase: todo dentro de la plataforma; no hay correo, push ni móvil.

## Arquitectura

```
Eventos existentes ──► eventos.ts ──► notificacion.service.ts ──► tabla `notificacion`
(informes, solicitudes,   (quién y qué)   (crear sin duplicar,         ▲
 crons diarios/semanales)  destinatarios.ts  listar, leer, depurar)    │
                                                                       │
Frontend: campana (sondeo cada 60 s a /no-leidas) ── /api/notificaciones ┘
```

- `src/services/notificaciones/notificacion.service.ts`: servicio central (crear, listar, contar, marcar, eliminar, depurar).
- `src/services/notificaciones/destinatarios.ts`: resolución de destinatarios con las mismas fuentes que la autorización de informes.
- `src/services/notificaciones/eventos.ts`: emisores por evento. Nunca lanzan: una falla de notificaciones no rompe el flujo original.
- `src/crons/notificaciones.ts`: tareas programadas (solo en producción).
- Los emisores se invocan **después** de la operación original (informes: `crearInforme`, `cerrarInforme`, cierre automático; solicitudes: `validarEmail`, `actualizarSolicitudMultimedia`). No se modificó la lógica de los informes ni la autenticación.

## Endpoints (`/api/notificaciones`, requieren `x-token`; sesiones QR reciben 403)

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/?estado=todas\|leidas\|no-leidas&categoria=&pagina=&porPagina=` | Historial paginado (máx. 50 por página) + `noLeidas`. |
| `GET` | `/no-leidas` | Contador liviano que consulta la campana. |
| `PATCH` | `/:id/leida` | Marca una como leída (idempotente). |
| `PATCH` | `/leidas[?categoria=]` | Marca todas (o las de una categoría). |
| `DELETE` | `/:id` | Elimina una propia. |

Un id ajeno o inexistente siempre responde `404` (no se revela que existe) y no modifica nada.

## Base de datos

Migración `migrations/017-notificaciones.sql` (tabla nueva, no toca datos existentes):

- `notificacion(id, usuario_id, tipo, categoria, titulo, mensaje, entidad_tipo, entidad_id, url_destino, clave_evento, leida, fecha_lectura, fecha_creacion, fecha_expiracion)`.
- `UNIQUE (usuario_id, clave_evento)`: **antiduplicados**; la inserción es `INSERT IGNORE`.
- Índices: `(usuario_id, leida, fecha_creacion)` no leídas, `(usuario_id, fecha_creacion)` historial, `(usuario_id, categoria, fecha_creacion)`, `(fecha_expiracion)`.
- No se copian datos de informes: solo `entidad_tipo` / `entidad_id` y la ruta de destino.
- Categorías: `INFORMATIVA`, `PENDIENTE`, `ADMINISTRATIVA`, `SOLICITUD`.

## Eventos y destinatarios

| Evento (existe en la plataforma) | Categoría | Quién recibe |
| --- | --- | --- |
| Informe registrado (`crearInforme`) | INFORMATIVA | Quien lo registra. Incluye la fecha límite real del periodo. |
| Informe cerrado / entregado (`cerrarInforme`) | INFORMATIVA | Responsables vigentes de la Congregación Ciudad y quien lo registró; Obrero País que supervisa ese país. |
| Informe cerrado automáticamente (cron / informe vencido) | INFORMATIVA | Igual que el anterior, con mensaje propio. |
| Informe pendiente a N días de la fecha límite | PENDIENTE | Responsables de cada Congregación Ciudad sin informe cerrado; Obrero País (resumen por país). |
| Informes sin entregar (resumen) | ADMINISTRATIVA | Administradores. |
| Alertas del Dashboard de Supervisión (variaciones, tendencias, asuntos recurrentes) | ADMINISTRATIVA | Solo quienes tienen el permiso autorizado del dashboard (`DASHBOARD_SUPERVISION_CONFIG.rolesAutorizados`). |
| Nueva solicitud multimedia (correo verificado) | SOLICITUD | Aprobadores multimedia con responsabilidad sobre el país / congregación / campo de la persona. |
| Solicitud aprobada / rechazada | SOLICITUD | La persona que hizo la solicitud. |
| Solicitudes pendientes (semanal) | PENDIENTE | Aprobadores multimedia con pendientes en su ámbito. |

Reglas:

- **Solo Congregación Ciudad** genera avisos de entrega de informes; no se generan para Campo ni País.
- **Obrero País**: encargado del país **con** el permiso Obrero País (misma regla que `obtenerContextoObreroPais`).
- **Fecha límite**: únicamente la de `helpers/periodoInforme.ts`; no se inventan vencimientos.
- **Alertas de supervisión**: se calculan sobre el último trimestre **cerrado**, con el motor y los umbrales del dashboard (`DASHBOARD_SUPERVISION_CONFIG.umbrales`). El mensaje trae periodo actual, periodo de comparación, valor anterior, valor actual y porcentaje. Es información de seguimiento: sin puntajes ni rankings. `INFORME_PENDIENTE` se excluye porque lo cubren los recordatorios por fecha límite.
- Las alertas `ADMINISTRATIVA` además se **filtran al consultar**: si un usuario pierde el permiso, deja de verlas.
- No existe un estado "informe devuelto / requiere corrección" ni un evento discreto de "informe actualizado" (las secciones se guardan por separado), por lo que no se generan esas notificaciones.

## Tareas programadas (solo `NODE_ENV=production`)

- Diaria 05:30 UTC (después del cierre automático de informes): recordatorios de informe pendiente, alertas de supervisión y depuración.
- Semanal, lunes 14:30 UTC: solicitudes multimedia pendientes por aprobador.

## Configuración (`src/config/notificaciones.config.ts`, variables opcionales)

| Variable | Defecto | Efecto |
| --- | --- | --- |
| `NOTIF_INFORME_DIAS_ANTES` | `7,3,1` | Umbrales de recordatorio (días antes de la fecha límite). Un aviso por umbral. |
| `NOTIF_RETENCION_LEIDAS_DIAS` | `90` | Las leídas se depuran pasado este tiempo. |
| `NOTIF_RETENCION_NO_LEIDAS_DIAS` | `365` | Las no leídas se depuran pasado este tiempo. |
| `NOTIF_SUPERVISION_MAX` | `200` | Tope de alertas nuevas por administrador y ejecución. |

## Actualización automática

**Sondeo (polling)** del contador cada 60 s mientras la pestaña está visible, y al volver a ella. Se descartó SSE/WebSockets: exigen conexiones persistentes, sesiones adheridas o infraestructura adicional con varias instancias de Elastic Beanstalk, y `EventSource` no permite enviar el JWT en la cabecera. El sondeo reutiliza el mismo JWT, no añade infraestructura y cada respuesta es el valor absoluto del servidor, así que el contador no puede incrementarse dos veces por la misma notificación.

## Despliegue

1. Aplicar `migrations/017-notificaciones.sql` en la base de producción (antes del backend).
2. Desplegar el backend y luego el frontend.
3. (Opcional) definir las variables de la tabla anterior en el entorno de Elastic Beanstalk.

## Pruebas

```bash
node --test tests/notificaciones.test.cjs   # servicio, controlador, permisos, duplicados y emisores
```

## Ampliaciones previstas (no incluidas)

Correo, push del navegador, móvil, preferencias por usuario y resúmenes: bastaría con añadir canales que lean la misma tabla / `crearNotificaciones`; las `clave_evento` ya identifican cada evento de forma única.
