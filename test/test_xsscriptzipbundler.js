"use strict";

const fs = require('fs');

const XSService = require('../lib/xsservice');
const XSScriptType = require('../lib/xsscripttype');
const {XSScriptBundler, CSVOption} = require('../lib/xsscriptbundler');
const assert = require('assert');

describe.only("XSScriptBundler", async ()=> {
    it("test bundleUserScripts(no userprefix|zip)", async() => {
        let svc = new XSService();
        let generator = new XSScriptBundler();

        let appId = 'DAQ';
        let userId = 'ALEXCHUW';
        let scriptType = XSScriptType.Function;

        let zipfile = `./output/${userId}(${appId}).zip`;

        await generator.bundleUserScripts(svc, appId, userId, scriptType, zipfile, false);
    })

    it("test bundleUserScripts(no userprefix|file)", async() => {
        let svc = new XSService();
        let generator = new XSScriptBundler();

        let appId = 'DAQ';
        let userId = 'ALEXCHUW';
        let scriptType = XSScriptType.Function;

        let zipfile = `./output/${userId}(${appId})`;

        await generator.bundleUserScripts(svc, appId, userId, scriptType, zipfile, false);
    })

    it("test bundleUserScripts(with userprefix|zip)", async() => {
        let svc = new XSService();
        let generator = new XSScriptBundler();

        let appId = 'DAQ';
        let userId = 'ALEXCHUW';
        let scriptType = XSScriptType.Function;

        let zipFile = `./output/${userId}(${appId})-prefix.zip`;

        await generator.bundleUserScripts(svc, appId, userId, scriptType, zipFile, true);
    })

    it("test bundleUserScripts(with userprefix|file)", async() => {
        let svc = new XSService();
        let generator = new XSScriptBundler();

        let appId = 'DAQ';
        let userId = 'ALEXCHUW';
        let scriptType = XSScriptType.Function;

        let zipFile = `./output/${userId}(${appId})-prefix`;

        await generator.bundleUserScripts(svc, appId, userId, scriptType, zipFile, true);
    })
    
    it("test bundleScriptsFromCSV(has headerrow|zip)", async()=> {
        let svc = new XSService();
        let generator = new XSScriptBundler();
        let csvFile = './data/scripts.csv';
        let zipFile = `./output/csv.zip`;
        let csvOption = new CSVOption(true, 0, 1, 2, 3);
        await generator.bundleScriptsFromCSV(svc, csvFile, csvOption, zipFile, true);
    })

    it("test bundleScriptsFromCSV(has headerrow|file)", async()=> {
        let svc = new XSService();
        let generator = new XSScriptBundler();
        let csvFile = './data/scripts.csv';
        let zipFile = `./output/scripts`;
        let csvOption = new CSVOption(true, 0, 1, 2, 3);
        await generator.bundleScriptsFromCSV(svc, csvFile, csvOption, zipFile, true);
    })

    it("test bundleScriptsFromCSV(no headerrow|zip)", async()=> {
        let svc = new XSService();
        let generator = new XSScriptBundler();
        let csvFile = './data/scripts(noheaderrow).csv';
        let zipFile = `./output/csv(noheaderrow).zip`;
        let csvOption = new CSVOption(false, 0, 1, 2, 3);
        await generator.bundleScriptsFromCSV(svc, csvFile, csvOption, zipFile, true);
    })

})