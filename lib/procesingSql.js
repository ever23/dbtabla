const dbHelpers = require("sql-model/sqlHelpers")
const SQLITE_DB=require("./const").SQLITE_DB
/**
* prosesingSql
* crea consultas sql insert, select, update, delete validas para una tabla
*/
class prosesingSql
{
    /**
    *
    * @param {object} colum, prymary, autoincrement, OrderColum, TypeDB - metadadtos de la tabla
    * @param {config} configuracion para los helpers
    */
    constructor(keys,config)
    {
        this.tabla=keys.tabla
        this.__helpers=new dbHelpers(config)
        this.colums=keys.colums
        this.primary=this.colums.filter(p=>p.primary)
        let auto=this.colums.find(p=>p.autoincrement)
        this.autoincrement=auto?auto.name:undefined
        this.OrderColum=this.colums.map(c=>c.name)
        this.typeSql=config.typeDB
        this.nextAutoincrementValue=undefined
        this.dataSmt={}
        this.smt=false
    }
    /**
    * Agrega un elemento a los datos smt
    * @param {string} name - 
    * @param {string} data 
    * @return {string} 
    */
    bindDataSmt(name,data)
    {
        this.dataSmt[":"+name]=data
        return ":"+name
    }
    /**
    * Activa o desactiva la generacion de sql para smt
    * @param {boolean}
    */
    activeSmt(smt)
    {
        this.smt=smt
    }
    /**
    * resetea los datos smt
    */
    resetDataSmt()
    {
        this.dataSmt={}
    }
    /**
    * retorna los datos smt
    * @return {object}
    */
    getDataSmt()
    {
        return this.dataSmt
    }
    /**
    * crea una consulta select sql para la tabla con un sencillo algoritmo de busqueda
    * @param {string} cadena - palabra o serie de palabras a buscar en la tabla
    * @param {array} campo_bus - campos en los que se buscara el contenido del primer parametro
    * @param {array|object|string} campos - campos de la tabla que se seleccionaran si es un object
    * se tomara con el parametro join si es un string entonces se utilisara como el parametro
    * join y todos los parametros se correran hacia la izquierda
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
    * si joins es un string entonces se utilisara el parametro where y
    * todos los parametros se correran hacia la izquierda
    * @param {string|object} where - clausula where desde este parametro se puede indicar
    * explicitamente las clausulas GROUP BY, OERDER BY, HAVING, LIMIT  y los parametros siguentes se correran hacia la izquierda
    * segun la posicion del parametro indicado
    * ejemplo: <em>si en el parametro where se coloca grup by micampo entonces where sera tomado
    * como group y group como having y asi sucesivamente   </em>
    * @param {string} group - clausula group
    * @param {string} having - clausula having
    * @param {string} order - clausula order
    * @param {string} limit - clausula limit
    * @return {string} la sentencia sql generada
    */
    busqueda(cadena,campo_bus,campos,joins,where,group,having,order,limit)
    {
        if(typeof cadena==="object" && cadena!==null && 
        ( cadena.cadena!==undefined
        ||cadena.campos!==undefined
        || cadena.where!==undefined
        || cadena.joins!==undefined
        || cadena.group!==undefined
        || cadena.having!==undefined
        || cadena.order!==undefined
        || cadena.limit!==undefined
        || cadena.campo_bus!==undefined))
        {
            campo_bus = cadena.campo_bus || undefined
            campos = cadena.campos || undefined
            joins = cadena.joins || undefined
            where = cadena.where || undefined
            group = cadena.group || undefined
            having = cadena.having || undefined
            order = cadena.order || undefined
            limit = cadena.limit || undefined
            cadena = cadena.cadena || undefined
        }
        if(typeof campo_bus==="undefined")
        {
            campo_bus=this.OrderColum
        }
        let search=this.__campoBusqueda(this.__helpers.filterSqlI(cadena),campo_bus)
        let params=this.__resolveParamsSelect(campos,joins,where,group,having,order,limit)
        let arrSql=[],
            arrJoin=this.__join(params.joins),
            w=this.__booleanSql("WHERE",params.where),
            g=this.__groupBy(params.group),
            h=this.__booleanSql("HAVING",params.having),
            o=this.__orderBy(params.order),
            l=this.__limit(params.limit)
            
        if(!w)
        {
            w=this.__booleanSql("WHERE",`(${search})>1`)
        }else {

            w =this.__booleanSql("WHERE",`(${w.replace(/^[\s]*where[\s]+(.*)/i,"$1")}) AND (${search})>1`)
        }
        if(!o)
        {
            o = this.__orderBy("puntaje_busqueda DESC")
        }
        if(params.campos instanceof Array)
        {
            params.campos.push(`(${search}) as puntaje_busqueda`)
        }else{
            params.campos=[`(${search}) as puntaje_busqueda`,this.tabla + ".*"]
        }
        arrSql.push(this.__campos(params.campos))
        arrSql.push("FROM")
        arrSql.push(this.__helpers.protectIdentifiers(this.tabla))
        if(arrJoin.length>0)
            arrSql.push(arrJoin.join(" "))
        if(w)
            arrSql.push(w)
        if(g)
            arrSql.push(g)
        if(h)
            arrSql.push(h)
        if(o)
            arrSql.push(o)
        if(l)
            arrSql.push(l)
        return "SELECT "+arrSql.join(" ")+";"
    }
    /**
    * genera un sencillo algoritmo de busqueda
    * @param {string} cadena a buscar
    * @param {array} campos en los que se realizara la busqueda
    * @return {string}
    */
    __campoBusqueda(cadena, campos)
    {
        if (cadena instanceof Array)
        {
            cadena =cadena.join(" ")
        }
        let trozos = cadena.split(" ")
        let select = ""
        for(let i in campos)
        {
            let campo=this.__helpers.protectIdentifiers(campos[i])
            select+=`(${campo} is NOT NULL AND ${campo} like '%${cadena}%')+(${campo} is NOT NULL AND ${campo} like '${cadena}%')+`
        }

        let noSearch = ["de", "la", "el", "en", "con", "and", "or", "the", "a", "from", " "]
        for(let i in trozos)
        {
            let palabra=trozos[i]
            if(typeof noSearch[palabra]!=="undefined")
                continue
            for(let j in campos)
            {
                let campo =this.__helpers.protectIdentifiers(campos[j])
                select += `(${campo} is NOT NULL AND ${campo} like '%${palabra}%') + (${campo} is NOT NULL AND ${campo} like '${palabra}%')+`

            }
        }

        //let solo = ""
        if (this.typeSql !== SQLITE_DB)
        {
            if (campos.length > 1)
            {
                select+="((CONCAT("
                for(let i in campos)
                {
                    let campo=this.__helpers.protectIdentifiers(campos[i])
                    let espace = !/[\d]+/.test(i) ? "''" : "' '"
                    select+=`IF(${campo} IS NOT NULL,${campo},' '),${espace},`
                }

                select+=`'') like '%${cadena}' )+1)`
            } else if (campos.length == 1)
            {
                select+="(0)"
                campos[0] = this.__helpers.protectIdentifiers(campos[0])
                // solo=`* (IF(${campos[0]}='${cadena}',0,1))+(IF(${campos[0]}='${cadena}',1,0))`
            }
        } else
        {
            select+="(0)"
        }
        return select
    }
    /**
    * genera una sentencia sql delete valida
    * @param {string|object} where - exprecion booleana sql
    * @return {string} - sentencia sql
    */
    delete(where)
    {
        return `DELETE FROM ${this.__helpers.protectIdentifiers(this.tabla)} ${this.__booleanSql("WHERE",where)};`
    }
    /**
    * genera una sentencia sql update valida
    * @param {object} sets - elementos a modificar
    * @param {string|object} where - exprecion booleana sql
    * @param {function} error - funcion a ejectuar en caso de error
    * @return {string}
    */
    update(sets,where,error)
    {
        let col=[]
        if (typeof where ==="undefined")
        {
            if (this.primary.length > 0)
            {
                where = []
                for(let pri of this.primary)
                {
                    where[pri.name]=sets[pri.name]
                    delete sets[pri.name]
                }
            } else
            {
                if(error)
                    error(`No se ha encontrado claves primarias en la tabla ${this.tabla} por lo tanto el parametro $where es obligatorio`)
                return false
            }
        }
        for(let i in sets)
        {
            let data
            if(this.smt)
            {
                data=this.bindDataSmt(i,sets[i])
            }else
            {
                data=this.__helpers.formatVarInsert(sets[i],i)
            }
            col.push(this.__helpers.protectIdentifiers(i) +"="+ data)
        }
        return `UPDATE ${this.__helpers.protectIdentifiers(this.tabla)} SET ${col.join(",")} ${this.__booleanSql("WHERE",where)};`
    }
    /**
    * genera una sentencia insert sql valida
    * @param {array|object} campos - campos a insertar
    * @retuen {string}
    */
    insert(campos)
    {
        let attrs=[]
        let col=[]
        if(!(campos instanceof Array))
        {
            for(let coll of this.colums)
            {
                if(coll.autoincrement && (campos[coll.name]===undefined || campos[coll.name]===null) && this.nextAutoincrementValue!==undefined)
                {
                    campos[coll.name]=this.nextAutoincrementValue
                }
                if(this.__verifyCampo(coll,campos[coll.name]))
                {
                    attrs.push(coll.name)
                    if(this.smt)
                    {
                        col.push(this.bindDataSmt(coll.name,campos[coll.name]))
                    }else
                    {
                        col.push(this.__helpers.formatVarInsert(campos[coll.name],coll.name))
                    }
                }
            }
        }else
        {
            // attrs=this.OrderColum
            for(let i in this.colums)
            {
                let coll = this.colums[i]
                if(coll.autoincrement && (campos[i]===undefined || campos[i]===null) && this.nextAutoincrementValue!==undefined)
                {
                    campos[i]=this.nextAutoincrementValue
                }
                if(this.__verifyCampo(coll,campos[i]))
                {
                    attrs.push(coll.name)
                    if(this.smt)
                    {
                        col.push(this.bindDataSmt(coll.name,campos[i]))
                    }else
                    {
                        col.push(this.__helpers.formatVarInsert(campos[i],coll.name))
                    }
                }
            }
        }
        let columnas = ""
        if (attrs)
        {
            columnas = `(${this.__helpers.campos(attrs) })`
        }
        return `INSERT INTO ${this.__helpers.protectIdentifiers(this.tabla)} ${columnas} VALUES (${col.join(",")});`

    }
    
