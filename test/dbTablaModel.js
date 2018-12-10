const assert= require("assert")
const {model}= require("../index.js")
//const dbTabla= require("../lib/dbTabla.js")

describe("Test de la clase dbTablaModel",()=>
{
     it("verificacion de modelos",()=>
     {
        let test1=new model("test1",[
            {
                name:"id",
                type:"int",
                defaultNull:false,
                prymary:true,
            },
            {
                name:"row1",
                type:"text",
                defaultNull:false,
            }
        ])

        assert.equal(typeof test1.colum,"function")
        assert.equal(typeof test1.foreingKey,"function")
        assert.equal(typeof test1.init,"function")
        assert.equal(typeof test1.keys,"function")
     })
    it("metodo keys",()=>
    {
        let test1=new model("test1",[
            {
                name:"id",
                type:"int",
                autoincrement:true,
                prymary:true,
            },
            {
                name:"row1",
                type:"text",
                defaultNull:false,
            }
        ])
        assert.deepEqual(test1.keys(),{
            colum:{
                id:{
                    Type:"int",
                    TypeName : "",
                    KEY : "",
                    Extra :"",
                    Default :  "",
                    Nullable : false,
                    Position : "0"
                },
                row1:{
                    Type:"text",
                    TypeName : "",
                    KEY : "",
                    Extra :"",
                    Default :  "",
                    Nullable : false,
                    Position : "1"
                }
            },
            primary:["id"],
            autoincrement:"id",
            OrderColum:{"0":"id","1":"row1"}

        })


    })

})
