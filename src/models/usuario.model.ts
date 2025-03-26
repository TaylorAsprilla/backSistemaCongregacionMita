import { DataTypes } from "sequelize";
import db from "../database/connection";
import { ESTADO_USUARIO_ENUM } from "../enum/usuario.enum";

const Usuario = db.define(
  "Usuario",
  {
    primerNombre: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    segundoNombre: {
      type: DataTypes.STRING,
    },
    primerApellido: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    segundoApellido: {
      type: DataTypes.STRING,
    },
    apodo: {
      type: DataTypes.STRING,
    },
    fechaNacimiento: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      validate: {
        isEmail: {
          msg: "Debe ser una direccion de correo electronico valida.",
        },
      },
    },
    telefonoCasa: {
      type: DataTypes.STRING,
    },
    numeroCelular: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    esJoven: {
      type: DataTypes.BOOLEAN,
      defaultValue: 0,
    },
    especializacionEmpleo: {
      type: DataTypes.STRING,
    },
    numeroDocumento: {
      type: DataTypes.STRING,
      unique: true,
    },
    login: {
      type: DataTypes.STRING,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
    },
    foto: {
      type: DataTypes.STRING,
    },
    estado: {
      type: DataTypes.ENUM(
        ESTADO_USUARIO_ENUM.ACTIVO,
        ESTADO_USUARIO_ENUM.ELIMINADO,
        ESTADO_USUARIO_ENUM.TRANSCENDIO
      ),
      defaultValue: ESTADO_USUARIO_ENUM.ACTIVO,
    },
    resetToken: {
      type: DataTypes.STRING,
    },
    genero_id: {
      type: DataTypes.INTEGER,
    },
    estadoCivil_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    rolCasa_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    nacionalidad_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    gradoAcademico_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tipoMiembro_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    tipoDocumento_id: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      allowNull: true,
    },
    direccion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    ciudadDireccion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    departamentoDireccion: {
      type: DataTypes.STRING,
    },
    codigoPostalDireccion: {
      type: DataTypes.STRING,
    },
    paisDireccion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    direccionPostal: {
      type: DataTypes.STRING,
    },
    ciudadPostal: {
      type: DataTypes.STRING,
    },
    departamentoPostal: {
      type: DataTypes.STRING,
    },
    codigoPostal: {
      type: DataTypes.STRING,
    },
    paisPostal: {
      type: DataTypes.STRING,
    },
    anoConocimiento: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    ocupacion: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    idUsuarioQueRegistra: {
      type: DataTypes.NUMBER,
      allowNull: false,
    },
  },
  {
    freezeTableName: true,
    tableName: "usuario",
  }
);

export default Usuario;
