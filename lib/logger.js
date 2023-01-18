"use strict"

/*
    Usage:

    var logger = require('./lib/logger.js').getLogger('[moduleName]');

    logger.debug('...');
    logger.info('...');
*/

var log4js = require('log4js');

log4js.configure({
    appenders: {
        out: { type: 'console' },
        app: { type: 'dateFile', filename: 'logs/server.log' }
    },
    categories: {
        default: { appenders: [ 'out', 'app' ], level: 'debug' }
    }
});

module.exports = log4js;
