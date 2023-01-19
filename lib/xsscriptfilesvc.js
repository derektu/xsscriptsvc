"use strict"

const fs = require('fs');
const path = require('path');
const archiver = require('archiver');
const events = require('events');
const XSScriptType = require('./xsscripttype');

const logger = require('./logger').getLogger('[XSFSvc]');

/**
 * Provide helper functions to convert XSScript object to files
 */
class XSScriptFileSvc {
    /**
     * 把傳入的scripts寫到zipfile內.
     * 
     * 使用上有兩種情境: 
     * - 一種是產生同一個user的腳本的zipfile, 此時zipfile內不需要把使用者的appId/userId當成目錄
     * - 另外一種是xsscripts是多位用戶的, 此時zipfile內必須把使用者的appId/userId當成目錄
     * 
     * zipfile的結構
     *  appId
     *      userId
     *          function
     *              <函數1.xs>
     *              <函數2.xs>
     *          sensor
     *              <sensor1.xs>
     *              <sensor2.xs>
     * 
     * @param {*} xsscripts array of XSScript
     * @param {*} omitUserPrefix true if these scripts are from the same user, and we don't want to output appId/userId prefix
     * @param {*} zipFile 
     */
    async scriptsToZipFile(xsscripts, omitUserPrefix, zipfile) {
        const output = fs.createWriteStream(zipfile);        
        const archive = archiver('zip', {
            zlib: { level: 9 } // Sets the compression level.
        });        

        archive.on('error', function(err) {
            throw err;
        });
          
        archive.pipe(output);

        try {
            for (let xsscript of xsscripts) {
                let prefix = `${this._scriptTypeToFolder(xsscript.type)}${xsscript.folder}`;
                if (!omitUserPrefix)
                    prefix = `${xsscript.appId}/${xsscript.userId}/`;
                let fname = `${xsscript.invisible?'^':''}${xsscript.name}.xs`;
                let content = xsscript.asFileContent();
                archive.append(content, { name: fname, prefix: prefix });            
            }

            archive.finalize();
            await events.once(output, 'close');             
        }
        catch(exception) {
            logger.error(`scriptsToZip exception:${exception}`);
            throw exception;
        }
    }

    /**
     * 
     * @param {string} scriptType XSScriptType
     * @returns 
     */
    _scriptTypeToFolder(scriptType) {
        if (scriptType == XSScriptType.Fnc)
            return 'Function';
        else if (scriptType == XSScriptType.Indicator)
            return 'Indicator';
        else if (scriptType == XSScriptType.Sensor)
            return 'Sensor';
        else if (scriptType == XSScriptType.Filter)
            return 'Filter';
        else if (scriptType == XSScriptType.AutoTrade)
            return 'AutoTrade';
        else 
            return scriptType;    
    }

}

module.exports = XSScriptFileSvc;