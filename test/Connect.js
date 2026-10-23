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

    describe("db.transaction() y contexto transaccional aislado", () => {
        class MockPoolConnect extends connect {
            constructor() {
                super({}, "mysql")
                this.poolConnections = [{ id: "conn_1" }, { id: "conn_2" }]
                this.activeConnections = []
                this.releasedConnections = []
                this.queriesExecuted = []
            }
            async _acquireDedicatedConnection() {
                const conn = this.poolConnections.shift() || { id: "conn_extra" }
                this.activeConnections.push(conn)
                return conn
            }
            async _releaseDedicatedConnection(conn) {
                this.releasedConnections.push(conn)
                this.activeConnections = this.activeConnections.filter(c => c !== conn)
            }
            _queryOnConnection(conn, sql) {
                this.queriesExecuted.push({ connId: conn.id, sql })
                return Promise.resolve({ ok: true })
            }
        }

        it("ejecuta commit automático y libera la conexión tras finalizar con éxito", async () => {
            const db = new MockPoolConnect()
            const result = await db.transaction(async (tx) => {
                await tx.query("INSERT INTO usuarios VALUES (1, 'Juan')")
                return { status: "ok", code: 200 }
            })

            assert.deepEqual(result, { status: "ok", code: 200 })
            assert.equal(db.queriesExecuted.length, 3)
            assert.equal(db.queriesExecuted[0].sql, "START TRANSACTION")
            assert.equal(db.queriesExecuted[1].sql, "INSERT INTO usuarios VALUES (1, 'Juan')")
            assert.equal(db.queriesExecuted[2].sql, "COMMIT")
            assert.equal(db.releasedConnections.length, 1)
            assert.equal(db.releasedConnections[0].id, "conn_1")
            assert.equal(db.activeConnections.length, 0)
        })

        it("ejecuta rollback automático y libera la conexión si ocurre un error", async () => {
            const db = new MockPoolConnect()
            let errorCaught = null

            try {
                await db.transaction(async (tx) => {
                    await tx.query("INSERT INTO usuarios VALUES (2, 'Maria')")
                    throw new Error("Fallo de validación de negocio")
                })
            } catch (err) {
                errorCaught = err
            }

            assert.ok(errorCaught)
            assert.equal(errorCaught.message, "Fallo de validación de negocio")
            assert.equal(db.queriesExecuted.length, 3)
            assert.equal(db.queriesExecuted[0].sql, "START TRANSACTION")
            assert.equal(db.queriesExecuted[1].sql, "INSERT INTO usuarios VALUES (2, 'Maria')")
            assert.equal(db.queriesExecuted[2].sql, "ROLLBACK")
            assert.equal(db.releasedConnections.length, 1)
            assert.equal(db.releasedConnections[0].id, "conn_1")
            assert.equal(db.activeConnections.length, 0)
        })

        it("soporta transacciones anidadas con SAVEPOINT y RELEASE SAVEPOINT", async () => {
            const db = new MockPoolConnect()
            await db.transaction(async (tx) => {
                await tx.query("UPDATE cuenta SET saldo = saldo - 100")

                await tx.transaction(async (nestedTx) => {
                    await nestedTx.query("INSERT INTO auditoria VALUES ('cargo realizado')")
                })

                await tx.query("UPDATE destino SET saldo = saldo + 100")
            })

            const sqlList = db.queriesExecuted.map(q => q.sql)
            assert.deepEqual(sqlList, [
                "START TRANSACTION",
                "UPDATE cuenta SET saldo = saldo - 100",
                "SAVEPOINT sp_1",
                "INSERT INTO auditoria VALUES ('cargo realizado')",
                "RELEASE SAVEPOINT sp_1",
                "UPDATE destino SET saldo = saldo + 100",
                "COMMIT"
            ])
            // Toda la transacción anidada debe haberse ejecutado con la misma conexión conn_1
            assert.ok(db.queriesExecuted.every(q => q.connId === "conn_1"))
            assert.equal(db.releasedConnections.length, 1)
        })

        it("revierte a SAVEPOINT en caso de fallo dentro de transacción anidada y continúa la externa", async () => {
            const db = new MockPoolConnect()
            await db.transaction(async (tx) => {
                await tx.query("INSERT INTO paso1 VALUES (1)")

                try {
                    await tx.transaction(async (nestedTx) => {
                        await nestedTx.query("INSERT INTO paso2_opcional VALUES (2)")
                        throw new Error("Error opcional ignorado")
                    })
                } catch (e) {
                    // Manejo del error opcional
                }

                await tx.query("INSERT INTO paso3_final VALUES (3)")
            })

            const sqlList = db.queriesExecuted.map(q => q.sql)
            assert.deepEqual(sqlList, [
                "START TRANSACTION",
                "INSERT INTO paso1 VALUES (1)",
                "SAVEPOINT sp_1",
                "INSERT INTO paso2_opcional VALUES (2)",
                "ROLLBACK TO SAVEPOINT sp_1",
                "INSERT INTO paso3_final VALUES (3)",
                "COMMIT"
            ])
        })

        it("lanza error informativo si se intenta llamar a tx.commit() o tx.rollback() manualmente", async () => {
            const db = new MockPoolConnect()
            await db.transaction(async (tx) => {
                await assert.rejects(async () => {
                    await tx.commit()
                }, /No debe llamar a tx\.commit\(\)/)

                await assert.rejects(async () => {
                    await tx.rollback()
                }, /No debe llamar a tx\.rollback\(\)/)

                await assert.rejects(async () => {
                    await tx.beginTransaction()
                }, /No debe llamar a tx\.beginTransaction\(\)/)
            })
        })
    })
})
