import dbTablaModel from 'tabla-model';

const test_esm = new dbTablaModel('test_esm', [
    {
        name: 'id',
        type: 'int',
        primary: true,
        autoincrement: true
    },
    {
        name: 'name',
        type: 'text'
    }
]);

export default test_esm;
