/**
 * Declaraciones de tipos TypeScript para dbtabla
 */

export interface SelectOptions {
    /** Criterios de filtrado SQL o mediante objeto con operadores (ej: { "estado": "activo", "puntos>": 10 }) */
    where?: Record<string, any> | string;
    /** Lista de columnas a seleccionar (por defecto '*') */
    campos?: string[] | string;
    /** Alias de 'campos' */
    columns?: string[] | string;
    /** Definición de uniones (ej: { '>perfil': 'perfiles.id_user=usuarios.id' }) */
    joins?: Record<string, string>;
    /** Cláusula ORDER BY (ej: 'id DESC') */
    order?: string;
    /** Límite de registros (ej: 10) */
    limit?: number | string;
    /** Cláusula GROUP BY */
    group?: string;
    /** Cláusula HAVING */
    having?: string | Record<string, any>;
    /** Campos para el método busqueda */
    campo_bus?: string[];
    /** Término a buscar en el método busqueda */
    cadena?: string;
}

/**
 * Representa una fila de base de datos con capacidades Active Record
 */
export class dbRow {
    [key: string]: any;
    /** Sentencia SQL ejecutada */
    $sql?: string;
    /** Actualiza los cambios realizados sobre este objeto en la base de datos física */
    update(): Promise<any>;
    /** Elimina este registro de la base de datos física */
    delete(): Promise<any>;
}

/**
 * Colección de filas devuelta por consultas de selección
 */
export class dbResult extends Array<dbRow> {
    $sql?: string;
}

export class dbTablaError extends Error {
    constructor(message: string);
}

/**
 * Representación e interfaz de interacción con una tabla SQL
 */
export class dbTabla {
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
    insert(data: Record<string, any> | any[]): Promise<any>;
    insert(...values: any[]): Promise<any>;

    /**
     * Actualiza registros coincidentes
     */
    update(sets: Record<string, any>, where?: string | Record<string, any>): Promise<any>;
    updateById(sets: Record<string, any>, id: string | number): Promise<any>;

    /**
     * Elimina registros coincidentes
     */
    delete(where?: string | Record<string, any>): Promise<any>;
    deleteById(id: string | number): Promise<any>;

    /**
     * Consulta registros (Sintaxis de Objeto Único recomendada)
     */
    select(options?: SelectOptions): Promise<dbResult>;
    /**
     * Consulta registros (Sintaxis posicional alternativa)
     */
    select(
        campos?: string[] | string | null,
        joins?: Record<string, string> | null,
        where?: string | Record<string, any>,
        group?: string,
        having?: string,
        order?: string,
        limit?: number | string
    ): Promise<dbResult>;

    /**
     * Obtiene el primer registro coincidente
     */
    selectOne(options?: SelectOptions): Promise<dbRow | null>;
    selectOne(
        campos?: string[] | string | null,
        joins?: Record<string, string> | null,
        where?: string | Record<string, any>,
        group?: string,
        having?: string,
        order?: string,
        limit?: number | string
    ): Promise<dbRow | null>;

    /**
     * Busca un registro por clave primaria
     */
    selectById(id: string | number): Promise<dbRow | null>;

    /**
     * Búsqueda de texto (LIKE) en múltiples campos
     */
    busqueda(cadena: string | SelectOptions, campo_bus?: string[]): Promise<dbResult>;

    [key: string]: any;
}

/**
 * Clase base para la conexión a la base de datos
 */
export abstract class Connect {
    config: any;
    typeDB: string;
    protected _cacheTablas: Record<string, dbTabla>;
    protected _caheTablas: Record<string, dbTabla>;

    constructor(params?: any, typeDB?: string);

    helpersConf(): Record<string, any>;
    model(tabla: string): any;
    addModel(model: any): void;
    pathModels(pathModel: string): void;

    /**
     * Obtiene una instancia interactiva de dbTabla
     */
    tabla(tabla: string, callback?: (t: dbTabla, error?: any) => void, verify?: boolean): dbTabla;

    abstract query(sql: string, params?: any[]): Promise<any>;
    _keysInTable(table: string): Promise<{ tabla: string; colums?: any[]; columns?: any[] }>;
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
    new (options: { tabla: string; connection: Connect; callback?: Function; config?: any }, verify?: boolean): dbTabla;
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
