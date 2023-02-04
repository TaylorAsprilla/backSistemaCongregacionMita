import AccesoMultimedia from "../models/accesoMultimedia.model";
import Congregacion from "../models/congregacion.model";
import Direccion from "../models/direccion.model";
import Dosis from "../models/dosis.model";
import EstadoCivil from "../models/estadoCivil.model";
import FuenteIngreso from "../models/fuenteIngreso.model";
import Genero from "../models/genero.model";
import GradoAcademico from "../models/gradoAcademico.model";
import Ministerio from "../models/ministerio.model";
import Nacionalidad from "../models/nacionalidad.model";
import Permiso from "../models/permiso.model";
import RazonSolicitud from "../models/razonSolicitud.model";
import RolCasa from "../models/rolCasa.model";
import SolicitudMultimedia from "../models/solicitudMultimedia.model";
import TiempoAprobacion from "../models/tiempoAprobacion.model";
import TipoDocumento from "../models/tipoDocumento.model";
import TipoEmpleo from "../models/tipoEmpleo.model";
import TipoMiembro from "../models/tipoMiembro.model";
import Usuario from "../models/usuario.model";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import UsuarioDireccion from "../models/usuarioDireccion.model";
import UsuarioFuenteIngreso from "../models/usuarioFuenteIngreso.model";
import UsuarioMinisterio from "../models/usuarioMinisterio.model";
import UsuarioPermiso from "../models/usuarioPermiso.model";
import UsuarioVoluntariado from "../models/usuarioVoluntariado.model";
import Vacuna from "../models/vacuna.model";
import Voluntariado from "../models/voluntariado.model";

// Uno a uno
// Usuario.hasOne(TipoDocumento, {
//   as: "tipoDocumento",
//   sourceKey: "tipoDocumento_id",
//   foreignKey: "id",
// });

Usuario.hasOne(Genero, {
  as: "genero",
  sourceKey: "genero_id",
  foreignKey: "id",
});

Usuario.hasOne(EstadoCivil, {
  as: "estadoCivil",
  sourceKey: "estadoCivil_id",
  foreignKey: "id",
});

Usuario.hasOne(RolCasa, {
  as: "rolCasa",
  sourceKey: "rolCasa_id",
  foreignKey: "id",
});

Usuario.hasOne(Vacuna, {
  as: "vacuna",
  sourceKey: "vacuna_id",
  foreignKey: "id",
});

Usuario.hasOne(Dosis, {
  as: "dosis",
  sourceKey: "dosis_id",
  foreignKey: "id",
});

Usuario.hasOne(Nacionalidad, {
  as: "nacionalidad",
  sourceKey: "nacionalidad_id",
  foreignKey: "id",
});

Usuario.hasOne(GradoAcademico, {
  as: "gradoAcademico",
  sourceKey: "gradoAcademico_id",
  foreignKey: "id",
});

Usuario.hasOne(TipoEmpleo, {
  as: "tipoEmpleo",
  sourceKey: "tipoEmpleo_id",
  foreignKey: "id",
});

Usuario.hasOne(TipoMiembro, {
  as: "tipoMiembro",
  sourceKey: "tipoMiembro_id",
  foreignKey: "id",
});

SolicitudMultimedia.hasOne(Usuario, {
  as: "usuarioQueRegistra",
  sourceKey: "usuarioQueRegistra_id",
  foreignKey: "id",
});

SolicitudMultimedia.hasOne(RazonSolicitud, {
  as: "razonSolicitud",
  sourceKey: "razonSolicitud_id",
  foreignKey: "id",
});

SolicitudMultimedia.hasOne(Nacionalidad, {
  as: "nacionalidad",
  sourceKey: "nacionalidad_id",
  foreignKey: "id",
});

SolicitudMultimedia.hasOne(AccesoMultimedia, {
  as: "accesoMultimedia",
  foreignKey: "solicitud_id",
});

// Muchos a Muchos
Usuario.belongsToMany(Direccion, {
  as: "direcciones",
  through: UsuarioDireccion,
  foreignKey: { name: "usuario_id", allowNull: false },
  otherKey: "direccion_id",
});

Usuario.belongsToMany(Congregacion, {
  as: "usuarioCongregacion",
  through: UsuarioCongregacion,
  foreignKey: { name: "usuario_id", allowNull: false },
  otherKey: "congregacion_id",
});

Usuario.belongsToMany(FuenteIngreso, {
  as: "usuarioFuenteIngreso",
  through: UsuarioFuenteIngreso,
  foreignKey: { name: "usuario_id", allowNull: false },
  otherKey: "fuenteIngreso_id",
});

Usuario.belongsToMany(Ministerio, {
  as: "usuarioMinisterio",
  through: UsuarioMinisterio,
  foreignKey: { name: "usuario_id", allowNull: false },
  otherKey: "ministerio_id",
});

Usuario.belongsToMany(Permiso, {
  as: "usuarioPermiso",
  through: UsuarioPermiso,
  foreignKey: { name: "usuario_id", allowNull: false },
  otherKey: "permiso_id",
});

Usuario.belongsToMany(Voluntariado, {
  as: "usuarioVoluntariado",
  through: UsuarioVoluntariado,
  foreignKey: { name: "usuario_id", allowNull: false },
  otherKey: "voluntariado_id",
});
