# Dashboard Ejecutivo de Supervisión Congregacional

Panel para administradores que resume, por trimestre, la información registrada en los
informes de obreros de congregaciones y campos. **No asigna puntajes ni ordena unidades por
desempeño**: muestra la evidencia y sus variaciones; la interpretación corresponde al
administrador.

- Backend: `src/routes/dashboardSupervision.routes.ts` → `src/controllers/dashboardSupervision.controller.ts`
  → `src/services/dashboardSupervision.service.ts` (+ módulos puros en `src/services/dashboardSupervision/`).
- Frontend: ruta `#/sistema/dashboard-supervision` (menú **Reportes → Dashboard de Supervisión**),
  página `src/app/pages/administracion/reportes/dashboard-supervision/`.

## Seguridad

Todas las rutas usan `validarJWT` y `validarRolSupervision`
(`src/middlewares/validar-roles.ts`). Los permisos autorizados están en
`src/config/dashboardSupervision.config.ts` (`rolesAutorizados`, por defecto sólo
`ADMINISTRADOR`).

| Situación                         | Respuesta |
| --------------------------------- | --------- |
| Sin token / token inválido        | 401       |
| Usuario sin permiso autorizado    | 403       |
| Error consultando permisos        | 500       |

En el frontend la ruta está protegida con `RolesGuard` (`ROLES.ADMINISTRADOR`) y el ítem de
menú sólo se muestra a administradores.

## Reglas de negocio

### Periodos

- Unidad de análisis: trimestre (`anio`, `trimestre`). Por defecto, el periodo activo
  (trimestre de la fecha actual).
- Periodo efectivo de un informe: `informe.periodo` (migración 004) o, si es nulo, el
  inicio del trimestre de `createdAt`.
- Modos de comparación (`comparacion`):
  - `TRIMESTRE_ANTERIOR` (por defecto): Q3 2026 vs Q2 2026.
  - `MISMO_TRIMESTRE_ANIO_ANTERIOR`: Q3 2026 vs Q3 2025.
- Inicio de cobertura: **1 de julio de 2026** (`inicioCobertura` en la configuración).
  Aunque el registro comenzó en septiembre, se ingresaron las actividades de julio a
  septiembre: Q3 2026 es el primer trimestre completo, no un trimestre parcial.
- `contexto.coberturaTemporal` informa el inicio, si el periodo carece de cobertura,
  si está en curso o es futuro, y si admite comparación. No se calculan crecimientos
  contra periodos anteriores a la cobertura ni para trimestres en curso.
  La interfaz oculta estadísticas de periodos sin cobertura, en lugar de mostrarlos
  como cero actividad o incumplimientos.

### Listado de informes de todos los obreros

La sección **Informes de todos los obreros**, exclusiva del dashboard del administrador,
se abre desde una pestaña junto a **Resumen de supervisión**. Ambas comparten los filtros
del Dashboard. Al regresar del informe completo se abre la pestaña de informes.
El listado
consulta `GET /api/dashboard-supervision/informes` con `anio`, `trimestre`, `busqueda`,
`pagina` y `porPagina` (máximo 100). Devuelve `{ ok, informes: { informes, total,
pagina, porPagina, totalPaginas } }`.

Incluye los informes no eliminados del trimestre seleccionado, abiertos y cerrados, de los
responsables asignados a congregaciones activas (país, ciudad o campo). Los parámetros
`pais_id`, `congregacion_id` y `campo_id` aplican la misma jerarquía del Dashboard:
país incluye sus ciudades y campos; ciudad incluye sus campos; campo incluye exclusivamente
sus responsables. Se consideran ambos responsables cuando la unidad permite dos.
El alcance del listado se selecciona por los responsables. Permite buscar por nombre del obrero o número de informe y abrir
el informe completo. Al regresar se conservan el periodo y los filtros geográficos.
La tabla muestra exclusivamente la jerarquía de la Congregación del informe, identificada
por `tipo_congregacion` y `congregacion_id`, sin combinar otras asignaciones del autor.
Un informe País muestra solo país; uno Ciudad muestra país y ciudad; uno Campo muestra
país, ciudad y campo. Los abiertos usan la jerarquía actual de esa unidad cuando está
disponible; los cerrados conservan los nombres guardados en el informe. Los informes
legados sin ámbito no infieren ubicaciones desde el autor. Las celdas no aplicables quedan vacías.
El endpoint usa los mismos controles JWT y de rol administrador que el resto del dashboard.

