"use strict";

const express = require('express');
const bodyParser = require('body-parser');
const morgan = require('morgan');
const _ = require('lodash');
const API = require('./api.js');
const logger = require('./logger').getLogger('[Web]');

class WebServer {
    /**
     * @param {*} xsservice XSService object
     * @param {string} siteUrl location of this site, e.g. http://localhost:8686/, or https://pm.moneydj.com/xsscript/
     */
    constructor(xsservice, siteUrl) {
        this.API = new API(xsservice, siteUrl); 
    }

    start(port) {
        var app = express();
        var webFolder = __dirname + '/../web';
        app.use(express.static(webFolder, {index: 'default.html'}));
        app.use(bodyParser.urlencoded({ extended: true }));
        app.use(bodyParser.json());
        app.use(morgan('common', {
            stream: { 
                write: (message)=> logger.info(message) 
            }
        }));    

        app.use('/api', this.API.getRouter());

        // default error handler
        //
        app.use((err, req, res, next) => {
            logger.error('Error request[' + req.url + '] Err=[' + err.toString() + ']');
            res.status(500).send('Error occurred:' + err.toString());
        });

        app.listen(port);

        logger.info('Web server started at port:' + port);
    }
}

module.exports = WebServer;