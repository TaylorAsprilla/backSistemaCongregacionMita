# 🚀 Guía de Despliegue a Producción

## ✅ CHECKLIST IMPLEMENTADO

Este proyecto ha sido preparado para producción con las siguientes mejoras de seguridad y observabilidad:

### Seguridad ✅

- ✅ **Helmet** - Headers HTTP de seguridad configurados
- ✅ **Rate Limiting** - Protección contra fuerza bruta en endpoints sensibles
- ✅ **CORS mejorado** - Whitelist estricta con validación de origen
- ✅ **Validación de ENV** - Verificación automática de variables críticas al iniciar
- ✅ **Compresión** - Respuestas comprimidas para mejor performance

### Observabilidad ✅

- ✅ **Winston Logger** - Sistema de logging profesional con rotación diaria
- ✅ **Error Handler Global** - Manejo centralizado de errores con contexto
- ✅ **Health Checks** - Endpoints /health para monitoreo y load balancers
- ✅ **Logging estructurado** - Logs en JSON para producción, legibles en desarrollo

### Performance ✅

- ✅ **Pool de conexiones optimizado** - Configurado para 1000 usuarios concurrentes
- ✅ **Compresión GZIP** - Reducción de tamaño de respuestas
- ✅ **Timeouts configurados** - Prevención de conexiones colgadas

---

## 📊 Configuración para 1000 Usuarios Concurrentes

### Pool de Base de Datos

```typescript
Producción:
- Max conexiones: 25
- Min conexiones: 5
- Acquire timeout: 30s
- Idle timeout: 10s

Desarrollo:
- Max conexiones: 10
- Min conexiones: 2
```

### Rate Limiting

```typescript
Login: 5 intentos / 15 minutos
Búsquedas: 50 búsquedas / 10 minutos
Creación: 20 operaciones / 10 minutos
General API: 100 requests / 15 minutos
```

---

## 🔧 Configuración Inicial

### 1. Variables de Entorno

```bash
# Copiar el archivo de ejemplo
cp .env.example .env

# Generar secretos seguros
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

**Variables CRÍTICAS que DEBES configurar:**

```env
# Seguridad
JWT_SECRET=<generar-secreto-64-caracteres>
JWT_SECRET_RESET=<generar-otro-secreto-64-caracteres>

# Base de Datos Producción
DB_USERNAME_PROD=usuario_prod
DB_PASSWORD_PROD=password_seguro_prod
DB_DATABASE_PROD=congregacion_mita_prod
DB_HOST_PROD=tu-servidor-bd.com

# Email Producción
USER_EMAIL_PRODUCTION=tu_email@gmail.com
PASS_EMAIL_PRODUCTION=tu_app_password_gmail

# URLs
LOGIN_POR_QR_PROD=https://cmar.live/sistemacmi/#/login?ticket=
```

### 2. Instalación

```bash
# Instalar dependencias
npm install

# Compilar TypeScript
npm run build

# Verificar errores
npm run build
```

### 3. Validación Pre-Producción

El servidor valida automáticamente variables de entorno al iniciar:

```bash
# Probar en modo producción local
NODE_ENV=production npm start

# Si faltan variables verás:
# ❌ Variables de entorno REQUERIDAS faltantes en production:
#   - JWT_SECRET
#   - DB_USERNAME_PROD
```

---

## 🚀 Despliegue

### Opción 1: PM2 (Recomendado para VPS/EC2)

```bash
# Instalar PM2 globalmente
npm install -g pm2

# Iniciar aplicación
pm2 start build/app.js --name congregacion-api

# Configurar auto-inicio
pm2 startup
pm2 save

# Monitorear
pm2 monit

# Ver logs
pm2 logs congregacion-api

# Reiniciar
pm2 restart congregacion-api
```

### Opción 2: Docker

```bash
# Construir imagen
docker build -t congregacion-backend .

# Ejecutar contenedor
docker run -d \
  --name congregacion-api \
  -p 3000:3000 \
  --env-file .env \
  --restart unless-stopped \
  congregacion-backend

# Ver logs
docker logs -f congregacion-api
```

### Opción 3: AWS Elastic Beanstalk

```bash
# Ya tienes buildspec.yml configurado
eb init
eb create production-env
eb deploy
```

---

## 📡 Health Checks

### Endpoints Disponibles

```bash
# Health check básico (para load balancers)
GET /api/health
# Responde rápido: { status: "healthy", uptime: 12345 }

