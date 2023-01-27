"use strict"

const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment');
const multer = require('multer');

const XSScriptType = require('./xsscripttype');
const logger = require('./logger').getLogger('[API]');
const XSService = require('./xsservice');
const {CSVOption, XSScriptBundler} = require('./xsscriptbundler');
const TaskQueue = require('./taskqueue');

class API {
    /**
     * @param {*} xsservice XSService object
     * @param {string} siteUrl location of this site, e.g. http://localhost:8686, or https://pm.moneydj.com/xsscriptsvc
     */
    constructor(xsservice, siteUrl) {
        this.xsservice = xsservice;
        this.siteUrl = siteUrl;
        this.zipQueue = new TaskQueue('zip', this.zipProc.bind(this));

        // without trailing '/'
        if (this.siteUrl.endsWith('/'))
            this.siteUrl = this.siteUrl.substring(0, this.siteUrl.length-1);

        this.downloadFolder = path.resolve(__dirname + '/../downloads');
        fs.mkdirSync(this.downloadFolder, {recursive: true});

        this.uploadFolder = path.resolve(__dirname + '/../uploads');
        fs.mkdirSync(this.uploadFolder, {recursive: true});

        this.uploadStorage = multer.diskStorage({
            destination: (req, file, cb) => {
                cb(null, this.uploadFolder);
            },
        
            filename: (req, file, cb) => {
                // 以執行時間來編號, 方便debug
                let now = moment().format("YYYYMMDD-HHmmss.SSS");
                cb(null, now + path.extname(file.originalname));
            }
        });
    }

    getRouter() {
        var router = express.Router();

        router.get('/script', (req, res)=> this.api_GetScriptById(req, res));
        router.get('/userscripts', (req, res)=> this.api_GetUserScripts(req, res));
        router.get('/sensorscriptid', (req, res)=> this.api_GetSensorScriptId(req, res));
        router.get('/zipuserscripts', (req, res)=> this.api_ZipUserScripts(req, res));
        router.post('/zipfromcsv', (req, res)=> this.api_ZipScriptsFromCSV(req, res));
        router.get('/download/:filename', (req, res)=> this.api_DownloadFile(req, res));
        router.get('/taskstatus/:taskid', (req, res)=> this.api_GetTaskStatus(req, res));
        return router;
    }    

    handleErr(req, res, err) {
        logger.error('Error::' + err.toString());
        res.status(500).send('Error occurred:' + err.toString());
    }

