"use strict";

const logger = require('./logger').getLogger('[App]');
const WebServer = require('./webserver');
const XSService = require('./xsservice');

var _argopt = {
    default : {
        port: 8686
    }
};

/**
 * Main entry point: start up API server
 */
 class App {
    /*
        $ node.js lib/app.js --port=8668 --xsservice=<server位置> --url='https://pm.moneyd.com/xsscript
     */
    run(args) {
        var argv = require('minimist')(args, _argopt);
        var port = parseInt(argv['port']) || 8686;
        
        if (!port) {
            this.usage();
            process.exit(1);
        }

        let xsservice = new XSService(argv['xsservice']);
        let siteUrl = argv['url'] || `http://localhost:${port}`;

        var webServer = new WebServer(xsservice, siteUrl);
        webServer.start(port);
    }

    usage() {
        console.log('Usage:');
        console.log(`
            $ node.js lib/app.js --port=8686 --xsservice=<server位置> --url=https://pm.moneydj.com/xsscript
        `);
    }
}

var app = new App();
app.run(process.argv.slice(2));
