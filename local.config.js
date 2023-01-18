// For local development
module.exports = {
    apps : [
        {
            name   : "xsscriptsvc",
            script : "./lib/app.js",
            args : "--port=8686 --xsservice=http://203.67.19.129/xsserviceuat",
            watch : true,
            ignore_watch : [ "node_modules", "logs" ]    
        },
    ]
  }
  