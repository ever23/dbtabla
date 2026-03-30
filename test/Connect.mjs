import { describe, it } from 'node:test';
import assert from 'node:assert';
import { Connect } from '../index.mjs';
import dbTablaModel from 'tabla-model';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

describe("Test de la clase Connect (ESM)", () => {
    it("verificacion de carga de modelos ESM y CJS", async () => {
        let dataBase = new Connect();
        // Cargamos los modelos (esto detectará que el proyecto es CJS o ESM según el package.json actual)
        dataBase.pathModels(path.join(__dirname, "model"));
        
        // Esperamos a que se carguen los modelos ESM (ya que import() es asíncrono internamente)
        await new Promise(res => setTimeout(res, 150));
        
        assert.ok(dataBase.model("test1"), "debe cargar el modelo CJS (test1.js)");
        assert.ok(dataBase.model("test_esm"), "debe cargar el modelo ESM (test_esm.mjs)");
    });
    
    it("verificacion de exportaciones ESM", () => {
        assert.equal(typeof Connect, "function", "Connect debe ser una función/clase");
    });
});
