const dbResult = require("./dbResult")
const procesingSql = require("./procesingSql")
const dbTablaError = require("./dbTablaError")
/**
* dbTabla
* representacion de una tabla en la base de datos
*/
class dbTabla {
    _connection;
    _lastSql;
    _keys;
    _callbackKey;
    _config;

    get lastSql() { return this._lastSql; }

    /**
    * @param {object} tabla, connection, callback,  config
    * @param {boolean} ret indica si verificara la existencia de la tabla o esperara la primera consulta
    */
    constructor({ tabla, connection, callback, config }, ret = false) {
        this._connection = connection
        this._lastSql = ""
        this._keys = false
        this.tabla = tabla || null
        this._callbackKey = callback || (e => e)
        this._config = config || {}
        this.typeDB = connection.typeDB
        if (ret)
            this._verifyKeys()
    }
    /**
    * agrega la propiedad $sql que continen
    * el sql de la ultima consulta al objeto pasado
    * @param {object}
    * @return {object}
    */
    _PropertyOk(ok) {
        if (typeof ok === "object")
            Object.defineProperty(ok, "$sql", {
                configurable: true,
                enumerable: false,
                value: this._lastSql,
            })
        return ok
    }
    /**
    * verifica la existencia de la tabla y obtiene los metadatos
    * @param {function} call
    */
    _verifyKeys(call = e => e) {
        if (!this._keys) {
            this._connection._keysInTable(this.tabla)
                .then(async keys => {
                    try {
                        keys = await this._connection._syncModelColumns(this.tabla, keys);
                    } catch (err) {
                        this._callbackKey(null, err);
                        return call(err);
                    }
                    this._keysData = keys
                    this.colum = keys.columns || keys.colums || keys.colum
                    this.columns = this.colum
                    this.colums = this.colum
                    this.sql = new procesingSql(keys, this._config)
                    this._keys = true
                    if (keys.methods)
                        for (let i in keys.methods) {
                            this[i] = (...params) => keys.methods[i](this, this._connection, ...params)
                        }

                    this._callbackKey(this)
                    call()
                }).catch(e => {


                    this._callbackKey(null, e)
                    call(e)


                })

        } else {
            call()
        }
    }
    /**
    * construye el objeto de resultado para consultas select
    * @param {array|object} resultado obtenido de la consulta ejecutada
    * @return {dbResult}
    */
    _formatResult(result) {
        return new dbResult(this, result)
    }


