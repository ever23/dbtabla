const model2Sql = require("./model2Sql")
class dbTablaModel
{
    constructor(tableName,params)
    {
        this.tabla=tableName
        /*
        {
            name:string,
            type:string,
            defaultNull:boolean,
            prymary:boolean,
            unique:bolean,
            defaul:string
        }
        */
        let colums,foreingKey
        if(params instanceof Array)
        {
            colums=params
        }else {
            colums=params.colums
            foreingKey=params.foreingKey
        }

        this.__colums =colums || []
        /*
        {
            key:string|array,
            reference:string,
            keyReference:string|array,
            match:string,
            onDelete:string,
            onUpdate:string
        }
        */
        this.__foreingKey  = foreingKey||[]
        this.__init=[]
    }
    getData()
    {
        return {
            tabla:this.tabla,
            colums:this.__colums,
            foreingKey:this.__foreingKey
        }
    }
    colum(coll)
    {
        this.__colums.push(coll)
    }
    foreingKey(key)
    {
        if(key===undefined)
            return this.__foreingKey
        this.__foreingKey.push(key)
    }
    init(colums)
    {
        this.__init=colums
    }
    keys()
    {
        let orderColum={}
        let colums={}
        let primarykey=[]
        let autoincrement=""
        for(let i in this.__colums)
        {
            let item=this.__colums[i]
            orderColum[i]=item.name


            colums[item.name]={
                Type: item.type,
                TypeName : "",
                KEY : "",
                Extra :"",
                Default :  "",
                Nullable :  (item.defaultNull && !item.autoincrement)?true:false,
                Position : i
            }
            if (item.primary)
            {
                primarykey.push(item.name)
            }
            if (item.autoincrement )
            {
                autoincrement = item.name
            }
        }
        return {
            colum:colums,
            primary:primarykey,
            autoincrement:autoincrement,
            OrderColum:orderColum,
        }
    }
    sql(Connect)
    {
        const  tabla= new model2Sql(this,Connect.helpersConf())
        return tabla.sql()
    }

}
module.exports=dbTablaModel
