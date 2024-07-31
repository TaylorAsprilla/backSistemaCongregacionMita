import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import Usuario from "../models/usuario.model";
import config from "../config/config";
import enviarEmail from "../helpers/email";

const environment = config[process.env.NODE_ENV || "development"];
const imagenEmail = environment.imagenEmail;

const templatePath = path.join(
  __dirname,
  "../templates/bienvenidoCmarLive.html"
);
const emailTemplate = fs.readFileSync(templatePath, "utf8");

export const enviarEmailBienvenida = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const asunto: string = "Bienvenido al censo de la Congregación Mita";

    if (!id) {
      return res.status(400).json({
        ok: false,
        msg: "El ID del usuario es requerido.",
      });
    }

    // Buscar el usuario por su ID
    const usuario = await Usuario.findByPk(id);

    // Validar si el usuario existe
    if (!usuario) {
      return res.status(404).json({
        ok: false,
        msg: "Usuario no encontrado.",
      });
    }

    // Obtener el nombre completo del usuario
    const primerNombre = usuario.getDataValue("primerNombre");
    const segundoNombre = usuario.getDataValue("segundoNombre");
    const primerApellido = usuario.getDataValue("primerApellido");
    const segundoApellido = usuario.getDataValue("segundoApellido");

    const nombre =
      `${primerNombre} ${segundoNombre} ${primerApellido} ${segundoApellido}`.trim();

    const email = usuario.getDataValue("email");

    const personalizarEmail = emailTemplate
      .replace("{{imagenEmail}}", imagenEmail)
      .replace("{{nombre}}", nombre)
      .replace("{{id}}", id);

    await enviarEmail(email, asunto, personalizarEmail);

    // Enviar respuesta al feligrés
    res.json({
      ok: true,
      msg: `Correo electrónico de bienvenida enviado exitosamente a <b>${nombre}</b>`,
    });

    console.info(
      "Email de bienvenida enviado exitosamente.",
      nombre,
      email,
      id
    );
  } catch (error) {
    console.error("Error al enviar el email de bienvenida:", error);
    res.status(500).json({
      ok: false,
      msg: "Error al enviar el email de bienvenida, por favor contacta al administrador.",
      error,
    });
  }
};
