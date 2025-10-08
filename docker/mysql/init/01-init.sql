-- Script de inicialización para la base de datos local
-- Este script se ejecuta automáticamente al crear el contenedor por primera vez

-- Crear base de datos si no existe
CREATE DATABASE IF NOT EXISTS congregacion_mita_local CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Usar la base de datos
USE congregacion_mita_local;

-- Crear usuario adicional para desarrollo (si es necesario)
-- CREATE USER IF NOT EXISTS 'dev_user'@'%' IDENTIFIED BY 'dev_password_2024';
-- GRANT ALL PRIVILEGES ON congregacion_mita_local.* TO 'dev_user'@'%';

-- Configurar timezone
SET time_zone = '+00:00';

-- Configuraciones iniciales
SET FOREIGN_KEY_CHECKS = 1;
SET SQL_MODE = 'STRICT_TRANS_TABLES,NO_ZERO_DATE,NO_ZERO_IN_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_AUTO_CREATE_USER,NO_ENGINE_SUBSTITUTION';

-- Mensaje de confirmación
SELECT 'Base de datos congregacion_mita_local inicializada correctamente para desarrollo local' AS mensaje;