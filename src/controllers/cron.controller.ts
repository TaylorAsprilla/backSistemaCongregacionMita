import { Request, Response } from "express";
import { notificarAprobadoresMultimedia } from "../crons/notifyPendingRequests";
import { CustomRequest } from "../middlewares/validar-jwt";

export const testNotifyPendingRequests = async (req: CustomRequest, res: Response) => {
  try {
    console.log(`🧪 [PRUEBA MANUAL] Usuario ${req.id} ejecutó notificación de solicitudes pendientes`);
    
    // Ejecutar la función de notificación
    await notificarAprobadoresMultimedia();
    
    return res.status(200).json({
      ok: true,
      msg: "Notificación de solicitudes pendientes ejecutada exitosamente",
      ejecutadoPor: req.id,
      fechaEjecucion: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error ejecutando notificación manual:", error);
    return res.status(500).json({
      ok: false,
      msg: "Error ejecutando la notificación de solicitudes pendientes",
      error: error instanceof Error ? error.message : "Error desconocido",
    });
  }
};