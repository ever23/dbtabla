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
    it("verificacion de tabla",()=>
    {
        let dataBase = new connect()

        assert.ok(dataBase.tabla("test1") instanceof dbTabla,"no debe retornar un objecto dbTabl")


    })
})
