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
        let auto=this.colums.find(p=>p.primary)
        this.autoincrement=auto?auto.name:undefined
        this.OrderColum=this.colums.map(c=>c.name)
        this.typeSql=config.typeDB
    }


    /**
    * crea una consulta select sql para la tabla con un sencillo algoritmo de busqueda
    * @param {string} cadena - palabra o serie de palabras a buscar en la tabla
    * @param {array} campo_bus - campos en los que se buscara el contenido del primer parametro
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
    busqueda(cadena,campo_bus,campos,joins,where,group,having,order,limit)
    {
        let verify=false
        if(cadena!=="undefined")
            verify=typeof cadena.campos!=="undefined"
        ||typeof cadena.where!=="undefined"
        ||typeof cadena.joins!=="undefined"
        ||typeof cadena.group!=="undefined"
        ||typeof cadena.having!=="undefined"
        ||typeof cadena.order!=="undefined"
        ||typeof cadena.limit!=="undefined"
        ||typeof cadena.cadena!=="undefined"
        ||typeof cadena.campo_bus!=="undefined"
        if(typeof cadena==="object" && verify)
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
        let search=this.__campoBusqueda(cadena,campo_bus)
        let params=[]

        params=this.__resolveParamsSelect(campos,joins,where,group,having,order,limit)
        campos=params[1]
        joins=params[2]
        where=params[3]
        group=params[4] ||""
        having=params[5]
        order=params[6] ||""
        limit=params[7] ||""
        if(where==="" || typeof where ==="undefined")
        {
            where=`(${search})>1`
        }else {

            let w = where.replace(/^( {0, }where)/i,"")
            where =`(${w}) AND (${search})>1`
        }
        if(order==="" || typeof order ==="undefined")
        {
            order = "order by puntaje_busqueda DESC"
        }
        let c=[`(${search}) as puntaje_busqueda`]
        for(let i in campos)
            c.push(campos[i])
        return (params[0]
               + this.__helpers.__campos(c) + " FROM " + this.__helpers.__protectIdentifiers(this.tabla) + " "
               + this.__join(joins).join(" ") + " "
               + this.__where(where) + " "
               + group + " "
               + this.__having(having) + " "
               + order + " "
               + limit).replace(/ +$/,";")
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
            let campo=this.__helpers.__protectIdentifiers(campos[i])
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
                let campo =this.__helpers.__protectIdentifiers(campos[j])
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
                    let campo=this.__helpers.__protectIdentifiers(campos[i])
                    let espace = !/[\d]+/.test(i) ? "''" : "' '"
                    select+=`IF(${campo} IS NOT NULL,${campo},' '),${espace},`
                }

                select+=`'') like '%${cadena}' )+1)`
            } else if (campos.length == 1)
            {
                select+="(0)"
                campos[0] = this.__helpers.__protectIdentifiers(campos[0])
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
        return `DELETE FROM ${this.__helpers.__protectIdentifiers(this.tabla)} ${this.__where(where)};`
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
        let col=""
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
            col += this.__helpers.__protectIdentifiers(i) +"="+ this.__helpers.__formatVarInsert(sets[i],i)+","
        }
        return `UPDATE ${this.__helpers.__protectIdentifiers(this.tabla)} SET ${col.slice(0,-1)} ${this.__where(where)};`
    }
    /**
    * genera una sentencia insert sql valida
    * @param {array|object} campos - campos a insertar
    * @retuen {string}
    */
    insert(campos)
    {
        let attrs=[]
        let col=""


        if(!(campos instanceof Array))
        {

            for(let coll of this.colums)
            {

                let verify=coll.autoincrement && (campos[coll.name]===undefined || campos[coll.name]==="undefined" || campos[coll.name]===null|| campos[coll.name]==="null")
                if(!verify)
                {
                    attrs.push(coll.name)
                    col+= this.__helpers.__formatVarInsert(campos[coll.name],coll.name)+","
                }


            }

        }else
        {
            // attrs=this.OrderColum
            for(let i in this.colums)
            {
                let coll = this.colums[i]
                let verify=coll.autoincrement && (campos[i]===undefined || campos[i]==="undefined" || campos[i]===null|| campos[i]==="null")
                if(!verify)
                {
                    attrs.push(coll.name)
                    col+= this.__helpers.__formatVarInsert(campos[i],coll.name)+","
                }
            }
        }
        let columnas = ""
        if (attrs)
        {
            columnas = `(${this.__helpers.__campos(attrs) })`
        }
        return `INSERT INTO ${this.__helpers.__protectIdentifiers(this.tabla)} ${columnas} VALUES (${col.slice(0,-1)});`

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
        if(typeof this.sql.primary[0]!==undefined)
        {
            where[this.sql.primary[0]]=id
        }else{
            throw "no existen claves primarias "
        }
        return this.__where(where)
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

        if ( typeof join ==="object" )
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

                        let u=this.__helpers.__protectIdentifiersBolean(v)
                        using = `ON(${u})`
                    }else if( v instanceof Array)
                    {
                        for(let i in v)
                        {
                            v[i]=this.__helpers.__protectIdentifiers(v[i])
                        }
                        let joined=v.join(",")
                        using = `USING(${joined})`
                    }else if(typeof v==="object")
                    {
                        using = `ON(${this.__helpers.__object2boleandSql(v)})`
                    }else {
                        using = `USING(${this.__helpers.__protectIdentifiers(v)})`
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
                J.push(`${tipe} JOIN ${this.__helpers.__protectIdentifiers(tabla)} ${using}`.replace(/ +$/,""))

            }
        }

        return J
    }
    /**
    * genera una sentencia where valida
    * @param {string|object} where
    * @return {string}
    */
    __where(where)
    {
        if (typeof where==="undefined")
        {
            return ""
        } else if (typeof where==="object")
        {
            where =this.__helpers.__object2boleandSql(where)
        }else
        {
            where=where.replace(/^( {0,}WHERE )/i,"")
            //where=where
        }
        return "WHERE " + where
    }
    /**
    * genera una sentencia where valida
    * @param {string|object} having
    * @return {string}
    */
    __having(having)
    {
        if (typeof having==="undefined")
        {
            return ""
        }else if ( typeof having==="object")
        {
            having =this.__helpers.__object2boleandSql(having)
        }else
        {
            having=having.replace(/^( {0,}HAVING )/i,"")
            //having=having
        }
        return "HAVING " + having

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
        campos=params[1]
        joins=params[2]
        where=params[3]
        group=params[4] ||""
        having=params[5]
        order=params[6] ||""
        limit=params[7] ||""

        return (params[0]
               + this.__helpers.__campos(campos) + " FROM " + this.__helpers.__protectIdentifiers(this.tabla) + " "
               + this.__join(joins).join(" ") + " "
               + this.__where(where) + " "
               + group + " "
               + this.__having(having) + " "
               + order + " "
               + limit).replace(/ +$/,";")

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
    * @return {array} - parametros en orden
    */
    __resolveParamsSelect(campos,joins,where,group,having,order,limit)
    {
        let $aj = joins,
            $aw = where,
            $ag = group,
            $ah = having,
            $ao = order

        let verify=false
        if(typeof campos ==="object" )
            verify=typeof campos.campos!==undefined
        ||typeof campos.where!==undefined
        ||typeof campos.joins!==undefined
        ||typeof campos.group!==undefined
        ||typeof campos.having!==undefined
        ||typeof campos.order!==undefined
        ||typeof campos.limit!==undefined
        let $ac=campos
        if(typeof campos==="object" && !(campos instanceof Array) && verify)
        {

            $aj = joins = campos.joins || undefined
            $aw = where = campos.where || undefined
            $ag = group = campos.group || undefined
            $ah = having = campos.having || undefined
            $ao = order = campos.order || undefined
            limit = campos.limit || undefined
            campos = campos.campos || undefined
        }


        if (typeof campos==="object" && !(campos instanceof Array))
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
        }
        if (typeof campos==="string")
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

        /*if (typeof where==="object")
        {
            joins = $aw
            group = $aj
            having = $ag
            order = $ah
            limit = $ao
            $aj = joins
            $aw = where
            $ag = group
            $ah = having
            $ao = order
            where = undefined
        }*/

        if (typeof joins==="string")
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

        $aj = joins
        $aw = where
        $ag = group
        $ah = having
        $ao = order


        if (typeof joins===undefined)
        {
            joins = {}
        }

        if (!(campos instanceof Array) || campos===[])
        {

            campos = [ this.tabla + ".*"]
        }


        if (/^( {0,}group by )/i.test(where))
        {
            group = where
            having = $ag
            order = $ah
            limit = $ag
            where = undefined

        } else if (/^( {0,}Having )/i.test(where))
        {
            having = where
            order = $ag
            limit = $ah
            where = undefined
            group = undefined
        } else if ( /^( {0,}Order by)/i.test(where))
        {
            order = where
            limit = $ag
            where = undefined

            group = undefined
            having = undefined
        } else if (/^( {0,}Limit )/i.test(where))
        {
            limit = where
            where = undefined
            group = undefined
            having = undefined
            order = undefined
        }

        if (typeof group !==undefined && typeof group !=="undefined"){
            if ( group instanceof Array)
            {
                group = "GROUP BY " + group.join()
            }else if (/^( {0,}having )/i.test(group))
            {
                having = group
                order = $ah
                limit = $ao
                group = undefined
            } else if (/^( {0,}ORDER by )/i.test(group))
            {
                order = group
                limit = $ao
                group = undefined
            } if (/^( {0,}LIMIT )/i.test(group))
            {
                limit = group
                group = undefined
            } else if (group !== "" && !/^( {0,}GROUP BY )/i.test(group))
            {
                group = "GROUP BY " + group
            }
        }
        if (typeof having !==undefined && typeof having !=="undefined"){
            if (/^( {0,}LIMIT )/i.test(having) || /^(\d{0,}(\.)?\d{0,}?)$/.test(having))
            {
                limit = having
                having = undefined
            } else if (/^( {0,}ORDER BY )/i.test(having))
            {
                order = having
                limit = $ao
                having = undefined
            }
        }
        if (typeof order!==undefined && typeof order!=="undefined")
        {
            if (/^( {0,}LIMIT )/i.test(order))
            {
                limit = order
                order = undefined
            } else
            {
                if (!/^( {0,}ORDER BY )/i.test(order))
                    order = "ORDER BY " + order
            }
        }else if(/^( {0,}LIMIT )/i.test(order) || /^(\d{0,}(.)?\d{0,}?)$/.test(order))
        {
            limit = order
            order = undefined
        }

        if (typeof limit!==undefined && typeof limit!=="undefined")
        {
            if (!/^( {0,}LIMIT )/i.test(limit))
            {
                limit = "LIMIT " + limit
            }
        }

        let Select = "SELECT "
        return [Select, campos,joins,where,group,having,order,limit]
    }

}
module.exports=prosesingSql
