const dbTabla = require("./lib/dbTabla")
const Connect = require("./lib/Connect")
const constants = require("./lib/const.js")
const dbResult = require("./lib/dbResult")
const dbRow = require("./lib/dbRow")
const dbTablaError = require("./lib/dbTablaError")
const procesingSql = require("./lib/procesingSql")

dbTabla.dbTabla = dbTabla
dbTabla.Connect = Connect
dbTabla.connect = Connect
dbTabla.dbResult = dbResult
dbTabla.dbRow = dbRow
dbTabla.dbTablaError = dbTablaError
dbTabla.procesingSql = procesingSql

dbTabla.MYSQL_DB = constants.MYSQL_DB
dbTabla.POSTGRESQL_DB = constants.POSTGRESQL_DB
dbTabla.SQLITE3_DB = constants.SQLITE3_DB
dbTabla.SQLSERVER_DB = constants.SQLSERVER_DB

module.exports = dbTabla
module.exports.dbTabla = dbTabla
module.exports.Connect = Connect
module.exports.connect = Connect
module.exports.dbResult = dbResult
module.exports.dbRow = dbRow
module.exports.dbTablaError = dbTablaError
module.exports.procesingSql = procesingSql
module.exports.MYSQL_DB = constants.MYSQL_DB
module.exports.POSTGRESQL_DB = constants.POSTGRESQL_DB
module.exports.SQLITE3_DB = constants.SQLITE3_DB
module.exports.SQLSERVER_DB = constants.SQLSERVER_DB
