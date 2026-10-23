/**
 * Declaraciones de tipos TypeScript para dbtabla
 * Abstracción ORM ligera con Active Record para SQL
 */

/**
 * Operadores de comparación soportados al final del nombre del campo en objetos `where`:
 * - `=` : Igualdad explícita (comportamiento por defecto al omitir operador)
 * - `!` o `!=` : Distinto de (para `null`, genera automáticamente `IS NOT NULL`)
 * - `>` : Mayor que
 * - `<` : Menor que
 * - `>=` : Mayor o igual que
 * - `<=` : Menor o igual que
 * - `%` : Búsqueda `LIKE` (ej: `'nombre%': '%Juan%'`)
 */
export type WhereComparisonOperator = '=' | '!' | '!=' | '>' | '<' | '>=' | '<=' | '%';

/**
 * Prefijos de concatenación lógica entre condiciones en objetos `where`:
 * - `||` : Concatena la condición actual con la anterior mediante `OR`
 * - `&&` : Concatena la condición actual con la anterior mediante `AND` (comportamiento por defecto)
 */
export type WhereLogicPrefix = '||' | '&&' | '';

/**
 * Valores escalares primitivos válidos para condiciones SQL
 */
export type WherePrimitive = string | number | boolean | Date | null | undefined;

/**
 * Valor aceptado en una condición del objeto `where`:
 * - Escalar: `col = val` (o con el operador indicado).
 *   Si el valor es `null`, `=` se transforma en `IS NULL` y `!` / `!=` en `IS NOT NULL`.
 * - Arreglo: Se evalúa como condiciones agrupadas con `OR`:
 *   `{ id: [1, 2, 3] }` => `(id = 1 OR id = 2 OR id = 3)`
 *   `{ 'nombre%': ['%Ana%', '%Juan%'] }` => `(nombre LIKE '%Ana%' OR nombre LIKE '%Juan%')`
 */
export type WhereValue = WherePrimitive | WherePrimitive[];

/**
 * Nombre de campo con operador sufijo y prefijo lógico opcional.
 * Proporciona autocompletado para propiedades del tipo `T` manteniendo compatibilidad
 * con cualquier expresión o columna calificada (ej: `'usuarios.id'`, `'DATE(fecha)>'`).
 */
export type WhereKey<T = Record<string, any>> =
    | (keyof T & string)
    | `${WhereLogicPrefix}${keyof T & string}`
    | `${WhereLogicPrefix}${keyof T & string}${WhereComparisonOperator}`
    | `${string}`;

/**
 * Objeto de condiciones estructuradas `where`.
 * 
 * Permite sintaxis concisa y segura sin necesidad de concatenar strings SQL manualmente.
 * 
 * @example
 * ```ts
 * const where: WhereObject<Usuario> = {
 *   estado: 'activo',
 *   'edad>=': 18,
 *   'puntos<': 100,
 *   'nombre%': '%Carlos%',
 *   'rol': ['admin', 'editor'], // (rol = 'admin' OR rol = 'editor')
 *   '||categoria': 'vip',        // OR categoria = 'vip'
 *   'eliminado_en!': null        // eliminado_en IS NOT NULL
 * };
 * ```
 */
export type WhereObject<T = Record<string, any>> = {
    [K in WhereKey<T>]?: WhereValue;
} & {
    [key: string]: WhereValue | any;
};

/**
 * Cláusula `where` para consultas o modificaciones:
 * puede ser un objeto estructurado (`WhereObject<T>`) o una sentencia SQL pura (`string`).
 */
export type WhereClause<T = Record<string, any>> = WhereObject<T> | string;

/**
 * Columna o expresión de selección SQL.
 * Sugiere las propiedades del modelo `T` y permite alias o funciones de agregación SQL (`COUNT(*)`, `AS alias`).
 */
export type ColumnItem<T = Record<string, any>> = (keyof T & string) | (string & {});

/**
 * Especificación de columnas a consultar.
 * - Array de nombres de columnas: `['id', 'nombre', 'email']` o `['u.id', 'COUNT(*) as total']`
 * - String con lista de columnas separadas por comas o comodín: `'*'`, `'id, nombre, email'`, `'usuarios.*'`
 */
export type ColumnList<T = Record<string, any>> = ColumnItem<T>[] | string;

/**
 * Prefijos de unión de tablas soportados por dbtabla:
 * - `>` : `LEFT JOIN`
 * - `<` : `RIGHT JOIN`
 * - `=` : `INNER JOIN`
 * - (sin prefijo) : `NATURAL JOIN`
 */