    /**
     * http://<server>/api/script?appid=<AppID>&userid=<UserID>&type=<ScriptType>&guid=<Guid>
     * 
     * return XSScript object as 
     * {appId, userId, type, name, guid, folder, invisible, code}
     * 
     * where code is an array of string (one string per line)
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async api_GetScriptById(req, res) {
        try {
            let appId = req.query.appid;
            if (!appId)
                throw `Missing argument: appId`;
            appId = appId.toUpperCase();

            let userId = req.query.userid;
            if (!userId)
                throw `Missing argument: userId`;
            userId = userId.toUpperCase();
            
            let scriptType = req.query.type;
            if (!scriptType)
                throw `Missing argument: type`;

            let guid = req.query.guid;
            if (!guid)
                throw `Missing argument: guid`;

            let script = await this.xsservice.queryScriptById(appId, userId, scriptType, guid);
            if (!script) {
                res.json({});
            }
            else {
                res.json(script.asJsonObject());
            }
        }
        catch(exception) {
            this.handleErr(req, res, exception);
        }
    }

    /**
     * http://<server>/api/userscripts?appid=<AppID>&userid=<UserID>&type=<ScriptType>
     * 
     * return 這個用戶的腳本(s), as array of XSScript object
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async api_GetUserScripts(req, res) {
        try {
            let appId = req.query.appid;
            if (!appId)
                throw `Missing argument: appId`;
            appId = appId.toUpperCase();

            let userId = req.query.userid;
            if (!userId)
                throw `Missing argument: userId`;
            userId = userId.toUpperCase();
            
            let scriptType = req.query.type || XSScriptType.ALL;

            let scripts = await this.xsservice.queryUserScripts(appId, userId, scriptType);
            let output = [];
            scripts.forEach((script)=> {
                output.push(script.asJsonObject());
            })
            res.json(output);
        }
        catch(exception) {
            this.handleErr(req, res, exception);
        }
    }

    /**
     * http://<server>/api/sensorscriptid?appid=<AppID>&userid=<UserID>&sensor=<SensorId>
     * 
     * 傳入指定的sensor, 回傳sensor所對應的腳本guid as
     * 
     * {
     *  guid: ".."
     * }
     * 
     * Note: 如果sensor跑的是系統腳本, 則guid是""
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async api_GetSensorScriptId(req, res) {
        try {
            let appId = req.query.appid;
            if (!appId)
                throw `Missing argument: appId`;
            appId = appId.toUpperCase();

            let userId = req.query.userid;
            if (!userId)
                throw `Missing argument: userId`;
            userId = userId.toUpperCase();
            
            let sensor = req.query.sensor;
            if (!sensor)
                throw `Missing argument: sensor`;

            let sensors = await this.xsservice.querySensors(appId, userId, sensor);
            res.json({
                guid: (sensors.length == 0 || sensors[0].groupId != "") ? "" : sensors[0].scriptId
            });
        }
        catch(exception) {
            this.handleErr(req, res, exception);
        }
    }

    /**
     * http://<server>/api/zipuserscripts?appid=<AppID>&userid=<UserID>&type=<ScriptType>
     * 
     * 把用戶的腳本(s)存到一個zip file後用戶可以下載.
     * 回傳zip file as attachment.
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async api_ZipUserScripts(req, res) {
        try {
            let appId = req.query.appid;
            if (!appId)
                throw `Missing argument: appId`;
            appId = appId.toUpperCase();

            let userId = req.query.userid;
            if (!userId)
                throw `Missing argument: userId`;
            userId = userId.toUpperCase();
            
            let scriptType = req.query.type || XSScriptType.ALL;

            let scripts = await this.xsservice.queryUserScripts(appId, userId, scriptType);

            // TODO: 收到request時就直接做查詢+壓縮的動作, 所以可能會卡住webserver的thread. 之後可以考慮搬到背景去做.
            //
            // 直接用appId/userId來當成zipfile的名稱, 所以會重複的overwrite(也有可能會發生錯誤)
            //

            let zipFilename = `${userId}(${appId}).zip`;    
            let zipFullpath = path.join(this.downloadFolder, zipFilename);

            await new XSScriptBundler().bundleUserScripts(this.xsservice, appId, userId, scriptType, zipFullpath, false);
            let data = await fs.readFileSync(zipFullpath);
            res.setHeader('Content-disposition', `attachment; filename=${zipFilename}`);
            res.setHeader('Content-type', "application/octet-stream");
            res.send(data);
        }
        catch(exception) {
            this.handleErr(req, res, exception);
        }
    }

    /**
     * http://<server>/api/download/<filename>
     *
     * 下載檔案
     *  
     * @param {*} req 
     * @param {*} res 
     */
    async api_DownloadFile(req, res) {
        try {
            let filename = req.params.filename;
            let fullpath = path.join(this.downloadFolder, filename);
            if (!fs.existsSync(fullpath))
                throw `Filename does not exists:${filename}`;
            
            let data = await fs.readFileSync(fullpath);
            res.setHeader('Content-disposition', `attachment; filename=${filename}`);
            res.setHeader('Content-type', "application/octet-stream");
            res.send(data);
        }
        catch(exception) {
            this.handleErr(req, res, exception);
        }
    }

