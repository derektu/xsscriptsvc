"use strict"

const express = require('express');
const logger = require('./logger').getLogger('[API]');
const XSService = require('./xsservice');

class API {
    constructor(servicelocator) {
        this.xsservice = servicelocator['xsservice'];
    }

    getRouter() {
        var router = express.Router();

        router.get('/script', (req, res)=> this.getScriptById(req, res));

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
            res.json({
                appId: script.appId,
                userId: script.userId,
                type: script.type,
                guid: script.guid,
                name: script.name,
                folder: script.folder,
                invisible: script.inviable,
                code: script.code.split("\r\n")
            });
        }
        catch(exception) {
            this.handleErr(req, res, exception);
        }
    }
}

module.exports = API;