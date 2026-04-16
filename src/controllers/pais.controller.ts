import fs from "fs";
import path from "path";
import { Request, Response } from "express";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import Pais from "../models/pais.model";
import Usuario from "../models/usuario.model";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import agregarPermisoUsuario from "../helpers/agregarPermisoUsuario";
import eliminarPermisoUsuario from "../helpers/eliminarPermisoUsuario";
import enviarEmail from "../helpers/email";
import config from "../config/config";
import { ROLES_ID } from "../enum/roles.enum";
import { ESTADO_USUARIO_ENUM } from "../enum/usuario.enum";
import { Op } from "sequelize";

const environment = config[process.env.NODE_ENV || "development"];
const imagenEmail = environment.imagenEmail;

const templatePathPaisAsignado = path.join(
  __dirname,
  "../templates/paisAsignado.html",
);

const emailTemplatePaisAsignado = fs.readFileSync(
  templatePathPaisAsignado,
  "utf8",
);

const templatePathPaisAdministradorAsignado = path.join(
  __dirname,
  "../templates/paisAdministradorAsignado.html",
);

const emailTemplatePaisAdministradorAsignado = fs.readFileSync(
  templatePathPaisAdministradorAsignado,
  "utf8",
);

export const getPaises = async (req: Request, res: Response) => {
  try {
    const pais = await Pais.findAll({
      include: [
        {
          model: Usuario,
          as: "obreroEncargado",
          attributes: ["id", "primerNombre", "primerApellido"],
        },
        {
          model: Usuario,
          as: "administrador",
          attributes: ["id", "primerNombre", "primerApellido"],
        },
      ],
      order: db.col("pais"),
    });

    res.json({
      ok: true,
      pais,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getPais = async (req: Request, res: Response) => {
  const { id } = req.params;

  const pais = await Pais.findByPk(id, {
    include: [
      {
        model: Usuario,
        as: "obreroEncargado",
        attributes: ["id", "primerNombre", "primerApellido"],
      },
      {
        model: Usuario,
        as: "administrador",
        attributes: ["id", "primerNombre", "primerApellido"],
      },
    ],
  });

  if (pais) {
    res.json({
      ok: true,
      pais,
      id,
    });
  } else {
    res.status(404).json({
      msg: `No existe el país con el id ${id}`,
    });
  }
};

export const crearPais = async (req: Request, res: Response) => {
  const { body } = req;
  const { idObreroEncargado, idAdministrador } = body;

  const transaction = await db.transaction();

  try {
    // =======================================================================
    //                  Verificar y Remover Obrero de Otros Países
    // =======================================================================

    if (idObreroEncargado) {
      await Pais.update(
        { idObreroEncargado: null },
        {
          where: { idObreroEncargado, id: { [Op.not]: null } },
          transaction,
        },
      );
    }

    // =======================================================================
    //                  Verificar y Remover Administrador de Otros Países
    // =======================================================================

    if (idAdministrador) {
      await Pais.update(
        { idAdministrador: null },
        {
          where: { idAdministrador, id: { [Op.not]: null } },
          transaction,
        },
      );
    }

    // =======================================================================
    //                          Guardar País
    // =======================================================================

    const pais = await Pais.create(body, { transaction });

    const paisId = pais.getDataValue("id");

    // =======================================================================
    //                  Asignar Permisos al Obrero Encargado
    // =======================================================================

    if (idObreroEncargado) {
      await agregarPermisoUsuario(
        idObreroEncargado,
        ROLES_ID.OBRERO_PAIS,
        transaction,
      );
      await agregarPermisoUsuario(
        idObreroEncargado,
        ROLES_ID.APROBADOR_MULTIMEDIA,
        transaction,
      );
    }

    // =======================================================================
    //                  Asignar Permisos al Administrador del País
    // =======================================================================

    if (idAdministrador) {
      await agregarPermisoUsuario(
        idAdministrador,
        ROLES_ID.ADMINISTRADOR_PAIS,
        transaction,
      );
    }

    await transaction.commit();

    // =======================================================================
    //                  Enviar Correo al Obrero Asignado
    // =======================================================================

    if (idObreroEncargado) {
      const obrero = await Usuario.findByPk(idObreroEncargado);

      if (obrero && obrero.getDataValue("email")) {
        const nombreObrero = `${obrero.getDataValue("primerNombre") || ""} ${
          obrero.getDataValue("segundoNombre") || ""
        } ${obrero.getDataValue("primerApellido") || ""} ${
          obrero.getDataValue("segundoApellido") || ""
        }`.trim();

        const emailObrero = obrero.getDataValue("email");
        const nombrePais = pais.getDataValue("pais");

        const personalizarEmail = emailTemplatePaisAsignado
          .replace("{{imagenEmail}}", imagenEmail)
          .replace("{{nombreObrero}}", nombreObrero)
          .replace("{{nombrePais}}", nombrePais);

        await enviarEmail(
          emailObrero,
          "Nueva Asignación de País",
          personalizarEmail,
        );

        console.info(`Email enviado al obrero de país: ${nombreObrero}`);
      }
    }

    // =======================================================================
    //                  Enviar Correo al Administrador Asignado
    // =======================================================================

    if (idAdministrador) {
      const administrador = await Usuario.findByPk(idAdministrador);

      if (administrador && administrador.getDataValue("email")) {
        const nombreAdministrador =
          `${administrador.getDataValue("primerNombre") || ""} ${
            administrador.getDataValue("segundoNombre") || ""
          } ${administrador.getDataValue("primerApellido") || ""} ${
            administrador.getDataValue("segundoApellido") || ""
          }`.trim();

        const emailAdministrador = administrador.getDataValue("email");
        const nombrePais = pais.getDataValue("pais");

        const totalFeligreses = await UsuarioCongregacion.count({
          where: { pais_id: paisId },
          include: [
            {
              model: Usuario,
              where: { estado: ESTADO_USUARIO_ENUM.ACTIVO },
              required: true,
            },
          ],
        });

        const personalizarEmail = emailTemplatePaisAdministradorAsignado
          .replace("{{imagenEmail}}", imagenEmail)
          .replace("{{nombreAdministrador}}", nombreAdministrador)
          .replace("{{nombrePais}}", nombrePais)
          .replace("{{totalFeligreses}}", String(totalFeligreses));

        await enviarEmail(
          emailAdministrador,
          "Nueva Asignación de País",
          personalizarEmail,
        );

        console.info(
          `Email enviado al administrador de país: ${nombreAdministrador}`,
        );
      }
    }

    res.json({
      ok: true,
      msg: "Se ha guardado el país exitosamente",
      pais,
    });

    console.info(
      "Se ha guardado el país exitosamente",
      pais.getDataValue("pais"),
    );
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarPais = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;
  const { idObreroEncargado, idAdministrador } = body;

  const transaction = await db.transaction();

  try {
    const pais = await Pais.findByPk(id, { transaction });
    if (!pais) {
      await transaction.rollback();
      return res.status(404).json({
        ok: false,
        msg: `No existe un pais con el id ${id}`,
      });
    }

    const previousIdObreroEncargado = pais.getDataValue("idObreroEncargado");
    const previousIdAdministrador = pais.getDataValue("idAdministrador");

    // =======================================================================
    //                  Remover obrero de otros países si aplica
    // =======================================================================

    if (idObreroEncargado) {
      await Pais.update(
        { idObreroEncargado: null },
        {
          where: { idObreroEncargado, id: { [Op.not]: id } },
          transaction,
        },
      );
    }

    // =======================================================================
    //                  Remover administrador de otros países si aplica
    // =======================================================================

    if (idAdministrador) {
      await Pais.update(
        { idAdministrador: null },
        {
          where: { idAdministrador, id: { [Op.not]: id } },
          transaction,
        },
      );
    }

    // =======================================================================
    //                          Actualizar País
    // =======================================================================

    const paisActualizado = await pais.update(body, { transaction });

    // =======================================================================
    //                  Gestionar permisos del obrero encargado
    // =======================================================================

    if (
      idObreroEncargado !== undefined &&
      idObreroEncargado !== previousIdObreroEncargado
    ) {
      if (previousIdObreroEncargado) {
        await eliminarPermisoUsuario(
          previousIdObreroEncargado,
          ROLES_ID.OBRERO_PAIS,
          transaction,
        );
        await eliminarPermisoUsuario(
          previousIdObreroEncargado,
          ROLES_ID.APROBADOR_MULTIMEDIA,
          transaction,
        );
      }

      if (idObreroEncargado) {
        await agregarPermisoUsuario(
          idObreroEncargado,
          ROLES_ID.OBRERO_PAIS,
          transaction,
        );
        await agregarPermisoUsuario(
          idObreroEncargado,
          ROLES_ID.APROBADOR_MULTIMEDIA,
          transaction,
        );
      }
    }

    // =======================================================================
    //                  Gestionar permisos del administrador del país
    // =======================================================================

    if (
      idAdministrador !== undefined &&
      idAdministrador !== previousIdAdministrador
    ) {
      if (previousIdAdministrador) {
        await eliminarPermisoUsuario(
          previousIdAdministrador,
          ROLES_ID.ADMINISTRADOR_PAIS,
          transaction,
        );
      }

      if (idAdministrador) {
        await agregarPermisoUsuario(
          idAdministrador,
          ROLES_ID.ADMINISTRADOR_PAIS,
          transaction,
        );
      }
    }

    await transaction.commit();

    // =======================================================================
    //                  Enviar Correo al Nuevo Obrero Asignado
    // =======================================================================

    if (
      idObreroEncargado !== undefined &&
      idObreroEncargado !== previousIdObreroEncargado &&
      idObreroEncargado
    ) {
      const nuevoObrero = await Usuario.findByPk(idObreroEncargado);

      if (nuevoObrero && nuevoObrero.getDataValue("email")) {
        const nombreObrero = `${
          nuevoObrero.getDataValue("primerNombre") || ""
        } ${nuevoObrero.getDataValue("segundoNombre") || ""} ${
          nuevoObrero.getDataValue("primerApellido") || ""
        } ${nuevoObrero.getDataValue("segundoApellido") || ""}`.trim();

        const emailObrero = nuevoObrero.getDataValue("email");
        const nombrePais = paisActualizado?.getDataValue("pais");

        const personalizarEmail = emailTemplatePaisAsignado
          .replace("{{imagenEmail}}", imagenEmail)
          .replace("{{nombreObrero}}", nombreObrero)
          .replace("{{nombrePais}}", nombrePais);

        await enviarEmail(
          emailObrero,
          "Nueva Asignación de País",
          personalizarEmail,
        );

        console.info(`Email enviado al nuevo obrero de país: ${nombreObrero}`);
      }
    }

    // =======================================================================
    //                  Enviar Correo al Nuevo Administrador Asignado
    // =======================================================================

    if (
      idAdministrador !== undefined &&
      idAdministrador !== previousIdAdministrador &&
      idAdministrador
    ) {
      const nuevoAdministrador = await Usuario.findByPk(idAdministrador);

      if (nuevoAdministrador && nuevoAdministrador.getDataValue("email")) {
        const nombreAdministrador = `${
          nuevoAdministrador.getDataValue("primerNombre") || ""
        } ${nuevoAdministrador.getDataValue("segundoNombre") || ""} ${
          nuevoAdministrador.getDataValue("primerApellido") || ""
        } ${nuevoAdministrador.getDataValue("segundoApellido") || ""}`.trim();

        const emailAdministrador = nuevoAdministrador.getDataValue("email");
        const nombrePais = paisActualizado?.getDataValue("pais");
        const paisIdNum = parseInt(id, 10);

        const totalFeligreses = await UsuarioCongregacion.count({
          where: { pais_id: paisIdNum },
          include: [
            {
              model: Usuario,
              where: { estado: ESTADO_USUARIO_ENUM.ACTIVO },
              required: true,
            },
          ],
        });

        const personalizarEmail = emailTemplatePaisAdministradorAsignado
          .replace("{{imagenEmail}}", imagenEmail)
          .replace("{{nombreAdministrador}}", nombreAdministrador)
          .replace("{{nombrePais}}", nombrePais)
          .replace("{{totalFeligreses}}", String(totalFeligreses));

        await enviarEmail(
          emailAdministrador,
          "Nueva Asignación de País",
          personalizarEmail,
        );

        console.info(
          `Email enviado al nuevo administrador de país: ${nombreAdministrador}`,
        );
      }
    }

    res.json({
      ok: true,
      msg: "País Actualizado",
      paisActualizado,
    });

    console.info("País actualizado.", paisActualizado?.getDataValue("pais"));
  } catch (error) {
    await transaction.rollback();
    console.error(error);
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarPais = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const pais = await Pais.findByPk(id);
    if (pais) {
      const nombre = await pais.get().pais;

      await pais.update({ estado: false });

      res.json({
        ok: true,
        msg: `El país ${nombre} se eliminó`,
        id: req.id,
      });
    }

    if (!pais) {
      return res.status(404).json({
        msg: `No existe un pías con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};

export const activarPais = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const pais = await Pais.findByPk(id);
    if (!!pais) {
      const nombre = await pais.get().pais;

      if (pais.get().estado === false) {
        await pais.update({ estado: true });
        res.json({
          ok: true,
          msg: `El país ${nombre} se activó`,
          congregacion: pais,
          id: req.id,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El país ${nombre} esta activo`,
          congregacion: pais,
        });
      }
    }

    if (!pais) {
      return res.status(404).json({
        ok: false,
        msg: `No existe un país con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
