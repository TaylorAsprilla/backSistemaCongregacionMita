import AuditoriaUsuario from "../models/auditoriaUsuario.model";
import Actividad from "../models/actividad.model";
import ActividadEconomica from "../models/actividadEconomica.model";
import Campo from "../models/campo.model";
import Congregacion from "../models/congregacion.model";
import EstadoCivil from "../models/estadoCivil.model";
import Genero from "../models/genero.model";
import GradoAcademico from "../models/gradoAcademico.model";
import GrupoGemelos from "../models/grupoGemelos.model";
import Informe from "../models/informe.model";
import Ministerio from "../models/ministerio.model";
import Nacionalidad from "../models/nacionalidad.model";
import OpcionTransporte from "../models/opcionTransporte.model";
import Pais from "../models/pais.model";
import Parentesco from "../models/parentesco.model";
import Permiso from "../models/permiso.model";
import QrAccesos from "../models/qrAccesos";
import QrCodigos from "../models/qrCodigos.model";
import RazonSolicitud from "../models/razonSolicitud.model";
import RolCasa from "../models/rolCasa.model";
import SolicitudMultimedia from "../models/solicitudMultimedia.model";
import TipoDocumento from "../models/tipoDocumento.model";
import TipoEstudio from "../models/tipoEstudio.model";
import TipoMiembro from "../models/tipoMiembro.model";
import TipoActividadEconomica from "../models/tipoActividadEconomica.model";
import UbicacionConexion from "../models/ubicacionConexion.model";
import Usuario from "../models/usuario.model";
import UsuarioCongregacion from "../models/usuarioCongregacion.model";
import UsuarioGrupoGemelos from "../models/usuarioGrupoGemelos.model";
import UsuarioMinisterio from "../models/usuarioMinisterio.model";
import UsuarioPermiso from "../models/usuarioPermiso.model";
import UsuarioVoluntariado from "../models/usuarioVoluntariado.model";
import Voluntariado from "../models/voluntariado.model";

// Asociaciones uno a uno
Usuario.hasOne(Usuario, {
  as: "usuarioQueRegistra",
  sourceKey: "idUsuarioQueRegistra",
  foreignKey: "id",
});

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

Usuario.hasOne(TipoDocumento, {
  as: "tipoDocumento",
  sourceKey: "tipoDocumento_id",
  foreignKey: "id",
});

Usuario.hasOne(TipoMiembro, {
  as: "tipoMiembro",
  sourceKey: "tipoMiembro_id",
  foreignKey: "id",
});

Usuario.hasOne(UsuarioCongregacion, {
  as: "usuarioCongregacion",
  sourceKey: "id",
  foreignKey: "usuario_id",
});

// Asociaciones muchos a uno y muchos a muchos
Usuario.hasMany(SolicitudMultimedia, {
  foreignKey: "usuario_id",
  as: "solicitudes",
});

SolicitudMultimedia.hasOne(Usuario, {
  as: "usuarioQueRegistra",
  sourceKey: "usuarioQueRegistra_id",
  foreignKey: "id",
});

SolicitudMultimedia.hasOne(Usuario, {
  as: "usuarioQueAprobo",
  sourceKey: "usuarioQueAprobo_id",
  foreignKey: "id",
});

SolicitudMultimedia.hasOne(Usuario, {
  as: "usuario",
  sourceKey: "usuario_id",
  foreignKey: "id",
});

SolicitudMultimedia.hasOne(RazonSolicitud, {
  as: "razonSolicitud",
  sourceKey: "razonSolicitud_id",
  foreignKey: "id",
});

SolicitudMultimedia.hasOne(TipoEstudio, {
  as: "tipoEstudio",
  sourceKey: "tipoDeEstudio_id",
  foreignKey: "id",
});

SolicitudMultimedia.hasOne(Parentesco, {
  as: "parentesco",
  sourceKey: "parentesco_id",
  foreignKey: "id",
});

SolicitudMultimedia.hasOne(OpcionTransporte, {
  as: "opcionTransporte",
  sourceKey: "opcionTransporte_id",
  foreignKey: "id",
});

Usuario.belongsToMany(Congregacion, {
  as: "usuarioCongregacionCongregacion",
  through: UsuarioCongregacion,
  foreignKey: { name: "usuario_id", allowNull: false },
  otherKey: "congregacion_id",
});

