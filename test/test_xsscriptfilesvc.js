"use strict";

const fs = require('fs');

const XSService = require('../lib/xsservice');
const XSScriptType = require('../lib/xsscripttype');
const XSScriptFileSvc = require('../lib/xsscriptfilesvc');
const assert = require('assert');

describe.only("XSScriptFileSvc", async ()=> {
    it("zip one user", async()=> {
        let svc = new XSService();

        let appId = 'DAQXQLITE';
        let userId = 'UNIDOLF';
        let scriptType = XSScriptType.Sensor;

        let scripts = await svc.queryUserScripts(appId, userId, scriptType);

        let zipfile = `./output/${userId}(${appId}).zip`;
        await new XSScriptFileSvc().scriptsToZipFile(scripts, true, zipfile);
    })

    it("zip one user (with prefix)", async()=> {
        let svc = new XSService();

        let appId = 'DAQXQLITE';
        let userId = 'UNIDOLF';
        let scriptType = XSScriptType.Sensor;

        let scripts = await svc.queryUserScripts(appId, userId, scriptType);

        let zipfile = `./output/${userId}(${appId})-prefix.zip`;
        await new XSScriptFileSvc().scriptsToZipFile(scripts, false, zipfile);
    })

});
