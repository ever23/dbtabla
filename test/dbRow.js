const assert= require("assert")
const dbRow= require("../lib/dbRow.js")
const dbTabla= require("../lib/dbTabla.js")
const connect = require("../lib/Connect")
class testConnect extends connect {
    __keysInTable(table)
    {
        return new Promise((res)=>
        {
            res({
                tabla:table,
                colums:[
                    {
                        name:"id",
                        type:"int",
                        primary:true,
                    },
                    {
                        name:"col1",
                        type:"int"

                    },
                    {
                        name:"col2",
                        type:"text"
                    }
                ]
            })
        })
    }
}
class test2Connect extends connect {
    __keysInTable(table)
    {
        return new Promise((res)=>
        {
            res({
                tabla:table,
                colums:[
                    {
                        name:"id",
                        type:"int",

                    },
                    {
                        name:"col1",
                        type:"int"

                    },
                    {
                        name:"col2",
                        type:"text"
                    }
                ]
            })
        })
    }
}
describe("Test de la clase dbRow",()=>
{
    let config={
        escapeChar:"`",
        escapeString:e=>e
    }
    it("verificacion de metodos",()=>
    {
        let row = new dbRow(new dbTabla({tabla:'test1',connection:new connect({},"")}),{col1:1,col2:"row"})
        assert.equal(typeof row.constructor,"function")
        assert.equal(typeof row.insert,"function")
        assert.equal(typeof row.update,"function")
        assert.equal(typeof row.delete,"function")
    })
    it("metodo update",()=>
    {
        return new Promise((res,rej)=>
        {

            let tabla=new dbTabla({tabla:'test1',connection:new testConnect({},""),callback:tab=>
            {
                 let row = new dbRow(tab,{id:1,col1:234,col2:"row"})
                 row.col1=2343
                 row.update().then(res).catch(rej)
            }},true)



        }).then(sql=>
        {
            assert.equal(sql,"UPDATE test1 SET col1=2343 WHERE id=1;")
        })

    })
    it("metodo update sin claves primarias",()=>
    {
        return new Promise((res,rej)=>
        {

            let tabla=new dbTabla({tabla:'test1',connection:new test2Connect({},""),callback:tab=>
            {
                 let row = new dbRow(tab,{id:1,col1:234,col2:"row"})
                 row.col1=2343
                 row.update().then(res).catch(rej)
            }},true)
        }).then(sql=>
        {
            assert.equal(sql,"UPDATE test1 SET col1=2343 WHERE id=1 AND col1=234 AND col2='row';")
        })

    })
    it("metodo delete",()=>
    {
        return new Promise((res,rej)=>
        {
            let tabla=new dbTabla({tabla:'test1',connection:new testConnect({},""),callback:tab=>
            {
                 let row = new dbRow(tab,{id:1,col1:234,col2:"row"})
                 row.delete().then(res).catch(rej)
            }},true)
        }).then(sql=>
        {
            assert.equal(sql,"DELETE FROM test1 WHERE id=1;")
        })
    })
    it("metodo delete sin claves primarias",()=>
    {
        return new Promise((res,rej)=>
        {
            let tabla=new dbTabla({tabla:'test1',connection:new test2Connect({},""),callback:tab=>
            {
                 let row = new dbRow(tab,{id:1,col1:234,col2:"row"})
                 row.delete().then(res).catch(rej)
            }},true)
        }).then(sql=>
        {
            assert.equal(sql,"DELETE FROM test1 WHERE id=1 AND col1=234 AND col2='row';")
        })

    })
})
