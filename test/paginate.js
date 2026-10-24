const { describe, it } = require('node:test');
const assert = require("assert");
const { connect } = require("../index.js");
const model = require("tabla-model");

describe("Test del método tabla.paginate()", () => {
    class MockPaginateConnect extends connect {
        constructor() {
            super({}, "sqlite3");
            this.queries = [];
            this.mockRows = [];
            this.mockCount = 25;
        }
        async query(sql) {
            this.queries.push(sql);
            if (/SELECT COUNT\(\*\)/i.test(sql)) {
                return [{ total: this.mockCount }];
            }
            return this.mockRows;
        }
        async _keysInTable(table) {
            return {
                tabla: table,
                columns: [
                    { name: "id", primary: true, autoincrement: true },
                    { name: "nombre", type: "varchar" },
                    { name: "edad", type: "int" },
                    { name: "activo", type: "int" }
                ]
            };
        }
    }

    it("paginación clásica por página (offset) con valores por defecto (page=1, limit=15)", async () => {
        const db = new MockPaginateConnect();
        db.mockRows = [{ id: 1, nombre: "Item 1" }, { id: 2, nombre: "Item 2" }];
        const tabla = db.tabla("usuarios");

        const res = await tabla.paginate();

        assert.equal(res.total, 25);
        assert.equal(res.page, 1);
        assert.equal(res.limit, 15);
        assert.equal(res.totalPages, 2);
        assert.equal(res.hasNext, true);
        assert.equal(res.hasPrev, false);
        assert.equal(res.data.length, 2);

        // Verifica que se ejecutaron las dos consultas esperadas
        const countQuery = db.queries.find(q => /COUNT\(\*\) as total/i.test(q));
        const dataQuery = db.queries.find(q => /LIMIT 0,15/i.test(q));
        assert.ok(countQuery, "debe ejecutar consulta de conteo");
        assert.ok(dataQuery, "debe ejecutar consulta de datos con limit y offset");
    });

    it("paginación offset respeta todos los atributos de select (campos, joins, where, order)", async () => {
        const db = new MockPaginateConnect();
        const tabla = db.tabla("usuarios");

        await tabla.paginate({
            campos: ["usuarios.id", "usuarios.nombre"],
            joins: { ">carreras": "usuarios.id_carrera = carreras.id" },
            where: { activo: 1, "edad>=": 18 },
            order: "usuarios.nombre ASC",
            page: 3,
            limit: 5
        });

        const countQuery = db.queries.find(q => /COUNT\(\*\) as total/i.test(q));
        const dataQuery = db.queries.find(q => /LIMIT 10,5/i.test(q));

        assert.ok(countQuery.includes("LEFT JOIN carreras ON(usuarios.id_carrera=carreras.id)"));
        assert.ok(countQuery.includes("activo=1"));
        assert.ok(countQuery.includes("edad>=18"));

        assert.ok(dataQuery.includes("LEFT JOIN carreras ON(usuarios.id_carrera=carreras.id)"));
        assert.ok(dataQuery.includes("ORDER BY usuarios.nombre ASC"));
        assert.ok(dataQuery.includes("LIMIT 10,5"));
    });

    it("paginación con GROUP BY y HAVING genera subconsulta de conteo adecuada", async () => {
        const db = new MockPaginateConnect();
        const tabla = db.tabla("usuarios");

        await tabla.paginate({
            campos: ["carrera", "COUNT(*) as total_estudiantes"],
            where: { activo: 1 },
            group: "carrera",
            having: { "COUNT(*)>": 5 },
            page: 1,
            limit: 10
        });

        const countQuery = db.queries.find(q => /SELECT COUNT\(\*\) as total FROM/i.test(q));
        assert.ok(countQuery, "debe encontrar la consulta de conteo");
        assert.ok(countQuery.includes("FROM (SELECT 1 FROM usuarios WHERE activo=1 GROUP BY carrera HAVING COUNT(*)>5) as _subquery"));
    });

    it("paginación basada en cursor (Keyset) usando after y limit", async () => {
        const db = new MockPaginateConnect();
        // Simulamos que la consulta con limit=3 pide limit+1 (4 filas) para detectar hasMore
        db.mockRows = [
            { id: 11, nombre: "Item 11" },
            { id: 12, nombre: "Item 12" },
            { id: 13, nombre: "Item 13" },
            { id: 14, nombre: "Item 14" }
        ];
        const tabla = db.tabla("usuarios");

        const res = await tabla.paginate({
            after: 10,
            limit: 3,
            order: "id ASC"
        });

        assert.equal(res.limit, 3);
        assert.equal(res.hasMore, true);
        assert.equal(res.data.length, 3);
        assert.equal(res.nextCursor, 13);

        const dataQuery = db.queries.find(q => /id>10/i.test(q));
        assert.ok(dataQuery, "debe incluir la condición de cursor id>10");
        assert.ok(dataQuery.includes("LIMIT 4"), "debe solicitar limit+1 filas");
    });

    it("paginación basada en cursor con orden descendente usa operador <", async () => {
        const db = new MockPaginateConnect();
        db.mockRows = [
            { id: 49, nombre: "Item 49" },
            { id: 48, nombre: "Item 48" }
        ];
        const tabla = db.tabla("usuarios");

        const res = await tabla.paginate({
            cursor: 50,
            limit: 2,
            order: "id DESC"
        });

        assert.equal(res.hasMore, false);
        assert.equal(res.nextCursor, null);
        assert.equal(res.data.length, 2);

        const dataQuery = db.queries.find(q => /id<50/i.test(q));
        assert.ok(dataQuery, "debe usar operador < para orden descendente");
    });

    it("búsqueda inteligente con paginación (busquedaPaginate) genera conteo subquery y query ponderada", async () => {
        const db = new MockPaginateConnect();
        db.mockRows = [
            { id: 1, nombre: "Laptop Lenovo", puntaje_busqueda: 5 },
            { id: 2, nombre: "Laptop Dell", puntaje_busqueda: 2 }
        ];
        const tabla = db.tabla("usuarios");

        const res = await tabla.busquedaPaginate({
            cadena: "Laptop",
            campo_bus: ["nombre"],
            page: 1,
            limit: 10
        });

        assert.equal(res.total, 25);
        assert.equal(res.page, 1);
        assert.equal(res.limit, 10);
        assert.equal(res.data.length, 2);

        const countQuery = db.queries.find(q => /SELECT COUNT\(\*\) as total FROM/i.test(q));
        const dataQuery = db.queries.find(q => /puntaje_busqueda/i.test(q) && /LIMIT 0,10/i.test(q));

        assert.ok(countQuery, "debe generar consulta de conteo para búsqueda");
        assert.ok(countQuery.includes("_subquery"), "el conteo debe usar subquery con las condiciones de puntaje");
        assert.ok(dataQuery, "debe generar consulta de datos ponderada");
        assert.ok(dataQuery.includes("puntaje_busqueda DESC"), "debe ordenar por relevancia puntaje_busqueda DESC");
    });

    it("busquedaPaginate y busquedaPaginada soportan sintaxis posicional y de objeto", async () => {
        const db = new MockPaginateConnect();
        db.mockRows = [{ id: 1, nombre: "Item Buscado" }];
        const tabla = db.tabla("usuarios");

        // Sintaxis posicional
        const resPos = await tabla.busquedaPaginate("Laptop", ["nombre"], { page: 2, limit: 5 });
        assert.equal(resPos.page, 2);
        assert.equal(resPos.limit, 5);

        // Sintaxis objeto
        const resObj = await tabla.busquedaPaginada({
            cadena: "Laptop",
            campo_bus: ["nombre"],
            page: 3,
            limit: 4
        });
        assert.equal(resObj.page, 3);
        assert.equal(resObj.limit, 4);
    });
});
