# dbTabla

[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]

Interfaz abstracta de alto nivel para la generación y ejecución de consultas SQL compatibles con MySQL, SQLite3 y PostgreSQL.

## Tabla de contenidos

- [Instalación](#instalación)
- [Introducción](#introducción)
- [Uso y Extensión](#uso-y-extensión)
- [Referencia de Clases](#referencia-de-clases)
    - [Connect](#connect)
    - [dbTabla](#dbtabla-1)
    - [dbRow](#dbrow)

## Instalación

`dbtabla` es un módulo para [Node.js](https://nodejs.org/) registrado en el [npm registry](https://www.npmjs.com/).

Para instalarlo, ejecute el siguiente comando:

```sh
$ npm install dbtabla
```

## Introducción

`dbtabla` proporciona una capa de abstracción sobre bases de datos SQL, permitiendo que el mismo código JavaScript interactúe de forma consistente con diferentes motores de base de datos sin preocuparse por las sutiles diferencias sintácticas de cada uno.

---

## Uso y Extensión

Para utilizar este módulo, es necesario extender la clase abstracta `Connect` para implementar el adaptador específico del motor de base de datos elegido.

### Ejemplo de implementación personalizada:

```js 
// archivo mysqlTable.js
const { MYSQL_DB, connect } = require("dbtabla");
const mysql = require("mysql");

class MySqlTable extends connect {
    constructor(params) {
        super(params, MYSQL_DB);
        // Lógica de conexión aquí...
    }

    query(sql) {
        // Ejecutar sentencia SQL y retornar una promesa
    }

    __escapeString(str) {
        // Escapar caracteres para prevenir inyecciones SQL (SQLi)
    }

    __keysInTable(table) {
        // Retornar los metadatos estructurales de la tabla especificada (columnas, tipos, etc.)
    }
}
```

Es imperativo redefinir los métodos: `constructor`, `query`, `__escapeString` y `__keysInTable`.

### Requisitos de `__keysInTable`:
Este método debe retornar una promesa que resuelva un objeto descriptivo con este formato:
```js
{
    tabla: String,
    colums: [
        {
            name: String,
            type: String,
            defaultNull: Boolean,
            primary: Boolean,
            unique: Boolean,
            defaul: String,
            autoincrement: Boolean
        },
        // ... otras columnas
    ]
}
```

---

## Referencia de Clases

### **Connect**
Clase base para administrar la conexión y el acceso a los modelos.

#### `Connect#tabla(tabla, [callback], [verify])`
Estructura y retorna un objeto `dbTabla`.
* `tabla {string}`: Nombre físico de la tabla.
* `callback {function}`: (Opcional) Callback ejecutado tras la verificación.
* `verify {boolean}`: (Opcional) Indica si se debe validar la existencia de la tabla inmediatamente.

#### `Connect#addModel(model)`
Agrega un modelo a la lista del manejador. Puede ser una instancia de `tabla-model`, un objeto de estructura o un string `CREATE TABLE`.

#### `Connect#pathModels(path)`
Carga masivamente modelos desde el directorio especificado.

---

### **dbTabla**
Representación interactiva de una tabla en la base de datos para realizar operaciones CRUD.

#### `dbTabla#insert(datos)`
Inserta registros de forma fluida. Acepta argumentos individuales, arrays u objetos.
```js
let miTabla = connect.tabla("usuarios");

// Inserción posicional
miTabla.insert(1, "Antigravity", "AI Developer");

// Inserción por objeto (recomendado)
miTabla.insert({
    nombre: "Antigravity",
    rol: "Developer"
});
```

#### `dbTabla#update(sets, where)`
Actualiza registros coincidentes con los criterios.
* `where`: Puede ser un string SQL o un objeto descriptivo para filtrado dinámico.
```js
// update usuarios set rol='Senior' where id=1
miTabla.update({ rol: 'Senior' }, { id: 1 });

// Criterios OR dinámicos usando "||"
miTabla.update({ rol: 'Senior' }, { "||id": 1, "nombre": "Admin" });
```

#### `dbTabla#delete(where)`
Elimina registros coincidentes con la cláusula `where`.

#### `dbTabla#select([campos], [joins], [where], ...)`
Poderoso motor de búsqueda y selección que retorna objetos `dbRow`.
* `campos {array|string}`: Lista de columnas a seleccionar.
* `joins {object}`: Definición de uniones entre tablas.
* `where {string|object}`: Criterios de filtrado SQL.
* `order / limit`: Criterios de ordenación y paginación.

```js
// Búsquedas complejas con Joins dinámicos
miTabla.select(
    ["id", "nombre"],
    { ">perfiles": "perfiles.id_user=usuarios.id" }, // Left Join
    { "estado": "activo" }
).then(rows => console.log(rows));
```

---

### **dbRow**
Representa una única fila de datos devuelta por `select`, `selectOne` o `selectById`. Permite la actualización de datos directamente sobre el objeto.

#### `dbRow#update()`
Sincroniza los cambios realizados en el objeto con la base de datos física.
```js
miTabla.selectById(1).then(row => {
    row.nombre = "Nuevo Nombre";
    row.update(); // Ejecuta el UPDATE correspondiente
});
```

#### `dbRow#delete()`
Elimina el registro que representa el objeto actual de la base de datos física.

[npm-image]: https://img.shields.io/npm/v/dbtabla.svg
[npm-url]: https://npmjs.org/package/dbtabla
[node-version-image]: https://img.shields.io/node/v/dbtabla.svg
[node-version-url]: https://nodejs.org/en/download/
[downloads-image]: https://img.shields.io/npm/dm/dbtabla.svg
[downloads-url]: https://npmjs.org/package/dbtabla
