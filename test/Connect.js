const assert= require("assert")
const {connect}= require("../index.js")
const model = require("sql-model")
const dbTabla= require("../index.js")
//const dbTabla= require("../lib/dbTabla.js")

describe("Test de la clase Connect",()=>
{
    it("verificacion de metodos",()=>
    {
        let dataBase = new connect()
        assert.equal(typeof dataBase.addModel,"function")
        assert.equal(typeof dataBase.pathModels,"function")
        assert.equal(typeof dataBase.model,"function")
        assert.equal(typeof dataBase.tabla,"function")

    })
    it("verificacion de modelos",()=>
    {
        let dataBase = new connect()
        dataBase.pathModels(__dirname+"/model")
        assert.ok(dataBase.model("test1"),"no debe retornar false")
        assert.ok(dataBase.model("test2") instanceof model,"no es un modelo")
        assert.equal(dataBase.model("nomodel"),false,"debe retornar false")
    })
    it("verificacion de tabla",()=>
    {
        let dataBase = new connect()

        assert.ok(dataBase.tabla("test1") instanceof dbTabla,"no debe retornar un objecto dbTabl")


    })
})
