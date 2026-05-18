const { describe, it } = require('node:test');
const assert = require("assert");
const procesingSql = require("../lib/procesingSql.js");

describe("Test de Joins en procesingSql", () => {
    const config = [
        {
            tabla: "A",
            colums: [
                { name: "id", primary: true }
            ]
        },
        { 
            typeDB: "mysql",
            escapeChar: "`"
        }
    ];

    const sql = new procesingSql(...config);

    it("debe generar RIGHT JOIN cuando se usa '<'", () => {
        const result = sql.select(null, { "<B": "id" });
        assert.strictEqual(result, "SELECT `A`.* FROM `A` RIGHT JOIN `B` USING(`id`);");
    });

    it("debe generar LEFT JOIN cuando se usa '>'", () => {
        const result = sql.select(null, { ">B": "id" });
        assert.strictEqual(result, "SELECT `A`.* FROM `A` LEFT JOIN `B` USING(`id`);");
    });

    it("debe generar INNER JOIN cuando se usa '='", () => {
        const result = sql.select(null, { "=B": "id" });
        assert.strictEqual(result, "SELECT `A`.* FROM `A` INNER JOIN `B` USING(`id`);");
    });

    it("debe generar NATURAL JOIN por defecto", () => {
        const result = sql.select(null, { "B": "id" });
        assert.strictEqual(result, "SELECT `A`.* FROM `A` NATURAL JOIN `B`;");
    });
});
