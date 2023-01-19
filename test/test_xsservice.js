"use strict";

const XSService = require('../lib/xsservice');
const XSScriptType = require('../lib/xsscripttype');
const XSRequest = require('../lib/xsrequest');
const assert = require('assert');

describe("XSService", ()=> {
    it("test queryScriptById", async()=> {
        let svc = new XSService();

        let appId = 'DAQXQLITE';
        let userId = 'UNIDOLF';
        let scriptType = XSScriptType.Sensor;
        let guid = '902ee595796e4b23882bb2578ab6305c'

        let data = await svc.queryScriptById(appId, userId, scriptType, guid);
        
        assert(data.type == XSScriptType.Sensor);
        assert(data.guid == guid);
        assert(data.code != '');
    })

    it("test queryScriptById failure will throw exception", async()=> {
        let svc = new XSService();

        let appId = 'DAQXQLITE';
        let userId = 'UNIDOLF_XYZ';
        let scriptType = XSScriptType.Sensor;
        let guid = '902ee595796e4b23882bb2578ab6305c'

        await assert.rejects(
            async() => {
                await svc.queryScriptById(appId, userId, scriptType, guid);
            },
            (err) => {
                return true;
            }
        )
    })    

    it("test queryUserScripts", async()=> {
        let svc = new XSService();

        let appId = 'DAQ';
        let userId = "EDDIE101";

        let scripts = await svc.queryUserScripts(appId, userId, XSScriptType.ALL);

        assert(scripts.length > 0);
    })
    
    it("test querySensors", async()=> {
        let svc = new XSService();

        let appId = 'DAQXQLITE';
        let userId = 'UNITED7878';
        let guid = 'FBABA792-9A0B-414b-9CF6-DACE911FAA5A';

        let sensors = await svc.querySensors(appId, userId, guid);

        assert(sensors.length == 1, "應該回傳一個object");
        assert(sensors[0].guid == guid);
        assert(sensors[0].groupId == "");
        assert(sensors[0].scriptId != "");
    })

    it("test querySensors failure will return empty array", async()=> {
        let svc = new XSService();

        let appId = 'DAQXQLITE';
        let userId = 'UNITED7878-xyz';
        let guid = 'FBABA792-9A0B-414b-9CF6-DACE911FAA5A';

        let sensors = await svc.querySensors(appId, userId, guid);

        assert(sensors.length == 0, "找不到, 應該回傳0個object");
    })

    it("test querySensors multiple", async()=> {
        let svc = new XSService();

        let appId = 'DAQXQLITE';
        let userId = 'GAMESTOCK';
        let guids = '58B97315-33FC-4d19-B0CD-D7138656D0D4;864093BD-084C-4a75-A27B-9355744F0BE0;4A1EC15F-49E8-419a-A8BD-EED41EC04E45';

        let sensors = await svc.querySensors(appId, userId, guids);
        assert(sensors.length == 3, "應該回傳3個object");
    })
    
});

