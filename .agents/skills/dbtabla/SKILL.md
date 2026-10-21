# dbtabla AI Skill (Capa de Abstracción SQL y Active Record)

Esta skill proporciona las instrucciones y mejores prácticas para que cualquier agente de IA utilice **dbtabla** de forma consistente, eficiente y segura.

---

## 1. Conceptos Fundamentales

`dbtabla` es una capa de abstracción SQL universal para Node.js y entornos multiplataforma (como Tauri).

* **`Connect`**: Clase abstracta base que gestiona la conexión, el registro de modelos (`addModel`, `pathModels`) y fabrica instancias de tabla.
* **`dbTabla`**: Fachada CRUD asociada a una tabla (`db.tabla('nombre')`).
* **`dbRow`**: Fila con patrón **Active Record** (`row.campo = 'nuevo'; await row.update()`).
* **`procesingSql`**: Motor generador de SQL agnóstico compatible con MySQL, SQLite, PostgreSQL y MSSQL.

---

## 2. Sintaxis de Consultas y Filtrado

### A. Sintaxis de Objeto Único (Recomendada)
Para evitar ambigüedades posicionales, pasa un único objeto descriptor:

```javascript
const usuarios = await db.tabla('usuarios').select({
    where: { 
        "estado": "activo", 
        "puntos>": 100, 
        "||rol": "admin" 
    },
    campos: ["id", "username", "email"],
    order: "id DESC",
    limit: 10
});
```

### B. Operadores en Cláusulas Where (Objetos)
* **Sufijos de comparación**:
  * `campo%` ➔ `campo LIKE 'valor'`
  * `campo!` ➔ `campo != 'valor'`
  * `campo>` / `campo<` ➔ Mayor que / Menor que
  * `campo>=` / `campo<=` ➔ Mayor/Menor o igual que
* **Prefijos lógicos**:
  * `||campo` ➔ Operador `OR` (por defecto es `AND`)
  * `&&campo` ➔ Operador `AND` explícito

---

## 3. Active Record (`dbRow`)

Cualquier fila devuelta por `select`, `selectOne` o `selectById` puede modificarse y guardarse directamente:

```javascript
const user = await db.tabla('usuarios').selectById(5);
if (user) {
    user.ultimo_acceso = new Date();
    await user.update(); // Ejecuta UPDATE automáticamente
    
    // O eliminar:
    // await user.delete();
}
```

---

## 4. Importación (ESM y CommonJS)

`dbtabla` ofrece soporte nativo tanto para ESM como para CommonJS:

```javascript
// ESM
import { Connect, dbTabla, dbResult, dbRow } from 'dbtabla';

// CommonJS
const { Connect, dbTabla, dbResult, dbRow } = require('dbtabla');
const dbtabla = require('dbtabla'); // dbtabla() por defecto
```
