# Dockerfile para la aplicación Node.js
FROM node:18-alpine

# Establecer directorio de trabajo
WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Crear directorio para logs
RUN mkdir -p /app/logs

# Exponer puerto
EXPOSE 3000

# Comando por defecto
CMD ["npm", "start"]