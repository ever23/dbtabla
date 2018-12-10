const dbHelper=require("../dbHelpers")
const {MYSQL_DB,SQLITE_DB,POSTGRESQL_DB} = require('../const')

class model2Sql
{
    constructor(model,helper)
    {
        this.__model=model
        this.__helpers=new dbHelper(helper)
        this.__typeDB=helper.typeDB
    }
    __colums(colum)
    {
        if(this.__typeDB===POSTGRESQL_DB && colum.autoincrement)
        {
            colum.type="serial"
        }
        let sql =`${this.__helpers.__protectIdentifiers(colum.name)} ${colum.type}`
        if(colum.defaultNull!==undefined)
            if(colum.defaultNull)
            {
                sql+=" NULL"
            }else {
                sql+=" NOT NULL"
            }
        if(colum.primary && !colum.defaultNull)
        {
            sql+=" NOT NULL"
        }
        if(colum.default!==undefined)
        {
            sql+=` DEFAULT ${this.__helpers.__formatVarInsert(colum.default)}`
        }
        if(colum.autoincrement && this.__typeDB===MYSQL_DB)
        {
            sql+=" AUTO_INCREMENT"
        }
        return sql
    }
    __primaryKeys(keys)
    {
        let colums=this.__helpers.__protectIdentifiers(keys).join(",")
        return `PRIMARY KEY (${colums})`
    }
    __uniqueKeys(keys)
    {
        let colums=this.__helpers.__protectIdentifiers(keys).join(",")
        return `UNIQUE (${colums})`
    }
    __indexKey(keys)
    {
         let colums=this.__helpers.__protectIdentifiers(keys).join(",")
         return `INDEX (${colums})`
    }
    __foreingKey(tabla,keys,numero)
    {
        let keyReference="",key=""
        if(keys.keyReference instanceof Array)
        {
            keyReference=this.__helpers.__protectIdentifiers(keys.keyReference).join(",")
        }else {
            keyReference=this.__helpers.__protectIdentifiers(keys.keyReference)
        }
        if(keys.key instanceof Array)
        {
            key=this.__helpers.__protectIdentifiers(keys.key).join(",")
        }else {
            key=this.__helpers.__protectIdentifiers(keys.key)
        }
        let constrait=this.__helpers.__protectIdentifiers(`m2s_${tabla}_${keys.reference}_${numero}`)
        let sql=`CONSTRAINT ${constrait} FOREIGN KEY (${key}) REFERENCES ${this.__helpers.__protectIdentifiers(keys.reference)} (${keyReference})`
        if(keys.match!==undefined)
        {
            sql+=` MATCH ${keys.match}`
        }
        if(keys.onUpdate!==undefined)
        {
            sql+=` ON UPDATE ${keys.onUpdate}`
        }
        if(keys.onDelete!==undefined)
        {
            sql+=` ON DELETE ${keys.onDelete}`
        }
        return sql
    }
    __cerateTable(data)
    {

        let colums= [],
        primary   = [],
        unique    = [],
        index     = []

        for(let colum of data.colums)
        {


            colums.push(this.__colums(colum))
            if(colum.primary!==undefined && colum.primary)
                primary.push(colum.name)
            if(colum.unique!==undefined && colum.unique)
                unique.push(colum.name)
        }

        if(primary.length>0)
        {
            colums.push(this.__primaryKeys(primary))
        }
        if(unique.length>0)
        {
            colums.push(this.__uniqueKeys(unique))
        }
        if(this.__typeDB===MYSQL_DB)
        {
            for(let keys of data.foreingKey)
            {
                if(keys.key instanceof Array)
                {
                    for(let i of keys.key)
                        index.push(i)
                }else {
                    index.push(keys.key)
                }
            }

            if(index.length>0)
                colums.push(this.__indexKey(index))
        }

        let i=1
        for(let keys of data.foreingKey)
            colums.push(this.__foreingKey(data.tabla,keys,i++))
        return `CREATE TABLE ${this.__helpers.__protectIdentifiers(data.tabla)} (${colums.join(",")});`
    }
    sql()
    {
        return this.__cerateTable(this.__model.getData())
    }
}
module.exports=model2Sql