export type JoinPrefix = '>' | '<' | '=' | '';

/**
 * Identificador de tabla en uniones con prefijo opcional (ej: `'>perfiles'`, `'=roles'`, `'<empresas'`)
 */
export type JoinTableKey = `>${string}` | `<${string}` | `=${string}` | string;

/**
 * Condición de unión (JOIN):
 * - String con operador de comparación (`=`, `!=`, `<`, `>`, `<=`, `>=`): Cláusula `ON(expresión)`
 *   Ej: `'perfiles.id_user = usuarios.id'`
 * - String simple (nombre de columna): Cláusula `USING(columna)`
 *   Ej: `'id_usuario'`
 * - Array de nombres de columnas: Cláusula `USING(col1, col2, ...)`
 *   Ej: `['id_usuario', 'tenant_id']`
 * - Objeto estructurado: Cláusula `ON(condiciones...)` generada automáticamente
 *   Ej: `{ 'perfiles.id_user': 'usuarios.id' }`
 */
export type JoinCondition = string | string[] | Record<string, any>;

/**
 * Mapa de uniones donde las claves son tablas (con prefijo opcional `>`, `<`, `=`)
 * y los valores son las condiciones ON / USING.
 * 
 * @example
 * ```ts
 * const joins: JoinsObject = {
 *   '>perfiles': 'perfiles.id_user = usuarios.id', // LEFT JOIN perfiles ON(perfiles.id_user = usuarios.id)
 *   '=roles': 'id_rol',                            // INNER JOIN roles USING(id_rol)
 *   '>permisos': ['id_user', 'id_rol']             // LEFT JOIN permisos USING(id_user, id_rol)
 * };
 * ```
 */
export type JoinsObject = {
    [table: JoinTableKey]: JoinCondition;
} & Record<string, JoinCondition>;

/**
 * Cláusula de uniones soportada en opciones o parámetros:
 * Puede ser un mapa de uniones (`JoinsObject`), un array de tablas (`string[]`) o un string SQL.
 */
export type JoinsClause = JoinsObject | string[] | string;

/**
 * Opciones para consultas `select`, `selectOne` y `busqueda` (Sintaxis de Objeto Único).
 */
export interface SelectOptions<T = Record<string, any>> {
    /**
     * Criterios de filtrado SQL estructurados o en texto SQL plano.
     * 
     * Soporta operadores al final (`=`, `!`, `!=`, `>`, `<`, `>=`, `<=`, `%`),
     * prefijos lógicos (`||`, `&&`), arreglos para comparaciones múltiples agrupadas en OR,
     * y conversión automática de `null` a `IS NULL` / `IS NOT NULL`.
     * 
     * @example
     * ```ts
     * { where: { "estado": "activo", "puntos>=": 10 } }
     * { where: { "nombre%": "%Juan%", "||nombre%": "%Pedro%" } }
     * { where: { "id": [1, 2, 3] } } // (id = 1 OR id = 2 OR id = 3)
     * { where: "puntos > 10 AND activo = 1" }
     * ```
     */
    where?: WhereClause<T>;

    /**
     * Lista de columnas a seleccionar.
     * Por defecto `['tabla.*']` (o `'*'`).
     * 
     * @example
     * ```ts
     * { campos: ['id', 'nombre', 'email'] }
     * { campos: 'id, nombre, email' }
     * { campos: ['u.id', 'COUNT(*) as total'] }
     * ```
     */
    campos?: ColumnList<T>;

    /**
     * Alias de `campos` (recomendado si prefieres nomenclatura en inglés).
     */
    columns?: ColumnList<T>;

    /**
     * Alias de `columns` (soportado por retrocompatibilidad histórica).
     */
    colums?: ColumnList<T>;

    /**
     * Definición de uniones (JOINs).
     * 
     * Prefijos:
     * - `>` : LEFT JOIN
     * - `<` : RIGHT JOIN
     * - `=` : INNER JOIN
     * - sin prefijo : NATURAL JOIN
     * 
     * @example
     * ```ts
     * { joins: { '>perfiles': 'perfiles.id_user = usuarios.id', '=roles': 'id_rol' } }
     * ```
     */
    joins?: JoinsClause;

