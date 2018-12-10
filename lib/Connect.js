const fs=require("fs")
const path=require("path")
const dbTablaModel=require("./model/dbTablaModel")
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
    model(tabla)
    {
        return this.__models[tabla] instanceof dbTablaModel?this.__models[tabla]:false
    }
    addModel(model)
    {
        this.__models[model.tabla]=model
    }
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
    * metodo abstracto que verificara la existencia de la tabla
    * en la base de datos y pasara lo metadatos de la misma calback en
    * el segundo parametro
    *   callback({
    *        colum:{object} - los nombres de los atributos debe ser las colunas y el valor sus metadatos
    *        primary:{array} - claves primarias
    *        autoincrement:{string} - nombre de la clumna autoincrement
    *        OrderColum:{array},// nombre de las columnas en el orden en el que se encuentran en la tabla
    *        typeDB:{string} // tipo de base de datos los valores aceptados son las constantes MYSQL_DB, SQLITE_DB o POSGRESQL_DB
    *    })
    * @param {string} table - nombre de la tabla
    * @param {function} callback - funcion a ejecutar cuando se obtengan los metadatos
    */
    __keysInTable(table,callback)
    {
        callback(table)
    }
}
module.exports=Connect
