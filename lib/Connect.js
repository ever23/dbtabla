const EventEmitter = require("events");
const dbTablaModel = require("tabla-model")
const dbTabla = require("./dbTabla")
const procesingSql = require('./procesingSql')
/**
* Connect
* clase abstracta para crear la clase de conexion a la base de datos
*/
class Connect extends EventEmitter {
    _escapeChar;
    _reserveIdentifiers;
    _ar_aliased_tables;
    _dbprefix;
    _swap_pre;
    _information_schema;
    _models;
    _caheTablas;
    _cacheTablas;
    _createdTables;
    _escapeString;
    /**
    * constructor de la clase
    * @param {object} params - parametros de conexion
    */
    constructor(params, typeDB = "") {
        super();
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
        this._cacheTablas = this._caheTablas
    }
    /**
    * retorna la configuracion para los helpers
    * @return {object}
    */
    /**
     * Registra y emite el evento 'query' con la información de rendimiento y estado de la consulta.
     * @param {string} sql - Sentencia SQL ejecutada
     * @param {number} timeMs - Tiempo de ejecución en milisegundos
     * @param {Error|null} [error=null] - Error si la consulta falló
     */
    _logQuery(sql, timeMs, error = null) {
        try {
            this.emit('query', {
                sql,
                timeMs,
                error,
                isTransaction: Boolean(this._isTransactionScope),
                timestamp: Date.now()
            });
        } catch (e) {
            console.error("Error en listener de evento 'query':", e);
        }
    }

    /**
     * Mide la duración de una consulta y emite el evento 'query'.
     * @param {string} sql - Sentencia SQL ejecutada
     * @param {function(): Promise<any>} executeFn - Función que realiza la consulta física
     * @returns {Promise<any>}
     */
    async _executeWithTiming(sql, executeFn) {
        const root = this._parentConnect || this;
        if (root._executingTiming) {
            return executeFn();
        }
        root._executingTiming = true;

        const hasHrtime = typeof process !== 'undefined' && process.hrtime && typeof process.hrtime.bigint === 'function';
        const start = hasHrtime ? process.hrtime.bigint() : (typeof performance !== 'undefined' ? performance.now() : Date.now());

        try {
            const result = await executeFn();
            const end = hasHrtime ? process.hrtime.bigint() : (typeof performance !== 'undefined' ? performance.now() : Date.now());
            const timeMs = hasHrtime
                ? Math.round(Number(end - start) / 1e4) / 100
                : Math.round((end - start) * 100) / 100;

            this._logQuery(sql, timeMs, null);
            return result;
        } catch (error) {
            const end = hasHrtime ? process.hrtime.bigint() : (typeof performance !== 'undefined' ? performance.now() : Date.now());
            const timeMs = hasHrtime
                ? Math.round(Number(end - start) / 1e4) / 100
                : Math.round((end - start) * 100) / 100;

            this._logQuery(sql, timeMs, error);
            throw error;
        } finally {
            root._executingTiming = false;
        }
    }

    /**
     * Atajo de conveniencia para registrar un listener de consultas lentas (Slow Query Logger).
     * @param {number} thresholdMs - Umbral en milisegundos (ej: 200)
     * @param {function({ sql: string, timeMs: number, error: any, isTransaction: boolean, timestamp: number })} callback
     * @returns {this}
     */
    onSlowQuery(thresholdMs, callback) {
        if (typeof callback !== 'function') {
            throw new Error("onSlowQuery() requiere una función de callback");
        }
        return this.on('query', (event) => {
            if (event.timeMs >= thresholdMs) {
                callback(event);
            }
        });
    }

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
        if (typeof require === 'undefined') {
            console.error("dbtabla: pathModels() no es compatible con el navegador. Use addModel() manualmente.")
            return
        }

        let fs, path, url
        try {
            fs = require('fs')
            path = require('path')
            url = require('url')
        } catch (e) {
            console.error("dbtabla: No se pudieron cargar los módulos de Node.js (fs, path, url).")
            return
        }