# Health check detallado
GET /api/health/detailed
# Incluye: memoria, CPU, DB status, version

# Kubernetes liveness probe
GET /api/health/live
# Responde si el servidor está vivo

# Kubernetes readiness probe
GET /api/health/ready
# Responde si el servidor está listo para tráfico

# Configuración (solo desarrollo)
GET /api/health/config
# Muestra variables de entorno (sin secretos)
```

### Configurar Load Balancer (nginx ejemplo)

```nginx
upstream backend {
    server localhost:3000;

    # Health check
    check interval=3000 rise=2 fall=5 timeout=1000 type=http;
    check_http_send "GET /api/health HTTP/1.0\r\n\r\n";
    check_http_expect_alive http_2xx;
}
```

---

## 📊 Monitoreo

### Logs

Los logs se guardan en:

```
logs/
├── combined-2026-04-17.log    # Todos los logs
├── combined-2026-04-16.log
├── error-2026-04-17.log       # Solo errores
└── error-2026-04-16.log
```

Configuración de rotación:

- **Combined logs**: 14 días de retención
- **Error logs**: 30 días de retención
- **Max tamaño**: 20MB por archivo

### Ver Logs en Tiempo Real

```bash
# Con PM2
pm2 logs congregacion-api --lines 100

# Directo
tail -f logs/combined-$(date +%Y-%m-%d).log

# Solo errores
tail -f logs/error-$(date +%Y-%m-%d).log
```

### Alertas Recomendadas

Configurar alertas para:

- ❌ Health check falla
- ❌ Tasa de errores > 5%
- ⚠️ Memoria > 80%
- ⚠️ CPU > 80%
- ⚠️ Pool de BD > 90% utilizado
- ⚠️ Rate limit excedido frecuentemente

---

## 🔒 Seguridad Post-Despliegue

### 1. HTTPS/SSL

```nginx
# Configurar en nginx/Apache
server {
    listen 443 ssl http2;
    server_name api.cmar.live;

    ssl_certificate /path/to/cert.pem;
    ssl_certificate_key /path/to/key.pem;

    # Configuración SSL moderna
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;

    location / {
        proxy_pass http://localhost:3000;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Redirigir HTTP a HTTPS
server {
    listen 80;
    server_name api.cmar.live;
    return 301 https://$server_name$request_uri;
}
```

### 2. Firewall

```bash
# UFW (Ubuntu)
sudo ufw allow 22/tcp   # SSH
sudo ufw allow 80/tcp   # HTTP
sudo ufw allow 443/tcp  # HTTPS
sudo ufw enable

# Bloquear acceso directo al puerto 3000
sudo ufw deny 3000/tcp
```

### 3. Rotación de Secretos

Cada 3-6 meses:

1. Generar nuevos JWT_SECRET
2. Actualizar .env en servidor
3. Reiniciar aplicación
4. Usuarios existentes deberán re-autenticarse

---

## 🐛 Troubleshooting

### El servidor no inicia

```bash
# Verificar variables de entorno
NODE_ENV=production npm start

# Si falla, revisar qué falta
grep "Variables de entorno" logs/error-*.log
```

### Rate limiting muy estricto

Ajustar en `src/config/rateLimiting.ts`:

```typescript
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10, // Aumentar si es necesario
  // ...
});
```

### Pool de BD agotado

Aumentar en `src/database/connection.ts`:

```typescript
pool: {
  max: 30, // Aumentar de 25 a 30
  min: 5,
  // ...
}
```

### Logs muy grandes

Ajustar retención en `src/helpers/logger.ts`:

```typescript
maxFiles: '7d', // Reducir de 14 a 7 días
maxSize: '10m', // Reducir de 20m a 10m
```

---

## 📈 Optimizaciones Futuras

### Recomendado para Escalar

- [ ] **Redis** para rate limiting distribuido
- [ ] **Redis** para cache de sesiones
- [ ] **CDN** para assets estáticos
- [ ] **Read replicas** de BD para consultas pesadas
- [ ] **APM** (New Relic, Datadog) para métricas avanzadas
- [ ] **Sentry** para tracking de errores
- [ ] **CI/CD** con tests automáticos

---

## 📞 Contacto

Para soporte técnico: [contacto]

**Versión:** 1.0.0  
**Última actualización:** Abril 2026  
**Estado:** ✅ Listo para Producción
