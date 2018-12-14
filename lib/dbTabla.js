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
                this.sql=new procesingSql(keys, this.__config)
                this.__keys=true
                if(keys.methods)
                    for(let i in keys.methods)
                    {
                        this[i]=(...params)=>keys.methods[i](this,...params)
                    }
                this.__callbackKey(this)

                call()
            })

        }else {
            call()
        }
    }
    /**
    * construlle el objeto de resultado para consultas select
    * @param {array|object} resultado obtenido de la consulta ejecutada
    * @return {dbResult}
    */
    __formatResult(result)
    {
        return new dbResult(this,result)
    }
    
    
    /**
    * envia una sentencia insert a la base de datos
    * @param {array|object|string} ...campos - campos a insertar
    * @retuen {Promise}
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
    * envia una sentencia select a la base de datos
    * @param {array|string} campos - campos de la tabla que se seleccionaran si es un 
    * string entonces se utilisara como la clausula where y todos los parametros se 
    * correran hacia la izquierda
    * @param {string|object} where - clausula where si es object se tomara como los joins 
    * y todos los parametros se correran hacia la izquierda desde este parametro se puede indicar 
    * explicitamente que clausula es y los parametros siguentes se correran hacia la izquierda 
    * segun la posicion del parametro indicado
    * ejemplo: <em>si en el parametro where se coloca grup by micampo entonces where sera tomado 
    * como group y group como having y asi sucesivamente   </em>
    * @param {object|string} joins - clausulas jois utilizando un object con las tablas que se
    * relacionaran ateponiendo los singnos <,>,= al nombre de la tabla foranea
    * < sera para left join
    * > sera para ringt join
    * = sera innert join
    * si no se antepone nada sera natural join
    * sera tomado de las claves primarias que contengan las tablas para la clausula using
    * para  la clausula 'on' o 'using'  se coloca el nombre de la tabla como atributo
    * y el valor 'using' si es uno como  valor string si son varios en un array
    * y para la exprecion 'on' un string con la exprecion
    * si joins es un string entonces se utilisara como la clausula group y
    * todos los parametros se correran hacia la izquierda
    * @param {string} group - clausula group
    * @param {string} having - clausula having
    * @param {string} order - clausula order
    * @param {string} limit - clausula limit
    * @return {Promise} la sentencia sql generada
    */
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
    * envia una sentencia select a la base de datos y obtiene la primera fila 
    * @param {array|string} campos - campos de la tabla que se seleccionaran si es un 
    * string entonces se utilisara como la clausula where y todos los parametros se 
    * correran hacia la izquierda
    * @param {string|object} where - clausula where si es object se tomara como los joins 
    * y todos los parametros se correran hacia la izquierda desde este parametro se puede indicar 
    * explicitamente que clausula es y los parametros siguentes se correran hacia la izquierda 
    * segun la posicion del parametro indicado
    * ejemplo: <em>si en el parametro where se coloca grup by micampo entonces where sera tomado 
    * como group y group como having y asi sucesivamente   </em>
    * @param {object|string} joins - clausulas jois utilizando un object con las tablas que se
    * relacionaran ateponiendo los singnos <,>,= al nombre de la tabla foranea
    * < sera para left join
    * > sera para ringt join
    * = sera innert join
    * si no se antepone nada sera natural join
    * sera tomado de las claves primarias que contengan las tablas para la clausula using
    * para  la clausula 'on' o 'using'  se coloca el nombre de la tabla como atributo
    * y el valor 'using' si es uno como  valor string si son varios en un array
    * y para la exprecion 'on' un string con la exprecion
    * si joins es un string entonces se utilisara como la clausula group y
    * todos los parametros se correran hacia la izquierda
    * @param {string} group - clausula group
    * @param {string} having - clausula having
    * @param {string} order - clausula order
    * @return {Promise} la sentencia sql generada
    */
    selectOne(campos,where,joins,group,having,order)
    {
        return this.select(campos,where,joins,group,having,order,1).then(d=>typeof d[0]!==undefined?d[0]:null)
    }
   
    /**
    * selecciona un elemento de la tabla comparando la primera clave primaria con el 
    * parametro proporcionado 
    * @param {string|numeric} id - clave primaria a buscar 
    * @return {Promise}
    */
    selectById(id)
    {
        return this.selectOne(this.sql.whereId(id))
    }
    /**
    * envia una sentencia select a la base de datos con un sencillo algoritmo de busqueda
    * @param {string} cadena - palabra o serie de palabras a buscar en la tabla 
    * @param {array} campo_bus - campos en los que se buscara el contenido del primer parametro
    * @param {array|string} campos - campos de la tabla que se seleccionaran si es un 
    * string entonces se utilisara como la clausula where y todos los parametros se 
    * correran hacia la izquierda
    * @param {string|object} where - clausula where si es object se tomara como los joins 
    * y todos los parametros se correran hacia la izquierda desde este parametro se puede indicar 
    * explicitamente que clausula es y los parametros siguentes se correran hacia la izquierda 
    * segun la posicion del parametro indicado
    * ejemplo: <em>si en el parametro where se coloca grup by micampo entonces where sera tomado 
    * como group y group como having y asi sucesivamente   </em>
    * @param {object|string} joins - clausulas jois utilizando un object con las tablas que se
    * relacionaran ateponiendo los singnos <,>,= al nombre de la tabla foranea
    * < sera para left join
    * > sera para ringt join
    * = sera innert join
    * si no se antepone nada sera natural join
    * sera tomado de las claves primarias que contengan las tablas para la clausula using
    * para  la clausula 'on' o 'using'  se coloca el nombre de la tabla como atributo
    * y el valor 'using' si es uno como  valor string si son varios en un array
    * y para la exprecion 'on' un string con la exprecion
    * si joins es un string entonces se utilisara como la clausula group y
    * todos los parametros se correran hacia la izquierda
    * @param {string} group - clausula group
    * @param {string} having - clausula having
    * @param {string} order - clausula order
    * @param {string} limit - clausula limit
    * @return {string} la sentencia sql generada
    */
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
    /**
    * envia una sentencia update en la base de datos
    * que edita la fila con la clave primaria pasada en el segundo parametro
    * @param {object} sets - elementos a modificar
    * @param {string|numeric} id - clave primaria 
    * @return {Promise}
    */
    updateById(sets,id)
    {
        return this.update(sets,this.sql.whereId(id))
    }
    /**
    * envia una sentencia update en la base de datos
    * @param {object} sets - elementos a modificar
    * @param {string|object} where - exprecion booleana sql
    * @return {Promise}
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
    * genera una sentencia sql deleteen la base de datos
    * que elimina la fila con la clave primaria pasada en el segundo parametro
    * @param {object} sets - elementos a modificar
    * @param {string|numeric} id - clave prpimaria a eliminar 
    * @return {Promise}
    */
    deleteById(sets,id)
    {
        return this.delete(sets,this.sql.whereId(id))
    }
    /**
    * genera una sentencia sql delete en la base de datos
    * @param {string|object} where - exprecion booleana sql
    * @return {Promise} - sentencia sql
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
    
}

module.exports=dbTabla
