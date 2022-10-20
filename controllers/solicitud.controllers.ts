import { Request, Response } from "express";
import { transporter } from "../config/mailer";
import db from "../database/connection";
import { CustomRequest } from "../middlewares/validar-jwt";
import Familiares from "../models/familiares.model";
import Solicitud from "../models/solicitud.model";
import SolicitudesFamiliares from "../models/solicitudesFamiliares.model";

export const getSolicitudes = async (req: Request, res: Response) => {
  try {
    const solicitudDeAccesos = await Solicitud.findAll({
      order: db.col("id"),
    });

    res.json({
      ok: true,
      solicitudDeAccesos,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const getUnaSolicitud = async (req: Request, res: Response) => {
  const { id } = req.params;

  const solicitudDeAcceso = await Solicitud.findByPk(id);

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

export const crearSolicitud = async (req: Request, res: Response) => {
  const { body } = req;
  const { familiares, email, nombre } = body;

  try {
    // =======================================================================
    //                          Guardar Acceso Multimedia
    // =======================================================================

    const solicitudDeAcceso = Solicitud.build(body);
    await solicitudDeAcceso.save();
    const idUsuario = solicitudDeAcceso.getDataValue("id");

    const solicitudFamiliares = await familiares.forEach(
      async (itemFamiliar: {
        nombre: string;
        telefono: {
          number: string;
          internationalNumber: string;
          nationalNumber: string;
          e164Number: string;
          countryCode: string;
          dialCode: string;
        };
        celular: {
          number: string;
          internationalNumber: string;
          nationalNumber: string;
          e164Number: string;
          countryCode: string;
          dialCode: string;
        };
        email: string;
        pais: string;
        parentesco: number;
      }) => {
        const guardarFamiliar = await Familiares.create({
          nombre: itemFamiliar.nombre,
          telefono: itemFamiliar.telefono.internationalNumber,
          celular: itemFamiliar.celular.internationalNumber,
          email: itemFamiliar.email,
          pais: itemFamiliar.pais,
          parentesco_id: itemFamiliar.parentesco,
        });

        const solicitudFamiliar = await SolicitudesFamiliares.create({
          solicitud_id: idUsuario,
          familiares_id: guardarFamiliar.getDataValue("id"),
        });
      }
    );

    // =======================================================================
    //                         Enviar Correo de Verificación
    // =======================================================================
    await transporter.sendMail({
      from: '"CMA Multimedia" <taylor.asprilla@gmail.com>',
      to: email,
      subject: "Verificar Correo - CMA Multimedia",
      html: `
      <div style="text-align: center; font-size: 22px">
      <img
        src="https://kromatest.pw/sistemacmi/assets/images/multimedia.png"
        alt="CMAR Multimedia"
        style="text-align: center; width: 400px"
      />
      <p>Saludos, ${nombre}</p>
      <p>Su solicitud será tramitada en breve</p>
      <b>Por favor verifique su cuenta de correo electrónico haciendo clic en</b>
      <a href="http://localhost:4200/#/validaremail/${idUsuario}" target="_blank">Verificar Cuenta </a>
    
      <p style="margin-top: 2%; font-size: 18px">
        Para mayor información puede contactarse a
        <a href="mailto:multimedia@congregacionmita.com">
          multimedia@congregacionmita.com</a
        >
      </p>
    
      <b class="margin-top:2%">Congregación Mita inc</b>
    </div>`,
    });

    res.json({
      ok: true,
      msg: "Se ha guardado la solicitud exitosamente ",
      solicitudDeAcceso,
    });
  } catch (error) {
    res.status(500).json({
      msg: "Hable con el administrador",
      error,
    });
  }
};

export const actualizarSolicitud = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const solicitudDeAcceso = await Solicitud.findByPk(id);
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

export const eliminarSolicitud = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const solicitudDeAcceso = await Solicitud.findByPk(id);
    if (solicitudDeAcceso) {
      const nombre = await solicitudDeAcceso.get().nombre;

      await solicitudDeAcceso.update({ estado: false });

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

export const activarSolicitud = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  const { body } = req;

  try {
    const solicitudDeAcceso = await Solicitud.findByPk(id);
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

export const validarEmail = async (req: CustomRequest, res: Response) => {
  const { id } = req.params;
  try {
    const verificarStatus = await Solicitud.findByPk(id);
    if (!!verificarStatus) {
      const nombre = await verificarStatus.get().nombre;

      if (verificarStatus.get().status === false) {
        await verificarStatus.update({ status: true });
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
