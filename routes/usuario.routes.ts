import { Router } from "express";
import { check } from "express-validator";
import {
  activarUsuario,
  actualizarUsuario,
  buscarCorreoElectronico,
  crearUsuario,
  eliminarUsuario,
  getTodosLosUsuarios,
  getUsuario,
  getUsuarios,
} from "../controllers/usuario.controllers";
import validarCampos from "../middlewares/validar-campos";
import validarJWT from "../middlewares/validar-jwt";

const router = Router();

router.get("/", validarJWT, getUsuarios);
router.get("/todos", validarJWT, getTodosLosUsuarios);
router.get("/:id", validarJWT, getUsuario);
router.get("/buscarcorreo/:email", validarJWT, buscarCorreoElectronico);
router.post(
  "/",
  validarJWT,
  [
    check("primerNombre", "El primer nombre es obligatorio").not().isEmpty(),
    check("primerApellido", "El primer apellido es obligatorio")
      .not()
      .isEmpty(),
    check("fechaNacimiento", "La fecha de nacimiento es obligatoria")
      .not()
      .isEmpty(),
    check("nacionalidad_id", "La nacionalidad es obligatoria").not().isEmpty(),
    check("email", "El correo electrónico es obligatorio").isEmail(),
    check("numeroCelular", "El número de celular es obligatorio")
      .not()
      .isEmpty(),
    check("esJoven", "Selecciones si es o no joven").not().isEmpty(),
    check("genero_id", "El género es obligatorio").not().isEmpty(),
    check("estadoCivil_id", "El estado civil es obligatorio").not().isEmpty(),
    check("rolCasa_id", "El rol es obligatorio").not().isEmpty(),
    check("vacuna_id", "La vacuna es obligatoria").not().isEmpty(),
    check("dosis_id", "La dosis es obligatoria").not().isEmpty(),
    check("nacionalidad_id", "Selecciona una nacionalidad").not().isEmpty(),
    check("gradoAcademico_id", "Selecione un grado académico").not().isEmpty(),
    check("tipoEmpleo_id", "Selecciones a qué se dedica").not().isEmpty(),
    check("tipoMiembro_id", "Seleccione un tipo de miembro (MN, MA, MNA, ME)")
      .not()
      .isEmpty(),
    check(
      "direcciones",
      "Debe diligenciar una dirección de residencia y/o postal"
    )
      .not()
      .isEmpty(),
    check("congregacion", "Indique a que congregación pertenece")
      .not()
      .isEmpty(),
    validarCampos,
  ],
  crearUsuario
);
router.put(
  "/:id",
  validarJWT,
  [
    check("primerNombre", "El primer nombre es obligatorio").not().isEmpty(),
    check("primerApellido", "El primer apellido es obligatorio")
      .not()
      .isEmpty(),
    check("fechaNacimiento", "La fecha de nacimiento es obligatoria")
      .not()
      .isEmpty(),
    check("nacionalidad_id", "La nacionalidad es obligatoria").not().isEmpty(),
    check("email", "El correo electrónico es obligatorio").isEmail(),
    check("numeroCelular", "El número de celular es obligatorio")
      .not()
      .isEmpty(),
    check("esJoven", "Selecciones si es o no joven").not().isEmpty(),
    check("genero_id", "El género es obligatorio").not().isEmpty(),
    check("estadoCivil_id", "El estado civil es obligatorio").not().isEmpty(),
    check("rolCasa_id", "El rol es obligatorio").not().isEmpty(),
    check("vacuna_id", "La vacuna es obligatoria").not().isEmpty(),
    check("dosis_id", "La dosis es obligatoria").not().isEmpty(),
    check("nacionalidad_id", "La dosis es obligatoria").not().isEmpty(),
    check("gradoAcademico_id", "La dosis es obligatoria").not().isEmpty(),
    check("tipoEmpleo_id", "La dosis es obligatoria").not().isEmpty(),
    check("tipoMiembro_id", "La dosis es obligatoria").not().isEmpty(),
    validarCampos,
  ],
  actualizarUsuario
);
router.delete("/:id", validarJWT, eliminarUsuario);
router.put("/activar/:id", validarJWT, activarUsuario);

export default router;
