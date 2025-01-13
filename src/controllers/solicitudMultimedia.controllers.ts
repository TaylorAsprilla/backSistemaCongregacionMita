import { Request, Response } from "express";
import config from "../config/config";
import enviarEmail from "../helpers/email";
import { CustomRequest } from "../middlewares/validar-jwt";
import SolicitudMultimedia from "../models/solicitudMultimedia.model";
import Usuario from "../models/usuario.model";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import Congregacion from "../models/congregacion.model";
import Campo from "../models/campo.model";
import RazonSolicitud from "../models/razonSolicitud.model";
import TipoMiembro from "../models/tipoMiembro.model";
import OpcionTransporte from "../models/opcionTransporte.model";
import Parentesco from "../models/parentesco.model";
import TipoEstudio from "../models/tipoEstudio.model";
import Pais from "../models/pais.model";
import { Op } from "sequelize";
import { SOLICITUD_MULTIMEDIA_ENUM } from "../enum/solicitudMultimendia.enum";

const environment = config[process.env.NODE_ENV || "development"];
const imagenEmail = environment.imagenEmail;
const urlDeValidacion = environment.urlDeValidacion;

export const getSolicitudesMultimedia = async (req: Request, res: Response) => {
  try {
    const solicitudDeAccesos = await Usuario.findAll({
      attributes: [
        "id",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
        "numeroCelular",
        "email",
        "fechaNacimiento",
        "direccion",
        "ciudadDireccion",
        "departamentoDireccion",
        "paisDireccion",
        "login",
      ],
      include: [
        {
          model: SolicitudMultimedia,
          as: "solicitudes",
          attributes: [
            "id",
            "emailVerificado",
            "otraRazon",
            "tiempoDistancia",
            "personaEncamada",
            "personaEncargada",
            "celularPersonaEncargada",
            "enfermedadCronica",
            "enfermedadQuePadece",
            "paisDondeEstudia",
            "ciudadDondeEstudia",
            "duracionDelPeriodoDeEstudio",
            "baseMilitar",
            "horaTemploMasCercano",
            "tiempoSugerido",
            "tiempoAprobacion",
            "motivoDeNegacion",
            "estado",
            "congregacionCercana",
            "observaciones",
            "createdAt",
          ],
          where: {
            emailVerificado: {
              [Op.ne]: null, // Asegurar de que el campo emailVerificado tenga un valor
            },
          },
          include: [
            {
              model: RazonSolicitud,
              as: "razonSolicitud",
              attributes: ["solicitud"],
            },
            {
              model: OpcionTransporte,
              as: "opcionTransporte",
              attributes: ["tipoTransporte"],
            },
            {
              model: Usuario,
              as: "usuarioQueRegistra",
              attributes: [
                "id",
                "primerNombre",
                "segundoNombre",
                "primerApellido",
                "segundoApellido",
              ],
            },
            {
              model: Usuario,
              as: "usuarioQueAprobo",
              attributes: [
                "id",
                "primerNombre",
                "segundoNombre",
                "primerApellido",
                "segundoApellido",
              ],
            },
            {
              model: Parentesco,
              as: "parentesco",
              attributes: ["nombre"],
            },
            {
              model: TipoEstudio,
              as: "tipoEstudio",
              attributes: ["estudio"],
            },
          ],
        },
        {
          model: TipoMiembro,
          as: "tipoMiembro",
          attributes: ["miembro"],
        },
        {
          model: UsuarioCongregacion,
          as: "usuarioCongregacion",
          attributes: ["id"],
          include: [
            {
              model: Pais,
              as: "pais",
              attributes: ["id", "pais"],
            },
            {
              model: Congregacion,
              as: "congregacion",
              attributes: ["id", "congregacion"],
            },
            {
              model: Campo,
              as: "campo",
              attributes: ["id", "campo"],
            },
          ],
        },
      ],
    });

    const numeroDeSolicitudes = solicitudDeAccesos.length;

    res.json({
      ok: true,
      numeroDeSolicitudes,
      solicitudDeAccesos,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnaSolicitudMultimedia = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;

  const solicitudDeAcceso = await SolicitudMultimedia.findByPk(id, {
    include: [
      {
        all: true,
        required: false,
      },
    ],
  });

  if (solicitudDeAcceso) {
    res.json({
      ok: true,
      solicitudDeAcceso,
      id,
    });
  } else {
    res.status(404).json({
      msg: `No existe la solicitud con el id ${id}`,
    });
  }
};

export const obtenerUsuariosConSolicitudesPorCongregacion = async (
  req: Request,
  res: Response
) => {
  const { usuario_id } = req.query;

  try {
    // Obtener el país y la congregación a cargo del usuario
    const congregacionPais = await Pais.findOne({
      where: { idObreroEncargado: usuario_id },
    });

    const congregacionCiudad = await Congregacion.findOne({
      where: {
        [Op.or]: [
          { idObreroEncargado: usuario_id },
          { idObreroEncargadoDos: usuario_id },
        ],
      },
    });

    const congregacionCampo = await Campo.findOne({
      where: {
        [Op.or]: [
          { idObreroEncargado: usuario_id },
          { idObreroEncargadoDos: usuario_id },
        ],
      },
    });

    const pais_id = congregacionPais?.getDataValue("id");
    const congregacion_id = congregacionCiudad?.getDataValue("id");
    const campo_id = congregacionCampo?.getDataValue("id");

    if (!pais_id && !congregacion_id && !campo_id) {
      return res.status(400).json({
        ok: false,
        msg: "El usuario no tiene un país o congregación a cargo",
      });
    }

    // Construir la condición de búsqueda
    let whereCondition = {};

    if (pais_id && congregacion_id) {
      whereCondition = {
        [Op.or]: [
          { "$usuarioCongregacion.pais_id$": pais_id },
          { "$usuarioCongregacion.congregacion_id$": congregacion_id },
        ],
      };
    } else if (pais_id) {
      whereCondition = { "$usuarioCongregacion.pais_id$": pais_id };
    } else if (congregacion_id) {
      whereCondition = {
        "$usuarioCongregacion.congregacion_id$": congregacion_id,
      };
    } else if (campo_id) {
      whereCondition = {
        "$usuarioCongregacion.campo_id$": campo_id,
      };
    }

    // Consulta a la base de datos con filtros dinámicos
    const usuarios = await Usuario.findAll({
      attributes: [
        "id",
        "primerNombre",
        "segundoNombre",
        "primerApellido",
        "segundoApellido",
        "numeroCelular",
        "email",
        "fechaNacimiento",
        "direccion",
        "ciudadDireccion",
        "departamentoDireccion",
        "paisDireccion",
        "login",
      ],
      include: [
        {
          model: SolicitudMultimedia,
          as: "solicitudes",
          attributes: [
            "id",
            "emailVerificado",
            "otraRazon",
            "tiempoDistancia",
            "personaEncamada",
            "personaEncargada",
            "celularPersonaEncargada",
            "enfermedadCronica",
            "enfermedadQuePadece",
            "paisDondeEstudia",
            "ciudadDondeEstudia",
            "duracionDelPeriodoDeEstudio",
            "baseMilitar",
            "horaTemploMasCercano",
            "tiempoSugerido",
            "tiempoAprobacion",
            "motivoDeNegacion",
            "congregacionCercana",
            "estado",
            "observaciones",
            "createdAt",
          ],
          where: {
            emailVerificado: {
              [Op.ne]: null, // Asegurar de que el campo emailVerificado tenga un valor
            },
          },
          include: [
            {
              model: RazonSolicitud,
              as: "razonSolicitud",
              attributes: ["solicitud"],
            },
            {
              model: OpcionTransporte,
              as: "opcionTransporte",
              attributes: ["tipoTransporte"],
            },
            {
              model: Usuario,
              as: "usuarioQueRegistra",
              attributes: [
                "id",
                "primerNombre",
                "segundoNombre",
                "primerApellido",
                "segundoApellido",
              ],
            },
            {
              model: Parentesco,
              as: "parentesco",
              attributes: ["nombre"],
            },
            {
              model: TipoEstudio,
              as: "tipoEstudio",
              attributes: ["estudio"],
            },
          ],
        },
        {
          model: TipoMiembro,
          as: "tipoMiembro",
          attributes: ["miembro"],
        },
        {
          model: UsuarioCongregacion,
          as: "usuarioCongregacion",
          attributes: ["id"],
          include: [
            {
              model: Pais,
              as: "pais",
              attributes: ["id", "pais"],
            },
            {
              model: Congregacion,
              as: "congregacion",
              attributes: ["id", "congregacion"],
            },
            {
              model: Campo,
              as: "campo",
              attributes: ["id", "campo"],
            },
          ],
        },
      ],
      where: whereCondition,
    });

    // Responder con los resultados
    return res.status(200).json({
      ok: true,
      total: usuarios.length,
      usuarios: usuarios || [],
    });
  } catch (error) {
    console.error(
      "Error al obtener usuarios con solicitudes pendientes:",
      error
    );
    return res.status(500).json({
      ok: false,
      msg: "Hubo un error al obtener los usuarios con solicitudes pendientes.",
    });
  }
};

export const crearSolicitudMultimedia = async (req: Request, res: Response) => {
  const { body } = req;
  const { usuario_id } = body;

  try {
    // =======================================================================
    //                          Guardar Acceso Multimedia
    // =======================================================================

    const solicitudDeAcceso = SolicitudMultimedia.build(body);
    await solicitudDeAcceso.save();

    const idUsuario = solicitudDeAcceso.getDataValue("id");
    const usuario = await Usuario.findByPk(usuario_id);
    const email = usuario?.getDataValue("email");
    const nombre = `${usuario?.getDataValue("primerNombre") || ""} 
    ${usuario?.getDataValue("segundoNombre") || ""}
    ${usuario?.getDataValue("primerApellido") || ""} 
    ${usuario?.getDataValue("segundoApellido") || ""}`;

    // =======================================================================
    //                         Enviar Correo de Verificación
    // =======================================================================
    const html = `
      <div
        style="
          max-width: 100%;
          width: 600px;
          margin: 0 auto;
          box-sizing: border-box;
          font-family: Arial, Helvetica, 'sans-serif';
          font-weight: normal;
          font-size: 16px;
          line-height: 22px;
          color: #252525;
          word-wrap: break-word;
          word-break: break-word;
          text-align: justify;
        "
      >
        <div style="text-align: center">
          <img
            src="${imagenEmail}"
            alt="CMAR Multimedia"
            style="text-align: center; width: 100px"
          />
        </div>
        <h3>Verifica tu cuenta de correo electrónico</h3>
        <p>Hola, <span style="text-transform: capitalize;">${nombre}</span></p>
        <p>
          Ha registrado ${email} como cuenta de correo electrónico para <b>CMAR LIVE.</b> Por
          favor verifique su cuenta de correo electrónico haciendo clic en el
          sifuiente enlace:
        </p>
      
        <div
          title="Verificar Cuenta"
          style="text-align: center; margin: 24px 0 40px 0; padding: 0"
        >
          <a
            href="${urlDeValidacion}/${idUsuario}"
            style="
              display: inline-block;
              margin: 0 auto;
              min-width: 180px;
              line-height: 28px;
              border-radius: 22px;
              padding: 8px 16px 7px 16px;
              vertical-align: middle;
              background-color: #0072de;
              color: #fff;
              box-sizing: border-box;
              text-align: center;
              text-decoration: none;
              font-family: Arial, Helvetica, 'sans-serif';
              font-weight: normal;
              word-wrap: break-word;
              word-break: break-all;
            "
            target="_blank"
          >
            Verificar cuenta
          </a>
        </div>
      
        <p>
          Si el enlace anterior no funciona, introduzca la dirección su navegador.
        </p>
      
        <a href="${urlDeValidacion}/${idUsuario}">${urlDeValidacion}/${idUsuario}</a>
      
        <div>
          <p
            style="
              margin: 30px 0 12px 0;
              padding: 0;
              color: #252525;
              font-family: Arial, Helvetica, 'sans-serif';
              font-weight: normal;
              word-wrap: break-word;
              word-break: break-word;
              font-size: 12px;
              line-height: 16px;
              color: #909090;
            "
          >
            Nota: No responda a este correo electrónico. Si tiene alguna duda, póngase
            en contacto con nosotros mediante nuestro correo electrónico
            <a href="mailto:cmar.live@congregacionmita.com">
              cmar.live@congregacionmita.com</a
            >
          </p>
      
          <br />
          Cordialmente,<br />
          <b>Congregación Mita, Inc.</b>
        </div>
      </div>`;

    await enviarEmail(email, "Verificar Correo - CMAR Multimedia", html);

    res.json({
      ok: true,
      msg: "Se ha guardado la solicitud exitosamente ",
      solicitudDeAcceso,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
      body,
    });
  }
};

export const actualizarSolicitudMultimedia = async (
  req: Request,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const solicitudDeAcceso = await SolicitudMultimedia.findByPk(id);
    if (!solicitudDeAcceso) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una solicitud con el id ${id}`,
      });
    }

    // =======================================================================
    //                          Actualizar la Solicitud de Accesos
    // =======================================================================

    const solicitudDeAccesoActualizado = await solicitudDeAcceso.update(body, {
      new: true,
    });
    res.json({
      ok: true,
      msg: "Solicitud de Acceso Actualizada",
      solicitudDeAccesoActualizado,
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const eliminarSolicitudMultimedia = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const solicitudDeAcceso = await SolicitudMultimedia.findByPk(id);
    if (solicitudDeAcceso) {
      const nombre = await solicitudDeAcceso.get().nombre;
      const email = await solicitudDeAcceso.get().email;
      const motivoDeNegacion = await body.motivoDeNegacion;

      solicitudDeAcceso.set({
        estado: SOLICITUD_MULTIMEDIA_ENUM.DENEGADA,
        motivoDeNegacion,
      });
      await solicitudDeAcceso.save();

      // =======================================================================
      //                         Enviar Correo de Verificación
      // =======================================================================
      const html = `
      <div
          style="
            max-width: 100%;
            width: 600px;
            margin: 0 auto;
            box-sizing: border-box;
            font-family: Arial, Helvetica, 'sans-serif';
            font-weight: normal;
            font-size: 16px;
            line-height: 22px;
            color: #252525;
            word-wrap: break-word;
            word-break: break-word;
            text-align: justify;
          "
        >
          <div style="text-align: center">
            <img
              src="${imagenEmail}"
              alt="CMAR Multimedia"
              style="text-align: center; width: 100px"
            />
          </div>
          <h3>Solicitud de Acceso</h3>
          <p>Hola, ${nombre}</p>
          <p>
            Hemos recibido su solicitud para poder acceder a <b>CMAR LIVE</b> para disfrutar de
            los servicios, vigilias y eventos especiales de la Congregación Mita,
            lamentablemente hemos revisado su solicitud y esta ha sido denegada.
          </p>
        
          <b>Motivos:</b>
          <p>${motivoDeNegacion}</p>
        
          <p>
            En un futuro puede presentar nuevamente su solicitud, si es que considera
            que algún factor en su solicitud original cambio para acceder a la
            plataforma CMAR LIVE, recuerda también explicarle a su obrero o persona que
            llene la solicitud sus motivos por el cual cualificaría para un acceso a la
            plataforma CMAR LIVE.
          </p>
        
          <div>
            <p
              style="
                margin: 30px 0 12px 0;
                padding: 0;
                color: #252525;
                font-family: Arial, Helvetica, 'sans-serif';
                font-weight: normal;
                word-wrap: break-word;
                word-break: break-word;
                font-size: 12px;
                line-height: 16px;
                color: #909090;
              "
            >
              Nota: No responda a este correo electrónico. Si tiene alguna duda, póngase
              en contacto con nosotros mediante nuestro correo electrónico
              <a href="mailto:cmar.live@congregacionmita.com">
                cmar.live@congregacionmita.com</a
              >
            </p>
        
            <br />
            Cordialmente, <br />
            <b>Congregación Mita, Inc.</b>
          </div>
        </div>`;

      await enviarEmail(email, "Solicitud de Acceso - CMAR Multimedia", html);

      res.json({
        ok: true,
        msg: `La solicitud de acceso al canal de multimedia de ${nombre} se eliminó`,
        id: id,
      });
    }

    if (!solicitudDeAcceso) {
      return res.status(404).json({
        msg: `No existe una solicitud de acceso con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};

export const activarSolicitudMultimedia = async (
  req: CustomRequest,
  res: Response
) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const solicitudDeAcceso = await SolicitudMultimedia.findByPk(id);
    if (!!solicitudDeAcceso) {
      const nombre = await solicitudDeAcceso.get().nombre;

      if (solicitudDeAcceso.get().estado === false) {
        await solicitudDeAcceso.update({ estado: true });
        res.json({
          ok: true,
          msg: `La solicitud de acceso al canal de multimedia de ${nombre} se activó`,
          solicitudDeAcceso,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `La solicitud de acceso al canal de multimedia de ${nombre} esta activo`,
          solicitudDeAcceso,
        });
      }
    }

    if (!solicitudDeAcceso) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una solicitud de acceso al canal de multimedia de con el id ${id}`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};

export const buscarCorreoElectronico = async (req: Request, res: Response) => {
  const email = req.params.email;

  if (!email) {
    res.status(500).json({
      ok: false,
      msg: `No existe parametro en la petición`,
    });
  } else {
    try {
      const correoElectronico = await SolicitudMultimedia.findOne({
        attributes: ["email"],
        where: {
          email: email,
        },
      });

      if (!!correoElectronico) {
        res.json({
          ok: false,
          msg: `Ya se encuentra registrado el correo electrónico ${email}`,
        });
      } else {
        res.json({
          ok: true,
          msg: `Correo electrónico válido`,
        });
      }
    } catch (error) {
      res.status(500).json({
        error,
        msg: "Hable con el administrador",
      });
    }
  }
};

export const validarEmail = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  try {
    const verificarStatus = await SolicitudMultimedia.findByPk(id);
    if (!!verificarStatus) {
      const nombre = await verificarStatus.get().nombre;

      if (verificarStatus.get().emailVerificado === false) {
        await verificarStatus.update({ emailVerificado: true });
        res.json({
          ok: true,
          msg: `El correo electrónico de ${nombre} esta verificado`,
          verificarStatus,
        });
      } else {
        return res.status(404).json({
          ok: false,
          msg: `El correo electrónico de ${nombre} esta verificado`,
          verificarStatus,
        });
      }
    }

    if (!verificarStatus) {
      return res.status(404).json({
        ok: false,
        msg: `No existe una verificación de correo electrónico para este usuario`,
      });
    }
  } catch (error) {
    res.status(500).json({
      error,
      msg: "Hable con el administrador",
    });
  }
};
