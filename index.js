const dbTabla=require("./lib/dbTabla")
Object.defineProperty(dbTabla, "connect", {
    configurable : true,
    enumerable   : false,
    value        : require("./lib/Connect")
})

let constants=require("./lib/const.js")
for(let i in constants) 
{
    Object.defineProperty(dbTabla, i, {
        configurable : true,
        enumerable   : false,
        value        : constants[i]
    })
}

dbTabla.Connect = require("./lib/Connect")
dbTabla.dbResult = require("./lib/dbResult")
dbTabla.dbRow = require("./lib/dbRow")
dbTabla.dbTablaError = require("./lib/dbTablaError")
dbTabla.procesingSql = require("./lib/procesingSql")

module.exports=dbTabla
