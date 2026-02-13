import { NextFunction, Request, Response } from "express";

/**
 * Middleware para validar API Key en requests service-to-service
 * Requiere el header X-API-KEY que debe coincidir con process.env.API_KEY
 */
const validarApiKey = (req: Request, res: Response, next: NextFunction) => {
  const apiKey = req.header("X-API-KEY");

  if (!apiKey) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "API Key requerida. Incluya el header X-API-KEY",
      },
    });
  }

  const validApiKey = process.env.API_KEY;

  if (!validApiKey) {
    console.error("ERROR: API_KEY no configurada en variables de entorno");
    return res.status(500).json({
      error: {
        code: "SERVER_CONFIGURATION_ERROR",
        message: "Error de configuración del servidor",
      },
    });
  }

  if (apiKey !== validApiKey) {
    return res.status(401).json({
      error: {
        code: "UNAUTHORIZED",
        message: "API Key inválida",
      },
    });
  }

  next();
};

export default validarApiKey;
