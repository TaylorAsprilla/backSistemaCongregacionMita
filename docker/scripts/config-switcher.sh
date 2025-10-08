#!/bin/bash

# Script para cambiar entre configuraciones de desarrollo

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

show_help() {
    echo -e "${GREEN}Configuraciones disponibles:${NC}"
    echo -e "${YELLOW}npm run config:docker${NC}    - Usar configuración Docker"
    echo -e "${YELLOW}npm run config:local${NC}     - Usar configuración local (XAMPP)"
    echo -e "${YELLOW}npm run config:status${NC}    - Ver configuración actual"
}

case "$1" in
    "docker")
        echo -e "${GREEN}🐳 Configurando para usar Docker...${NC}"
        cp .env.docker .env
        export NODE_ENV=docker
        echo -e "${GREEN}✅ Configuración Docker activada${NC}"
        echo -e "${YELLOW}💡 Base de datos: localhost:3307${NC}"
        echo -e "${YELLOW}💡 Ejecuta: npm run docker:db-only${NC}"
        ;;
    "local")
        echo -e "${GREEN}🏠 Configurando para uso local (XAMPP)...${NC}"
        if [ -f ".env.local" ]; then
            cp .env.local .env
        else
            echo -e "${RED}❌ Archivo .env.local no encontrado${NC}"
            echo -e "${YELLOW}💡 Crea .env.local con tu configuración de XAMPP${NC}"
            exit 1
        fi
        export NODE_ENV=development
        echo -e "${GREEN}✅ Configuración local activada${NC}"
        echo -e "${YELLOW}💡 Base de datos: localhost:3306 (XAMPP)${NC}"
        ;;
    "status")
        echo -e "${GREEN}📊 Estado actual de configuración:${NC}"
        if [ -f ".env" ]; then
            echo -e "${YELLOW}Archivo .env existe${NC}"
            if grep -q "congregacion_mita_local" .env; then
                echo -e "${GREEN}✅ Configuración: Docker${NC}"
            else
                echo -e "${GREEN}✅ Configuración: Local/Personalizada${NC}"
            fi
        else
            echo -e "${RED}❌ No hay archivo .env${NC}"
        fi
        echo -e "${YELLOW}NODE_ENV: ${NODE_ENV:-'no definido'}${NC}"
        ;;
    *)
        show_help
        ;;
esac