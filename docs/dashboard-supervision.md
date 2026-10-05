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

### Congregaciones (unidades) y estado de entrega

En la interfaz cada unidad se muestra como **congregación**, discriminada por tipo:

| `tipo`         | En pantalla          | Tabla      | Obrero(s) que la representan                      |
| -------------- | -------------------- | ---------- | ------------------------------------------------- |
| `PAIS`         | Congregación País    | `pais`     | `idObreroEncargado`                               |
| `CONGREGACION` | Congregación Ciudad  | `congregacion` | `idObreroEncargado` / `idObreroEncargadoDos`  |
| `CAMPO`        | Congregación Campo   | `campo`    | `idObreroEncargado` / `idObreroEncargadoDos`      |

Un informe no tiene llave hacia la congregación: se asocia por `informe.usuario_id` = obrero
encargado. La Congregación País entra en el alcance cuando no se filtra una Congregación
Ciudad o Campo. `cobertura.porTipo` entrega el conteo por tipo.

| Estado           | Significado                                      |
| ---------------- | ------------------------------------------------ |
| `ENTREGADO`      | Informe del periodo cerrado                      |
| `EN_ELABORACION` | Informe del periodo abierto                      |
| `PENDIENTE`      | Tiene obrero asignado pero no hay informe        |
| `SIN_OBRERO`     | No tiene obrero asignado                         |

### Variaciones

`porcentaje = (actual − anterior) / anterior × 100`, redondeado a un decimal.

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
unidades que tienen informe en ambos periodos (`cobertura.unidadesComparadas`), para no
confundir "más informes" con "más actividad". `valorPeriodo` sí incluye todos los informes
del periodo.

### Actividades y servicios

`tipoActividadEclesiastico.nombre` se normaliza (minúsculas, sin tildes) y se clasifica:

- contiene "servicio" → servicio; el día se toma del nombre (martes, jueves, domingo) o, si no
  lo indica, de `DAYOFWEEK(actividad.fecha)` → `SERVICIO_MARTES`, `SERVICIO_JUEVES`,
  `SERVICIO_DOMINGO`, `SERVICIO_OTROS_DIAS`;
- contiene "consejero" → `CONSEJERO`;
- contiene "vigilia" → `VIGILIA`;
- en otro caso → `OTRA`.

Las palabras clave están en la configuración.

### Alertas

| Tipo                    | Nivel        | Regla                                                                 |
| ----------------------- | ------------ | --------------------------------------------------------------------- |
| `INFORME_PENDIENTE`     | Atención     | Unidad con obrero y sin informe en el periodo                         |
| `DISMINUCION`           | Atención     | Indicador alertable con disminución significativa                      |
| `INCREMENTO`            | Informativa  | Indicador alertable con incremento significativo                       |
| `TENDENCIA_DISMINUCION` | Atención     | 3 variaciones consecutivas a la baja en el histórico                   |
| `TENDENCIA_CRECIMIENTO` | Informativa  | 3 variaciones consecutivas al alza en el histórico                     |
| `ASUNTO_RECURRENTE`     | Atención     | Mismo asunto pendiente (texto normalizado) en 3 trimestres seguidos    |

Un trimestre sin información interrumpe la racha de una tendencia.

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
| GET    | `/unidades`               | `busqueda`, `tipo`, `estado`, `orden`, `pagina`, `porPagina` (máx. 100)      |
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
      "generadoEn": "2026-10-04T22:00:00.000Z"
    },
    "cobertura": { "unidades": 349, "porTipo": { "PAIS": 12, "CONGREGACION": 120, "CAMPO": 217 }, "conObrero": 223, "entregados": 0, "enElaboracion": 1, "pendientes": 222, "sinObrero": 126, "porcentajeConInforme": 0.4, "informesPeriodo": 1, "unidadesComparadas": 1 },
    "indicadores": [
      {
        "clave": "asistenciaGeneral", "etiqueta": "Asistencia general", "grupo": "ASISTENCIA", "formato": "ENTERO",
        "valorPeriodo": 7475,
        "variacion": { "anterior": 8860, "actual": 7475, "diferencia": -1385, "porcentaje": -15.6, "estado": "VARIACION", "tendencia": "DISMINUCION_SIGNIFICATIVA", "direccion": "BAJA", "mensaje": "↓ 15,6 %" }
      }
    ],
    "asistenciaPorServicio": [],
    "actividadesEspiritualesPorCategoria": [],
    "actividadEconomica": { "disponible": false, "montoRecaudado": null, "mensaje": "Seleccione un país para ver montos: cada país registra en su moneda local y no se suman entre sí." },
    "alertas": { "total": 227, "porTipo": { "INFORME_PENDIENTE": 222 } }
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
Alertas) y **PDF** (resumen, indicadores, servicios y alertas) con los mismos filtros
aplicados.

## Limitaciones conocidas

1. **Obrero compartido**: si un mismo usuario es obrero de una congregación y de uno de sus
   campos, su informe aparece en ambas unidades. Los totales del alcance deduplican por id de
   informe, pero la fila de cada unidad lo muestra.
2. **Asignaciones actuales**: el histórico usa los obreros asignados hoy. Si una unidad cambió
   de obrero, los trimestres anteriores reflejan los informes del obrero actual.
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
