import { DataTypes } from "sequelize";
import db from "../database/connection";
import { TIPO_ASUNTO_PENDIENTE_ENUM } from "../enum/asuntoPendiente.enum";

const AsuntoPendiente = db.define(
  "AsuntoPendiente",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    asunto: {
      type: DataTypes.STRING(255),
      allowNull: false,
    },
    tipoAsunto: {
      type: DataTypes.ENUM(...Object.values(TIPO_ASUNTO_PENDIENTE_ENUM)),
      allowNull: true,
    },

    responsable: {
      type: DataTypes.STRING(200),
      allowNull: true,
    },
    informe_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    estado: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  },
  {
    freezeTableName: true,
    tableName: "asuntoPendiente",
  },
);

export default AsuntoPendiente;
