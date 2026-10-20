# Informes trimestrales por Congregación

## Identidad y responsables

Los informes nuevos pertenecen a una Congregación y a un periodo. Su identidad
técnica es `(periodo, tipo_congregacion, congregacion_id)`, donde `tipo_congregacion` distingue
Congregación País (`PAIS`), Congregación Ciudad (`CONGREGACION`) y Congregación
Campo (`CAMPO`). La cantidad de responsables no forma parte de la identidad, así
que el obrero principal y sus auxiliares comparten el mismo informe. `usuario_id`
se conserva como usuario que creó el registro y para la compatibilidad con los
informes existentes.

Las responsabilidades formales provienen de los campos
`idObreroEncargado`/`idObreroEncargadoDos` de `pais`, `congregacion` y `campo`.
Los responsables son únicamente los obreros encargados y auxiliares formales
registrados directamente en esas entidades. Los feligreses asociados mediante
`usuarioCongregacion` no son responsables del informe; una Congregación Ciudad
puede mostrar su obrero encargado y, como máximo, su obrero auxiliar. Para
Congregación País, el responsable es el obrero encargado definido directamente
en `pais`.

Mientras el informe está abierto, la pantalla presenta las responsabilidades
vigentes. El cierre manual y el cierre automático guardan, en una transacción,
los nombres, usuarios y tipos de responsabilidad en `informeResponsable`, junto
con el nombre de la Congregación y su jerarquía en `informe`. A partir del cierre,
las lecturas utilizan exclusivamente ese snapshot. `fecha_cierre` registra el
cierre y `usuario_cierre_id` queda nulo para cierres automáticos.

## Migración y compatibilidad

Aplicar `migrations/006-informe-ambito-y-responsables.sql`, luego
`migrations/007-informe-tipo-congregacion.sql`,
`migrations/008-informe-revision-auditoria.sql` y finalmente
`migrations/009-eliminar-informe-seccion-revision.sql` y
`migrations/010-completar-historial-informes.sql`. La migración 007 cambia los
nombres técnicos de `tipo_unidad`/`unidad_id` a `tipo_congregacion`/
`congregacion_id`; conserva sus valores y la clave única. Los registros legados
mantienen los campos nuevos en nulo; no modifica ni elimina sus IDs ni sus datos.
La migración 008 crea el historial de auditoría de las secciones.
Si se aplicó una versión anterior que incluía `informeSeccionRevision`,
esa tabla ya no se utiliza. Tras desplegar el código sin la funcionalidad de
revisión y respaldar la base de datos, la migración 009 elimina únicamente esa
tabla y sus marcas de revisión de forma permanente. Puede ejecutarse aunque
la tabla no exista. No modifica `informeAuditoria` ni `informeResponsable`.

La migración 010 completa los campos de Congregación vacíos de informes cerrados
usando la entidad actual correspondiente y crea snapshots de responsables solo
cuando el informe todavía no tiene ninguno. Para informes legados sin tipo ni
Congregación, asigna la unidad formal actual del creador únicamente cuando tiene
exactamente una; si tiene varias o ninguna, no inventa una correspondencia. La
migración no reemplaza campos no vacíos ni modifica snapshots existentes y se
puede ejecutar de nuevo. Los datos recuperados de asignaciones vigentes son una
aproximación: no garantizan cuáles eran los obreros asignados al cerrar cada
informe. Los casos que no se puedan asociar de forma única siguen indicándose
como información histórica no disponible. Hacer un respaldo antes de ejecutar.

Los informes abiertos legados conservan su registro y pueden cerrarse; el
snapshot oficial de cierre se genera cuando se dispone de su ámbito actual.

La creación de informes nuevos requiere que el usuario autenticado tenga
responsabilidad en la Congregación correspondiente. Si dos responsables intentan
crear el mismo informe a la vez, la restricción única de base de datos evita el
duplicado.

## Cambios de asignación

Los informes abiertos reflejan las asignaciones actuales. El snapshot solo se
escribe cuando el informe pasa de `ABIERTO` a `CERRADO`; el controlador y el cron
usan el mismo servicio transaccional. Los endpoints de edición y los endpoints
de secciones rechazan modificaciones posteriores al cierre. Un informe cerrado
tampoco se puede eliminar: sus datos, identidad de Congregación y responsables
son registros históricos inmutables. Si cambia la asignación de obreros o el
nombre de una Congregación, las consultas históricas siguen mostrando los datos
guardados al cierre y no sustituyen esos valores por la asignación actual.

## Cierre y auditoría

Las secciones muestran si tienen registros, sin marcas de revisión ni
declaraciones de ausencia de novedades. Antes del cierre manual se presenta
la Congregación, el período, los responsables y las secciones con datos.
El cierre no exige completar todas las secciones. Las secciones vacías muestran
su mensaje habitual tanto en la consulta como en el PDF.

`GET /api/informe/:id/auditoria` devuelve el historial autorizado del informe.
La pantalla de diligenciamiento no muestra ni consulta este historial; los
registros de auditoría y su endpoint se conservan en el backend.
Cada cierre y creación/actualización/eliminación de un registro de
sección guarda actor, fecha, sección, ID del registro y cambios. La auditoría
de una escritura de sección se guarda en la misma transacción; si falla, la
operación falla y se revierte en lugar de persistir un cambio sin auditoría.

## Metas pendientes por Congregación

`GET /api/meta/informe/:informeId/pendientes` devuelve metas activas en estado
Pendiente o En Progreso de informes anteriores del mismo `tipo_congregacion` y
`congregacion_id`, sin limitar por usuario creador. Solo admite el informe
abierto del periodo activo. La continuación se crea como registro nuevo en ese
informe con `POST /api/meta/copiar` y `actualizacion`; nunca modifica la meta
del informe previo. Completar una meta exige que pertenezca a un informe
autorizado, abierto y del periodo activo.

## Vencimiento

El middleware de escritura detecta informes abiertos que alcanzaron la fecha
límite, los cierra con el servicio transaccional compartido y rechaza la
escritura con `409 INFORME_VENCIDO`. En producción el cron se ejecuta
diariamente a las 05:05 UTC. Tras autenticar la conexión a la base de datos,
el backend también ejecuta un catch-up al arrancar para cerrar informes que
vencieron mientras el servicio estaba detenido.
