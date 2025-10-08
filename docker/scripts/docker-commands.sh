#!/bin/bash

# Scripts para manejar el entorno Docker de desarrollo

# Colores para output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Función para mostrar ayuda
show_help() {
    echo -e "${GREEN}Scripts disponibles para Docker:${NC}"
    echo -e "${YELLOW}npm run docker:build${NC}     - Construir las imágenes Docker"
    echo -e "${YELLOW}npm run docker:up${NC}        - Iniciar los contenedores"
    echo -e "${YELLOW}npm run docker:down${NC}      - Detener los contenedores"
    echo -e "${YELLOW}npm run docker:logs${NC}      - Ver logs de los contenedores"
    echo -e "${YELLOW}npm run docker:clean${NC}     - Limpiar contenedores y volúmenes"
    echo -e "${YELLOW}npm run docker:db-only${NC}   - Solo base de datos y phpMyAdmin"
    echo -e "${YELLOW}npm run docker:reset${NC}     - Resetear completamente Docker"
}

# Funciones principales
case "$1" in
    "build")
        echo -e "${GREEN}🐳 Construyendo imágenes Docker...${NC}"
        docker-compose build --no-cache
        ;;
    "up")
        echo -e "${GREEN}🚀 Iniciando contenedores Docker...${NC}"
        docker-compose up -d
        echo -e "${GREEN}✅ Contenedores iniciados!${NC}"
        echo -e "${YELLOW}📱 phpMyAdmin: http://localhost:8081${NC}"
        echo -e "${YELLOW}🖥️  API: http://localhost:3000${NC}"
        echo -e "${YELLOW}🗃️  MySQL: localhost:3307${NC}"
        ;;
    "down")
        echo -e "${YELLOW}🛑 Deteniendo contenedores Docker...${NC}"
        docker-compose down
        echo -e "${GREEN}✅ Contenedores detenidos!${NC}"
        ;;
    "logs")
        echo -e "${GREEN}📋 Mostrando logs...${NC}"
        docker-compose logs -f --tail=100
        ;;
    "clean")
        echo -e "${RED}🧹 Limpiando contenedores y volúmenes...${NC}"
        docker-compose down -v --remove-orphans
        docker system prune -f
        echo -e "${GREEN}✅ Limpieza completada!${NC}"
        ;;
    "db-only")
        echo -e "${GREEN}🗃️  Iniciando solo base de datos...${NC}"
        docker-compose up -d db phpmyadmin
        echo -e "${GREEN}✅ Base de datos iniciada!${NC}"
        echo -e "${YELLOW}📱 phpMyAdmin: http://localhost:8081${NC}"
        echo -e "${YELLOW}🗃️  MySQL: localhost:3307${NC}"
        ;;
    "reset")
        echo -e "${RED}🔄 Reseteando completamente Docker...${NC}"
        docker-compose down -v --remove-orphans
        docker system prune -af --volumes
        echo -e "${GREEN}✅ Reset completado!${NC}"
        ;;
    *)
        show_help
        ;;
esac