    /**
     * Cláusula ORDER BY.
     * Puede ser un string SQL (`"id DESC"`, `"nombre ASC, id DESC"`) o un array de columnas (`['nombre ASC', 'id DESC']`).
     */
    order?: string | (keyof T & string)[] | string[];

    /**
     * Límite de registros y paginación.
     * Puede ser un número (`10`), string (`"10"`, `"10 OFFSET 20"`), o tupla `[offset, limit]` (`[20, 10]`).
     */
    limit?: number | string | [number, number];

    /**
     * Cláusula GROUP BY.
     * Puede ser un string SQL (`"categoria"`, `"pais, ciudad"`) o un array de columnas.
     */
    group?: string | (keyof T & string)[] | string[];

    /**
     * Cláusula HAVING.
     * Puede ser un objeto estructurado (`WhereObject`) o un string SQL (`"COUNT(*) > 5"`).
     */
    having?: WhereClause<any>;

    /**
     * Lista de columnas donde se ejecutará la búsqueda en el método `busqueda`.
     */
    campo_bus?: ColumnList<T>;

    /**
     * Texto o término a buscar en el método `busqueda`.
     */
    cadena?: string;
}

/**
 * Representa una fila individual obtenida de la base de datos con capacidades Active Record
 */
export class dbRow<T = Record<string, any>> {
    [key: string]: any;
    /** Sentencia SQL exacta ejecutada para obtener o modificar este registro */
    $sql?: string;
    /** Actualiza los cambios realizados sobre este objeto en la base de datos física */
    update(): Promise<any>;
    /** Elimina este registro de la base de datos física */
    delete(): Promise<any>;
}

/**
 * Fila de datos combinada con las propiedades tipadas del modelo T y los métodos Active Record
 */
export type DbRowRecord<T = Record<string, any>> = dbRow<T> & T;

/**
 * Colección de filas devuelta por consultas de selección
 */
export class dbResult<T = Record<string, any>> extends Array<DbRowRecord<T>> {
    /** Sentencia SQL ejecutada */
    $sql?: string;
}

export class dbTablaError extends Error {
    constructor(message: string);
}

/**
 * Representación e interfaz de interacción con una tabla SQL
 */
export class dbTabla<T = Record<string, any>> {
    readonly lastSql: string;
    tabla: string;
    typeDB: string;
    columns: any[];
    colums: any[];
    colum: any[];

    constructor(options: { tabla: string; connection: Connect; callback?: Function; config?: any }, verify?: boolean);

    /**
     * Inserta registros en la tabla
     */
    insert(data: Partial<T> | Partial<T>[] | Record<string, any> | Record<string, any>[]): Promise<any>;
    insert(...values: any[]): Promise<any>;

    /**
     * Inserta múltiples filas en una única sentencia SQL de alto rendimiento (Bulk Insert)
     * @param filas Arreglo de objetos a insertar
     */
    insertAll(filas: (Partial<T> | Record<string, any>)[]): Promise<any>;

    /**
     * Actualiza registros coincidentes
     */
    update(sets: Partial<T> | Record<string, any>, where: WhereClause<T>): Promise<any>;
    updateById(sets: Partial<T> | Record<string, any>, id: string | number): Promise<any>;

    /**
     * Elimina registros coincidentes
     */
    delete(where: WhereClause<T>): Promise<any>;
    deleteById(id: string | number): Promise<any>;
    deleteById(sets: any, id: string | number): Promise<any>;

    /**
     * Consulta registros utilizando Sintaxis de Objeto Único (Recomendada)
     */
    select(options?: SelectOptions<T>): Promise<dbResult<T>>;
    /**
     * Consulta registros utilizando sintaxis posicional clásica
     */
    select(
        campos?: ColumnList<T> | null,
        joins?: JoinsClause | null,
        where?: WhereClause<T> | null,
        group?: string | string[],
        having?: WhereClause<any> | null,
        order?: string | string[],
        limit?: number | string | [number, number]
    ): Promise<dbResult<T>>;

    /**
     * Obtiene el primer registro coincidente utilizando Sintaxis de Objeto Único (Recomendada)
     */
    selectOne(options?: SelectOptions<T>): Promise<DbRowRecord<T> | null>;
    /**
     * Obtiene el primer registro coincidente utilizando sintaxis posicional clásica
     */
    selectOne(
        campos?: ColumnList<T> | null,
        joins?: JoinsClause | null,
        where?: WhereClause<T> | null,
        group?: string | string[],
        having?: WhereClause<any> | null,
        order?: string | string[]
    ): Promise<DbRowRecord<T> | null>;

