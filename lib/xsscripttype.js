"use strict";

class XSScriptType {
    constructor() {
        this.ALL = '0';
        this.Function = '1';
        this.Indicator = '2';
        this.Sensor = '3';
        this.Filter = '4';
        this.AutoTrade = '7';
    }
}

module.exports = new XSScriptType();
