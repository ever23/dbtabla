const fs=require("fs")
const path=require("path")
const dbTablaModel=require("tabla-model")
const dbTabla=require(__dirname+"/dbTabla.js")
const procesingSql = require('./procesingSql')
/**
* Connect
* clase abstracta para crear la clase de conexion a la base de datos
*/
class Connect
{
    /**
    * constructor de la clase
    * @param {object} params - parametros de conexion
    */
    constructor(params,typeDB="")
    {
        this.config=params
        this.__escapeChar=""
        this.__reserveIdentifiers=["*"]
        this.__ar_aliased_tables=[]
        this.__dbprefix=""
        this.__swap_pre=""
        this.__information_schema = " "
        this.__models={}
        this.typeDB=typeDB
        this.__caheTablas={}
    }
    /**
    * retorna la configuracion para los helpers
    * @return {object}
    */
    helpersConf()
    {
        return {
            escapeChar:this.__escapeChar,
            reserveIdentifiers:this.__reserveIdentifiers,
            ar_aliased_tables:this.__ar_aliased_tables,
            dbprefix:this.__dbprefix,
            swap_pre:this.__swap_pre,
            typeDB:this.typeDB,
            escapeString:typeof this.__escapeString==="function"?e=>this.__escapeString(e):null
        }
    }
    /**
    * retorna el modelo asociado a la tabla
    * @param {string} tabla - nombre de la tabla
    * @return {dbTablaModel|boolean} - si el modelo  no existe retorna false
    */
    model(tabla)
    {

        return this.__models[tabla] instanceof dbTablaModel?this.__models[tabla]:false
    }
    /**
    * agrega un modelo a la lista de modelos interna
    * @param {sqlModel|object|string} model - objeto modelo
    */
    addModel(model)
    {
        if(model instanceof dbTablaModel)
        {
            this.__models[model.tabla]=model
        }else if(typeof model==="object" && model!==null){
            this.__models[model.tabla]= new dbTablaModel(model.tabla,model)
        }else {
            this.__models[model.tabla]= new dbTablaModel(model,this.helpersConf().escapeChar)
        }

    }
    /**
    * agrega todos los modelos existentes en un directorio a la lista interna
    * @param {string} pathModel - directorio de modelos
    */
    pathModels(pathModel)
    {
        let files=fs.readdirSync(pathModel)
        for(let i in files)
        {

            if(/(\.js)$/i.test(files[i]))
            {
                let model=require(path.join(pathModel,files[i]))
                if(model instanceof dbTablaModel)
                {
                    this.addModel(model)
                }

            }

        }

    }
    /**
    * metodo abstracto en su redefinicion debere generar una
    * consulta a la base de datos y debe retornar una promesa
    * @param {string} query - consulta sql
    * @return {Promise}
    */
    query(query)
    {
        return new Promise((res)=>
        {
            res(query)
        })
    }
    /**
    * construlle un objeto dbtabla asociado a el nombre
    * de la tabla del primer parametro
    * @param {string} tabla - nombre de la tabla en la base de datos
    * @param {function} callback - funcion anomina que se ejecutara cuando se verifique la existencia de la tabla
    * @param {boolean} verify - indicara si se verificara la existencia de la tabla o se esperara a la primera consulta
    * @return {dbTabla}
    */
    tabla(tabla,callback,verify=false)
    {
        if(typeof this.__caheTablas[tabla]!=="undefined")
        {
            typeof callback==="function"?callback(this.__caheTablas[tabla]):null
            return this.__caheTablas[tabla]
        }
        return this.__caheTablas[tabla] = new dbTabla({
            tabla:tabla,
            connection:this,
            callback:callback,
            config:this.helpersConf()
        },verify)
        //console.log(config)

    }
    /**
    * metodo abstracto que escapara el texto sql
    * @param {string} str - texto
    * @return {string}
    */
    /*__escapeString(str)
    {
        return str
    }*/


    /**
    * metodo abstracto que verificara la existencia de la tabla
    * en la base de datos y retornar una promesa
    * el valor de la promesa debe ser en el siguiente formato
    * {
    *   tabla:{string} - nombre de la tabla
    *   colums:{array} - columnas de la tabla
    * }
    * @param {string} table - nombre de la tabla
    * @return {Promise}
    */
    __keysInTable(table)
    {
        return new Promise((res)=>
        {
            res({
                tabla:table,
                colums:[]
            })
        })
    }
    /**
    * Verifica si la tabla esta representada en un modelo si el parametro create es true
    * se intentara crear la tabla e inicializarla retorna una promesa si no existe el modelo
    * lanzara un catch
    *
    * @param {string} tabla - nombre de la tabla
    * @param {boolean} create - existencia en la base de datos
    * @return {Promise}
    */
    inModel(tabla,create)
    {
        return new Promise((res,rej)=>{
            if(!this.model(tabla))
            {
                rej()
            }else
            {
                
                if(create)
                {
                
                    this.__createTable(this.model(tabla))
                        .then(res).catch(rej)
                }else
                {
                    res(this.model(tabla).getData())
                }
            }
        })
    }
    /**
    * crea una tabla en la base de datos apartir de un modelo
    * si la tabla tiene claves foraneas intentara crear primero
    * las tablas a las que apuntan
    * @param {dbTablaModel} model - objeto del modelo
    * @return {Promise}
    */
    __createTable(model)
    {
       
        return new Promise((res,rej)=>
        {
            this.__createdTables={}
            let rescursive=(foreingKey,i)=>
            {
                
                if(foreingKey[i]!==undefined)
                {
                    try
                    {
                        this.tabla(foreingKey[i].reference,(t)=>
                        {
                            rescursive(foreingKey,++i) 
                        },true)
                    }catch(e){rej(e)}
                }else {
                    
                    this.query(model.sql(this)).then(()=>{
                        this.__createdTables[model.tabla]=true
                        this.__initializeTable(model.tabla).then(()=>
                            {
                               
                                res(model.getData())
                            }).catch(rej)
                    }).catch(rej)
                }
            }
            rescursive(model.foreingKey(),0)
        })
    }
    __initializeTable(tab)
    {
        return new Promise(async(res)=>
        {
            
            let sql=new procesingSql(this.model(tab).getData(),this.helpersConf())
            let init=this.model(tab).getData().init
            
            if(init.length<1)
            {
                return res()
            }
            for(let item of init)
            {
                await this.query(sql.insert(item))
            }
            res()

        })

    }
}
module.exports=Connect
