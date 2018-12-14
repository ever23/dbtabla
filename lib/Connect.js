const fs=require("fs")
const path=require("path")
const dbTablaModel=require("sql-model")
const dbTabla=require(__dirname+"/dbTabla.js")
/**
* Connect 
* clase abstracta para crear la clase de coneccion a la base de datos
*/

class Connect
{
    /**
    * constructor de la clase
    * @param {object} params - parametros de coneccion
    */
    constructor(params,typeDB)
    {
        this.config=params
        this.conection=null
        this.__escapeChar=""
        this.__reserveIdentifiers=["*"]
        this.__ar_aliased_tables=[]
        this.__dbprefix=""
        this.__swap_pre=""
        this.__information_schema = " "
        this.__models={}
        this.typeDB=typeDB
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
            escapeString:e=>this.__escapeString(e)
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
    * @param {dbTablaModel} model - objeto modelo
    */
    addModel(model)
    {
        this.__models[model.tabla]=model
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
                
                this.addModel(require(path.join(pathModel,files[i])))
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
        return query
    }
    /**
    * construlle un objeto dbtabla asociado a el nombre
    * de la tabla del primer parametro
    * @param {string} tabla - nombre de la tabla en la base de datos
    * @param {function} callback - funcion anomina que se ejecutara cuando se verifique la existencia de la tabla
    * @param {boolean} re - indicara si se verificara la existencia de la tabla o se esperara a la primera consulta
    * @return {dbTabla}
    */
    tabla(tabla,callback,ret=false)
    {

        return new dbTabla({
            tabla:tabla,
            conection:this,
            callback:callback,
            config:this.helpersConf()
        },ret)
        //console.log(config)

    }
    /**
    * metodo abstracto que escapara el texto sql
    * @param {string} str - texto
    * @return {string}
    */
    __escapeString(str)
    {
        return str
    }
    
    /**
    * verifica si la tabla esta representada en un modelo
    * si el parametro create es true se intentara crear la tabla 
    * e inicializarla 
    * 
    * @param {string} table - nombre de la tabla
    * @param {function} callback - funcion a ejecutar cuando se obtengan los metadatos
    * @param {boolean} create - existencia en la base de datos
    * 
    * @return {boolean}
    */
    inModel(table,callback,create)
    {
      
        if(!this.model(table))
            return false
        if(create)
        {
            this.__createTable(this.model(table),callback)
        }else
        {
            callback(this.model(table).getData())
        }
        return true
        
    }
    /**
    * metodo abstracto que verificara la existencia de la tabla
    * en la base de datos y pasara lo metadatos de la misma calback en
    * el segundo parametro
    *   callback({
    *        tabla:{string} - nombre de la tabla
    *        colums:{array} - columnas de la tabla 
    *       })
    * @param {string} table - nombre de la tabla
    * @param {function} callback - funcion a ejecutar cuando se obtengan los metadatos
    */
    __keysInTable(table,callback)
    {
        callback(table)
    }
    /**
    * crea una tabla en la base de datos apartir de un modelo 
    * si la tabla tiene claves foraneas intentara crear primero 
    * las tablas a las que apuntan
    * @param {dbTablaModel} model - objeto del modelo
    * @param {function} callback - funcion a ejecutar cuando se completa la operacion
    */
    __createTable(model,callback)
    {
        this.__createdTables={}
        let rescursive=(foreingKey,i)=>
        {
            if(foreingKey[i]!==undefined)
            {
                this.tabla(foreingKey[i].reference,(t)=>
                {
                    if(this.__createdTables[foreingKey[i].reference])
                        this.__initializeTable(t,()=>
                        {
                            i++
                            rescursive(foreingKey,i)
                        })
                },true)
            }else {
                this.query(model.sql(this)).then(()=>{
                    this.__createdTables[model.tabla]=true
                    callback(model.getData())
                }).catch(e=>{throw e})
            }

        }
        rescursive(model.foreingKey(),0)
    }
    __initializeTable(tab,callback)
    {
        let init=this.model(tab.tabla).getData().init
        if(init.length<1)
        {
            return callback()
        }
        let rescursiveInitialize=(i)=>
        {
            if(init[i]!==undefined)
            {
                //console.log(init[i])
                tab.insert(init[i]).then(()=>
                {
                    i++
                    rescursiveInitialize(i)
                }).catch(e=>
                {
                    throw e
                })
            }else
            {
                callback()
            }
        }
        rescursiveInitialize(0)
    }
}
module.exports=Connect