### Congregaciones (unidades) y estado de entrega

En la interfaz cada unidad se muestra como **congregación**, discriminada por tipo:

| `tipo`         | En pantalla          | Tabla      | Obrero(s) que la representan                      |
| -------------- | -------------------- | ---------- | ------------------------------------------------- |
| `PAIS`         | Congregación País    | `pais`     | `idObreroEncargado`                               |
| `CONGREGACION` | Congregación Ciudad  | `congregacion` | `idObreroEncargado` / `idObreroEncargadoDos`  |
| `CAMPO`        | Congregación Campo   | `campo`    | `idObreroEncargado` / `idObreroEncargadoDos`      |

Los cálculos asocian cada informe exclusivamente por `tipo_congregacion` +
`congregacion_id`, independientemente de su autor y de cambios de responsable.
Un mismo obrero encargado de Chile y Tuluá no comparte los datos de ambos informes.
Los informes legados sin ámbito no se atribuyen automáticamente a ninguna unidad.
La Congregación País entra en el alcance cuando no se filtra una Congregación
Ciudad o Campo. `cobertura.porTipo` entrega el conteo por tipo.

La cobertura de entrega y los indicadores del resumen corresponden exclusivamente a
**Congregaciones Ciudad**. El detalle de un país agrega sus ciudades; el de un campo
usa su ciudad. Los informes propios de País y Campo no se suman otra vez a esos
agregados. Los conteos de catálogo por tipo incluyen las unidades del alcance.

`contexto.integridad` cuenta los informes sin ámbito del periodo seleccionado, de la
comparación y del rango histórico. Son **conteos globales**, no atribuibles al filtro
geográfico. Si existen, la interfaz y las exportaciones avisan que los indicadores y
series excluyen esos registros y pueden ser parciales. No se infiere su ubicación
desde los responsables actuales, ni se modifican los datos históricos.
Con legados en alguno de los periodos comparados se inhiben los porcentajes de
crecimiento. Con legados en el periodo seleccionado, los porcentajes de entrega son
`null`, se ocultan las tarjetas de cumplimiento y se inhiben las alertas de pendientes.
Sin informe identificado no equivale necesariamente a incumplimiento. Las tendencias
de crecimiento o disminución se inhiben si el rango histórico contiene legados.

| Estado           | Significado                                      |
| ---------------- | ------------------------------------------------ |
| `ENTREGADO`      | Informe del periodo cerrado                      |
| `EN_ELABORACION` | Informe del periodo abierto                      |
| `PENDIENTE`      | Tiene obrero asignado pero no hay informe        |
| `SIN_OBRERO`     | No tiene obrero asignado                         |

### Variaciones

`porcentaje = (actual − anterior) / anterior × 100`, redondeado a dos decimales
(presentado con un decimal en la interfaz).

| Estado                           | Cuándo                                         |
| -------------------------------- | ---------------------------------------------- |
| `VARIACION`                      | Ambos valores existen y `anterior > 0`         |
| `SIN_BASE_COMPARATIVA`           | `anterior = 0` y `actual > 0`                  |
| `SIN_ACTIVIDAD`                  | `anterior = 0` y `actual = 0`                  |
| `SIN_INFORMACION_PREVIA`         | No hay dato anterior                           |
| `INFORMACION_ACTUAL_INCOMPLETA`  | Hay dato anterior pero no actual               |
| `SIN_INFORMACION`                | No hay ninguno                                 |

Clasificación (umbrales configurables, por defecto 10 % y 3 %):

