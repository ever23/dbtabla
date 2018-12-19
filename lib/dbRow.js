/**
* dbRow
* maneja las filas de la consulta
*
*/
class dbRow
{
    /**
    * @param {dbTabla} dbtabla - objeto de la tabla que genero la consulta
    * @param {data} data - fila
    */
    constructor(dbTabla,data)
    {
        Object.defineProperty(this, "$dbTabla", {
            configurable : true,
            enumerable   : false,
            value        : dbTabla,
        })
        Object.defineProperty(this, "$lastData", {
            configurable : true,
            enumerable   : false,
            value        : data,
        })

        //this.$dbTabla=dbTabla
        for(let i in data)
        {
            this[i]=data[i]
        }
    }
    /**
    * inserta los datos de la fila en la tabla que la genero
    * @return {Promise}
    */
    insert()
    {
        return  this.$dbTabla.insert(this)
    }
    /**
    * guarda los cambios de la fila
    * @return {Promise}
    */
    update()
    {
        return new  Promise((resolve,reject)=>
        {
            let where={}
            //console.log(this[this.$dbTabla.primary[0]])

            if (this.$dbTabla.primary.length > 0)
            {
                for(let i in this.$dbTabla.primary)
                {
                    if(typeof this.$lastData[this.$dbTabla.primary[i]]!=="undefined")
                    {
                        where[this.$dbTabla.primary[i]]=this.$lastData[this.$dbTabla.primary[i]]
                    }
                }
            }else {
                where=this.$lastData
            }
            let changes={}
            for(let i in this.$lastData)
            {
                if(this[i]!==this.$lastData[i])
                    changes[i]=this[i]
            }
            this.$dbTabla.update(changes,where).then(resolve).catch(reject)
        })
    }
    /**
    * elimina la fila de la base de datos
    * @return {Promise}
    */
    delete()
    {
        let where ={}
        if (this.$dbTabla.primary.length > 0)
        {
            for(let i in this.$dbTabla.primary)
            {
                where[this.$dbTabla.primary[i]]=this.$lastData[this.$dbTabla.primary[i]]
            }
        } else
        {
            where = this.$lastData
        }
        return  this.$dbTabla.delete(where)
    }

}
module.exports=dbRow
