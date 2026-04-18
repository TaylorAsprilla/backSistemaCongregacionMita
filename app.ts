import dotenv from "dotenv";
import Server from "./src/server.model";
import { validateEnv } from "./src/helpers/validateEnv";
import { setupGlobalErrorHandlers } from "./src/middlewares/errorHandler";
import logger from "./src/helpers/logger";

// 1. Configurar dotenv PRIMERO
dotenv.config();

// 2. Configurar manejadores globales de errores no capturados
setupGlobalErrorHandlers();

// 3. Validar variables de entorno antes de iniciar
try {
  validateEnv();
} catch (error: any) {
  logger.error("❌ Error en validación de variables de entorno:", error);
  logger.error("El servidor NO puede iniciar sin la configuración requerida");
  process.exit(1);
}

// 4. Iniciar servidor
const server = new Server();
server.listen();