| Tendencia                   | Regla                  |
| --------------------------- | ---------------------- |
| `INCREMENTO_SIGNIFICATIVO`  | ≥ +10 %                |
| `INCREMENTO_MODERADO`       | ≥ +3 % y < +10 %       |
| `ESTABLE`                   | > −3 % y < +3 %        |
| `DISMINUCION_MODERADA`      | ≤ −3 % y > −10 %       |
| `DISMINUCION_SIGNIFICATIVA` | ≤ −10 %                |

En la interfaz cada variación se muestra con flecha **y** texto (nunca sólo color).

**Base de comparación del alcance**: las variaciones agregadas (resumen) usan únicamente las
unidades que tienen informe **cerrado en ambos periodos** (`cobertura.unidadesComparadas`), para no
confundir "más informes" con "más actividad". `valorPeriodo` sí incluye todos los informes
del periodo, incluidos los abiertos, cuyos datos son provisionales. Cada indicador compara
solo las unidades con información de esa métrica en ambos periodos; una sección ausente
no se sustituye por cero ni altera la base de comparación del otro periodo.
Los trimestres deben haber terminado en la fecha local de Bogotá y tener cobertura completa.

### Actividades y servicios

`tipoActividadEclesiastico.nombre` se normaliza (minúsculas, sin tildes) y se clasifica:

- contiene "servicio" → servicio; el día se toma del nombre (martes, jueves, domingo) o, si no
  lo indica, de `DAYOFWEEK(actividad.fecha)` → `SERVICIO_MARTES`, `SERVICIO_JUEVES`,
  `SERVICIO_DOMINGO`, `SERVICIO_OTROS_DIAS`;
- contiene "consejero" → `CONSEJERO`;
- contiene "vigilia" → `VIGILIA`;
- en otro caso → `OTRA`.

Las palabras clave están en la configuración.

La asistencia acumulada cuenta participaciones, **no personas únicas**. No existe
identificación de asistentes para calcular personas distintas.

### Datos ausentes y serie mensual

Una sección sin registros devuelve `null` y se muestra como “—”, no como cero actividad.
Un cero explícitamente registrado sigue siendo cero. No se añade un mecanismo nuevo
para confirmar secciones sin actividad.

`/tendencias` conserva las series trimestrales y añade `seriesMensuales`: asistencia
acumulada a servicios, cantidad de servicios y promedio por servicio. Usa el mes de
`actividad.fecha`, no la fecha de creación del informe, y únicamente los informes de
las ciudades del alcance. Los meses sin registros son `null`; no se crean meses
anteriores a julio de 2026 ni posteriores al mes actual. El mes actual es provisional.
No incluye una serie mensual de visitas porque sus registros no tienen la misma
fecha de evento verificable.

### Variación de asistencia por servicio

Para revisar muchas congregaciones a la vez, `/resumen` incluye `variacionPorServicio`: por cada
servicio (`general`, `martes`, `jueves`, `domingo`, `otros`), cuántas congregaciones del alcance
quedan en cada grupo según la variación de **su propio** promedio de asistencia por servicio
(periodo actual vs. comparación): `DISMINUCION_SIGNIFICATIVA`, `DISMINUCION_MODERADA`, `ESTABLE`,
`INCREMENTO_MODERADO`, `INCREMENTO_SIGNIFICATIVO` y `SIN_COMPARACION` (sin informe en alguno de
los periodos, sin base o sin servicios). Cada congregación cuenta una sola vez por servicio, de modo
que la suma de cada fila es el total de congregaciones del alcance.

En `/unidades`, `servicio` + `variacion` filtran la tabla por ese mismo grupo. `variacion` acepta
cualquiera de los grupos anteriores o `DISMINUYO` / `AUMENTO` (ambos niveles). Con `servicio`, el
orden `MAYOR_INCREMENTO` / `MAYOR_DISMINUCION` usa el promedio de ese servicio. Cada fila incluye
`promedioAsistenciaServicio`, `promedioServicioMartes`, `promedioServicioJueves`,
`promedioServicioDomingo` y `promedioServicioOtrosDias`.

