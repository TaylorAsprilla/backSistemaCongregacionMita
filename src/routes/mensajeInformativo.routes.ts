/* 
  Path: '/api/mensajes-informativos'
*/

import { Router } from "express";
import { check } from "express-validator";
import {
  getMensajesInformativos,
  getMensajesActivos,
  getMensajeInformativo,
  crearMensajeInformativo,
  actualizarMensajeInformativo,
  eliminarMensajeInformativo,
} from "../controllers/mensajeInformativo.controller";

import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";
import { TIPO_MENSAJE_INFORMATIVO_ENUM } from "../enum/mensajeInformativo.enum";

const router = Router();

const validarVigencia = check("publicar_hasta").custom((value, { req }) => {
  if (
    req.body.publicar_desde &&
    new Date(value) < new Date(req.body.publicar_desde)
  ) {
    throw new Error(
      "La fecha 'publicar_hasta' no puede ser menor que 'publicar_desde'",
    );
  }
  return true;
});

// Nota: '/activos' debe declararse antes de '/:id' para evitar colisión de rutas
router.get("/activos", validarJWT, getMensajesActivos);
router.get("/", validarJWT, getMensajesInformativos);
router.get("/:id", validarJWT, getMensajeInformativo);

router.post(
  "/",
  [
    check("titulo", "El título es obligatorio").not().isEmpty(),
    check("mensaje", "El mensaje es obligatorio").not().isEmpty(),
    check(
      "publicar_hasta",
      "La fecha de vigencia (publicar_hasta) es obligatoria",
    )
      .not()
      .isEmpty(),
    check(
      "publicar_hasta",
      "La fecha de vigencia (publicar_hasta) no es válida",
    ).isISO8601(),
    check(
      "publicar_desde",
      "La fecha de publicación (publicar_desde) no es válida",
    )
      .optional()
      .isISO8601(),
    check("tipo", "El tipo de mensaje no es válido")
      .optional()
      .isIn(Object.values(TIPO_MENSAJE_INFORMATIVO_ENUM)),
    check("activo", "El campo activo debe ser booleano").optional().isBoolean(),
    check("prioridad", "La prioridad debe ser numérica").optional().isNumeric(),
    validarVigencia,
    validarCampos,
    validarJWT,
  ],
  crearMensajeInformativo,
);

router.patch(
  "/:id",
  [
    check("titulo", "El título no puede estar vacío")
      .optional()
      .not()
      .isEmpty(),
    check("mensaje", "El mensaje no puede estar vacío")
      .optional()
      .not()
      .isEmpty(),
    check(
      "publicar_hasta",
      "La fecha de vigencia (publicar_hasta) no es válida",
    )
      .optional()
      .isISO8601(),
    check(
      "publicar_desde",
      "La fecha de publicación (publicar_desde) no es válida",
    )
      .optional()
      .isISO8601(),
    check("tipo", "El tipo de mensaje no es válido")
      .optional()
      .isIn(Object.values(TIPO_MENSAJE_INFORMATIVO_ENUM)),
    check("activo", "El campo activo debe ser booleano").optional().isBoolean(),
    check("prioridad", "La prioridad debe ser numérica").optional().isNumeric(),
    check("publicar_hasta")
      .optional()
      .custom((value, { req }) => {
        if (
          req.body.publicar_desde &&
          new Date(value) < new Date(req.body.publicar_desde)
        ) {
          throw new Error(
            "La fecha 'publicar_hasta' no puede ser menor que 'publicar_desde'",
          );
        }
        return true;
      }),
    validarCampos,
    validarJWT,
  ],
  actualizarMensajeInformativo,
);

router.delete("/:id", validarJWT, eliminarMensajeInformativo);

export default router;
