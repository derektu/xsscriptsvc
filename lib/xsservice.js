"use strict";

const fetch = require('node-fetch');
const _ = require('lodash');

const XSRequest = require('./xsrequest');
const logger = require('./logger').getLogger('[XSSvc]');
const XSScriptType = require('./xsscripttype');
const XSScript = require('./xsscript');

class XSService {
    /**
     * construct XSService object
     * 
     * 實際的hub位置在
     *  http://192.168.99.153 (測試環境)
     *  http://sd-xshubuat/2019/index.html (UAT環境)
     * 
     *  管理介面 <hub>/2019/index.html
     * 
     * 在203.67.19.129上面架了兩個proxy
     * 
     *  http://203.67.19.129/xsservicetest 指向192.168.99.153
     *  http://203.67.19.129/xsserviceutat 指向sd-xshubuat
     * 
     * @param {string} server xshub server location, for example "http://203.67.19.129/xsserviceuat/"
     */
    constructor(server) {
        this.server = server || 'http://203.67.19.129/xsserviceuat/';
        if (!this.server.endsWith('/'))
            this.server = this.server + '/';
    }

    /**
     * 查詢腳本的內容 by guid/scriptType
     * 
     * @param {string} appId 
     * @param {string} userId 
     * @param {string} scriptType, use any of XSScriptType
     * @param {string} guid 
     * @returns {*} return XSScript object, or null if not found.  
     */
    async queryScriptById(appId, userId, scriptType, guid) {
        let xml = this._composeScriptQueryXml(appId, userId, scriptType, guid);

        var version = 1;
        var action = 403;

        let xmldoc = await new XSRequest().postXmlRequst(this.server, version, action, xml);
        let scripts = this._parseScriptQueryXml(xmldoc);
        if (!scripts || scripts.length == 0)
            return null;
        
        return scripts[0];    
    }

    _composeScriptQueryXml(appId, userId, scriptType, guid) {
        /*
         <?xml version='1.0' encoding='utf-8' ?>
        <DB Type='3'>
            <Query Type='1' AppID="DAQ" UserID="yuweiyang" ID="e9ccfbb8156c4b0089ec4a0c716875d7" ScriptType="3"/>
        </DB>         
         */

        let xml = `<?xml version="1.0" encoding="utf-8" ?>`;
        xml += '<DB Type="3">';
        xml += `<Query Type="1" AppID="${appId}" UserID="${userId}" ID="${guid}" ScriptType="${scriptType}"/>`;
        xml += '</DB>'
        return xml;
    }

    _parseScriptQueryXml(doc) {
        /*
            xml格式請參考 data/queryScript.xml

            <Result status="0">
                <Scripts AppID="DAQXQLITE" UserID="UNIDOLF" Version="2" Lang="TW" StatusMask="34">
                    <Script Type="3" Name="Arrive Price" ID="902ee595796e4b23882bb2578ab6305c" ReturnType="0" ExecType="1" Folder="/" UpdateTime="20221101-002241" CompileStatus="0" StatusMask="34">
                        <Desc><![CDATA[]]></Desc>
                        <Code><![CDATA[Input: cross_way(1, "1:大於等於/2:小於等於");
                        ...
                        ]]></Code>
                    </Script>
                </Scripts>
            </Result>                        
        */
        let rootNode = doc.documentElement.getElementsByTagName("Scripts")[0];
        if (!rootNode)
            throw `Unexpected format: cannot find <Scripts>`;
        
        let appId = rootNode.getAttribute("AppID");
        let userId = rootNode.getAttribute("UserID");
        let scripts = [];
        let scriptNodes = rootNode.getElementsByTagName("Script");
        for (let i = 0; i < scriptNodes.length; i++) {
            let node = scriptNodes.item(i);

            let type = node.getAttribute("Type");
            let name = node.getAttribute("Name");
            let guid = node.getAttribute("ID");
            let folder = node.getAttribute("Folder") || "/";
            let mask = node.getAttribute("StatusMask") || "0";

            if (!name || !guid)
                continue;
            
            let nodeCode = node.getElementsByTagName("Code")[0];
            if (!nodeCode)
                continue;
            
            nodeCode = nodeCode.firstChild;
            if (!nodeCode)
                continue;
            
            let code = nodeCode.data || '';
            if (!code)
                continue;
            
            let script = new XSScript();
            script.appId = appId;
            script.userId = userId;
            script.type = type;
            script.name = name;
            script.guid = guid;
            script.folder = folder;
            script.invisible = mask == "0";
            script.code = code;

            scripts.push(script);
        }
        return scripts;    
    }

