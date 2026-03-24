const { describe, it } = require('node:test');
const assert= require("assert")
const Connect= require("../lib/Connect.js")
const procesingSql= require("../lib/procesingSql.js")
describe("Test de la clase prosessingSql",()=>{
    const DB= new Connect({
        host     : "localhost",
        user     : "root",
    })
    let config=
    [
        
        {
            tabla:"unatabla",
            colums:[
                {
                    name:"row1",
                    type:"int",
                    prymary:true,
                    autoincrement:true
                },
                {
                    name:"row2",
                    type:"text",
                },
                {
                    name:"row3",
                    type:"text",
                    defaultNull:true
                },
                {
                    name:"row4",
                    type:"text",
                    default:"'mi texto default'"
                }

            ]
        },
        {
            escapeChar:"`",
        }
    ]
    it("verificacion de metodos",()=>
    {
        let tabla = new procesingSql(...config)
        assert.equal(typeof tabla.select,"function")
        assert.equal(typeof tabla.insert,"function")
        assert.equal(typeof tabla.update,"function")
        assert.equal(typeof tabla.delete,"function")
        assert.equal(typeof tabla.busqueda,"function")

    })
    it("metodo busqueda",()=>
    {
        let tabla = new procesingSql(...config)
        let value="(`row1` is NOT NULL AND `row1` like '%cadena otra%')+(`row1` is NOT NULL AND `row1` like 'cadena otra%')+"
        value+="(`row2` is NOT NULL AND `row2` like '%cadena otra%')+(`row2` is NOT NULL AND `row2` like 'cadena otra%')+"
        value+="(`row1` is NOT NULL AND `row1` like '%cadena%') + (`row1` is NOT NULL AND `row1` like 'cadena%')+"
        value+="(`row2` is NOT NULL AND `row2` like '%cadena%') + (`row2` is NOT NULL AND `row2` like 'cadena%')+"
        value+="(`row1` is NOT NULL AND `row1` like '%otra%') + (`row1` is NOT NULL AND `row1` like 'otra%')+"
        value+="(`row2` is NOT NULL AND `row2` like '%otra%') + (`row2` is NOT NULL AND `row2` like 'otra%')+"
        value+="((CONCAT(IF(`row1` IS NOT NULL,`row1`,' '),' ',IF(`row2` IS NOT NULL,`row2`,' '),' ','') like '%cadena otra' )+1)"
        let sql = "SELECT ("+value+") as `puntaje_busqueda`,`unatabla`.* FROM `unatabla` WHERE (row3='a') AND ("+value+")>1 ORDER BY puntaje_busqueda DESC;"
        assert.deepEqual(tabla.busqueda('cadena otra',['row1','row2'],"row3='a'"),sql)

    })
    it("metodo select",()=>
    {
        let tabla = new procesingSql(...config)
        assert.equal(tabla.select(),"SELECT `unatabla`.* FROM `unatabla`;")

    })


    it("metodo select",()=>
    {
        let tabla = new procesingSql(...config)
        assert.equal(tabla.select(["a","count(a) as c","b"]),"SELECT `a`,count(a) as `c`,`b` FROM `unatabla`;")

    })

    it("metodo insert",()=>
    {
        let tabla = new procesingSql(...config)
        assert.equal(tabla.insert(["a",2,"b",1]),"INSERT INTO `unatabla` (`row1`,`row2`,`row3`,`row4`) VALUES ('a',2,'b',1);","arrays")
        assert.equal(tabla.insert({row1:"a",row2:2,row4:undefined,row3:"b"}),"INSERT INTO `unatabla` (`row1`,`row2`,`row3`) VALUES ('a',2,'b');","object")
        assert.equal(tabla.insert([null,"a",null,"b"]),"INSERT INTO `unatabla` (`row2`,`row4`) VALUES ('a','b');","array null")
        assert.equal(tabla.insert({row1:"a",row2:2,row4:"b"}),"INSERT INTO `unatabla` (`row1`,`row2`,`row4`) VALUES ('a',2,'b');","array null")
        assert.equal(tabla.insert({row1:"a",row2:2,row3:"b"}),"INSERT INTO `unatabla` (`row1`,`row2`,`row3`) VALUES ('a',2,'b');","array null")

    })
    it("metodo update",()=>
    {
        let tabla = new procesingSql(...config)
        tabla.OrderColum=["row1","row2","row3"]
        let result1="UPDATE `unatabla` SET `row1`='a',`row2`=2,`row3`='b' WHERE row1='b';"
        let result2="UPDATE `unatabla` SET `row1`='a',`row2`=2,`row3`='b' WHERE `row1`='b';"
        assert.equal(tabla.update({row1:"a",row2:2,row3:"b"},"row1='b'"),result1)
        assert.equal(tabla.update({row1:"a",row2:2,row3:"b"},{row1:"b"}),result2)

    })
    it("metodo delete",()=>
    {
        let tabla = new procesingSql(...config)
        tabla.OrderColum=["row1","row2","row3"]
        let result1="DELETE FROM `unatabla` WHERE row1='b' and row2=1;"
        let result2="DELETE FROM `unatabla` WHERE `row1`='b' AND `row2`=1;"
        assert.equal(tabla.delete("row1='b' and row2=1"),result1)
        assert.equal(tabla.delete({row1:"b",row2:1}),result2)

    })


})
