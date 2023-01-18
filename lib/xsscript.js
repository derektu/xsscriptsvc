"use strict";

/**
 * 代表一個腳本物件
 */
class XSScript {
    constructor() {
        this.appId = '';        // AppID
        this.userId = '';       // UserID
        this.type = '';         // XSScriptType
        this.name = '';         // 腳本名稱
        this.guid = '';         // guid
        this.folder = '/';      // 儲存位置, 預設="/", always ends with "/", e.g. "/A/B/",
        this.invisible = false; // 是否隱藏程式碼
        this.code = '';         // 程式碼
    }

    /**
     * 把腳本寫成檔案內容
     */
    asFileContent() {

    }

    /**
     * 把腳本轉成json格式
     */
    asJson() {

    }

    /**
     * 從json字串轉回一個XSScript object
     * 
     * @param {*} jsonString 
     */
    static fromJson(jsonString) {

    }
}

module.exports = XSScript;

