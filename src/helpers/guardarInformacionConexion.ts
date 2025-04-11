import DeviceDetector from "device-detector-js";
import { obtenerUbicacionPorIP } from "./obtenerDireccionIp";
import { BrowserResult } from "device-detector-js/dist/parsers/client/browser";
import Usuario from "../models/usuario.model";
import Congregacion from "../models/congregacion.model";
import UbicacionConexion from "../models/ubicacionConexion.model";

export async function guardarInformacionConexion(
  ipAddress: string,
  userAgent: string,
  loginUsuario: any = null,
  loginCongregacion: any = null
) {
  try {
    const deviceDetector = new DeviceDetector();
    const deviceResult = deviceDetector.parse(userAgent);

    const location = await obtenerUbicacionPorIP(ipAddress);

    if (location.status === "success") {
      const ubicacion = {
        ...location,
        userAgent,
        navegador: deviceResult.client?.name || "Desconocido",
        tipoDispositivo: deviceResult.device?.type || "Desconocido",
        dispositivo: deviceResult.device?.model || "Desconocido",
        marca: deviceResult.device?.brand || "Desconocido",
        modelo: deviceResult.device?.model || "Desconocido",
        so: deviceResult.os?.name || "Desconocido",
        version: deviceResult.os?.version || "Desconocido",
        plataforma: deviceResult.os?.platform || "Desconocido",
        motorNavegador:
          deviceResult.client?.type === "browser"
            ? (deviceResult.client as BrowserResult).engine || "Desconocido"
            : "Desconocido",
        idUsuario:
          loginUsuario instanceof Usuario
            ? loginUsuario.getDataValue("id")
            : null,
        idCongregacion:
          loginCongregacion instanceof Congregacion
            ? loginCongregacion.getDataValue("id")
            : null,
      };

      await UbicacionConexion.create(ubicacion);
    }
  } catch (error) {
    console.error(
      "Error al obtener la ubicación por IP: guardarInformacionConexion",
      error
    );
  }
}
