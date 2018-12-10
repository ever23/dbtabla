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
            let where=[]
            //console.log(this[this.$dbTabla.primary[0]])
            let j=0
            //console.log(this.$dbTabla.primary)
            for(let i in this.$dbTabla.primary)
            {
                if(typeof this[this.$dbTabla.primary[i]]!=="undefined")
                {
                    j++
                    where[this.$dbTabla.primary[i]]=this[this.$dbTabla.primary[i]]
                }
            }
            if(j===0)
            {
                return reject(`No existen claves primarias en la tabla ${this.$dbTabla.tabla}`)
            }
            this.$dbTabla.update(this,where).then(resolve).catch(reject)
        })
    }
    /**
    * elimina la fila de la base de datos
    * @return {Promise}
    */
    delete()
    {
        let where =[]
        if (this.$dbTabla.primary.length > 0)
        {
            for(let i in this.$dbTabla.primary)
            {
                where[this.$dbTabla.primary[i]]=this[this.$dbTabla.primary[i]]
            }
        } else
        {
            where = this
        }
        return  this.$dbTabla.delete(where)
    }

}
module.exports=dbRow
