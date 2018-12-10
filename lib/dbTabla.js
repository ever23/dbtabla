const dbResult= require("./dbResult")
const procesingSql = require("./procesingSql")

/**
* dbTabla
* representacion de una tabla en la base de datos
*/
class dbTabla
{
    /**
    * @param {object} tabla, conection, callback,  config
    * @param {boolean} ret indica si verificara la existencia de la tabla o esperara la primera consulta
    */
    constructor({tabla,conection,callback,config},ret=false)
    {

        this.__conection=conection
        this.__lastSql=""
        this.__keys=false
        this.tabla=tabla || null
        this.__callbackKey=callback ||( e=>e)
        this.__config=config || {}
        this.typeDB=this.__conection.typeDB
        if(ret)
            this.__verifyKeys()
    }
    /**
    * verifica la existencia de la tabla y obtiene los metadatos
    * @param {function} call
    */
    __verifyKeys(call=e=>e)
    {
        if(!this.__keys)
        {

            this.__conection.__keysInTable(this.tabla,(keys)=>
            {
                this.colum=keys.colum
                this.primary=keys.primary
                this.autoinrement=keys.autoinrement
                this.SqlIdent=keys.SqlIdent
                this.OrderColum=keys.OrderColum

                this.sql=new procesingSql(this.tabla,keys, this.__config)
                this.__keys=true
                this.__callbackKey(this)

                call()
            })

        }else {
            call()
        }
    }
    __formatResult(result)
    {
        return new dbResult(this,result)
    }

    busqueda(cadena,campo_bus,campos,where,joins,group,having,order,limit)
    {
        return new Promise((resolve,reject)=>
        {
            this.__verifyKeys(()=>
            {
                this.__lastSql = this.sql.busqueda(cadena,campo_bus,campos,where,joins,group,having,order,limit)
                this.__conection.query(this.__lastSql).then(d=>{
                    resolve(this.__formatResult(d))
                }).catch(e=>reject(e))
            })

        })
    }
    select(campos,where,joins,group,having,order,limit)
    {
        return new Promise((resolve,reject)=>
        {
            this.__verifyKeys(()=>
            {
                this.__lastSql = this.sql.select(campos,where,joins,group,having,order,limit)
                this.__conection.query(this.__lastSql).then(d=>{
                    resolve(this.__formatResult(d))
                }).catch(e=>reject(e))
            })

        })
    }
    /**
    * envia una sentencia insert a la base de datos
    * @param {array|object|string} ...campos - campos a insertar
    * @retuen {string}
    */
    insert(...params)
    {
        return new Promise((resolve,reject)=>
        {
            if(params.length===0)
                return reject("debe pasar almenos un parametro ")

            this.__verifyKeys(()=>
            {
                if(params instanceof Array && params.length==1)
                {
                    this.__lastSql=this.sql.insert(params[0])
                }else {
                    this.__lastSql=this.sql.insert(params)
                }
                this.__conection.query(this.__lastSql).then(d=>{

                    resolve(this.__PropertyOk(d))
                }).catch(e=>reject(e))
            })
        })
    }
    /**
    * envia una sentencia update en la base de datos
    * @param {object} sets - elementos a modificar
    * @param {string|object} where - exprecion booleana sql
    * @return {string}
    */
    update(sets,where)
    {
        return new Promise((resolve,reject)=>
        {
            this.__verifyKeys(()=>
            {
                this.__lastSql =this.sql.update(sets,where,reject)
                if(  this.__lastSql)
                {
                    this.__conection.query(this.__lastSql).then(d=>{

                        resolve(this.__PropertyOk(d))
                    }).catch(e=>reject(e))
                }
            })
        })
    }
    /**
    * genera una sentencia sql delete en la base de datos
    * @param {string|object} where - exprecion booleana sql
    * @return {string} - sentencia sql
    */
    delete(where)
    {
        return new Promise((resolve,reject)=>
        {
            this.__verifyKeys(()=>
            {
                if(typeof where ===undefined)
                    return reject("no se aha establecido el parametro where ")
                this.__lastSql =this.sql.delete(where)
                this.__conection.query(this.__lastSql).then(d=>{

                    resolve(this.__PropertyOk(d))
                }).catch(e=>reject(e))
            })
        })
    }
    /**
    * agrega la propiedad $sql que continen
    * el sql de la ultima consulta al objeto pasado
    * @param {object}
    * @return {object}
    */
    __PropertyOk(ok)
    {
        Object.defineProperty(ok, "$sql", {
            configurable : true,
            enumerable   : false,
            value        : this.__lastSql,
        })

        return ok
    }
}

module.exports=dbTabla