### Entrega del informe por país

`/resumen` incluye `entregaPorPais`: por cada país del alcance (orden alfabético), el total de
**Congregaciones Ciudad** y cuántas tienen el informe del periodo `entregados` (cerrado),
`enElaboracion` (abierto), `pendientes` (con obrero, sin informe) o `sinObrero`.
`porcentajeConInforme` = (entregados + en elaboración) ÷ ciudades con responsable × 100.
Es el porcentaje de **informes iniciados**, no de entregados.
`cobertura.porcentajeEntregado` = entregados (cerrados) ÷ ciudades con responsable × 100.
Sin denominador o sin cobertura temporal los porcentajes son `null`.

### Alertas

Las alertas del dashboard (`/alertas` y `resumen.alertas`) solo incluyen **Congregaciones Ciudad**
(tipo `CONGREGACION`).

| Tipo                    | Nivel        | Regla                                                                 |
| ----------------------- | ------------ | --------------------------------------------------------------------- |
| `INFORME_PENDIENTE`     | Atención     | Unidad con obrero y sin informe en el periodo                         |
| `DISMINUCION`           | Atención     | Indicador alertable con disminución significativa                      |
| `INCREMENTO`            | Informativa  | Indicador alertable con incremento significativo                       |
| `TENDENCIA_DISMINUCION` | Atención     | 3 variaciones consecutivas a la baja en el histórico                   |
| `TENDENCIA_CRECIMIENTO` | Informativa  | 3 variaciones consecutivas al alza en el histórico                     |
| `ASUNTO_RECURRENTE`     | Atención     | Mismo asunto pendiente (texto normalizado) en 3 trimestres seguidos    |

Un trimestre sin información interrumpe la racha de una tendencia. Las alertas de
variación y tendencia solo usan informes cerrados de trimestres terminados y cubiertos.
No se generan alertas de pendientes para periodos anteriores a la cobertura.

### Actividad económica

Los montos sólo se muestran cuando el alcance está limitado a un país, congregación o campo,
porque las monedas difieren entre países. Los diezmos no se incluyen.

## Endpoints

Base: `/api/dashboard-supervision`. Header obligatorio: `x-token`.

Parámetros comunes (query): `anio` (o `año`), `trimestre` (1‑4), `pais_id`,
`congregacion_id`, `campo_id`, `comparacion`. Los IDs deben ser enteros y coherentes con la
jerarquía; de lo contrario se responde 400.

| Método | Ruta                      | Parámetros adicionales                                                       |
| ------ | ------------------------- | ---------------------------------------------------------------------------- |
| GET    | `/filtros`                | —                                                                            |
| GET    | `/resumen`                | —                                                                            |
| GET    | `/tendencias`             | —                                                                            |
| GET    | `/alertas`                | `tipo`, `nivel`                                                              |
| GET    | `/unidades`               | `busqueda`, `tipo`, `estado`, `orden`, `servicio`, `variacion`, `pagina`, `porPagina` (máx. 100) |
| GET    | `/unidades/:tipo/:id`     | `tipo` = `PAIS` \| `CONGREGACION` \| `CAMPO`                                   |

`orden`: `NOMBRE`, `PAIS`, `CONGREGACION`, `MAYOR_INCREMENTO`, `MAYOR_DISMINUCION`,
`MAS_ALERTAS` (los dos de variación ordenan por la asistencia general; no es un ranking de
desempeño).

### Ejemplo: `GET /resumen?anio=2026&trimestre=3`

