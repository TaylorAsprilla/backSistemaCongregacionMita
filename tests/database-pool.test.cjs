const { test } = require("node:test");
const assert = require("node:assert/strict");
const db = require("../build/src/database/connection").default;

test("MySQL: pool de 30 conexiones manteniendo los tiempos existentes", () => {
  const { max, min, acquire, idle } = db.options.pool;
  assert.deepEqual({ max, min, acquire, idle }, {
    max: 30,
    min: 0,
    acquire: 60000,
    idle: 10000,
  });
});
