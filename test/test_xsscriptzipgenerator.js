"use strict";

const fs = require('fs');

const XSService = require('../lib/xsservice');
const XSScriptType = require('../lib/xsscripttype');
const {XSScriptZipGenerator, CSVOption} = require('../lib/xsscriptzipgenerator');
const assert = require('assert');

describe.only("XSScriptZipGenerator", async ()=> {
    it("test zipUserScripts(no userprefix)", async() => {
        let svc = new XSService();
        let generator = new XSScriptZipGenerator();

        let appId = 'DAQ';
        let userId = 'ALEXCHUW';
        let scriptType = XSScriptType.Function;

        let zipfile = `./output/${userId}(${appId}).zip`;


        await generator.zipUserScripts(svc, appId, userId, scriptType, zipfile, false);
    })

    it("test zipUserScripts(with userprefix)", async() => {
        let svc = new XSService();
        let generator = new XSScriptZipGenerator();

        let appId = 'DAQ';
        let userId = 'ALEXCHUW';
        let scriptType = XSScriptType.Function;

        let zipFile = `./output/${userId}(${appId})-prefix.zip`;

        await generator.zipUserScripts(svc, appId, userId, scriptType, zipFile, true);
    })


    it("test zipScriptsFromCSV", async()=> {
        let svc = new XSService();
        let generator = new XSScriptZipGenerator();
        let csvFile = './data/scripts.csv';
        let zipFile = `./output/csv.zip`;
        let csvOption = new CSVOption(true, 0, 1, 3, 2);
        await generator.zipScriptsFromCSV(svc, csvFile, csvOption, zipFile, true);
    })

    it("test zipScriptsFromCSV(no headerrow)", async()=> {
        let svc = new XSService();
        let generator = new XSScriptZipGenerator();
        let csvFile = './data/scripts(noheaderrow).csv';
        let zipFile = `./output/csv(noheaderrow).zip`;
        let csvOption = new CSVOption(false, 0, 1, 3, 2);
        await generator.zipScriptsFromCSV(svc, csvFile, csvOption, zipFile, true);
    })

})