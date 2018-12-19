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
                    autoinrement:true
                },
                {
                    name:"row2",
                    type:"text",
                },
                {
                    name:"row3",
                    type:"text",
                },
                {
                    name:"row4",
                    type:"text",
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
        assert.equal(typeof tabla.__join,"function")
        assert.equal(typeof tabla.__where,"function")
        assert.equal(typeof tabla.__having,"function")
        assert.equal(typeof tabla.select,"function")
        assert.equal(typeof tabla.insert,"function")
        assert.equal(typeof tabla.update,"function")
        assert.equal(typeof tabla.delete,"function")
        assert.equal(typeof tabla.busqueda,"function")

    })

    it("metodo __join",()=>
    {
        let tabla = new procesingSql(...config)
        let param={
            ">unatabla":"id_tabla",
            "<otratabla":"otra",
            "=tabla1":"uno",
            "tabla":"id",
            ">tabla_2":"tabla1.uno=tabla_2.id"
        }
        let result=[
            "LEFT JOIN `unatabla` USING(`id_tabla`)",
            "RIGHT JOIN `otratabla` USING(`otra`)",
            "INNERT JOIN `tabla1` USING(`uno`)",
            "NATURAL JOIN `tabla`",
            "LEFT JOIN `tabla_2` ON(`tabla1`.`uno`=tabla_2.id)"
        ]
        assert.deepEqual(tabla.__join(param),result)
        assert.deepEqual(tabla.__join({">unatabla":["id1","id2"]}),["LEFT JOIN `unatabla` USING(`id1`,`id2`)"])

    })
    it("metodo __where",()=>
    {
        let tabla = new procesingSql(...config)
        let result1="WHERE id='12a' and id2=3"
        let result2="WHERE `id`='12a' AND `id2`=3"
        assert.equal(tabla.__where("id='12a' and id2=3"),result1)
        assert.equal(tabla.__where({id:"12a","id2":3}),result2)

    })
    it("metodo __having",()=>
    {
        let tabla = new procesingSql(...config)

        let result1="HAVING id='12a' and id2=3"
        let result2="HAVING `id`='12a' AND `id2`=3"

        assert.equal(tabla.__having("id='12a' and id2=3"),result1)
        assert.equal(tabla.__having({id:"12a","id2":3}),result2)


    })
    it("metodo __groupBy",()=>
    {
        let tabla = new procesingSql(...config)
        let result1="GROUP BY id"
        assert.equal(tabla.__groupBy("id"),result1)
        assert.equal(tabla.__groupBy("  group   by   id"),result1)
        assert.equal(tabla.__groupBy(["id"]),result1)
    })
    it("metodo __orderBy",()=>
    {
        let tabla = new procesingSql(...config)
        let result1="ORDER BY id"
        assert.equal(tabla.__orderBy("id"),result1)
        assert.equal(tabla.__orderBy("  order   by   id"),result1)
        assert.equal(tabla.__orderBy(["id"]),result1)
    })
    it("metodo __limit",()=>
    {
        let tabla = new procesingSql(...config)
        let result1="LIMIT 1"
        assert.equal(tabla.__limit(1),result1)
        assert.equal(tabla.__limit("1"),result1)
        assert.equal(tabla.__limit("  limit   1"),result1)
    })
    it("metodo __resolveParamsSelect",()=>
    {
        let tabla = new procesingSql(...config)


        assert.deepEqual(tabla.__resolveParamsSelect(),{
            campos:undefined,//campos
            joins:undefined,//join
            where:undefined,//where
            group:undefined,//group
            having:undefined,//having
            order:undefined,//order
            limit:undefined//limit
        })
        assert.deepEqual(tabla.__resolveParamsSelect({">a":"id"}),{
            campos:undefined,//campos
            joins:{">a":"id"},//join
            where:undefined,//where
            group:undefined,//group
            having:undefined,//having
            order:undefined,//order
            limit:undefined//limit
        })
        assert.deepEqual(tabla.__resolveParamsSelect("a='v'"),{
            campos:undefined,//campos
            joins:undefined,//join
            where:"a='v'",//where
            group:undefined,//group
            having:undefined,//having
            order:undefined,//order
            limit:undefined//limit
        })
        assert.deepEqual(tabla.__resolveParamsSelect("group by id"),{
            campos:undefined,//campos
            joins:undefined,//join
            where:undefined,//where
            group:"group by id",//group
            having:undefined,//having
            order:undefined,//order
            limit:undefined//limit
        })
        assert.deepEqual(tabla.__resolveParamsSelect("having id=1"),{
            campos:undefined,//campos
            joins:undefined,//join
            where:undefined,//where
            group:undefined,//group
            having:"having id=1",//having
            order:undefined,//order
            limit:undefined//limit
        })
        assert.deepEqual(tabla.__resolveParamsSelect("order by id"),{
            campos:undefined,//campos
            joins:undefined,//join
            where:undefined,//where
            group:undefined,//group
            having:undefined,//having
            order:"order by id",//order
            limit:undefined//limit
        })
        assert.deepEqual(tabla.__resolveParamsSelect("limit 1"),{
            campos:undefined,//campos
            joins:undefined,//join
            where:undefined,//where
            group:undefined,//group
            having:undefined,//having
            order:undefined,//order
            limit:"limit 1"//limit
        })
        assert.deepEqual(tabla.__resolveParamsSelect(["a","b"],{">a":"id"}),{
            campos:["a","b"],//campos
            joins:{">a":"id"},//join
            where:undefined,//where
            group:undefined,//group
            having:undefined,//having
            order:undefined,//order
            limit:undefined//limit
        })
        assert.deepEqual(tabla.__resolveParamsSelect(["a","b"],"group by id",{"id":1}),{
            campos:["a","b"],//campos
            joins:undefined,//join
            where:undefined,//where
            group:"group by id",//group
            having:{"id":1},//having
            order:undefined,//order
            limit:undefined//limit
        })
        assert.deepEqual(tabla.__resolveParamsSelect(["a","b"],{">a":"id"},2),{
            campos:["a","b"],//campos
            joins:{">a":"id"},//join
            where:undefined,//where
            group:undefined,//group
            having:undefined,//having
            order:undefined,//order
            limit:2//limit
        })
        assert.deepEqual(tabla.__resolveParamsSelect({campos:['a','b']}),{
            campos:["a","b"],//campos
            joins:undefined,//join
            where:undefined,//where
            group:undefined,//group
            having:undefined,//having
            order:undefined,//order
            limit:undefined//limit
        })
        

    })
    it("metodo __campoBusqueda",()=>
    {
        let tabla = new procesingSql(...config)
        let value="(`row1` is NOT NULL AND `row1` like '%cadena otra%')+(`row1` is NOT NULL AND `row1` like 'cadena otra%')+"
        value+="(`row2` is NOT NULL AND `row2` like '%cadena otra%')+(`row2` is NOT NULL AND `row2` like 'cadena otra%')+"
        value+="(`row1` is NOT NULL AND `row1` like '%cadena%') + (`row1` is NOT NULL AND `row1` like 'cadena%')+"
        value+="(`row2` is NOT NULL AND `row2` like '%cadena%') + (`row2` is NOT NULL AND `row2` like 'cadena%')+"
        value+="(`row1` is NOT NULL AND `row1` like '%otra%') + (`row1` is NOT NULL AND `row1` like 'otra%')+"
        value+="(`row2` is NOT NULL AND `row2` like '%otra%') + (`row2` is NOT NULL AND `row2` like 'otra%')+"
        value+="((CONCAT(IF(`row1` IS NOT NULL,`row1`,' '),' ',IF(`row2` IS NOT NULL,`row2`,' '),' ','') like '%cadena otra' )+1)"
        assert.deepEqual(tabla.__campoBusqueda('cadena otra',['row1','row2']),value)

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
        assert.equal(tabla.insert({row1:"a",row2:2,row4:undefined,row3:"b"}),"INSERT INTO `unatabla` (`row1`,`row2`,`row3`,`row4`) VALUES ('a',2,'b',NULL);","object")

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