    __verifyCampo(coll,value)
    {
        return !((
            (coll.autoincrement || coll.defaultNull)  && 
            (
                value===undefined || value===null || 
                (
                    typeof value==="string" && 
                    (
                        value==="undefined"  || value.toLowerCase()==="null"
                    )
                )
            )
        ) || (
            value===undefined && coll.default!==undefined && coll.default!==""
        ))
    }
    /**
    * genera una sentencia where valida con la clave primaria
    * igualada al parametro id
    * @param {string|numeric} in
    * @return {string}
    */
    whereId(id)
    {
        let where={}
        if(typeof this.primary[0]!==undefined)
        {
            where[this.primary[0].name]=id
        }else{
            throw "no existen claves primarias "
        }
        //console.log(this.primary[0])
        return where
    }
    /**
    * crea una consulta select sql para la tabla
    * @param {array|object|string} campos - campos de la tabla que se seleccionaran si es un object
    * se tomara con el parametro join si es un string entonces se utilisara como el parametro
    * where y todos los parametros se correran hacia la izquierda
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
    * si joins es un string entonces se utilisara el parametro where y
    * todos los parametros se correran hacia la izquierda
    * @param {string|object} where - clausula where desde este parametro se puede indicar
    * explicitamente las clausulas GROUP BY, OERDER BY, HAVING, LIMIT  y los parametros siguentes se correran hacia la izquierda
    * segun la posicion del parametro indicado
    * ejemplo: <em>si en el parametro where se coloca grup by micampo entonces where sera tomado
    * como group y group como having y asi sucesivamente   </em>
    * @param {string} group - clausula group
    * @param {string} having - clausula having
    * @param {string} order - clausula order
    * @param {string} limit - clausula limit
    * @return {string} la sentencia sql generada
    */
    select(campos,joins,where,group,having,order,limit)
    {
        let params=[]

        params=this.__resolveParamsSelect(campos,joins,where,group,having,order,limit)
        let arrSql=[],
            arrJoin=this.__join(params.joins),
            w=this.__booleanSql("WHERE",params.where),
            g=this.__groupBy(params.group),
            h=this.__booleanSql("HAVING",params.having),
            o=this.__orderBy(params.order),
            l=this.__limit(params.limit)
       
        arrSql.push(this.__campos(params.campos))
        arrSql.push("FROM")
        arrSql.push(this.__helpers.protectIdentifiers(this.tabla))
        if(arrJoin.length>0)
            arrSql.push(arrJoin.join(" "))
        if(w)
            arrSql.push(w)
        if(g)
            arrSql.push(g)
        if(h)
            arrSql.push(h)
        if(o)
            arrSql.push(o)
        if(l)
            arrSql.push(l)
        return "SELECT "+arrSql.join(" ")+";"
       

    }
    /**
    * crea una exprecion sql join valida
    * @param {object} join - los nombre de los atributos representara
    * las tablas y el valor el campo que las une o exprecion para sql ON()
    * si el atributo comiensa por > sera LEFT JOIN, < RIGHT, = INNER por defecto
    * es NATURAL
    * @return {string}
    */
    __join(join)
    {
        let J = []
        //let keys = this.OrderColum

        if ( typeof join ==="object" && join!==null )
        {
            for(let i in join )
            {
                let v=join[i]
                let using=""
                let tipe=""
                let tabla
                if(!/^[\d]+(\.[\d]+)?(e\+?[\d]+)?$/i.test(i))// !is number
                {
                    tabla =i

                    if(typeof v==="string" && /(!=|>=|<=|=|>|<)/.test(v))
                    {

                        let u=this.__helpers.protectIdentifiersBolean(v)
                        using = `ON(${u})`
                    }else if( v instanceof Array)
                    {
                        for(let i in v)
                        {
                            v[i]=this.__helpers.protectIdentifiers(v[i])
                        }
                        let joined=v.join(",")
                        using = `USING(${joined})`
                    }else if(typeof v==="object")
                    {
                        using = `ON(${this.__helpers.object2boleandSql(v,true)})`
                    }else {
                        using = `USING(${this.__helpers.protectIdentifiers(v)})`
                    }
                }else
                {
                    tabla = v
                }

                switch (tabla.slice(0,1)) {
                case ">":
                    tipe = "LEFT"
                    tabla=tabla.slice(1)
                    break
                case "<":
                    tipe = "RIGHT"
                    tabla=tabla.slice(1)
                    break
                case "=":
                    tipe = "INNERT"
                    tabla=tabla.slice(1)
                    break
                default:
                    tipe = "NATURAL"
                    using = ""
                    break

                }
                //" " . $tipe . " JOIN " . $this->Driver->ProtectIdentifiers($tab->Tabla()) . " " . $using
                J.push(`${tipe} JOIN ${this.__helpers.protectIdentifiers(tabla)} ${using}`.replace(/ +$/,""))

            }
        }

        return J
    }
    /**
    * genera una sentencia booleana sql valida para where y having
    * @param {string} type - tipo de exprecion WHERE o HAVING
    * @param {string|object} sql
    * @return {string}
    */
    __booleanSql(type,sql)
    {
        if (typeof sql==="object" && sql!==null)
        {
            return  type+" " +this.__helpers.object2boleandSql(sql)
        }else if(sql!==undefined && sql!==null)
        {
            return  type+" " +sql.replace(new RegExp(`^[\\s]*${type}[\\s]+(.*)`,"i"),"$1")
        }
        return false
    }
    
