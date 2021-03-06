'use strict';

const path = require('path');
const fs = require('fs');
const schemaPath = path.join(__dirname, './../schema/k12Schema.json');
const K12 = require('./../databaseModels/k12')(schemaPath);

let schemaJson = require(schemaPath);
let validFieldTypes = ['String', 'Number', 'Date', 'Boolean'];

function addField(fieldName, data, callback) {
    if (schemaJson.schema[fieldName]) {
        let err = new Error();
        err.status = 'SCHEMA_ERROR_RESOURCE_CONFLICT';
        err.message = `The Field ${fieldName} already exists.`;
        return callback(err);
    } else {
        // Validate Field Type
        let err = validateFieldType(data);
        if (err) {
            return callback(err);
        }

        let sch = JSON.parse(JSON.stringify(schemaJson));
        sch.schema[fieldName] = {};
        sch.schema[fieldName].type = data.type;
        if (data.hasOwnProperty('required')) {
            sch.schema[fieldName].required = data.required.toString().toLowerCase() === 'true';
        }
        if (data.hasOwnProperty('hidden')) {
            sch.schema[fieldName].hidden = data.hidden.toString().toLowerCase() === 'true';
        }
        return writeToSchemaFile(schemaPath, sch, callback);
    }
}

function updateField(fieldName, data, callback) {
    if (schemaJson.schema[fieldName]) {

        if (schemaJson.schema[fieldName].systemLevel) {
            let err = new Error();
            err.status = 'SCHEMA_ERROR_BAD_INPUT_REQUEST';
            err.message = `The Field ${fieldName} is a System Level Field. You can't modify/delete a field which has System Level set as true`;
            return callback(err);
        }

        // Validate Field Type
        let err = validateFieldType(data);
        if (err) {
            return callback(err);
        }

        let sch = JSON.parse(JSON.stringify(schemaJson));
        sch.schema[fieldName] = {};
        sch.schema[fieldName].type = data.type;
        if (data.hasOwnProperty('required')) {
            sch.schema[fieldName].required = data.required.toString().toLowerCase() === 'true';
        }
        if (data.hasOwnProperty('hidden')) {
            sch.schema[fieldName].hidden = data.hidden.toString().toLowerCase() === 'true';
        }
        return writeToSchemaFile(schemaPath, sch, callback);
    } else {
        let err = new Error();
        err.status = 'SCHEMA_ERROR_RESOURCE_NOT_FOUND';
        err.message = 'The request resource is not found';
        return callback(err);
    }
}

function deleteField(fieldName, callback) {
    if (schemaJson.schema[fieldName]) {

        if (schemaJson.schema[fieldName].systemLevel) {
            let err = new Error();
            err.status = 'SCHEMA_ERROR_BAD_INPUT_REQUEST';
            err.message = `The Field ${fieldName} is a System Level Field. You can't modify/delete a field which has System Level set as true`;
            return callback(err);
        }

        let sch = JSON.parse(JSON.stringify(schemaJson));
        delete sch.schema[fieldName];
        return writeToSchemaFile(schemaPath, sch, callback);
    } else {
        let err = new Error();
        err.status = 'SCHEMA_ERROR_RESOURCE_NOT_FOUND';
        err.message = 'The request resource is not found';
        return callback(err);
    }
}

function getField(fieldName, callback) {
    if (schemaJson.schema[fieldName]) {
        return callback(null, schemaJson);
    } else {
        let err = new Error();
        err.status = 'SCHEMA_ERROR_RESOURCE_NOT_FOUND';
        err.message = 'The request resource is not found';
        return callback(err);
    }
}

function getSchema(callback) {
    return callback(null, schemaJson);
}

function writeToSchemaFile(path, data, callback) {
    fs.writeFile(path, JSON.stringify(data), (err) => {
        if (err) {
            return callback(err);
        }
        K12.refreshModel();
        // Doing this to remove the schema from require cache
        delete require.cache[require.resolve(path)];
        schemaJson = require(path);
        return callback(null, schemaJson);
    });
}

function refreshModels() {
    K12.refreshModel();
}

function validateFieldType(data) {
    // Check if Data exists
    if (!data || !data.type) {
        let err = new Error();
        err.status = 'SCHEMA_ERROR_BAD_INPUT_REQUEST';
        err.message = 'The mandatory field "type" is not present';
        return err;
    }

    // Check if user has set a systemLevel
    if (data.systemLevel) {
        let err = new Error();
        err.status = 'SCHEMA_ERROR_BAD_INPUT_REQUEST';
        err.message = 'The field "systemLevel" is system level field and should not be used';
        return err;
    }

    // Check if the type is an array
    if (data.type.constructor === Array && (data.type.length !== 1 || validFieldTypes.indexOf(data.type[0]) === -1)) {
        // check if the length of the array == 1 and if its present in the validTypes
        let err = new Error();
        err.status = 'SCHEMA_ERROR_BAD_INPUT_REQUEST';
        err.message = 'The field "type" should have the one of the possible values "String", "Number", "Date", "Boolean", ["String"], ["Number"], ["Date"], ["Boolean"]';
        return err;
    } else if (data.type.constructor !== Array && validFieldTypes.indexOf(data.type) === -1) {
        // check if the type present in the validTypes
        let err = new Error();
        err.status = 'SCHEMA_ERROR_BAD_INPUT_REQUEST';
        err.message = 'The field "type" should have the one of the possible values "String", "Number", "Date", "Boolean", ["String"], ["Number"], ["Date"], ["Boolean"]';
        return err;
    }
}

module.exports.K12 = K12;

module.exports.addField = addField;
module.exports.updateField = updateField;
module.exports.deleteField = deleteField;
module.exports.getField = getField;
module.exports.getSchema = getSchema;
module.exports.refreshModels = refreshModels;
