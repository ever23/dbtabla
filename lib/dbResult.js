const dbRow = require("./dbRow")
/**
* dbResult
* maneja el resultado de una consulta select
*/
class dbResult extends Array
{
    static get [Symbol.species]() {
        return Array;
    }

    /**
    * @param {dbTabla} dbTabla - objeto de la tabla que ejecuto la consulta
    * @param {array} data - resultado de la consulta  
    */
    constructor(dbTabla, data)
    {
        // Manejo de llamadas internas de Array (ej: slice o llamadas del constructor de subclase)
        if (typeof dbTabla === 'number' && data === undefined) {
            super(dbTabla);
            return;
        }

        if (!data) {
            super();
            return;
        }

        const rows = data.map(d => new dbRow(dbTabla, d));
        super(...rows);

        Object.defineProperty(this, "$sql", {
            configurable : true,
            enumerable   : false,
            value        : dbTabla.lastSql,
        })
    }

    /**
     * Sobreescritura de map para devolver un Array común con objetos comunes
     */
    map(fn, thisArg) {
        const arr = new Array(this.length);
        for (let i = 0; i < this.length; i++) {
            // Pasamos una copia plana del objeto (simple object)
            arr[i] = fn.call(thisArg, { ...this[i] }, i, this);
        }
        return arr;
    }

    /**
     * Sobreescritura de filter para devolver un Array común con objetos comunes
     */
    filter(fn, thisArg) {
        const arr = [];
        for (let i = 0; i < this.length; i++) {
            const plain = { ...this[i] };
            if (fn.call(thisArg, plain, i, this)) {
                arr.push(plain);
            }
        }
        return arr;
    }

    /**
     * Sobreescritura de forEach para trabajar con objetos comunes
     */
    forEach(fn, thisArg) {
        for (let i = 0; i < this.length; i++) {
            fn.call(thisArg, { ...this[i] }, i, this);
        }
    }
}
module.exports=dbResult