        const { pathToFileURL } = url
        pathModel = path.resolve(pathModel)
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
    * Método abstracto: en su redefinición deberá generar una
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
    * Construye un objeto dbtabla asociado al nombre
    * de la tabla del primer parámetro
    * @param {string} tabla - nombre de la tabla en la base de datos
    * @param {function} callback - función anónima que se ejecutará cuando se verifique la existencia de la tabla
    * @param {boolean} verify - indicará si se verificará la existencia de la tabla o se esperará a la primera consulta
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
    /**
    * Sincroniza las columnas faltantes del modelo con la base de datos física (auto-migración incremental)
    * @param {string} table - nombre de la tabla
    * @param {object} keys - metadatos actuales de la tabla (provenientes de la base de datos)
    * @return {Promise<object>} - metadatos actualizados
    */
    async _syncModelColumns(table, keys) {
        if (!keys) return keys;
        const model = this.model(table);
        if (!model || typeof model.sqlAddColumn !== 'function') {
            return keys;
        }

        const modelData = model.getData();
        if (modelData.methods && (!keys.methods || Object.keys(keys.methods).length === 0)) {
            keys.methods = modelData.methods;
        }

        // Si la auto-migración está desactivada explícitamente en la configuración, salimos
        if (this.config && this.config.autoMigrate === false) {
            return keys;
        }

        const modelCols = modelData.columns || modelData.colums || [];
        const existingCols = keys.columns || keys.colums || keys.colum || [];
        const existingNames = new Set(existingCols.map(c => (c.name || '').toLowerCase().trim()));

        const missingCols = modelCols.filter(c => !existingNames.has((c.name || '').toLowerCase().trim()));
        if (missingCols.length > 0) {
            for (const col of missingCols) {
                const sql = model.sqlAddColumn(col, this.helpersConf());
                await this.query(sql);
                existingCols.push(col);
            }
            keys.columns = existingCols;
            keys.colums = existingCols;
            keys.colum = existingCols;
        }

        return keys;
    }
    /**
    * intenta crear todas las tablas asociadas a los modelos cargados
    * respetando las relaciones de claves foráneas
    * @return {Promise}
    */
    async createAllTables() {
        let results = [];
        // Limpiamos el registro de tablas creadas en esta sesión para la recursión
        this._createdTables = {};

        for (let tabla in this._models) {
            try {
                // _keysInTable con el segundo parámetro en true activará la 
                // recursión de _createTable si la tabla no existe.
                await this._keysInTable(tabla, true);
                results.push({ tabla, status: "ok" });
            } catch (e) {
                results.push({ tabla, status: "error", error: e });
            }
        }
        return results;
    }

    /**
     * Ejecuta una función dentro de una transacción aislada.
     * Si la función finaliza exitosamente, se realiza COMMIT automáticamente.
     * Si lanza una excepción, se realiza ROLLBACK automáticamente.
     * Soporta transacciones anidadas transparentes usando SAVEPOINT.
     * 
     * @param {function(Connect): Promise<any>} callback - Función con el contexto transaccional 'tx'
     * @returns {Promise<any>} - Retorna el resultado devuelto por el callback
     */
    async transaction(callback) {
        if (typeof callback !== 'function') {
            throw new Error("db.transaction() requiere una función callback como argumento.");
        }

        // Si ya estamos dentro de un scope transaccional (ej: tx.transaction(...))
        if (this._isTransactionScope) {
            const savepointLevel = (this._savepointLevel || 0) + 1;
            const savepointName = `sp_${savepointLevel}`;
            const conn = this._dedicatedConnection;
            const nestedTx = this._createTransactionScope(conn, savepointLevel);

            const spSql = this._sqlSavepoint(savepointName);
            if (spSql && spSql.trim() !== '') {
                await nestedTx.query(spSql);
            }

            try {
                const result = await callback(nestedTx);
                const relSql = this._sqlReleaseSavepoint(savepointName);
                if (relSql && relSql.trim() !== '') {
                    await nestedTx.query(relSql);
                }
                return result;
            } catch (err) {
                try {
                    const rbSql = this._sqlRollbackSavepoint(savepointName);
                    if (rbSql && rbSql.trim() !== '') {
                        await nestedTx.query(rbSql);
                    }
                } catch (rbErr) {
                    // Ignoramos error en el rollback a savepoint para preservar la excepción original
                }
                throw err;
            }
        }

        // Transacción de nivel superior (raíz)
        const conn = await this._acquireDedicatedConnection();
        const tx = this._createTransactionScope(conn, 0);

        try {
            await this._beginTransactionOnConnection(conn);
            const result = await callback(tx);
            await this._commitTransactionOnConnection(conn);
            return result;
        } catch (err) {
            try {
                await this._rollbackTransactionOnConnection(conn);
            } catch (rbErr) {
                // Ignoramos error secundario del rollback raíz para propagar la excepción original
            }
            throw err;
        } finally {
            await this._releaseDedicatedConnection(conn);
        }
    }

    /**
     * Obtiene una conexión dedicada para la transacción.
     * En pools (MySQL, PostgreSQL), reserva un cliente/conexión del pool.
     * En SQLite o conexiones únicas, retorna this.connection.
     * @returns {Promise<any>}
     */
    async _acquireDedicatedConnection() {
        return this.connection;
    }

    /**
     * Libera la conexión dedicada adquirida previamente para la transacción.
     * @param {any} conn 
     * @returns {Promise<void>}
     */
    async _releaseDedicatedConnection(conn) {
        // Implementado por cada adaptador si usa pool
    }

    /**
     * Ejecuta una consulta SQL en una conexión específica.
     * @param {any} conn - Conexión dedicada
     * @param {string} sql - Consulta SQL
     * @param  {...any} params - Parámetros adicionales
     * @returns {Promise<any>}
     */
    _queryOnConnection(conn, sql, ...params) {
        return this.query(sql, ...params);
    }

