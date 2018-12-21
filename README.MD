# dbTabla

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]

## Tabla de contenidos

- [Install](#install)
- [Introduccion](#introduccion)
- [Uso](#uso)
- [dbTabla](#dbtabla)

## install

dbtabla es un  modulo de [Node.js](https://nodejs.org/es/) valido registrado en [npm registry](https://www.npmjs.com/).

Para instalar use [`npm install` command](https://docs.npmjs.com/getting-started/installing-npm-packages-locally):

```sh
$ npm install dbtabla
```
## introduccion

dbtabla es una interface de alto nivel abstracta para generar consultas sql compatible con mysql, sqlite3 y postgesql.
Escrito en JavaScript

## uso

Para usar este modulo es nesesario extender la clase Connect para crear
la clase de conexion para el motor de base de datos elegido
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
        // aqui su codigo de inicializacion y conexion
    }
    query(sql)
    {
        // aqui su codigo para ejecutar consultas
    }
    __escapeString(str)
    {
        // aqui su codigo para filtrar sqli
    }
    __keysInTable(table)
    {
        // aqui su codigo para obtener los metadatos de la tabla
    }
}
```

Deben ser redefinidos los metodos *`constructor, query, __escapeString, __keysInTable`*

- En el constructor se establecera la conexion

- *`query`*: debe ejecutar el sql recibido en su parametro y retornar una promesa

- *`__escapeString`*: escapara el texto que reciba para evitar inyecciones sqli

- *`__keysInTable`*: obtendra los metadatos de la tabla del primer parametro y retornara una promesa con los metadatos
Ejempo:
```js
 __keysInTable(table)
 {
     return new Promise((res,rej)=>
     {
         res({
             tabla:table,
             colums:[
                {
                    name:string,
                    type:string,
                    defaultNull:boolean,
                    primary:boolean,
                    unique:boolean,
                    defaul:string,
                    autoincrement:boolean
                },
                .
                .
                .]
         })
     })
 }
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
El metodo tabla() de mysqlTable retorna un objeto dbTabla que representa
la tabla en la base de datos con el mismo nombre del parametro

## **Connect**
Clase abstracta para administrar la conexion con la base de datos

### Connect#tabla(tabla,[callback,[verify]])
Factoriza y retorna un objeto dbTabla que representara a la tabla con el nombre del primer parametro

* `tabla {string}`: Nombre de la tabla en la base de datos
* `callback {function} (opcional)`: Funcion que sera ejecutada cuando se verifique la existencia de la tabla, esta funcion recibira un parametro que sera el objeto dbTabla creado y si la tabla no es encontrada el parametro sera *null*
* `verify {boolean} (opcional)`: indica  si la verificacion se realizara al instante o se esperara a la primera consulta

### Connect#model(tabla)
Verifica si un modelo existe y lo retorna si no existe retorna *`false`*

* `tabla {string}`: Nombre del modelo

### Connect#addModel(model)
Agrega un modelo
* `model {sqlModel|object|string}`: Si es un objeto instanceado de sql-model se agregara a la lista de modelos, si es un objeto pero no de sql-model se tomara como los datos para factorizar un modelo deberia tener el formato *`{tabla:String, campos:Array, foreingKey:Array}`* y si es un string deberia ser una clausula sql *`CREATE TABLE`* de la cual se factorizara el modelo
[Mas documentacion sobre sql-model..](https://github.com/ever23/sql-model#uso)
```js
//ejemplo 1
const model=require("sql-model")
let connect= new Connect(/*parametros de conexion */)
const test2=new model("test2",{
    campos:[
        {
            name:"id",
            type:"int",
            primary:true,
        },
        {
            name:"row1",
            type:"text"
        },
        {
            name:"row2",
            type:"int",
        },
        {
            name:"row3",
            type:"date",
        }
    ]
})
connect.addModel(test2)
```
```js
//ejemplo 2
let connect= new Connect(/*parametros de conexion */)
connect.addModel({
    tabla:"test2",
    campos:[
        {
            name:"id",
            type:"int",
            primary:true,
        },
        {
            name:"row1",
            type:"text"
        },
        {
            name:"row2",
            type:"int",
        },
        {
            name:"row3",
            type:"date",
        }
    ]
})
```
```js
//ejemplo 3
let connect= new Connect(/*parametros de conexion */)
connect.addModel(`CREATE TABLE test2 (
    id int,
    row1 text,
    row2 int,
    row3 date,
    primary key (id)
)`)
```

### Connect#pathModels(path)
Cargar todos los modelos existentes en el directorio path  
* `path {string}`: directorio de modelos

### Connect#inModel(tabla,create)

Verifica si la tabla esta representada en un modelo si el parametro create es true se intentara crear la tabla e inicializarla retorna una promesa si no existe el modelo lanzara un catch 
* `tabla {string}`: nombre de la tabla
* `create {boolean}`: indica si se creara e inicializara la tabla en la base de datos

### Connect#\_\_keysInTable(tabla)
Metodo abstracto que verificara la existencia de la tabla en la base de datos y retornar una promesa el valor de la promesa debe ser en el siguiente formato
```js
{
    tabla:{String}, // nombre de la tabla   
    colums:{Array} // columnas de la tabla
}
```
* `tabla {string}`: Nombre de la tabla

### Connect#query(sql)

Metodo abstracto debe ejecutar una consulta sql en la base de datos y retornar una promesa

* `sql {string}`: consulta sql

### Connect#end()

Metodo abstracto debe terminar la conexion


## **dbtabla**
dbTabla es una representacion de una tabla en una base de datos para realizar
operaciones comunes como insertar, editar, eliminar y consultar con una interface
sencilla de usar, dbtabla cuenta con los siguientes metodos

### dbTabla#insert(param, [param2, ...])

Con este metodo se pueden insertar datos en la tabla de forma sencilla pasando los datos como parametros individuales, en un *array* o *object*, retornara una promesa

```js
// tu codigo...
let mitabla=connect.tabla("mitabla")
// insert into mitabla (id,row1,row2) values(1,"un texto","otro texto")
mitabla.insert(1,"un texto","otro texto")
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))
// insert into mitabla (id,row1,row2) values(1,"un texto","otro texto")
mitabla.insert([1,"un texto","otro texto"])
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))
// insert into mitabla (id,row1,row2) values(1,"un texto","otro texto")
mitabla.insert({id:1,row1:"un texto",row2:"otro texto"})
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))
```
Las tres llamadas daran el mismo resultado, si se tiene un campo que esta marcado como *`AUTO_INCREMENT`* en mysql o un campo de *`serial`* en postgresql se puede dar el valor de null o obviarse cuando se pasan los datos en un objeto

En el siguien ejemplo en campo id es el valor auto_increment
```js
// tu codigo...
let mitabla=connect.tabla("mitabla")
// insert into mitabla (row1,row2) values("un texto","otro texto")
mitabla.insert(null,"un texto","otro texto")
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))
// insert into mitabla (row1,row2) values("un texto","otro texto")
mitabla.insert([null,"un texto","otro texto"])
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))
// insert into mitabla (row1,row2) values("un texto","otro texto")
mitabla.insert({row1:"un texto",row2:"otro texto"})
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))
```

### dbTabla#update(sets,where)

Realiza cambios a los elementos de una tabla y devuelve una promesa

* `sets {object}`: Campos de la tabla a editar

* `where {string|object}`: exprecion booleana sql para where, si es de tipo *object* los atributos seran el campo y su valor con lo que se comparara por defecto se utilizara el operador *and* para separar las comparaciones pero si se antepone el operador *||* al nombre del atributo se usara el operador *or* y el operrador *`=`* para realizar las comparaciones para cambiarlo solo se tiene que colocar el operador de comparacion al final del nombre del atributo los operadores aceptados son *`<,<=,>,>=,=,!=`* y para like *`%`*, si el valor del atributo es un array todos sus elemenos seran comparados con el nombre del atributo unado el operador *`OR`*.

Ejemplo de uso

```js
// tu codigo...
let mitabla=connect.tabla("mitabla")
// update mitabla set row1='mas texto' row2='mas texto 2' where id=1
mitabla.update({row1:"mas texto",row2:"mas texto 2"},{id:1})
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))

// update mitabla set row1='mas texto' row2='mas texto 2' where id=1 and row='un texto'
mitabla.update({row1:"mas texto",row2:"mas texto 2"},"id=1 and rpw='un texto'")
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))

// update mitabla set row1='mas texto' row2='mas texto 2' where id=1 and row='un texto'
mitabla.update({row1:"mas texto",row2:"mas texto 2"},{id:1,row:'un texto'})
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))

// update mitabla set row1='mas texto' row2='mas texto 2' where id=1 or row='un texto'
mitabla.update({row1:"mas texto",row2:"mas texto 2"},{"||id":1,row:'un texto'})
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))
```

### dbTabla#updateById(sets,id)

Edita el elemento en el que el parametro id sea igual a valor de la clave primaria y devuelve una promesa

* `sets {object}`: Campos de la tabla a editar

* `id {numeric|string}`: valor de la clave primaria .


Ejemplo de uso

```js
// tu codigo...
let mitabla=connect.tabla("mitabla")
// update mitabla set row1='mas texto' row2='mas texto 2' where id=1
mitabla.updateById({row1:"mas texto",row2:"mas texto 2"},1)
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))
```

### dbTabla#delete(where)

Elimina uno o mas elementos de la tabla y devuelve una promesa

* `where {string|object}`: exprecion booleana sql para where, si es de tipo *object* los atributos seran el campo y su valor con lo que se comparara por defecto se utilizara el operador *and* para separar las comparaciones pero si se antepone el operador *||* al nombre del atributo se usara el operador *or* y el operrador *`=`* para realizar las comparaciones para cambiarlo solo se tiene que colocar el operador de comparacion al final del nombre del atributo los operadores aceptados son *`<,<=,>,>=,=,!=`* y para like *`%`*, si el valor del atributo es un array todos sus elemenos seran comparados con el nombre del atributo unado el operador *`OR`*.

Ejemplo de uso

```js
// tu codigo...
let mitabla=connect.tabla("mitabla")
// delete from mitabla where id=1
mitabla.delete("id=1")
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))
// delete from mitabla where id=1
mitabla.delete({id:1})
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))
// delete from mitabla where id=1 and row="un texto"
mitabla.delete({id:1,row:"un texto"})
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))
// delete from mitabla where id=1 or row="un texto"
mitabla.delete({"||id":1,row:"un texto"})
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))
```

### dbTabla#deleteById(id)

Elimina el elemento de la tabla en el que el parametro id sea igual a valor de la clave primaria y devuelve una promesa

* `id {numeric|string}`: valor de la clave primaria.

Ejemplo de uso

```js
// tu codigo...
let mitabla=connect.tabla("mitabla")
// delete from mitabla where id=1
mitabla.deleteById(1)
    .then(ok=>console.log(ok))
    .catch(err=>console.log(err))
```


### dbTabla#select([campos,[joins,[where,[group,[having,[order,[limit]]]]]]])

Este metodo realiza una consulta a la base de datos y retorna una promesa el valor
de la promesa sera un array y cada elemeto del array sera un objeto [dbRow](#dbrow) con los datos del fila, todos los parametros son opcionales
e intercambiables si no se pasa ningun parametro solo realizara una consulta sencilla obteniendo todos los campos de la tabla, retorna una promesa.

* `campos {array|string|object}`: Este parametro si es un *array* sera la lista de campos
a obtener de la consulta en caso de ser un de tipo *object* sera join y todos los demas se correna hasta join, si es un *string* sera where y todos los demas parametros se correran.

* `join {object|string}` en caso de ser un *string* sera tomado como el parametro where, si join es de tipo *object* cada atributo de este objeto sera el nombre de la tabla a la que hace referencia la clave foranea y el valor puede ser
el nombre del campo que comparten las dos tabla o una exprecion booleana sql ejemplo *`{"unatabla":"id"}`* o *`{"unatabla":"unatabla.id=mitabla.row1"}`*, para indicar si el join es *left*, *ringt* o *innert* solo hay que anteponer al nombre de la tabla los operadores > < = respectivamente ejemplo para *left join* *`{">unatabla":"id"}`*
por defecto es *natural join*.

* `where {string|object}`: exprecion booleana sql para where, si es de tipo *object* los atributos seran el campo y su valor con lo que se comparara por defecto se utilizara el operador *and* para separar las comparaciones pero si se antepone el operador *||* al nombre del atributo se usara el operador *or* y el operrador *`=`* para realizar las comparaciones para cambiarlo solo se tiene que colocar el operador de comparacion al final del nombre del atributo los operadores aceptados son *`<,<=,>,>=,=,!=`* y para like *`%`*, si el valor del atributo es un array todos sus elemenos seran comparados con el nombre del atributo unado el operador *`OR`*.

* `group {string|object}`: es parametro sera la clausula *group by* de la consulta si es de tipo `object` sera tomado como el parametro having

* `having {string}`: sera la exprecion booleana sql para having funciona igual que el parametro where

* `order {string}`: si esta presente sera el valor de *order by*

* `limit {numeric|string}`: el limite de resultados a obtener

Si cualquiera de los parametros es de tipo *`Number`* sera tomado como el parametro limit y los parametros siguientes seran ignorados o si es de tipo *`String`* y coincide con la exprecion 
*`/^[\s]*(group[\s]+by|having|order[\s]+by|limit)/i`* sera tomado como el parametro que conicida y los siguientes se correran 

Ejemplo de uso:
```js
// tu codigo...
let mitabla=connect.tabla("mitabla")
// select mitabla.* from mitabla;
mitabla.select()
    .then(data=>{
        console.log(data)    
    }).catch(e=>console.log(e))
// select id,row1 from mitabla;
mitabla.select(["id","row1"])
    .then(data=>{
        console.log(data)    
    }).catch(e=>console.log(e))
// select mitabla.* from mitabla where id=1 or id=2;
mitabla.select("id=1 or id=2")
    .then(data=>{
        console.log(data)    
    }).catch(e=>console.log(e))
/*
select mitabla.* from mitabla
left join tabla1 using(row1)
ringt join tabla2 on(tabla2.id=mitabla.row2)
*/
mitabla.select({">tabla1":"row1","<tabla2":"tabla2.id=mitabla.row2"})
    .then(data=>{
        console.log(data)    
    }).catch(e=>console.log(e))
/*
select mitabla.* from mitabla
left join tabla1 using(row1)
ringt join tabla2 on(tabla2.id=mitabla.row2)
where id=1 or id=2;
*/
mitabla.select({">tabla1":"row1","<tabla2":"tabla2.id=mitabla.row2"},"id=1 or id=2")
    .then(data=>{
        console.log(data)    
    }).catch(e=>console.log(e))
/*
select mitabla.* from mitabla
left join tabla1 using(row1)
ringt join tabla2 on(tabla2.id=mitabla.row2)
oder by id
*/
mitabla.select({">tabla1":"row1","<tabla2":"tabla2.id=mitabla.row2"},"oder by id")
    .then(data=>{
        console.log(data)    
    }).catch(e=>console.log(e))
    /*
select mitabla.* from mitabla
left join tabla1 using(row1)
ringt join tabla2 on(tabla2.id=mitabla.row2)
oder by id
*/
mitabla.select({">tabla1":"row1","<tabla2":"tabla2.id=mitabla.row2"},"oder by id")
    .then(data=>{
        console.log(data)    
    }).catch(e=>console.log(e))
```

### dbTabla#selectOne([campos,[joins,[where,[group,[having,[order]]]]]])

Igual que select pero solo se obtendra de la promesa un objeto [dbRow](#dbrow) con con  la fila obtenida si no se obtiene nada sea null.

### dbTabla#selectById(campos,[joins,[id]])

Igual que el metodo anterior pero en este caso seleccionara por el valor de la clave primaria  

* `campos {array|string|object}`: Este parametro si es un *array* sera la lista de campos
a obtener de la consulta, si es de tipo *object* sera join y todos los demas se correna hasta join.

* `join {object|string}`: En caso de no ser un *object* sera tomado como el parametro id, si join es de tipo *object* cada atributo de este objeto sera el nombre de la tabla a la que hace referencia la clave foranea y el valor puede ser
el nombre del campo que comparten las dos tabla o una exprecion booleana sql ejemplo *`{"unatabla":"id"}`* o *`{"unatabla":"unatabla.id=mitabla.row1"}`*, para indicar si el join es *left*, *ringt* o *innert* solo hay que anteponer al nombre de la tabla los operadores > < = respectivamente ejemplo para *left join* *`{">unatabla":"id"}`*
por defecto es *natural join*.

* `id {numeric|string}`: valor de la clave primaria.

Ejemplo de uso:
```js
// tu codigo...
let mitabla=connect.tabla("mitabla")
// select mitabla.* from mitabla where id=1;
mitabla.selectById(1)
    .then(row=>{
        console.log(row)    
    }).catch(e=>console.log(e))
// select id,row1 from mitabla where id=1;
mitabla.selectById(["id","row1"],1)
    .then(row=>{
        console.log(row)    
    }).catch(e=>console.log(e))

/*
select mitabla.* from mitabla
left join tabla1 using(row1)
ringt join tabla2 on(tabla2.id=mitabla.row2)
where id=1;
*/
mitabla.selectById({">tabla1":"row1","<tabla2":"tabla2.id=mitabla.row2"},1)
    .then(row=>{
        console.log(row)    
    }).catch(e=>console.log(e))
/*
select id,row1 from mitabla
left join tabla1 using(row1)
ringt join tabla2 on(tabla2.id=mitabla.row2)
where id=1;
*/
mitabla.selectById(["id","row1"],{">tabla1":"row1","<tabla2":"tabla2.id=mitabla.row2"},1)
    .then(row=>{
        console.log(row)    
    }).catch(e=>console.log(e))
```

### dbTabla#busqueda(texto,campos_bus,[campos,[joins,[where,[group,[having,[order,[limit]]]]]]])


Este metodo realiza una busqueda en la tabla con un algoritmo interno sql y devuelve una promesa.

* `texto {string}`: texto a buscar

* `campos_bus {array}`: lista de campos en los que se buscara el texto

* `campos {array|string|object}`: Este parametro si es un *array* sera la lista de campos
a obtener de la consulta en caso de ser un de tipo *object* sera join y todos los demas se correna hasta join, si es un *string* sera where y todos los demas parametros se correran.

* `join {object|string}` en caso de ser un *string* sera tomado como el parametro where, si join es de tipo *object* cada atributo de este objeto sera el nombre de la tabla a la que hace referencia la clave foranea y el valor puede ser
el nombre del campo que comparten las dos tabla o una exprecion booleana sql ejemplo *`{"unatabla":"id"}`* o *`{"unatabla":"unatabla.id=mitabla.row1"}`*, para indicar si el join es *left*, *ringt* o *innert* solo hay que anteponer al nombre de la tabla los operadores > < = respectivamente ejemplo para *left join* *`{">unatabla":"id"}`*
por defecto es *natural join*.

* `where {string|object}`: exprecion booleana sql para where, si es de tipo *object* los atributos seran el campo y su valor con lo que se comparara por defecto se utilizara el operador *and* para separar las comparaciones pero si se antepone el operador *||* al nombre del atributo se usara el operador *or* y el operrador *`=`* para realizar las comparaciones para cambiarlo solo se tiene que colocar el operador de comparacion al final del nombre del atributo los operadores aceptados son *`<,<=,>,>=,=,!=`* y para like *`%`*, si el valor del atributo es un array todos sus elemenos seran comparados con el nombre del atributo unado el operador *`OR`*.

* `group {string}`: es parametro sera la clausula *group by* de la consulta

* `having {string}`: sera la exprecion booleana sql para having

* `order {string}`: si esta presente sera el valor de *order by*

* `limit {numeric|string}`: el limite de resultados a obtener

## **dbRow**
Esta clase representa una fila obtenida en *`dbTabla#select()`*, *`dbTabla#selectOne()`* o *`dbTabla#selectById()`*

### dbRow#update()
Guarda los cambios de la fila en la tabla donde fue factorizado el objeto y retorna una promesa
```js
// tu codigo...
let mitabla=connect.tabla("mitabla")
// select mitabla.* from mitabla where id=1;
mitabla.selectById(1)
    .then(row=>{
        row.row1="cambio de texto"
        // update mitabla set row1="cambio de texto" where id=1
        row.update().then(ok=>
        {
            console.log(ok)
        }).catch(e=>console.log(e))
    }).catch(e=>console.log(e))

```
### dbRow#delete()
Elimina la fila de la base de datos y retorna una promesa

```js
// tu codigo...
let mitabla=connect.tabla("mitabla")
// select mitabla.* from mitabla where id=1;
mitabla.selectById(1)
    .then(row=>{
        // delete from mitabla where id=1
        row.delete().then(ok=>
        {
            console.log(ok)
        }).catch(e=>console.log(e))
    }).catch(e=>console.log(e))

```

[npm-image]: https://img.shields.io/npm/v/dbtabla.svg
[npm-url]: https://npmjs.org/package/dbtabla
[node-version-image]: https://img.shields.io/node/v/dbtabla.svg
[node-version-url]: https://nodejs.org/en/download/
[coveralls-url]: https://coveralls.io/r/mysqljs/mysql?branch=master
[downloads-image]: https://img.shields.io/npm/dm/dbtabla.svg
[downloads-url]: https://npmjs.org/package/dbtabla
