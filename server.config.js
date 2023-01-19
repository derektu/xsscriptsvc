// For deploy to 203.67.19.129
module.exports = {
    apps : [
        {
            name   : "xsscriptsvc",
            script : "./lib/app.js",
            args : "--port=8686 --xsservice=http://127.0.0.1/xsserviceuat" --url=https://pm.moneydj.com/xsscript,
            watch : true,
            ignore_watch : [ "node_modules", "logs" ]    
        },
    ]
  }
  