    async _beginTransactionOnConnection(conn) {
        const sql = this._sqlBeginTransaction();
        if (sql && sql.trim() !== '') {
            return this._queryOnConnection(conn, sql);
        }
    }

    async _commitTransactionOnConnection(conn) {
        const sql = this._sqlCommitTransaction();
        if (sql && sql.trim() !== '') {
            return this._queryOnConnection(conn, sql);
        }
    }

    async _rollbackTransactionOnConnection(conn) {
        const sql = this._sqlRollbackTransaction();
        if (sql && sql.trim() !== '') {
            return this._queryOnConnection(conn, sql);
        }
    }

    _sqlBeginTransaction() {
        if (/mysql|mariadb/i.test(this.typeDB)) {
            return "START TRANSACTION";
        }
        return "BEGIN TRANSACTION";
    }

    _sqlCommitTransaction() {
        if (/mssql|sqlserver/i.test(this.typeDB)) {
            return "COMMIT TRANSACTION";
        }
        return "COMMIT";
    }

    _sqlRollbackTransaction() {
        if (/mssql|sqlserver/i.test(this.typeDB)) {
            return "ROLLBACK TRANSACTION";
        }
        return "ROLLBACK";
    }

    _sqlSavepoint(name) {
        if (/mssql|sqlserver/i.test(this.typeDB)) {
            return `SAVE TRANSACTION ${name}`;
        }
        return `SAVEPOINT ${name}`;
    }

    _sqlReleaseSavepoint(name) {
        if (/mssql|sqlserver/i.test(this.typeDB)) {
            return "";
        }
        return `RELEASE SAVEPOINT ${name}`;
    }

    _sqlRollbackSavepoint(name) {
        if (/mssql|sqlserver/i.test(this.typeDB)) {
            return `ROLLBACK TRANSACTION ${name}`;
        }
        return `ROLLBACK TO SAVEPOINT ${name}`;
    }

    /**
     * Construye un contexto transaccional aislado (TransactionScope).
     * @param {any} conn - Conexión dedicada
     * @param {number} level - Nivel de anidamiento de la transacción
     * @returns {Connect}
     */
    _createTransactionScope(conn, level = 0) {
        const parent = this._parentConnect || this;
        const tx = Object.create(parent);

        tx._isTransactionScope = true;
        tx._parentConnect = parent;
        tx._dedicatedConnection = conn;
        tx._savepointLevel = level;
        tx._caheTablas = {};
        tx._cacheTablas = tx._caheTablas;

        tx.query = (sql, ...params) => {
            if (!sql || (typeof sql === 'string' && sql.trim() === '')) {
                return Promise.resolve();
            }
            return tx._executeWithTiming(sql, () => {
                return parent._queryOnConnection(conn, sql, ...params);
            });
        };

        if (typeof parent._getOnConnection === 'function') {
            tx.get = (sql, ...params) => {
                return tx._executeWithTiming(sql, () => {
                    return parent._getOnConnection(conn, sql, ...params);
                });
            };
        }

        const origTabla = parent.tabla.bind(tx);
        tx.tabla = (tablaName, callback, verify = false) => {
            if (tx._caheTablas[tablaName] !== undefined) {
                if (typeof callback === "function") callback(tx._caheTablas[tablaName]);
                return tx._caheTablas[tablaName];
            }
            const t = origTabla(tablaName, callback, verify);
            const parentTable = parent._caheTablas ? parent._caheTablas[tablaName] : null;
            if (parentTable && parentTable._keys && parentTable._keysData && !t._keys) {
                t.colum = parentTable.colum;
                t.columns = parentTable.columns;
                t.colums = parentTable.colums;
                t.sql = new procesingSql(parentTable._keysData, tx.helpersConf());
                t._keys = true;
                t._keysData = parentTable._keysData;
                if (parentTable._keysData.methods) {
                    for (let i in parentTable._keysData.methods) {
                        t[i] = (...params) => parentTable._keysData.methods[i](t, tx, ...params);
                    }
                }
                if (typeof callback === "function") callback(t);
            }
            return t;
        };

        tx.commit = async () => {
            throw new Error("No debe llamar a tx.commit() manualmente dentro de db.transaction(). La transacción se confirma automáticamente al retornar exitosamente del bloque.");
        };
        tx.rollback = async () => {
            throw new Error("No debe llamar a tx.rollback() manualmente dentro de db.transaction(). Para revertir la transacción, lance una excepción dentro del bloque.");
        };
        tx.beginTransaction = async () => {
            throw new Error("No debe llamar a tx.beginTransaction() dentro de db.transaction(). Para transacciones anidadas, use await tx.transaction(async (nestedTx) => { ... }).");
        };

        return tx;
    }
}
module.exports = Connect
