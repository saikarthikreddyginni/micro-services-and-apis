'use strict';

const schemaService = require('./../services/schemaService');
const basicAuth = require('basic-auth');

function generateErrorJSON(status, message) {
    return {
        resourceType: "error",
        errors: [{
            version: "v1",
            status: status,
            message: message
        }]
    };
}

function customErrorToHTTP(errorStatus) {
    let errorMap = {
        'SCHEMA_ERROR_RESOURCE_NOT_FOUND': 404,
        'SCHEMA_ERROR_INTERAL_ERROR': 500,
        'SCHEMA_ERROR_RESOURCE_CONFLICT': 409,
        'SCHEMA_ERROR_UNAUTHORIZED': 401,
        'SCHEMA_ERROR_VALIDATION_CHECK_FAILED': 400,
        'SCHEMA_ERROR_BAD_INPUT_REQUEST': 400,
        'SCHEMA_ERROR_FORBIDDEN': 403,
        'DB_ERROR_RESOURCE_NOT_FOUND': 404,
        'DB_ERROR_BAD_INPUT_REQUEST': 400
    };

    if (!isNaN(errorStatus)) {
        return errorStatus;
    }

    return errorMap[errorStatus] || 500;
}

function generateFieldJSON(fieldName, data) {
    let output = {};
    if (data && data.schema && data.schema[fieldName]) {
        output.resourceType = 'field';
        output.data = {
            fieldName: fieldName,
            type: data.schema[fieldName].type,
            hidden: data.schema[fieldName].hidden || false,
            required: data.schema[fieldName].required || false,
            systemLevel: data.schema[fieldName].systemLevel || false
        };
        output.link = {
            rel: 'self',
            href: `/spi/v1/schema/fields/${fieldName}`
        };
    }
    return output;
}

function generateSchemaJSON(data) {

    let output = {};
    if (data && data.schema) {
        output.resourceType = 'schema';
        output.data = {};
        output.data.schemaName = data.schemaName;
        output.data.collectionName = data.collectionName;
        output.data.historyCollectionName = data.historyCollectionName;
        output.data.version = data.version;
        output.data.fields = [];

        for (let key in data.schema) {
            if (data.schema.hasOwnProperty(key)) {
                output.data.fields.push(generateFieldJSON(key, data));
            }
        }

        output.link = {
            rel: 'self',
            href: `/spi/v1/schema/fields`
        };
    }
    return output;
}

function generateFinanceJSON(results, callback) {

    function generateFinance(finance, schemaJson) {
        if (finance) {
            let output = {
                resourceType: "finance",
                financeID: finance.financeID,
                version: finance.version,
                data: {}
            };

            for (let key in schemaJson.schema) {
                if (schemaJson.schema.hasOwnProperty(key)) {
                    let isHidden = schemaJson.schema[key].hidden || false;

                    if (isHidden) {
                        continue;
                    }

                    if (key !== 'financeID' && key !== 'version') {
                        output.data[key] = finance[key];
                    }
                }
            }

            return output;
        } else {
            return {};
        }
    }

    schemaService.getSchema((err, schemaJson) => {
        if (err) {
            return callback(err);
        }
        let data = {};
        if (results.constructor === Array) {
            data = {
                resourceType: "finances",
                "finances": []
            };
            results.forEach((result) => {
                data.finances.push(generateFinance(result, schemaJson));
            });
            data.link = {
                rel: "self",
                href: `/api/v1/finances`
            }
        } else {
            data = generateFinance(results, schemaJson);
            data.link = {
                rel: "self",
                href: `/api/v1/finances/${results.financeID}`
            };
        }
        return callback(null, data);
    });
}

function auth(req, res, next) {
    function unauthorized(res) {
        res.set('WWW-Authenticate', 'Basic realm=Authorization Required');
        return res.status(401).sendData(generateErrorJSON(401, 'User is not authorized'));
    }

    let user = basicAuth(req);

    if (!user || !user.name || !user.pass) {
        return unauthorized(res);
    }

    if (user.name === 'developer' && user.pass === 'awesome') {
        return next();
    } else {
        return unauthorized(res);
    }
}

module.exports.auth = auth;
module.exports.generateErrorJSON = generateErrorJSON;
module.exports.customErrorToHTTP = customErrorToHTTP;
module.exports.generateSchemaJSON = generateSchemaJSON;
module.exports.generateFieldJSON = generateFieldJSON;
module.exports.generateFinanceJSON = generateFinanceJSON;