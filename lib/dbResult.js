const dbRow = require("./dbRow")
/**
* dbResult
* maneja el resultado de una consulta select
*/
class dbResult extends Array
{
    /**
    * @param {dbTabla} dbTabla - objeto de la tabla que ejecuto la consulta
    * @param {array} data - resultado de la consulta  
    */
    constructor(dbTabla,data)
    {
        data.forEach((d,i)=>
        {
            data[i]=new dbRow(dbTabla,d)
        })

        super(...data)
        Object.defineProperty(this, "$sql", {
            configurable : true,
            enumerable   : false,
            value        : dbTabla.__lastSql,
        })
        //this.sql=dbTabla.__lastSql
    }
}
module.exports=dbResult
