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
        let content = '';
        content += `{User:${this.appId}-${this.userId}}\n`;
        content += `{Type:${this.type}}\n`;
        content += `{Path:${this.folder}${this.invisible ? '^':''}${this.name} ${this.invisible ? '(__HIDDEN__)':''}}\n`;
        content += `{ID:${this.guid}}\n`;
        content += this.code;
        return content;
    }

    /**
     * 把xsscript轉成一個'readable'的json樣式
     * 
     * TODO: 這樣子的寫法感覺蠻爛的@@
     */
    asJsonObject() {
        return {
            appId: this.appId,
            userId: this.userId,
            type: this.type,
            guid: this.guid,
            name: this.name,
            folder: this.folder,
            invisible: this.inviable,
            code: this.code.split("\r\n")
        };
    }
}

module.exports = XSScript;

