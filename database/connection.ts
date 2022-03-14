import { Sequelize } from "sequelize";

const db = new Sequelize("cmainformes", "adminCMA", "KASJxkoA6$jA", {
  host: "mysql-cmainformes.c6j48ovs9j2b.us-west-2.rds.amazonaws.com",
  dialect: "mysql",
  // logging: false,
});

export default db;
