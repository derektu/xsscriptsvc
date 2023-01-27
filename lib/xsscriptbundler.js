"use strict";

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const archiver = require('archiver');
const events = require('events');
const _ = require('lodash');

const XSScriptType = require('./xsscripttype');
const XSService = require('./xsservice');

const logger = require('./logger').getLogger('[Bundler]');

class CSVOption {
    constructor(hasHeaderRow, colAppId, colUserId, colGuid, colType) {
        this.hasHeaderRow = hasHeaderRow;
        this.colAppId = colAppId;
        this.colUserId = colUserId;
        this.colGuid = colGuid;
        this.colType = colType;
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

        this.sequenceMap = {};  // 用來記錄每個用戶每種腳本類型的編號
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
     * 如果keepFolder是false的話, 那麼腳本的名稱都會改成編號, 如下:
     *  appId
     *      userId
     *          Function
     *              00001.xs>
     *              00002.xs>
     *          Sensor
     *              00001.xs
     *              00002.xs
     * 
     * @param {*} xsscript 
     * @param {*} bundleOption {userPrefix, keepFolder}, userPrefix: 每個腳本是否要加上userId的prefix路徑, keepFolder: 每個腳本會保留原始路徑
     */
    async add(xsscript, bundleOption) {
        if (!bundleOption)
            bundleOption = {};

        let userPrefix = (bundleOption.userPrefix === undefined) ? true : bundleOption.userPrefix;
        let keepFolder = (bundleOption.keepFolder === undefined) ? true : bundleOption.keepFolder;

        let folder = userPrefix ? `${xsscript.appId}/${xsscript.userId}/` : "";
        folder += `${this._scriptTypeToFolder(xsscript.type)}`;
        
        let fname;

        if (keepFolder) {
            folder += `${xsscript.folder}`;
            fname = `${xsscript.invisible?'^':''}${xsscript.name}.xs`;
        }
        else {
            let key = `${xsscript.appId}-${xsscript.userId}-${xsscript.type}`;
            let seqNo = this.sequenceMap[key] || 0;
            seqNo++;
            this.sequenceMap[key] = seqNo;
            fname = `${xsscript.invisible?'^':''}${_.padStart(seqNo.toString(), 5, '0')}.xs`;
        }

        let content = xsscript.asFileContent();

        if (this.archive) {
            this.archive.append(content, { name: fname, prefix: folder });                        
        }
        else {
            let dirpath = path.join(this.rootFolder, folder)
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
     * @param {*} bundleOption {userPrefix, keepFolder}, userPrefix: 每個腳本是否要加上userId的prefix路徑, keepFolder: 每個腳本會保留原始路徑
     */
    async bundleScripts(xsscripts, target, bundleOption) {
        let task = new XSScriptBundleTask(target);

        for (let xsscript of xsscripts) {
            await task.add(xsscript, bundleOption);
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
     * @param {*} bundleOption {userPrefix, keepFolder}, userPrefix: 每個腳本是否要加上userId的prefix路徑, keepFolder: 每個腳本會保留原始路徑
     */
    async bundleUserScripts(xsservice, appId, userId, scriptType, target, bundleOption) {
        let xsscripts = await xsservice.queryUserScripts(appId, userId, scriptType);
        await this.bundleScripts(xsscripts, target, bundleOption);
    }

    /**
     * 從csv檔案內讀取要查詢的腳本資訊, 然後一一加到zipfile內
     * 
     * @param {*} xsservice XSService object, 用來查詢腳本資訊
     * @param {string} csvFilename CSV檔案路徑
     * @param {*} csvOption CSVOption 
     * @param {string} target ZIP檔案路徑
     * @param {*} bundleOption {userPrefix, keepFolder}, userPrefix: 每個腳本是否要加上userId的prefix路徑, keepFolder: 每個腳本會保留原始路徑
     * @param {*} cbProgress optional callback function to report progress. async cbProgress(progress)
     */
    async bundleScriptsFromCSV(xsservice, csvFilename, csvOption, target, bundleOption, cbProgress) {
        let task = new XSScriptBundleTask(target);
        let basename = path.basename(csvFilename);
        let lines = fs.readFileSync(csvFilename, {encoding: 'utf-8'}).split('\n');
        let lineno = 0;
        for (let line of lines) {
            lineno++;
            if (csvOption.hasHeaderRow && lineno <= 1)
                continue;

            line = line.trim();
            if (!line)
                continue;

            try {
                let fields = line.split(',');
                let appId = fields[csvOption.colAppId]||'';
                let userId = fields[csvOption.colUserId]||'';
                let type = fields[csvOption.colType]||'';
                let guid = fields[csvOption.colGuid]||'';
                if (!appId || !userId || !type || !guid)
                    throw `Invalid content`;
    
                let xsscript = await xsservice.queryScriptById(appId, userId, type, guid);
                if (xsscript)
                    await task.add(xsscript, bundleOption);  
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