    /**
    * envia una sentencia insert a la base de datos
    * @param {array|object|string} ...campos - campos a insertar
    * @retuen {Promise}
    */
    insert(...params) {
        if (params.length === 0) {
            throw new dbTablaError("Debe pasar al menos un parámetro")
        }
        return new Promise((resolve, reject) => {

            this._verifyKeys(e => {
                if (e) {
                    return reject(e)
                }
                if (params instanceof Array && params.length == 1) {
                    this._lastSql = this.sql.insert(params[0])
                } else {
                    this._lastSql = this.sql.insert(params)
                }

                this._connection.query(this._lastSql).then(d => {

                    resolve(this._PropertyOk(d))
                }).catch(e => reject(e))
            })
        })
    }
    /**
    * envia una sentencia insert masiva a la base de datos para multiples filas (Bulk Insert)
    * @param {array<object>} filas - lista de objetos a insertar
    * @return {Promise}
    */
    insertAll(filas) {
        if (!Array.isArray(filas) || filas.length === 0) {
            throw new dbTablaError("insertAll requiere un arreglo con al menos un elemento")
        }
        return new Promise((resolve, reject) => {
            this._verifyKeys(e => {
                if (e) {
                    return reject(e)
                }
                try {
                    this._lastSql = this.sql.insertAll(filas)
                    this._connection.query(this._lastSql).then(d => {
                        resolve(this._PropertyOk(d))
                    }).catch(e => reject(e))
                } catch (err) {
                    reject(err)
                }
            })
        })
    }
    /**
    * envia una sentencia select a la base de datos
    * @param {array|object|string} campos - campos de la tabla que se seleccionaran si es un object
    * se tomara con el parametro join si es un string entonces se utilizará como el parametro
    * where y todos los parametros se correran hacia la izquierda
    * @param {object|string} joins - clausulas jois utilizando un object con las tablas que se
    * relacionaran anteponiendo los signos <,>,= al nombre de la tabla foranea
    * > sera para left join
    * < sera para right join
    * = sera inner join
    * si no se antepone nada sera natural join
    * sera tomado de las claves primarias que contengan las tablas para la clausula using
    * para  la clausula 'on' o 'using'  se coloca el nombre de la tabla como atributo
    * y el valor 'using' si es uno como  valor string si son varios en un array
    * y para la expresión 'on' un string con la expresión
    * si joins es un string entonces se utilizará el parametro where y
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
    * @return {Promise} la sentencia sql generada
    */
    select(...params) {
        return new Promise((resolve, reject) => {
            this._verifyKeys(e => {
                if (e) {
                    return reject(e)
                }
                this._lastSql = this.sql.select(...params)
                this._connection.query(this._lastSql).then(d => {
                    resolve(this._formatResult(d))
                }).catch(e => reject(e))
            })

        })
    }
    /**
    * envia una sentencia select a la base de datos y obtiene la primera fila
    * @param {array|object|string} campos - campos de la tabla que se seleccionaran si es un object
    * se tomara con el parametro join si es un string entonces se utilizará como el parametro
    * where y todos los parametros se correran hacia la izquierda
    * @param {object|string} joins - clausulas jois utilizando un object con las tablas que se
    * relacionaran anteponiendo los signos <,>,= al nombre de la tabla foranea
    * > sera para left join
    * < sera para right join
    * = sera inner join
    * si no se antepone nada sera natural join
    * sera tomado de las claves primarias que contengan las tablas para la clausula using
    * para  la clausula 'on' o 'using'  se coloca el nombre de la tabla como atributo
    * y el valor 'using' si es uno como  valor string si son varios en un array
    * y para la expresión 'on' un string con la expresión
    * si joins es un string entonces se utilizará el parametro where y
    * todos los parametros se correran hacia la izquierda
    * @param {string|object} where - clausula where desde este parametro se puede indicar
    * explicitamente las clausulas GROUP BY, OERDER BY, HAVING, LIMIT  y los parametros siguentes se correran hacia la izquierda
    * segun la posicion del parametro indicado
    * ejemplo: <em>si en el parametro where se coloca grup by micampo entonces where sera tomado
    * como group y group como having y asi sucesivamente   </em>
    * @param {string} group - clausula group
    * @param {string} having - clausula having
    * @param {string} order - clausula order
    * @return {Promise} la sentencia sql generada
    */
    /**
    * Pagina registros de la tabla soportando todos los atributos de select()
    * (campos, joins, where, group, having, order, limit).
    * Soporta paginación clásica por número de página (page / limit) y paginación por cursor (cursor / after).
    *
    * @param {object} options - Opciones de paginación y selección
    * @return {Promise<object>}
    */
    paginate(...args) {
        let options = {}
        if (args.length === 1 && typeof args[0] === "object" && args[0] !== null && !Array.isArray(args[0])) {
            options = { ...args[0] }
        } else if (args.length > 0) {
            const params = typeof this.sql.resolveParamsSelect === "function"
                ? this.sql.resolveParamsSelect(...args)
                : {}
            options = { ...params }
            const lastArg = args[args.length - 1]
            const prevArg = args.length > 1 ? args[args.length - 2] : undefined
            if (typeof lastArg === "number" && typeof prevArg === "number") {
                options.page = prevArg
                options.limit = lastArg
            } else if (typeof lastArg === "number") {
                options.page = lastArg
            }
        }

        return new Promise((resolve, reject) => {
            this._verifyKeys(async (err) => {
                if (err) return reject(err)

                try {
                    const cursorField = options.cursorField || (this.sql.primary && this.sql.primary[0] ? this.sql.primary[0].name : "id")

                    // Modo 1: Cursor / Keyset Pagination
                    if (options.cursor !== undefined || options.after !== undefined) {
                        const cursorVal = options.cursor !== undefined ? options.cursor : options.after
                        const limit = Number(options.limit) > 0 ? Math.floor(Number(options.limit)) : 15
                        const isDesc = options.order && /desc/i.test(String(options.order))
                        const op = isDesc ? "<" : ">"

                        let where = options.where
                        if (cursorVal !== null && cursorVal !== undefined && cursorVal !== "") {
                            if (typeof where === "object" && where !== null && !Array.isArray(where)) {
                                where = { ...where, [`${cursorField}${op}`]: cursorVal }
                            } else if (typeof where === "string" && where.trim() !== "") {
                                where = `(${cursorField} ${op} ${cursorVal}) AND (${where})`
                            } else {
                                where = { [`${cursorField}${op}`]: cursorVal }
                            }
                        }

                        const order = options.order || `${cursorField} ${isDesc ? "DESC" : "ASC"}`

                        const data = await this.select({
                            campos: options.campos,
                            joins: options.joins,
                            where: where,
                            group: options.group,
                            having: options.having,
                            order: order,
                            limit: limit + 1
                        })

                        const hasMore = data.length > limit
                        if (hasMore) {
                            data.pop()
                        }
                        const nextCursor = (data.length > 0 && hasMore && data[data.length - 1][cursorField] !== undefined)
                            ? data[data.length - 1][cursorField]
                            : null

                        return resolve({
                            data,
                            limit,
                            nextCursor,
                            hasMore
                        })
                    }

                    // Modo 2: Offset / Page-based Pagination (por defecto)
                    const page = Number(options.page) > 0 ? Math.floor(Number(options.page)) : 1
                    const limit = Number(options.limit) > 0 ? Math.floor(Number(options.limit)) : 15
                    const offset = (page - 1) * limit

                    let countSql
                    if (options.group) {
                        const innerSql = this.sql.select({
                            campos: ["1"],
                            joins: options.joins,
                            where: options.where,
                            group: options.group,
                            having: options.having
                        }).replace(/;$/, "")
                        countSql = `SELECT COUNT(*) as total FROM (${innerSql}) as _subquery;`
                    } else {
                        countSql = this.sql.select({
                            campos: ["COUNT(*) as total"],
                            joins: options.joins,
                            where: options.where
                        })
                    }

                    const [countRes, data] = await Promise.all([
                        this._connection.query(countSql),
                        this.select({
                            campos: options.campos,
                            joins: options.joins,
                            where: options.where,
                            group: options.group,
                            having: options.having,
                            order: options.order,
                            limit: [offset, limit]
                        })
                    ])

                    const rawTotal = countRes && countRes[0] ? (countRes[0].total ?? countRes[0]['COUNT(*)'] ?? countRes[0]['count'] ?? 0) : 0
                    const total = Number(rawTotal) || 0
                    const totalPages = Math.ceil(total / limit)
                    const hasNext = page < totalPages
                    const hasPrev = page > 1
                    const nextCursor = (data.length > 0 && hasNext && data[data.length - 1][cursorField] !== undefined)
                        ? data[data.length - 1][cursorField]
                        : null

                    resolve({
                        data,
                        total,
                        page,
                        limit,
                        totalPages,
                        hasNext,
                        hasPrev,
                        hasMore: hasNext,
                        nextCursor
                    })
                } catch (error) {
                    reject(error)
                }
            })
        })
    }

