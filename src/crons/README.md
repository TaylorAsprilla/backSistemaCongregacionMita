# 🔔 Cron Job: Notificación de Solicitudes Multimedia Pendientes

## 📋 Descripción

Este cron job notifica automáticamente a los usuarios con permiso de **APROBADOR MULTIMEDIA** sobre las solicitudes multimedia pendientes correspondientes a su área de responsabilidad (país, congregación o campo).

## ⚙️ Funcionamiento

### **Programación**

- **Frecuencia**: Semanal
- **Día**: Todos los lunes
- **Hora**: 9:00 AM
- **Expresión Cron**: `0 9 * * 1`

### **Lógica de Notificación**

#### **1. Identificación de Aprobadores**

El sistema busca usuarios con:

- Permiso `ADMINISTRADOR_MULTIMEDIA` (ID: 7)
- Email válido configurado
- Asignados como obreros encargados de:
  - **Países** (`Pais.idObreroEncargado`)
  - **Congregaciones** (`Congregacion.idObreroEncargado` o `idObreroEncargadoDos`)
  - **Campos** (`Campo.idObreroEncargado` o `idObreroEncargadoDos`)

#### **2. Filtrado de Solicitudes**

Para cada aprobador, se obtienen solicitudes que cumplan:

- Estado: `PENDIENTE`
- Email verificado: `true`
- Ubicación del solicitante coincide con la jurisdicción del aprobador

#### **3. Envío de Notificaciones**

Solo se envían emails cuando:

- Hay solicitudes pendientes en la jurisdicción
- El aprobador tiene email configurado
- No hay errores en el proceso de envío

## 📊 Ejemplos de Casos de Uso

### **Caso 1: Obrero País**

```
Usuario: 2182
Rol: Obrero País - Colombia
Permiso: ADMINISTRADOR_MULTIMEDIA
Resultado: Recibe email con todas las solicitudes pendientes de usuarios ubicados en Colombia
```

### **Caso 2: Obrera Congregación**

```
Usuario: 3
Rol: Obrera Congregación - Boston
Permiso: ADMINISTRADOR_MULTIMEDIA
Resultado: Recibe email con todas las solicitudes pendientes de usuarios de la congregación Boston
```

### **Caso 3: Obrero Campo**

```
Usuario: 1425
Rol: Obrero Campo - Centro
Permiso: ADMINISTRADOR_MULTIMEDIA
Resultado: Recibe email con todas las solicitudes pendientes de usuarios del campo Centro
```

## 📧 Contenido del Email

### **Información Incluida**

- Nombre del aprobador
- Tipo y nombre de la jurisdicción
- Total de solicitudes pendientes
- Fecha del reporte
- Lista detallada con:
  - Número Mita del solicitante
  - Nombre completo
  - Email
  - Fecha de la solicitud

### **Template Utilizado**

`src/templates/solicitudesPendientesAprobador.html`

## 🧪 Pruebas

### **Endpoint Manual de Prueba**

```http
POST /api/cron/test-notifications
Authorization: Bearer <JWT_TOKEN>
```

**Respuesta exitosa:**

```json
{
  "ok": true,
  "msg": "Notificación de solicitudes pendientes ejecutada exitosamente",
  "ejecutadoPor": 123,
  "fechaEjecucion": "2024-10-09T14:30:00.000Z"
}
```

### **Pruebas en Desarrollo**

Para pruebas frecuentes, descomenta en `notifyPendingRequests.ts`:

```typescript
// Para pruebas, descomenta la siguiente línea (ejecuta cada minuto):
cron.schedule("* * * * *", async () => {
  console.log("🧪 [PRUEBA] Ejecutando notificación...");
  await notificarAprobadoresMultimedia();
});
```

## 📝 Logs del Sistema

### **Logs Principales**

```bash
🔍 Iniciando notificación semanal a aprobadores multimedia...
📊 Encontrados 5 aprobadores multimedia
✅ Email enviado al Obrero País: Juan Pérez (3 solicitudes)
✅ Email enviado al Obrero Congregación: María López (1 solicitudes)
✅ Proceso de notificación semanal completado exitosamente
```

### **Logs de Error**

```bash
❌ Error en notificación semanal a aprobadores: [detalle del error]
```

## 🔧 Configuración

### **Variables de Entorno Requeridas**

- `NODE_ENV`: Entorno de ejecución
- Configuraciones de email en `config.ts`

### **Base de Datos**

El cron requiere las siguientes tablas:

- `usuario`
- `usuarioPermiso`
- `usuarioCongregacion`
- `solicitudMultimedia`
- `pais`
- `congregacion`
- `campo`

## ⚠️ Consideraciones

### **Rendimiento**

- Consultas optimizadas con `include` para evitar N+1
- Solo procesa usuarios con permisos específicos
- Agrupa operaciones para minimizar consultas DB

### **Manejo de Errores**

- Errores individuales no detienen el proceso completo
- Logs detallados para debugging
- Transacciones donde sea necesario

### **Seguridad**

- Solo usuarios autenticados pueden usar endpoint de prueba
- Validación de permisos antes de envío
- No exposición de datos sensibles en logs

## 🚀 Despliegue

### **Desarrollo Local**

1. El cron se activa automáticamente al iniciar el servidor
2. Usar endpoint de prueba para validar funcionamiento
3. Revisar logs en consola

### **Producción**

1. Verificar configuración de email
2. Confirmar que la expresión cron sea apropiada
3. Monitorear logs para errores
4. Validar que los emails se envíen correctamente

## 📋 Monitoreo

### **Métricas a Observar**

- Número de aprobadores procesados
- Cantidad de emails enviados
- Tiempo de ejecución del proceso
- Errores en envío de emails

### **Alertas Recomendadas**

- Fallos en ejecución del cron
- Errores de conexión a base de datos
- Problemas en envío de emails
- Tiempo de ejecución excesivo