    /**
     * Busca un registro por su clave primaria
     */
    selectById(id: string | number): Promise<DbRowRecord<T> | null>;
    selectById(campos: ColumnList<T> | null, id: string | number): Promise<DbRowRecord<T> | null>;
    selectById(campos: ColumnList<T> | null, joins: JoinsClause | null, id: string | number): Promise<DbRowRecord<T> | null>;

    /**
     * Búsqueda de texto (LIKE) en múltiples campos con algoritmo de ponderación
     */
    busqueda(options: SelectOptions<T>): Promise<dbResult<T>>;
    busqueda(
        cadena: string,
        campo_bus?: ColumnList<T>,
        campos?: ColumnList<T>,
        where?: WhereClause<T>,
        joins?: JoinsClause,
        group?: string,
        having?: string,
        order?: string,
        limit?: number | string
    ): Promise<dbResult<T>>;

    [key: string]: any;
}

/**
 * Clase base para la conexión a la base de datos
 */
/**
 * Objeto emitido en el evento 'query' para observabilidad y registro de consultas
 */
export interface QueryEvent {
    /** Sentencia SQL ejecutada */
    sql: string;
    /** Duración de la consulta en milisegundos */
    timeMs: number;
    /** Error si la consulta falló, o null si finalizó con éxito */
    error: any | null;
    /** Indica si la consulta se ejecutó dentro de una transacción */
    isTransaction: boolean;
    /** Timestamp de la consulta */
    timestamp: number;
}

export abstract class Connect {
    config: any;
    typeDB: string;
    protected _cacheTablas: Record<string, dbTabla<any>>;
    protected _caheTablas: Record<string, dbTabla<any>>;

    constructor(params?: any, typeDB?: string);

    helpersConf(): Record<string, any>;
    model(tabla: string): any;
    addModel(model: any): void;
    pathModels(pathModel: string): void;

    /**
     * Obtiene una instancia interactiva de dbTabla tipada con soporte para métodos de negocio inyectados
     */
    tabla<T = Record<string, any>, TMethods = Record<string, any>>(
        tabla: string,
        callback?: (t: dbTabla<T> & TMethods, error?: any) => void,
        verify?: boolean
    ): dbTabla<T> & TMethods;

    abstract query(sql: string, params?: any[]): Promise<any>;

    /**
     * Se suscribe al evento de ejecución de consultas
     */
    on(event: 'query', listener: (e: QueryEvent) => void): this;
    on(event: string | symbol, listener: (...args: any[]) => void): this;
    once(event: 'query', listener: (e: QueryEvent) => void): this;
    once(event: string | symbol, listener: (...args: any[]) => void): this;

    /**
     * Atajo para alertar o loggear cuando una consulta supera el umbral de tiempo especificado en milisegundos.
     */
    onSlowQuery(thresholdMs: number, callback: (e: QueryEvent) => void): this;

    /**
     * Ejecuta una serie de operaciones en una transacción aislada.
     * Realiza COMMIT automáticamente al terminar el bloque o ROLLBACK si se produce un error.
     * Soporta transacciones anidadas automáticas mediante SAVEPOINT.
     */
    transaction<TResult = any>(callback: (tx: this) => Promise<TResult>): Promise<TResult>;

    _keysInTable(table: string): Promise<{ tabla: string; colums?: any[]; columns?: any[] }>;
    _syncModelColumns(table: string, keys: any): Promise<any>;
    inModel(tabla: string, create?: boolean): Promise<any>;
}

export class procesingSql {
    constructor(keys: any, config: any);
    [key: string]: any;
}

export const MYSQL_DB: string;
export const POSTGRESQL_DB: string;
export const SQLITE3_DB: string;
export const SQLSERVER_DB: string;

export interface dbTablaStatic {
    new <T = Record<string, any>>(options: { tabla: string; connection: Connect; callback?: Function; config?: any }, verify?: boolean): dbTabla<T>;
    dbTabla: typeof dbTabla;
    Connect: typeof Connect;
    connect: typeof Connect;
    dbResult: typeof dbResult;
    dbRow: typeof dbRow;
    dbTablaError: typeof dbTablaError;
    procesingSql: typeof procesingSql;
    MYSQL_DB: string;
    POSTGRESQL_DB: string;
    SQLITE3_DB: string;
    SQLSERVER_DB: string;
}

declare const defaultExport: dbTablaStatic;
export default defaultExport;
