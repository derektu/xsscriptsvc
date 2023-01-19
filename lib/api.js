"use strict"

const express = require('express');
const fs = require('fs');
const path = require('path');
const moment = require('moment');

const XSScriptType = require('./xsscripttype');
const logger = require('./logger').getLogger('[API]');
const XSService = require('./xsservice');
const XSScriptFileSvc = require('./xsscriptfilesvc');

class API {
    /**
     * @param {*} xsservice XSService object
     * @param {string} siteUrl location of this site, e.g. http://localhost:8686, or https://pm.moneydj.com/xsscript
     */
    constructor(xsservice, siteUrl) {
        this.xsservice = xsservice;
        this.siteUrl = siteUrl;

        // without trailing '/'
        if (this.siteUrl.endsWith('/'))
            this.siteUrl = this.siteUrl.substring(0, this.siteUrl.length-1);

        this.downloadFolder = path.resolve(__dirname + '/../downloads');
        fs.mkdirSync(this.downloadFolder, {recursive: true});
    }

    getRouter() {
        var router = express.Router();

        router.get('/script', (req, res)=> this.getScriptById(req, res));
        router.get('/userscripts', (req, res)=> this.getUserScripts(req, res));
        router.get('/zipuserscripts', (req, res)=> this.zipUserScripts(req, res));
        router.get('/download/:filename', (req, res)=> this.downloadFile(req, res));

        return router;
    }    

    handleErr(req, res, err) {
        logger.error('Error::' + err.toString());
        res.status(500).send('Error occurred:' + err.toString());
    }

    /**
     * http://<server>/api/script?appid=<AppID>&userid=<UserID>&type=<ScriptType>&guid=<Guid>
     * 
     * return XSScript object
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async getScriptById(req, res) {
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
    async getUserScripts(req, res) {
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
     * http://<server>/api/zipuserscripts?appid=<AppID>&userid=<UserID>&type=<ScriptType>
     * 
     * 把用戶的腳本(s)存到一個zip file後用戶可以下載
     * 
     * @param {*} req 
     * @param {*} res 
     */
    async zipUserScripts(req, res) {
        // TODO: 收到request時就直接做查詢+壓縮的動作, 所以可能會卡住webserver的thread. 之後再搬到背景去做.
        //
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

            // 直接用appId/userId來當成zipfile的名稱, 所以會重複的overwrite(也有可能會發生錯誤)

            let zipfilename = `${userId}(${appId}).zip`;    
            let fullfilename = path.join(this.downloadFolder, zipfilename);
            await new XSScriptFileSvc().scriptsToZipFile(scripts, true, fullfilename);

            res.json({
                zipfile: this.getDownloadUrlPrefix(req) + zipfilename
            });
        }
        catch(exception) {
            this.handleErr(req, res, exception);
        }
    }

    async downloadFile(req, res) {
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
     * 回傳處理結果檔案的url路徑Prefix, 例如 "http://127.0.0.1:8686/api/download/"
     * 
     * @param {*} req 
     */
    getDownloadUrlPrefix(req) {
        // 最簡單的作法, 就是啟動時從外部傳入真正對外的路徑(siteUrl), 不需要從req裡面兜來兜去
        //
        return this.siteUrl + req.baseUrl + "/download/";
    }


}

module.exports = API;