    /**
     * 查詢用戶某種類型scripts的清單
     * 
     * TODO: 這個動作, 是把所有腳本一次全部查回來, 目前看起來速度還OK. 未來如果遇到問題的話, 可以改成兩段式
     * 
     * 第一次送這個payload
     * <DB Type='12'>
     *   <Sync AppID='DAQ' UserID='yuweiyang' SyncVer='2'>
     *      <List ScriptType="0"/>
     *  </Sync>
     * </DB>
     * 
     * ScriptType = "0" 表示所有類型的腳本(也可以只query某種類型的腳本). 之後再一個一個去抓資料. 
     * 
     * @param {string} appId 
     * @param {string} userId 
     * @param {string} scriptType, use any of XSScriptType, XSScriptType.ALL可以抓回所有類型的腳本.
     * @returns {*} array of XSScript.
     */
    async queryUserScripts(appId, userId, scriptType) {
        let xml = this._composeScriptTypeQueryXml(appId, userId, scriptType);

        var version = 1;
        var action = 403;

        let xmldoc = await new XSRequest().postXmlRequst(this.server, version, action, xml);
        return this._parseScriptQueryXml(xmldoc);
    }

    _composeScriptTypeQueryXml(appId, userId, scriptType) {
        /*
         <?xml version='1.0' encoding='utf-8' ?>
        <DB Type='3'>
            <Query Type='4' AppID="DAQ" UserID="yuweiyang" ScriptType="3"/>
        </DB>         
         */

        let xml = `<?xml version="1.0" encoding="utf-8" ?>`;
        xml += '<DB Type="3">';
        xml += `<Query Type="4" AppID="${appId}" UserID="${userId}" ScriptType="${scriptType}"/>`;
        xml += '</DB>'
        return xml;
    }

    /**
     * 查詢sensor的設定. 可以一次查詢同一個用戶的多個sensors.
     * 
     * @param {string} appId AppID
     * @param {string} userId UserID
     * @param {*} sensorIds sensorId to lookup. 可以傳入一個array of strings, or string(';'-separated)
     * @returns {*} return array of {sensorId, groupId, scriptId}
     */
    async querySensors(appId, userId, sensorIds) {
        if (!Array.isArray(sensorIds))
            sensorIds = sensorIds.split(";");

        let xml = this._composeSensorQueryXml(appId, userId, sensorIds);

        var version = 1;
        var action = 219;

        let xmldoc = await new XSRequest().postXmlRequst(this.server, version, action, xml);
        return this._parseSensorQueryXml(xmldoc);
    }

    _composeSensorQueryXml(appId, userId, sensorIds) {
        /*
         <?xml version='1.0' encoding='utf-8' ?>
         <UserSensorDB Type="4" AppID="DAQ" UserID="yuweiyang" Version="1">
            <Query SID="040F575D-A31B-4573-990C-D846F7498019"/>
         </UserSensorDB>
         */
        let xml = `<?xml version="1.0" encoding="utf-8" ?>`;
        xml += `<UserSensorDB Type="4" AppID="${appId}" UserID="${userId}" Version="1">`;
        sensorIds.forEach((sensorId)=> {
            xml += `<Query SID="${sensorId}"/>`
        })
        xml += '</UserSensorDB>';
        return xml;
    }

    _parseSensorQueryXml(doc) {
        /*
            xml格式請參考 data/querySensor.xml

            <Result status="0" version="1">
                <UserSensor SID="859D0E82-F53E-461a-BD47-29F347BEC7E6"><![CDATA[
                    ... json data
                ]]>
                </UserSensor>    
            </Result>    
        */
        let sensorNodes = doc.documentElement.getElementsByTagName("UserSensor");
        let sensors = [];
        for (let i = 0; i < sensorNodes.length; i++) {
            let node = sensorNodes.item(i);
            let sensorId = node.getAttribute("SID");
            let sensorText = node.firstChild.data;
            // 資料內沒有處理各種encoding !! 所以我們改用regular expression來取我們所需要的部分
            try {
                let {groupId, scriptId} = this._parseSensorData(sensorText);
                // let sensor = JSON.parse(node.firstChild.data);
                //  sensor.Script.ID, sensor.Script.GroupID
                //
                sensors.push({sensorId: sensorId, groupId: groupId, scriptId:scriptId});    
            }
            catch(exception) {
                logger.error(exception);
            }
        }    
        return sensors;
    }

    _parseSensorData(sensorText) {
        // "Script":{"ID":"..","GroupID":".."
        let regex = /,\"Script\":\{\"ID\":\"(.*?)\",\"GroupID\":\"(.*?)"/;
        let match = sensorText.match(regex);
        if (!match)
            throw `cannot find Script:ID in ${sensorText}`;
        
        return {groupId: match[2]||'', scriptId:match[1]}   
    }


}

module.exports = XSService;