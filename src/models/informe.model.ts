import { DataTypes } from "sequelize";
import db from "../database/connection";
import { ESTADO_INFORME_ENUM } from "../enum/informe.enum";

const Informe = db.define(
  "Informe",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    usuario_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    estado: {
      type: DataTypes.ENUM(...Object.values(ESTADO_INFORME_ENUM)),
      allowNull: false,
      defaultValue: ESTADO_INFORME_ENUM.ABIERTO,
    },
  },
  {
    freezeTableName: true,
    tableName: "informe",
  },
);

export default Informe;
