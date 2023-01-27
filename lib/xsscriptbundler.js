"use strict";

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const archiver = require('archiver');
const events = require('events');

const XSScriptType = require('./xsscripttype');
const XSService = require('./xsservice');
const { lastIndexOf } = require('lodash');

const logger = require('./logger').getLogger('[ZipGen]');

class CSVOption {
    constructor(hasHeaderRow, colAppId, colUserId, colType, colGuid) {
        this.hasHeaderRow = hasHeaderRow;
        this.colAppId = colAppId;
        this.colUserId = colUserId;
        this.colType = colType;
        this.colGuid = colGuid;
    }
}

/**
 * 產生XSScript的zip file or local files
 * 
 * 使用方式
 *  let task = new XSScriptBundleTask(zipfilename);
 *  await task.add(..);
 *  await task.add(..);
 *  await task.end();   // 此時就完成了
 */
class XSScriptBundleTask {
    /**
     * @param {string} target bundle的位置. 如果taget的結尾是.zip, 那就壓成zip, 否則把script files放在target這個目錄底下
     */
    constructor(target) {
        if (target.toLowerCase().endsWith(".zip")) {
            this.output = fs.createWriteStream(target);        
            this.archive = archiver('zip', {
                zlib: { level: 9 } // Sets the compression level.
            });        
    
            this.archive.on('error', function(err) {
                throw err;
            });
              
            this.archive.pipe(this.output);
        }
        else {
            this.rootFolder = target;
        }
    }

    /**
     * 加入一個xsscript
     * 
     * 每個xsscript會依照這個script的類型, 以及script的路徑, 擺放在zipfile內, 如下:
     * 
     *  Function
     *      <函數1.xs>
     *      <函數2.xs>
     *  Sensor
     *      <sensor1.xs>
     *      <sensor2.xs>
     * 
     * 如果userPrefix是true的話, 那麼還會加上appId/userId的路徑, 如下:
     *  appId
     *      userId
     *          Function
     *              <函數1.xs>
     *              <函數2.xs>
     *          Sensor
     *              <sensor1.xs>
     *              <sensor2.xs>
     * 
     * @param {*} xsscript 
     * @param {*} userPrefix 
     */
    async add(xsscript, userPrefix) {
        let prefix = `${this._scriptTypeToFolder(xsscript.type)}${xsscript.folder}`;
        if (userPrefix)
            prefix = `${xsscript.appId}/${xsscript.userId}/` + prefix;

        let fname = `${xsscript.invisible?'^':''}${xsscript.name}.xs`;
        let content = xsscript.asFileContent();

        if (this.archive) {
            this.archive.append(content, { name: fname, prefix: prefix });                        
        }
        else {
            let dirpath = path.join(this.rootFolder, prefix)
            fs.mkdirSync(dirpath, {recursive: true});
            fs.writeFileSync(path.join(dirpath, fname), content, {encoding:'utf-8'});
        }
    }

    async end() {
        if (this.archive) {
            this.archive.finalize();
            await events.once(this.output, 'close');                 
        }
    }

    /**
     * 
     * @param {string} scriptType XSScriptType
     * @returns 
     */
    _scriptTypeToFolder(scriptType) {
        if (scriptType == XSScriptType.Function)
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

class XSScriptBundler {

    /**
     * 把任意N個腳本加到zipfile內
     * 
     * @param {*} xsscripts array of XSScript 
     * @param {string} target ZIP檔案路徑 or Local目錄
     * @param {boolean} userPrefix ZIP內每個腳本是否要加上userId的prefix路徑
     */
    async bundleScripts(xsscripts, target, userPrefix) {
        let task = new XSScriptBundleTask(target);

        for (let xsscript of xsscripts) {
            await task.add(xsscript, userPrefix);
        }

        await task.end();
    }

    /**
     * 從xsservice查詢指定用戶的某種類型腳本, 然後加到zipfile或是folder內
     * 
     * @param {*} xsscripts array of XSScript 
     * @param {string} appId
     * @param {string} userId
     * @param {string} scriptType  
     * @param {string} target ZIP檔案路徑 or Local目錄
     * @param {boolean} userPrefix ZIP內每個腳本是否要加上userId的prefix路徑
     */
    async bundleUserScripts(xsservice, appId, userId, scriptType, target, userPrefix) {
        let xsscripts = await xsservice.queryUserScripts(appId, userId, scriptType);
        await this.bundleScripts(xsscripts, target, userPrefix);
    }

    /**
     * 從csv檔案內讀取要查詢的腳本資訊, 然後一一加到zipfile內
     * 
     * @param {*} xsservice XSService object, 用來查詢腳本資訊
     * @param {string} csvFilename CSV檔案路徑
     * @param {*} options CSVOption 
     * @param {string} zipFilename ZIP檔案路徑
     * @param {boolean} userPrefix ZIP內每個腳本是否要加上userId的prefix路徑
     * @param {*} cbProgress optional callback function to report progress. async cbProgress(progress)
     */
    async bundleScriptsFromCSV(xsservice, csvFilename, options, zipFilename, userPrefix, cbProgress) {
        let task = new XSScriptBundleTask(zipFilename);
        let basename = path.basename(csvFilename);
        let lines = fs.readFileSync(csvFilename, {encoding: 'utf-8'}).split('\n');
        let lineno = 0;
        for (let line of lines) {
            lineno++;
            if (options.hasHeaderRow && lineno <= 1)
                continue;

            line = line.trim();
            if (!line)
                continue;

            try {
                let fields = line.split(',');
                let appId = fields[options.colAppId]||'';
                let userId = fields[options.colUserId]||'';
                let type = fields[options.colType]||'';
                let guid = fields[options.colGuid]||'';
                if (!appId || !userId || !type || !guid)
                    throw `Invalid content`;
    
                let xsscript = await xsservice.queryScriptById(appId, userId, type, guid);
                if (xsscript)
                    await task.add(xsscript, userPrefix);  
            }
            catch(exception) {
                logger.error(`[${basename}](LINE:${lineno}) exception=${exception}`);
            }
            finally {
                logger.debug(`[${basename}] zip process: [${lineno}/${lines.length}] data:${line}`);
                if (cbProgress)
                    await cbProgress(`${lineno}/${lines.length}`);
            }
        }

        await task.end();
    }
}

module.exports = {
    CSVOption,
    XSScriptBundler
}