    /**
    * genera el sql para los campos que se obtendran en una sentencia select
    * @param {array} campos - lista de campos 
    * @return {string}
    */
    __campos(campos)
    {
        if (!(campos instanceof Array) || campos===[])
        {
            return  this.__helpers.campos([ this.tabla + ".*"])
        }
        return  this.__helpers.campos(campos)
    }
    /**
    * genera el sql para pa el group by de una sentencia select
    * @param {array|string} group - lista de campos 
    * @return {string}
    */
    __groupBy(group)
    {
        if (group instanceof Array)
        {
            return "GROUP BY " + group.join(",")
        }else if(/^[\s]*GROUP[\s]+BY[\s]+/i.test(group))
        {
            return group.replace(/^[\s]*GROUP[\s]+BY[\s]+(.*)/i,"GROUP BY $1")
        }else if(group!==undefined && group!==null && group!=="")
        {
            return "GROUP BY " + group
        }
        return false
    }
    /**
    * genera el sql para para el order by de una sentencia select
    * @param {array|string} order - lista de campos 
    * @return {string}
    */
    __orderBy(order)
    {
        if (order instanceof Array)
        {
            return "ORDER BY " + order.join(",")
        }else if(/^[\s]*ORDER[\s]+BY[\s]+/i.test(order))
        {
            return order.replace(/^[\s]*ORDER[\s]+BY[\s]+(.*)/i,"ORDER BY $1")
        }else if(order!==undefined && order!==null && order!=="")
        {
            return "ORDER BY " + order
        }
        return false
    }
    /**
    * genera el sql para para el limit de una sentencia select
    * @param {array|string} limit - lista de campos 
    * @return {string}
    */
    __limit(limit)
    {
        if(/^[\s]*LIMIT[\s]+/i.test(limit))
        {
            return limit.replace(/^[\s]*LIMIT[\s]+(.*)/i,"LIMIT $1")
        }else if(typeof limit==="number" || (typeof limit==="string" && /^[\d]+$/.test(limit)))
        {
            return "LIMIT " + limit
        }
        return false
    }
    
