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
        $ node.js lib/app.js --port=8668 --xsservice=<server位置>
     */
    run(args) {
        var argv = require('minimist')(args, _argopt);
        var port = parseInt(argv['port']) || 8888;
        
        if (!port) {
            this.usage();
            process.exit(1);
        }

        let servicelocator = {};
        servicelocator.xsservice = new XSService(argv['xsservice']);

        var webServer = new WebServer(servicelocator);
        webServer.start(port);
    }

    usage() {
        console.log('Usage:');
        console.log(`
            $ node.js lib/app.js --port=8686 --xsservice=<server位置>
        `);
    }
}

var app = new App();
app.run(process.argv.slice(2));
