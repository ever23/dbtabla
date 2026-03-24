const fs=require("fs")
const path=require("path")
const dbTablaModel=require("tabla-model")
const dbTabla=require(__dirname+"/dbTabla.js")
const procesingSql = require('./procesingSql')
/**
* Connect
* clase abstracta para crear la clase de conexion a la base de datos
*/
class Connect {
    #escapeChar;
    #reserveIdentifiers;
    #ar_aliased_tables;
    #dbprefix;
    #swap_pre;
    #information_schema;
    #models;
    #caheTablas;
    #createdTables;
    #escapeString;
    /**
    * constructor de la clase
    * @param {object} params - parametros de conexion
    */
    constructor(params,typeDB="")
    {
        this.config=params
        this.#escapeChar=""
        this.#reserveIdentifiers=["*"]
        this.#ar_aliased_tables=[]
        this.#dbprefix=""
        this.#swap_pre=""
        this.#information_schema = " "
        this.#models={}
        this.typeDB=typeDB
        this.#caheTablas={}
    }
    /**
    * retorna la configuracion para los helpers
    * @return {object}
    */
    helpersConf()
    {
        return {
            escapeChar:this.#escapeChar,
            reserveIdentifiers:this.#reserveIdentifiers,
            ar_aliased_tables:this.#ar_aliased_tables,
            dbprefix:this.#dbprefix,
            swap_pre:this.#swap_pre,
            typeDB:this.typeDB,
            escapeString:typeof this.#escapeString==="function"?e=>this.#escapeString(e):null
        }
    }
    /**
    * retorna el modelo asociado a la tabla
    * @param {string} tabla - nombre de la tabla
    * @return {dbTablaModel|boolean} - si el modelo  no existe retorna false
    */
    model(tabla)
    {

        return this.#models[tabla] instanceof dbTablaModel?this.#models[tabla]:false
    }
    /**
    * agrega un modelo a la lista de modelos interna
    * @param {sqlModel|object|string} model - objeto modelo
    */
    addModel(model)
    {
        if(model instanceof dbTablaModel)
        {
            this.#models[model.tabla]=model
        }else if(typeof model==="object" && model!==null){
            this.#models[model.tabla]= new dbTablaModel(model.tabla,model)
        }else {
            this.#models[model.tabla]= new dbTablaModel(model,this.helpersConf().escapeChar)
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
        if(typeof this.#caheTablas[tabla]!=="undefined")
        {
            typeof callback==="function"?callback(this.#caheTablas[tabla]):null
            return this.#caheTablas[tabla]
        }
        return this.#caheTablas[tabla] = new dbTabla({
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
    #keysInTable(table)
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
                
                    this.#createTable(this.model(tabla))
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
    #createTable(model)
    {
       
        return new Promise((res,rej)=>
        {
            this.#createdTables={}
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
                        this.#createdTables[model.tabla]=true
                        this.#initializeTable(model.tabla).then(()=>
                            {
                               
                                res(model.getData())
                            }).catch(rej)
                    }).catch(rej)
                }
            }
            rescursive(model.foreingKey(),0)
        })
    }
    #initializeTable(tab)
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
