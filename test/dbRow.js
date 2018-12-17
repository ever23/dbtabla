const assert= require("assert")
const dbRow= require("../lib/dbRow.js")
const dbTabla= require("../lib/dbTabla.js")
const connect = require("../lib/Connect")
describe("Test de la clase dbRow",()=>
{
    let config={
        escapeChar:"`",
        escapeString:e=>e
    }
    it("verificacion de metodos",()=>
    {
        let row = new dbRow(new dbTabla({tabla:'test1',connection:new connect({},"")}),{row1:1,row2:"row"})
        assert.equal(typeof row.constructor,"function")
        assert.equal(typeof row.insert,"function")
        assert.equal(typeof row.update,"function")
        assert.equal(typeof row.delete,"function")



    })
})
