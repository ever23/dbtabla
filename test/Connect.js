const { describe, it } = require('node:test');
const assert= require("assert")
const {connect}= require("../index.js")
const model = require("tabla-model")
const dbTabla= require("../index.js")

describe("Test de la clase Connect",()=>
{
    it("verificacion de metodos",()=>
    {
        let dataBase = new connect()
        assert.equal(typeof dataBase.addModel,"function")
        assert.equal(typeof dataBase.pathModels,"function")
        assert.equal(typeof dataBase.model,"function")
        assert.equal(typeof dataBase.tabla,"function")
        assert.equal(typeof dataBase.helpersConf,"function")

    })
    it("verificacion de modelos",async ()=>
    {
        let dataBase = new connect()
        dataBase.pathModels(__dirname+"/model")
        // Esperamos un poco para que los modelos ESM se carguen ya que import() es asincrono
        await new Promise(res => setTimeout(res, 100));
        
        assert.ok(dataBase.model("test1"),"no debe retornar false")
        assert.ok(dataBase.model("test2") instanceof model,"no es un modelo")
        assert.ok(dataBase.model("test_esm"), "debe cargar el modelo ESM")
        assert.equal(dataBase.model("nomodel"),false,"debe retornar false")
    })
    it("carga de modelos con ruta relativa (compatibilidad Windows/Linux)",async ()=>
    {
        let dataBase = new connect()
        // La ruta es relativa al CWD desde donde se ejecutan los tests
        dataBase.pathModels("./test/model")
        await new Promise(res => setTimeout(res, 100));
        
        assert.ok(dataBase.model("test1"),"no debe retornar false usando rutas relativas cruzadas")
    })
    it("verificacion de tabla",()=>
    {
        let dataBase = new connect()

        assert.ok(dataBase.tabla("test1") instanceof dbTabla,"no debe retornar un objecto dbTabl")


    })
    it("_syncModelColumns detecta columnas faltantes y ejecuta ALTER TABLE", async () => {
        let queriesExecuted = []
        class MockConnect extends connect {
            constructor() {
                super({}, "MYSQL_DB")
            }
            async query(sql) {
                queriesExecuted.push(sql)
                return []
            }
        }

        let db = new MockConnect()
        let m = new model("usuarios", [
            { name: "id", type: "int", primary: true },
            { name: "nombre", type: "varchar", len: 100 },
            { name: "edad", type: "int" }
        ])
        db.addModel(m)

        let initialKeys = {
            tabla: "usuarios",
            columns: [
                { name: "id", type: "int", primary: true },
                { name: "nombre", type: "varchar", len: 100 }
            ]
        }

        let updatedKeys = await db._syncModelColumns("usuarios", initialKeys)
        assert.equal(queriesExecuted.length, 1)
        assert.ok(queriesExecuted[0].includes("ALTER TABLE"))
        assert.ok(queriesExecuted[0].includes("ADD COLUMN"))
        assert.ok(queriesExecuted[0].includes("edad"))
        assert.equal(updatedKeys.columns.length, 3)
        assert.equal(updatedKeys.columns[2].name, "edad")
    })
    it("_syncModelColumns no ejecuta nada si autoMigrate es false", async () => {
        let queriesExecuted = []
        class MockConnect extends connect {
            constructor() {
                super({ autoMigrate: false }, "MYSQL_DB")
            }
            async query(sql) {
                queriesExecuted.push(sql)
                return []
            }
        }

        let db = new MockConnect()
        let m = new model("usuarios", [
            { name: "id", type: "int", primary: true },
            { name: "nombre", type: "varchar", len: 100 },
            { name: "edad", type: "int" }
        ])
        db.addModel(m)

        let initialKeys = {
            tabla: "usuarios",
            columns: [
                { name: "id", type: "int", primary: true }
            ]
        }

        let updatedKeys = await db._syncModelColumns("usuarios", initialKeys)
        assert.equal(queriesExecuted.length, 0)
        assert.equal(updatedKeys.columns.length, 1)
    })
})
