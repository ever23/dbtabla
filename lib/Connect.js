const fs = require("fs")
const path = require("path")
const dbTablaModel = require("tabla-model")
const dbTabla = require(__dirname + "/dbTabla.js")
const procesingSql = require('./procesingSql')
/**
* Connect
* clase abstracta para crear la clase de conexion a la base de datos
*/
class Connect {
    _escapeChar;
    _reserveIdentifiers;
    _ar_aliased_tables;
    _dbprefix;
    _swap_pre;
    _information_schema;
    _models;
    _caheTablas;
    _createdTables;
    _escapeString;
    /**
    * constructor de la clase
    * @param {object} params - parametros de conexion
    */
    constructor(params, typeDB = "") {
        this.config = params
        this._escapeChar = ""
        this._reserveIdentifiers = ["*"]
        this._ar_aliased_tables = []
        this._dbprefix = ""
        this._swap_pre = ""
        this._information_schema = " "
        this._models = {}
        this.typeDB = typeDB
        this._caheTablas = {}
    }
    /**
    * retorna la configuracion para los helpers
    * @return {object}
    */
    helpersConf() {
        return {
            escapeChar: this._escapeChar,
            reserveIdentifiers: this._reserveIdentifiers,
            ar_aliased_tables: this._ar_aliased_tables,
            dbprefix: this._dbprefix,
            swap_pre: this._swap_pre,
            typeDB: this.typeDB,
            escapeString: typeof this._escapeString === "function" ? e => this._escapeString(e) : null
        }
    }
    /**
    * retorna el modelo asociado a la tabla
    * @param {string} tabla - nombre de la tabla
    * @return {dbTablaModel|boolean} - si el modelo  no existe retorna false
    */
    model(tabla) {

        return this._models[tabla] instanceof dbTablaModel ? this._models[tabla] : false
    }
    /**
    * agrega un modelo a la lista de modelos interna
    * @param {sqlModel|object|string} model - objeto modelo
    */
    addModel(model) {
        if (model instanceof dbTablaModel) {
            this._models[model.tabla] = model
        } else if (typeof model === "object" && model !== null) {
            this._models[model.tabla] = new dbTablaModel(model.tabla, model)
        } else {
            this._models[model.tabla] = new dbTablaModel(model, this.helpersConf().escapeChar)
        }

    }
    /**
    * agrega todos los modelos existentes en un directorio a la lista interna
    * @param {string} pathModel - directorio de modelos
    */
    pathModels(pathModel) {
        const { pathToFileURL } = require('url')
        let files = fs.readdirSync(pathModel)

        let isEsmProject = false
        try {
            const pkgPath = path.join(process.cwd(), 'package.json')
            if (fs.existsSync(pkgPath)) {
                isEsmProject = JSON.parse(fs.readFileSync(pkgPath, 'utf8')).type === 'module'
            }
        } catch (e) { }

        for (let i in files) {

            if (/(\.js|\.mjs|\.cjs)$/i.test(files[i])) {
                let filePath = path.join(pathModel, files[i])

                if (isEsmProject || /\.mjs$/i.test(files[i])) {
                    import(pathToFileURL(filePath).href).then(module => {
                        let model = module.default || module
                        if (model instanceof dbTablaModel) {
                            this.addModel(model)
                        }
                    }).catch(e => console.error(`Error loading ESM model ${files[i]}:`, e))
                } else {
                    try {
                        let model = require(filePath)
                        if (model && model.default) model = model.default
                        if (model instanceof dbTablaModel) {
                            this.addModel(model)
                        }
                    } catch (e) {
                        import(pathToFileURL(filePath).href).then(module => {
                            let model = module.default || module
                            if (model instanceof dbTablaModel) {
                                this.addModel(model)
                            }
                        }).catch(err => console.error(`Error loading model ${files[i]}:`, err))
                    }
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
    query(query) {
        return new Promise((res) => {
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
    tabla(tabla, callback, verify = false) {
        if (typeof this._caheTablas[tabla] !== "undefined") {
            typeof callback === "function" ? callback(this._caheTablas[tabla]) : null
            return this._caheTablas[tabla]
        }
        return this._caheTablas[tabla] = new dbTabla({
            tabla: tabla,
            connection: this,
            callback: callback,
            config: this.helpersConf()
        }, verify)
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
    _keysInTable(table) {
        return new Promise((res) => {
            res({
                tabla: table,
                colums: []
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
    inModel(tabla, create) {
        return new Promise((res, rej) => {
            if (!this.model(tabla)) {
                rej()
            } else {

                if (create) {

                    this._createTable(this.model(tabla))
                        .then(res).catch(rej)
                } else {
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
    _createTable(model) {

        return new Promise((res, rej) => {
            this._createdTables = {}
            let rescursive = (foreingKey, i) => {

                if (foreingKey[i] !== undefined) {
                    try {
                        this.tabla(foreingKey[i].reference, (t) => {
                            rescursive(foreingKey, ++i)
                        }, true)
                    } catch (e) { rej(e) }
                } else {

                    this.query(model.sql(this)).then(() => {
                        this._createdTables[model.tabla] = true
                        this._initializeTable(model.tabla).then(() => {

                            res(model.getData())
                        }).catch(rej)
                    }).catch(rej)
                }
            }
            rescursive(model.foreingKey(), 0)
        })
    }
    _initializeTable(tab) {
        return new Promise(async (res) => {

            let sql = new procesingSql(this.model(tab).getData(), this.helpersConf())
            let init = this.model(tab).getData().init

            if (init.length < 1) {
                return res()
            }
            for (let item of init) {
                await this.query(sql.insert(item))
            }
            res()

        })

    }
}
module.exports = Connect