    selectOne(campos, joins, where, group, having, order) {
        return this.select(campos, joins, where, group, having, order, 1).then(d => typeof d[0] !== undefined ? d[0] : null)
    }

    /**
    * selecciona un elemento de la tabla comparando la primera clave primaria con el
    * parametro proporcionado
    * @param {array|string} campos - campos de la tabla que se seleccionaran si es un
    * object entonces se utilizará como la clausula join y todos los parametros se
    * correran hacia la izquierda
    * @param {object|string} joins - clausulas jois utilizando un object con las tablas que se
    * relacionaran anteponiendo los signos <,>,= al nombre de la tabla foranea
    * > sera para left join
    * < sera para right join
    * = sera inner join
    * si no se antepone nada sera natural join
    * sera tomado de las claves primarias que contengan las tablas para la clausula using
    * para  la clausula 'on' o 'using'  se coloca el nombre de la tabla como atributo
    * y el valor 'using' si es uno como  valor string si son varios en un array
    * y para la expresión 'on' un string con la expresión
    * si joins no es un objeto entonces se utilizará como el parametro id
    * @param {string|numeric} id - clave primaria a buscar
    * @return {Promise}
    */
    selectById(campos, joins, id) {
        if (typeof campos === "string" || typeof campos === "number") {
            id = campos
            joins = undefined
            campos = undefined
        }
        if (typeof campos === "string" || typeof campos === "number") {
            id = joins
            joins = campos
            campos = undefined
        }
        if (id === undefined) {
            throw new dbTablaError("falta el parametro id no es opcional")
        }
        return this.selectOne(campos, joins, this.sql.whereId(id))
    }
    /**
    * envia una sentencia select a la base de datos con un sencillo algoritmo de busqueda
    * @param {string} cadena - palabra o serie de palabras a buscar en la tabla
    * @param {array} campo_bus - campos en los que se buscara el contenido del primer parametro
    * @param {array|object|string} campos - campos de la tabla que se seleccionaran si es un object
    * se tomara con el parametro join si es un string entonces se utilizará como el parametro
    * where y todos los parametros se correran hacia la izquierda
    * @param {object|string} joins - clausulas jois utilizando un object con las tablas que se
    * relacionaran anteponiendo los signos <,>,= al nombre de la tabla foranea
    * > sera para left join
    * < sera para right join
    * = sera inner join
    * si no se antepone nada sera natural join
    * sera tomado de las claves primarias que contengan las tablas para la clausula using
    * para  la clausula 'on' o 'using'  se coloca el nombre de la tabla como atributo
    * y el valor 'using' si es uno como  valor string si son varios en un array
    * y para la expresión 'on' un string con la expresión
    * si joins es un string entonces se utilizará el parametro where y
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
    busqueda(cadena, campo_bus, campos, where, joins, group, having, order, limit) {
        return new Promise((resolve, reject) => {
            this._verifyKeys(() => {
                this._lastSql = this.sql.busqueda(cadena, campo_bus, campos, where, joins, group, having, order, limit)
                this._connection.query(this._lastSql).then(d => {
                    resolve(this._formatResult(d))
                }).catch(e => reject(e))
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
    updateById(sets, id) {
        if (sets === undefined) {
            throw new dbTablaError("Falta el parametro numero 1 sets no es opcional")
        } else if (typeof sets !== "object") {
            throw new dbTablaError("El parametro numero 1 sets debe ser un de tipo object")
        }
        if (id === undefined) {
            throw new dbTablaError("falta el parametro numero 2 id no es opcional")
        }
        return this.update(sets, this.sql.whereId(id))
    }
    /**
    * envia una sentencia update en la base de datos
    * @param {object} sets - elementos a modificar
    * @param {string|object} where - expresión booleana sql
    * @return {Promise}
    */
    update(sets, where) {
        if (sets === undefined) {
            throw new dbTablaError("Falta el parametro numero 1 sets no es opcional")
        } else if (typeof sets !== "object") {
            throw new dbTablaError("El parametro numero 1 sets debe ser un de tipo object")
        }
        if (where === undefined || where === null || (typeof where === "object" && Object.keys(where).length === 0) || (typeof where === "string" && !where.trim())) {
            throw new dbTablaError("UPDATE requiere una cláusula WHERE válida para evitar modificar toda la tabla")
        }
        return new Promise((resolve, reject) => {
            this._verifyKeys(e => {
                if (e) {
                    return reject(e)
                }
                this._lastSql = this.sql.update(sets, where, reject)
                if (this._lastSql) {
                    this._connection.query(this._lastSql).then(d => {

                        resolve(this._PropertyOk(d))
                    }).catch(e => reject(e))
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
    deleteById(sets, id) {
        if (sets === undefined) {
            throw new dbTablaError("Falta el parametro  numero1 sets no es opcional")
        } else if (typeof sets !== "object") {
            throw new dbTablaError("El parametro numero 1 sets debe ser un de tipo object")
        }
        if (id === undefined) {
            throw new dbTablaError("falta el parametro numero 2 id no es opcional")
        }
        return this.delete(sets, this.sql.whereId(id))
    }
    /**
    * genera una sentencia sql delete en la base de datos
    * @param {string|object} where - expresión booleana sql
    * @return {Promise} - sentencia sql
    */

    delete(where) {
        if (where === undefined || where === null || (typeof where === "object" && Object.keys(where).length === 0) || (typeof where === "string" && !where.trim())) {
            throw new dbTablaError("DELETE requiere una cláusula WHERE válida para evitar vaciar toda la tabla")
        }
        return new Promise((resolve, reject) => {
            this._verifyKeys(e => {
                if (e) {
                    return reject(e)
                }
                this._lastSql = this.sql.delete(where)
                this._connection.query(this._lastSql).then(d => {

                    resolve(this._PropertyOk(d))
                }).catch(e => reject(e))
            })
        })
    }

}

module.exports = dbTabla
