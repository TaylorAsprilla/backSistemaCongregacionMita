import { createHmac, randomInt, timingSafeEqual } from "crypto";

export const PUESTOS_QR = ["Puesto 1", "Casa Nueva", "Finca de Arecibo", "Finca de Bayamón"];
export const HORAS_SESION_QR = 4;
export const MINUTOS_CODIGO_QR = 10;
export const MAX_INTENTOS_CODIGO_QR = 5;

export function generarCodigoQr(): string {
  return randomInt(0, 1000000).toString().padStart(6, "0");
}

export function resumirCodigoQr(id: string, codigo: string): string {
  const clave = process.env.JWT_SECRET;
  if (!clave) throw new Error("JWT_SECRET es obligatorio para verificar el acceso QR.");
  return createHmac("sha256", clave).update(`${id}:${codigo}`).digest("hex");
}

export function verificarCodigoQr(id: string, codigo: string, resumen: string): boolean {
  if (!/^\d{6}$/.test(codigo) || !/^[a-f0-9]{64}$/.test(resumen)) return false;
  return timingSafeEqual(
    Buffer.from(resumirCodigoQr(id, codigo), "hex"),
    Buffer.from(resumen, "hex"),
  );
}

export function validarDatosGuarda(esGuarda: unknown, enTurnoGuarda: unknown, puesto: unknown): boolean {
  if (typeof esGuarda !== "boolean" || typeof enTurnoGuarda !== "boolean") return false;
  if (!esGuarda && enTurnoGuarda) return false;
  if (esGuarda && enTurnoGuarda) return typeof puesto === "string" && PUESTOS_QR.includes(puesto);
  return puesto === null || puesto === undefined || puesto === "";
}