```json
{
  "ok": true,
  "resumen": {
    "contexto": {
      "filtros": { "anio": 2026, "trimestre": 3, "pais_id": null, "congregacion_id": null, "campo_id": null, "comparacion": "TRIMESTRE_ANTERIOR" },
      "periodo": { "anio": 2026, "trimestre": 3, "etiqueta": "Q3 2026", "nombre": "tercer trimestre de 2026", "fechaInicio": "2026-07-01" },
      "periodoComparacion": { "anio": 2026, "trimestre": 2, "etiqueta": "Q2 2026", "nombre": "segundo trimestre de 2026", "fechaInicio": "2026-04-01" },
      "descripcionComparacion": "trimestre anterior (Q2 2026)",
      "generadoEn": "2026-10-04T22:00:00.000Z",
      "integridad": { "informesSinAmbitoPeriodo": 0, "informesSinAmbitoComparacion": 0, "informesSinAmbitoHistorico": 0 },
      "coberturaTemporal": { "inicioCobertura": "2026-07-01", "sinCobertura": false, "enCurso": false, "comparable": false, "mensaje": "Historial insuficiente: el periodo de comparación no tiene cobertura completa." }
    },
    "cobertura": { "unidades": 349, "porTipo": { "PAIS": 12, "CONGREGACION": 120, "CAMPO": 217 }, "conObrero": 100, "entregados": 0, "enElaboracion": 1, "pendientes": 99, "sinObrero": 20, "porcentajeConInforme": 1, "porcentajeEntregado": 0, "informesPeriodo": 1, "unidadesComparadas": 0 },
    "indicadores": [
      {
        "clave": "asistenciaGeneral", "etiqueta": "Asistencia general", "grupo": "ASISTENCIA", "formato": "ENTERO",
        "valorPeriodo": 7475,
        "variacion": { "anterior": null, "actual": null, "diferencia": null, "porcentaje": null, "estado": "SIN_INFORMACION", "tendencia": null, "direccion": null, "mensaje": "Historial insuficiente: el periodo de comparación no tiene cobertura completa." }
      }
    ],
    "asistenciaPorServicio": [],
    "variacionPorServicio": [],
    "actividadesEspiritualesPorCategoria": [],
    "actividadEconomica": { "disponible": false, "montoRecaudado": null, "mensaje": "Seleccione un país para ver montos: cada país registra en su moneda local y no se suman entre sí." },
    "alertas": { "total": 99, "porTipo": { "INFORME_PENDIENTE": 99 } }
  }
}
```

(Valores ilustrativos.)

### Ejemplo de error

```json
{ "ok": false, "msg": "El campo seleccionado no pertenece a la congregación indicada." }
```

## Rendimiento

- Los cálculos de un mismo conjunto de filtros se guardan en memoria durante
  `cacheSegundos` (60 s) y se comparten entre endpoints.
- Migración `migrations/005-indices-dashboard-supervision.sql`: índice
  `idx_informe_periodo_usuario (periodo, usuario_id)`. Es idempotente; ejecutar **después** de
  la 004. Ver `migrations/README.md`.

## Exportación

Desde la página se exporta a **Excel** (hojas Resumen, Asistencia por servicio, Congregaciones,
Alertas y Servicios mensuales) y **PDF** (resumen, indicadores, servicios, serie mensual y
alertas) con los mismos filtros aplicados. Ambos formatos incluyen el inicio de cobertura,
las restricciones de comparación y los porcentajes separados de iniciados y entregados.

## Limitaciones conocidas

1. **Legados sin ámbito**: no se infiere la congregación desde el autor; requieren una
   conciliación explícita si deben incorporarse a las estadísticas.
2. **Catálogo actual**: las unidades y su jerarquía proceden del catálogo activo actual.
   El autor histórico no limita los informes consultados, pero una unidad inactiva o
   un cambio de jerarquía no se reconstruye como un catálogo histórico.
3. **Monedas**: no se suman montos entre países.
4. **Comparación semestral/anual**: no implementada; queda como trabajo futuro (los módulos de
   periodos están preparados para agregar nuevos modos).
5. La caché es por proceso; en despliegues con varias instancias cada una mantiene la suya.

## Pruebas

```bash
npm test
```

Compila `tests/**/*.ts` con `tsconfig.test.json` y ejecuta `node --test`. Cubre cálculo de
variaciones y redondeo, clasificación, tendencias consecutivas, periodos y comparaciones,
clasificación de actividades, validación de jerarquía y el middleware de roles (401/403/500).