    /**
    * resuelve los parametros para select
    * @param {array|string|object} campo
    * @param {array|string|object} join
    * @param {array|string|object} where
    * @param {array|string|object} group
    * @param {array|string|object} having
    * @param {array|string|object} order
    * @param {array|string|object} limit
    * @return {object} - parametros 
    */
    __resolveParamsSelect(campos,joins,where,group,having,order,limit)
    {
        if(typeof campos==="object" && campos!==null && !(campos instanceof Array) && 
        ( campos.campos!==undefined
        || campos.where!==undefined
        || campos.joins!==undefined
        || campos.group!==undefined
        || campos.having!==undefined
        || campos.order!==undefined
        || campos.limit!==undefined))
        {
            return {
                campos:campos.campos,
                joins:campos.joins,
                where:campos.where,
                group:campos.group,
                having:campos.having,
                order:campos.order,
                limit:campos.limit
            }
        }
        let $aj = joins,
            $aw = where,
            $ag = group,
            $ah = having,
            $ao = order
        
        // verifica el parametro campos 
        if (typeof campos==="object" && campos!==null && !(campos instanceof Array))
        {
            
            joins = campos
            where = $aj
            group = $aw
            having = $ag
            order = $ah
            limit = $ao
            campos = undefined
            $aj = joins
            $aw = where
            $ag = group
            $ah = having
            $ao = order
        }else if(typeof campos==="number" || (typeof campos==="string" && /^[\d]+$/.test(campos)))
        {
            limit=campos
            where = undefined
            group = undefined
            having = undefined
            order = undefined
            campos = undefined
            joins=undefined
            $aj = joins
            $aw = where
            $ag = group
            $ah = having
            $ao = order
        } else if (typeof campos==="string")
        {

            where = campos
            group = $aw
            having = $ag
            order = $ah
            limit = $ao
            campos = undefined
            joins=undefined
            $aj = joins
            $aw = where
            $ag = group
            $ah = having
            $ao = order
        }
        // verifica el parametro joins
        if(typeof joins==="number" || (typeof joins==="string" && /^[\d]+$/.test(joins)))
        {
            limit=joins
            where = undefined
            group = undefined
            having = undefined
            order = undefined
            joins=undefined
            $aj = joins
            $aw = where
            $ag = group
            $ah = having
            $ao = order
        }else if (typeof joins==="string")
        {
            where =$aj
            group = $aw
            having = $ag
            order = $ah
            limit = $ao
            $aj = joins
            $aw = where
            $ag = group
            $ah = having
            $ao = order
            joins = undefined

        }
        //verifica el parametro where 
        if(typeof where==="number" || (typeof where==="string" && (/^[\d]+$/.test(where) || /^([\s]*Limit[\s]+)/i.test(where))))
        {
            limit=where
            where = undefined
            group = undefined
            having = undefined
            order = undefined
            $aw = where
            $ag = group
            $ah = having
            $ao = order
        }else if (/^([\s]*group[\s]+by[\s]+)/i.test(where))
        {
            
            group = where
            having = $ag
            order = $ah
            limit = $ao
            where = undefined
            

        } else if (/^([\s]*Having[\s]+)/i.test(where))
        {
            having = where
            order = $ag
            limit = $ah
            where = undefined
            group = undefined
        } else if ( /^([\s]*Order[\s]+by[\s]+)/i.test(where))
        {
            order = where
            limit = $ag
            where = undefined

            group = undefined
            having = undefined
        }
        // verifica el parametro group 
        if(typeof group==="number" || (typeof group==="string" && (/^[\d]+$/.test(group) || /^([\s]*LIMIT[\s]+)/i.test(group))))
        {
            limit=group
            group = undefined
            having = undefined
            order = undefined
            $ag = group
            $ah = having
            $ao = order
        }else if (typeof group==="object" && group!==null && !(group instanceof Array))
        {
           
            having = $ag
            order = $ah
            limit = $ao
            $aj = joins
            $aw = where
            $ag = group
            $ah = having
            $ao = order
            group = undefined

        }else if (typeof group==="string" && /^([\s]*having[\s]+)/i.test(group))
        {
            having = group
            order = $ah
            limit = $ao
            group = undefined
        } else if (typeof group==="string" && /^([\s]*ORDER[\s]+by[\s]+)/i.test(group))
        {
            order = group
            limit = $ao
            group = undefined
        }
        // verifica el parametro having
        if(typeof having==="number" || (typeof having==="string" && (/^[\d]+$/.test(having) || /^([\s]*LIMIT[\s]+)/i.test(having))))
        {
            limit=having
            having = undefined
            order = undefined
            $ah = having
            $ao = order
        }else if (typeof having ==="string"  && /^([\s]*ORDER[\s]+BY[\s]+)/i.test(having))
        {
            order = having
            limit = $ao
            having = undefined
            
        }
        // verifica el parametro order
        if(typeof order==="number" || (typeof order==="string" && (/^[\d]+$/.test(order) || /^([\s]*LIMIT[\s]+)/i.test(order))))
        {
            limit=order
            order = undefined
            $ao = order
        }
        return {
            campos:campos,
            joins:joins,
            where:where,
            group:group,
            having:having,
            order:order,
            limit:limit
        }
    }

}
module.exports=prosesingSql