    /**
     * http://<server>/api/taskstatus/<taskid>
     * 
     * 查詢task目前的執行情形.
     * 
     * {
     *      taskId: ..,
     *      finished: true/false,
     *      retValue: ..
     *      progress: ..
     * }
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async api_GetTaskStatus(req, res) {
        try {
            let taskId = req.params.taskid;

            try {
                let finished = await this.zipQueue.isTaskFinish(taskId);
                if (finished) {
                    let retValue = await this.zipQueue.getTaskReturnValue(taskId);
                    res.json({taskId, finished, retValue});    
                }
                else {
                    let progress = await this.zipQueue.getTaskProgress(taskId);
                    res.json({taskId, finished, progress});    
                }
            }
            catch(exception) {
                res.json({taskId, exception});
            }
        }
        catch(exception) {
            this.handleErr(req, res, exception);
        }
    }

    /**
     * 上傳想要打包的腳本資訊(appId/userId/type/guid), 產生一個zip檔案內包含這些腳本的內容
     * 
     * 回傳
     *  
     * {
     *  status: <url to query zip status>
     * }
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async api_ZipScriptsFromCSV(req, res) {
        /*
            Client端用web form的方式post:

            csv: CSV檔案, 裡面包含要打包的腳本資訊
            has_headerrow: CSV檔案是否有header row, 預設=1
            col_appid: appid是那個column (0-based), 預設=0
            col_userid: userid是那個column (0-based), 預設=1
            col_guid: guid是那個column (0-based), 預設=2
            col_type: scripttype是那個column (0-based), 預設=3
        */
        let upload = multer({storage: this.uploadStorage}).single("csv");
        upload(req, res, (err)=> {
            try {
                if (err)
                    throw err;

                let csvOption = new CSVOption(
                    (req.body['has_headerrow'] || '1') == '1',
                    parseInt(req.body['col_appid'] || '0'),
                    parseInt(req.body['col_userid'] || '1'),
                    parseInt(req.body['col_guid'] || '2'),
                    parseInt(req.body['col_type'] || '3')
                );

                let csvFilename = req.file.path;
                let timestamp = path.parse(path.basename(csvFilename)).name;
                let zipFullPathname = path.join(this.downloadFolder, `${timestamp}.zip`);

                this.procZipFromCSVTask(req, timestamp, csvFilename, csvOption, zipFullPathname)
                    .then((data)=> {
                        res.json(data);
                    })
                    .catch((err)=> {
                        this.handleErr(req, res, err);
                    })
            }
            catch(err) {
                this.handleErr(req, res, err);
            }
        })
    }

    /**
     * 從CSV內產生腳本zip檔案. 
     * 
     * 回傳 
     * {
     *      status: <url to query task status>
     * }
     * 
     * @param {*} req
     * @param {string} timestamp 收到這個request的時間(yyyyMMdd-HHmmss.SSS), 我們認定這個是unique
     * @param {string} csvFilename 
     * @param {*} csvOption CSVOption 
     * @param {string} zipFullPathname zip file的路徑(位於下載區)
     */
    async procZipFromCSVTask(req, timestamp, csvFilename, csvOption, zipFullPathname) {
        let zipBaseFilename = path.basename(zipFullPathname);
        let zipUrl = `${this.getAPIRootUrl(req)}/download/${zipBaseFilename}`;
        let task = {
            csvFilename, 
            csvOption, 
            zipFullPathname,
            zipUrl
        };

        let statusUrl = `${this.getAPIRootUrl(req)}/taskstatus/${timestamp}`;

        await this.zipQueue.add(timestamp, task);

        return {
            status: statusUrl
        };
    }

    /**
     * 回傳API的root url, 例如 "http://127.0.0.1:8686/api"
     * 
     * @param {*} req 
     */
    getAPIRootUrl(req) {
        // 最簡單的作法, 就是啟動時從外部傳入真正對外的路徑(siteUrl), 不需要從req裡面兜來兜去
        //
        return this.siteUrl + req.baseUrl;
    }

    /**
     * Process a csv zip task
     * @param {string} taskId
     * @param {*} task { csvFilename, csvOption, zipFullPathname, zipUrl} 
     */
    async zipProc(taskId, task, updateProgress) {
        let {csvFilename, csvOption, zipFullPathname} = task;

        logger.debug(`zipProc(${taskId}) started`);

        await new XSScriptBundler().bundleScriptsFromCSV(this.xsservice, csvFilename, csvOption, zipFullPathname, true, updateProgress);
        
        logger.debug(`zipProc(${taskId}) finished`);

        return task.zipUrl;
    }

}

module.exports = API;