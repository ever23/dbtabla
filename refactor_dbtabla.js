const fs = require('fs');
const path = require('path');

const libDir = 'c:/programacion/dbtabla/dbtabla/lib';

// 1. Refactor Connect.js
let connectFile = path.join(libDir, 'Connect.js');
let connectCode = fs.readFileSync(connectFile, 'utf8');
connectCode = connectCode.replace(/class Connect\s*\{/, 'class Connect {\n    #escapeChar;\n    #reserveIdentifiers;\n    #ar_aliased_tables;\n    #dbprefix;\n    #swap_pre;\n    #information_schema;\n    #models;\n    #caheTablas;\n    #createdTables;\n    #escapeString;');
connectCode = connectCode.replace(/this\.__/g, 'this.#');
connectCode = connectCode.replace(/^(\s*)__([a-zA-Z0-9_]+)\s*\(/gm, '$1#$2(');
fs.writeFileSync(connectFile, connectCode);

// 2. Refactor dbTabla.js
let dbTablaFile = path.join(libDir, 'dbTabla.js');
let dbTablaCode = fs.readFileSync(dbTablaFile, 'utf8');
dbTablaCode = dbTablaCode.replace(/class dbTabla\s*\{/, 'class dbTabla {\n    #connection;\n    #lastSql;\n    #keys;\n    #callbackKey;\n    #config;\n\n    get lastSql() { return this.#lastSql; }\n');
dbTablaCode = dbTablaCode.replace(/this\.__/g, 'this.#');
dbTablaCode = dbTablaCode.replace(/^(\s*)__([a-zA-Z0-9_]+)\s*\(/gm, '$1#$2(');
fs.writeFileSync(dbTablaFile, dbTablaCode);

// 3. Refactor procesingSql.js
let procesingSqlFile = path.join(libDir, 'procesingSql.js');
let procesingSqlCode = fs.readFileSync(procesingSqlFile, 'utf8');
procesingSqlCode = procesingSqlCode.replace(/class prosesingSql\s*\{/, 'class prosesingSql {\n    #helpers;');
procesingSqlCode = procesingSqlCode.replace(/this\.__/g, 'this.#');
procesingSqlCode = procesingSqlCode.replace(/^(\s*)__([a-zA-Z0-9_]+)\s*\(/gm, '$1#$2(');
fs.writeFileSync(procesingSqlFile, procesingSqlCode);

// 4. Refactor dbResult.js (read exposed property)
let dbResultFile = path.join(libDir, 'dbResult.js');
let dbResultCode = fs.readFileSync(dbResultFile, 'utf8');
dbResultCode = dbResultCode.replace(/dbTabla\.__lastSql/g, 'dbTabla.lastSql');
fs.writeFileSync(dbResultFile, dbResultCode);

console.log('Refactoring completed successfully.');
