"use strict";

const fs = require('fs');

const XSService = require('../lib/xsservice');
const XSScriptType = require('../lib/xsscripttype');
const {XSScriptBundler, CSVOption} = require('../lib/xsscriptbundler');
const assert = require('assert');

describe.only("XSScriptBundler", async ()=> {
    it("test bundleUserScripts(zip|noprefix|folder)", async() => {
        let svc = new XSService();
        let generator = new XSScriptBundler();

        let appId = 'DAQ';
        let userId = 'ALEXCHUW';
        let scriptType = XSScriptType.Function;

        let zipfile = `./output/${userId}(${appId}).zip`;

        await generator.bundleUserScripts(svc, appId, userId, scriptType, zipfile, {userPrefix:false});
    })

    it("test bundleUserScripts(zip|noprefix|flatten)", async() => {
        let svc = new XSService();
        let generator = new XSScriptBundler();

        let appId = 'DAQ';
        let userId = 'ALEXCHUW';
        let scriptType = XSScriptType.Function;

        let zipfile = `./output/${userId}(${appId})-flatten.zip`;

        await generator.bundleUserScripts(svc, appId, userId, scriptType, zipfile, {userPrefix:false,keepFolder:false});
    })

    it("test bundleUserScripts(file|noprefix|folder)", async() => {
        let svc = new XSService();
        let generator = new XSScriptBundler();

        let appId = 'DAQ';
        let userId = 'ALEXCHUW';
        let scriptType = XSScriptType.Function;

        let zipfile = `./output/${userId}(${appId})`;

        await generator.bundleUserScripts(svc, appId, userId, scriptType, zipfile, {userPrefix:false});
    })

    it("test bundleUserScripts(file|noprefix|flatten)", async() => {
        let svc = new XSService();
        let generator = new XSScriptBundler();

        let appId = 'DAQ';
        let userId = 'ALEXCHUW';
        let scriptType = XSScriptType.Function;

        let zipfile = `./output/${userId}(${appId})-flatten`;

        await generator.bundleUserScripts(svc, appId, userId, scriptType, zipfile, {userPrefix:false,keepFolder:false});
    })

    it("test bundleUserScripts(zip|prefix|folder)", async() => {
        let svc = new XSService();
        let generator = new XSScriptBundler();

        let appId = 'DAQ';
        let userId = 'ALEXCHUW';
        let scriptType = XSScriptType.Function;

        let zipFile = `./output/${userId}(${appId})-prefix.zip`;

        await generator.bundleUserScripts(svc, appId, userId, scriptType, zipFile);
    })

    it("test bundleUserScripts(file|prefix|folder)", async() => {
        let svc = new XSService();
        let generator = new XSScriptBundler();

        let appId = 'DAQ';
        let userId = 'ALEXCHUW';
        let scriptType = XSScriptType.Function;

        let zipFile = `./output/${userId}(${appId})-prefix`;

        await generator.bundleUserScripts(svc, appId, userId, scriptType, zipFile);
    })
    
    it("test bundleScriptsFromCSV(zip|has headerrow)", async()=> {
        let svc = new XSService();
        let generator = new XSScriptBundler();
        let csvFile = './data/scripts.csv';
        let zipFile = `./output/csv.zip`;
        let csvOption = new CSVOption(true, 0, 1, 2, 3);
        await generator.bundleScriptsFromCSV(svc, csvFile, csvOption, zipFile);
    })

    it("test bundleScriptsFromCSV(zip|has headerrow|flatten)", async()=> {
        let svc = new XSService();
        let generator = new XSScriptBundler();
        let csvFile = './data/scripts.csv';
        let zipFile = `./output/csv-flatten.zip`;
        let csvOption = new CSVOption(true, 0, 1, 2, 3);
        await generator.bundleScriptsFromCSV(svc, csvFile, csvOption, zipFile, {keepFolder:false});
    })

    it("test bundleScriptsFromCSV(file|has headerrow)", async()=> {
        let svc = new XSService();
        let generator = new XSScriptBundler();
        let csvFile = './data/scripts.csv';
        let zipFile = `./output/scripts`;
        let csvOption = new CSVOption(true, 0, 1, 2, 3);
        await generator.bundleScriptsFromCSV(svc, csvFile, csvOption, zipFile);
    })

    it("test bundleScriptsFromCSV(file|has headerrow|flatten)", async()=> {
        let svc = new XSService();
        let generator = new XSScriptBundler();
        let csvFile = './data/scripts.csv';
        let zipFile = `./output/scripts-flatten`;
        let csvOption = new CSVOption(true, 0, 1, 2, 3);
        await generator.bundleScriptsFromCSV(svc, csvFile, csvOption, zipFile, {keepFolder:false});
    })

    it("test bundleScriptsFromCSV(zip|no headerrow)", async()=> {
        let svc = new XSService();
        let generator = new XSScriptBundler();
        let csvFile = './data/scripts(noheaderrow).csv';
        let zipFile = `./output/csv(noheaderrow).zip`;
        let csvOption = new CSVOption(false, 0, 1, 2, 3);
        await generator.bundleScriptsFromCSV(svc, csvFile, csvOption, zipFile);
    })
})