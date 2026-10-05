import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { crearValidadorRoles } from "../../src/middlewares/validar-roles";

const crearRespuesta = () => {
  const res: any = { statusCode: 200, body: null };
  res.status = (codigo: number) => {
    res.statusCode = codigo;
    return res;
  };
  res.json = (cuerpo: unknown) => {
    res.body = cuerpo;
    return res;
  };
  return res;
};

describe("validar-roles", () => {
  const permisos: Record<number, string[]> = { 1: ["1", "4"], 2: ["4", "5"] };
  const middleware = crearValidadorRoles(["1"], async (id) => permisos[id] ?? []);

  it("permite al administrador", async () => {
    let continuo = false;
    const res = crearRespuesta();
    await middleware({ id: 1 } as any, res, () => {
      continuo = true;
    });
    assert.equal(continuo, true);
    assert.equal(res.statusCode, 200);
  });

  it("rechaza con 403 a un usuario sin el permiso", async () => {
    let continuo = false;
    const res = crearRespuesta();
    await middleware({ id: 2 } as any, res, () => {
      continuo = true;
    });
    assert.equal(continuo, false);
    assert.equal(res.statusCode, 403);
    assert.equal(res.body.ok, false);
  });

  it("rechaza con 401 si no hay usuario autenticado", async () => {
    const res = crearRespuesta();
    await middleware({} as any, res, () => assert.fail("no debe continuar"));
    assert.equal(res.statusCode, 401);
  });

  it("responde 500 si falla la consulta de permisos", async () => {
    const fallido = crearValidadorRoles(["1"], async () => {
      throw new Error("db");
    });
    const res = crearRespuesta();
    const original = console.error;
    console.error = () => undefined;
    await fallido({ id: 1 } as any, res, () => assert.fail("no debe continuar"));
    console.error = original;
    assert.equal(res.statusCode, 500);
  });
});
