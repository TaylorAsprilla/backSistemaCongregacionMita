import { strict as assert } from "assert";
import { test } from "node:test";
import {
  generarCodigoQr, resumirCodigoQr, verificarCodigoQr, validarDatosGuarda, PUESTOS_QR,
} from "../src/helpers/accesoQr";

test("codigo QR tiene seis digitos y el resumen queda vinculado al desafio", () => {
  const anterior = process.env.JWT_SECRET;
  process.env.JWT_SECRET = "clave-exclusiva-de-pruebas";
  try {
    for (let i = 0; i < 20; i++) assert.match(generarCodigoQr(), /^\d{6}$/);
    const resumen = resumirCodigoQr("desafio-1", "012345");
    assert.notEqual(resumen, "012345");
    assert.equal(verificarCodigoQr("desafio-1", "012345", resumen), true);
    assert.equal(verificarCodigoQr("desafio-2", "012345", resumen), false);
    assert.equal(verificarCodigoQr("desafio-1", "012346", resumen), false);
    assert.equal(verificarCodigoQr("desafio-1", "12345", resumen), false);
    assert.equal(verificarCodigoQr("desafio-1", "012345", "invalido"), false);
  } finally {
    if (anterior === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = anterior;
  }
});

test("no guarda y guarda fuera de turno no requieren ni aceptan puesto", () => {
  assert.equal(validarDatosGuarda(false, false, null), true);
  assert.equal(validarDatosGuarda(true, false, ""), true);
  assert.equal(validarDatosGuarda(false, true, null), false);
  assert.equal(validarDatosGuarda(false, false, PUESTOS_QR[0]), false);
  assert.equal(validarDatosGuarda(true, false, PUESTOS_QR[0]), false);
  assert.equal(validarDatosGuarda("true", false, null), false);
  assert.equal(validarDatosGuarda(null, false, null), false);
});

test("guarda en turno requiere uno de los cuatro puestos autorizados", () => {
  for (const puesto of PUESTOS_QR) assert.equal(validarDatosGuarda(true, true, puesto), true);
  assert.equal(validarDatosGuarda(true, true, ""), false);
  assert.equal(validarDatosGuarda(true, true, "otro"), false);
});
