# dbTabla

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]

## Tabla de contenidos

- [Install](#install)
- [Introduccion](#introduccion)
- [Uso](#uso)

## install

dbtabla es un  modulo de [Node.js](https://nodejs.org/es/) valido registrado en [npm registry](https://www.npmjs.com/).

Para instalar use [`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```sh
$ npm install dbtabla
```
## introduccion

dbtabla es una interface de alto nivel para generar consultas sql compatible con mysql, sqlite3 y posgesql.
Escrito en JavaScript

## uso 

Para usar este modulo es nesesario extender la clase Connect para crear
la clase de coneccion para el motor de base de datos elegido
ejemplo: 
```js
// file mysqlTable.js
const {MYSQL_DB,connect}=require("dbtabla")
const mysql=require("mysql")
class mysqlTable extends connect
{
    constructor(params)
    {
        super(params,MYSQL_DB)
        // aqui su codigo de inicializacion y coneccion 
    }
    query(sql)
    {
        // aqui su codigo para ejecutar consultas
    }
    __escapeString(str)
    {
        // aqui su codigo para filtrar sqli
    }
    __keysInTable(table,callback)
    {
        // aqui su codigo para obtener los metadatos de la tabla 
    }
}
```
Deben ser redefinidos los metodos constructor, query, __escapeString, __keysInTable
En el constructor se establecera la coneccion 
query: debe ejecutar el sql recibido en su parametro y retornar una promesa 
__escapeString: escapara el texto que reciba para evitar inyecciones sqli 
__keysInTable: obtendra los metadatos de la tabla del primer parametro y los pasara 
a la funcion callback del segundo parametro en el siguiente formato 
Ejempor
```js
callback({
    tabla:"tabla1",// nombre de la tabla recibida en el primer parametro
    colums:[
        {
            name:string,
            type:string,
            defaultNull:boolean,
            primary:boolean,
            unique:bolean,
            defaul:string,
            autoincrement:boolean
        },
        .
        .
        .
    ]
})
```
y su uso seria de la siguiente manera 

```js
const mysql=require("./mysqlTable.js")
let connect= new mysql({/* params mysql */})
let test1=connect.tabla("test1")
test1.insert(/* datos a insertar */).then(ok=>
{
    console.log(ok)
}).catch(e=>
{
    console.log(e)
})
```


[npm-image]: https://img.shields.io/npm/v/dbtabla.svg
[npm-url]: https://npmjs.org/package/dbtabla
[node-version-image]: https://img.shields.io/node/v/dbtabla.svg
[node-version-url]: https://nodejs.org/en/download/
[coveralls-url]: https://coveralls.io/r/mysqljs/mysql?branch=master
[downloads-image]: https://img.shields.io/npm/dm/dbtabla.svg
[downloads-url]: https://npmjs.org/package/dbtabla
