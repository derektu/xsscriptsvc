"use strict";

const fetch = require('node-fetch');
var DOMParser = require('xmldom').DOMParser;

const logger = require('./logger').getLogger('[XSR]');

/**
 * 呼叫XSService的流程
 */
 class XSRequest {

    static turnOnTracing(enable) {
        if (enable)
            logger.level = 'all';
        else
            logger.level = 'debug';    
    }

    /**
     * Perform a XS request (with xml data), and return the xml DOM document
     * 
     * @param {string} url XS server的位置
     * @param {integer} version XS call的version
     * @param {integer} action XS call的action 
     * @param {string} postXml 要呼叫的xml payload
     * 
     * @returns {*} 回傳結果內的xml文件object
     */
	async postXmlRequst(url, version, action, postXml) {
		let postData = this._generateRequestBody(version, action, postXml);
        let options = {};
        options["headers"] = {
            'content-length' : postData.length,
            'content-type' : 'application/octet-stream'
        };
        options["method"] = "POST";
        options["body"] = postData;

        try {
            let response = await fetch(url, options);
            let xmltext = await response.text();
            logger.trace(xmltext);
            return this._parseXmlResult(xmltext);    
        }
        catch(exception) {
            logger.error(`Calling [${url}:${version}:${action}:${postXml}] fails:${exception}`);
            throw exception;
        }
    }    

	_generateRequestBody(version, action, content) {
		var contentBuf = Buffer.from(content, 'utf8');
		var frame = Buffer.alloc(8);
		frame.writeInt32LE(contentBuf.length + 4, 0);
		frame.writeInt16LE(version, 4);
		frame.writeInt16LE(action, 6);
		return Buffer.concat([frame, contentBuf]);
	}

	_parseXmlResult(xml) {
		/*
			<Ret status="0">
			...
			</Ret>
		*/
		var doc = new DOMParser().parseFromString(xml);
		var status = doc.documentElement.getAttribute("status") || "0";
		if (status != "0")
			throw 'Xml Ret status = ' + status;
		else
			return doc;
	}
}

module.exports = XSRequest;