Usuario.belongsToMany(Campo, {
  as: "usuarioCongregacionCampo",
  through: UsuarioCongregacion,
  foreignKey: { name: "usuario_id", allowNull: false },
  otherKey: "campo_id",
});

Usuario.belongsToMany(Pais, {
  as: "usuarioCongregacionPais",
  through: UsuarioCongregacion,
  foreignKey: { name: "usuario_id", allowNull: false },
  otherKey: "pais_id",
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

// Relaciones adicionales
UsuarioCongregacion.belongsTo(Pais, { foreignKey: "pais_id", as: "pais" });

AuditoriaUsuario.belongsTo(Usuario, { foreignKey: "usuario_id" });
AuditoriaUsuario.belongsTo(Usuario, { foreignKey: "usuarioQueRegistra_id" });
UsuarioCongregacion.belongsTo(Usuario, { foreignKey: "usuario_id" });

// Relación de UsuarioCongregacion con Congregación y Campo
UsuarioCongregacion.belongsTo(Congregacion, {
  foreignKey: "congregacion_id",
  as: "congregacion",
});

UsuarioCongregacion.belongsTo(Campo, {
  foreignKey: "campo_id",
  as: "campo",
});

QrCodigos.belongsTo(Congregacion, {
  foreignKey: "idCongregacion",
  targetKey: "id",
});

GrupoGemelos.belongsToMany(Usuario, {
  through: UsuarioGrupoGemelos,
  foreignKey: "grupoGemelos_id",
  as: "usuarios",
});

Usuario.belongsToMany(GrupoGemelos, {
  through: UsuarioGrupoGemelos,
  foreignKey: "usuario_id",
  as: "gruposGemelos",
});

UbicacionConexion.belongsTo(Usuario, {
  foreignKey: "idUsuario",
  as: "usuario",
});

Usuario.hasMany(UbicacionConexion, {
  foreignKey: "idUsuario",
  as: "ubicaciones",
});

UbicacionConexion.hasOne(QrAccesos, {
  foreignKey: "ip",
  sourceKey: "ip",
  as: "qrAcceso",
});

QrAccesos.hasMany(UbicacionConexion, {
  foreignKey: "ip", // Este campo debe existir en `UbicacionConexion`
  sourceKey: "ip", // Se asocia con el campo `id` de `QrAccesos`
  as: "ubicaciones", // Alias para acceder a las conexiones en `UbicacionConexion`
});

UbicacionConexion.belongsTo(Congregacion, {
  foreignKey: "idCongregacion",
  targetKey: "id",
  as: "congregacion",
});

Pais.belongsTo(Usuario, {
  foreignKey: "idObreroEncargado",
  as: "obreroEncargado",
});

Congregacion.belongsTo(Usuario, {
  foreignKey: "idObreroEncargado",
  as: "obreroEncargado",
});

Congregacion.belongsTo(Usuario, {
  foreignKey: "idObreroEncargadoDos",
  as: "obreroEncargadoDos",
});

Campo.belongsTo(Usuario, {
  foreignKey: "idObreroEncargado",
  as: "obreroEncargado",
});

Campo.belongsTo(Usuario, {
  foreignKey: "idObreroEncargadoDos",
  as: "obreroEncargadoDos",
});

// Relaciones de Informe y Actividad
Informe.belongsTo(Usuario, {
  foreignKey: "usuario_id",
  as: "usuario",
});

Usuario.hasMany(Informe, {
  foreignKey: "usuario_id",
  as: "informes",
});

Informe.hasMany(Actividad, {
  foreignKey: "informe_id",
  as: "actividades",
});

Actividad.belongsTo(Informe, {
  foreignKey: "informe_id",
  as: "informe",
});

// Relaciones de Informe y ActividadEconomica
Informe.hasMany(ActividadEconomica, {
  foreignKey: "informe_id",
  as: "actividadesEconomicas",
});

ActividadEconomica.belongsTo(Informe, {
  foreignKey: "informe_id",
  as: "informe",
});

// Relaciones de TipoActividadEconomica y ActividadEconomica
TipoActividadEconomica.hasMany(ActividadEconomica, {
  foreignKey: "tipoActividadEconomica_id",
  as: "actividadesEconomicas",
});

ActividadEconomica.belongsTo(TipoActividadEconomica, {
  foreignKey: "tipoActividadEconomica_id",
  as: "tipoActividadEconomica",
});
