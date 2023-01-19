# XSScriptSvc

提供XS腳本查詢的服務.

## Installation

```
$ npm ci                        # 不要用npm install, 不然package-lock.json會被異動
$ npm run dev                   # for local development, port=8686
$ pm2 start local.config.js     # for local development test for pm2
$ pm2 start server.config.js    # 如果是在203.67.19.129, 則使用這一個來deploy pm2
```

## API

### 查詢特定腳本的資訊 

```
http://<server>/api/script?appid=<AppID>&userid=<UserID>&type=<ScriptType>&guid=<Guid>
```

回傳腳本內容如下: 

```
{
    appId : <AppID>, 
    userId : <UserID>,
    type: <ScriptType>,
    guid: <Guid>,
    name: <腳本名稱>,
    folder: <腳本的路徑>,
    invisible: <是否是隱藏的腳本>,
    code: [
        "line#1",
        "line#2",
        "line#3",
        ..
    ]
}
```

說明:

- type是腳本類型, 1=函數, 2=指標, 3=Sensor, 4=選股, 7=自動交易,
- invisible為true/false, true表示腳本是鎖碼的,
- folder是腳本的儲存路徑, 預設是"/",

### 查詢用戶某種類型的腳本資訊 

```
http://<server>/api/userscripts?appid=<AppID>&userid=<UserID>&type=<ScriptType>
```

回傳內容為一個陣列, 每個element是一個腳本物件. 如下: 

```
[
    {
        appId : <AppID>, 
        userId : <UserID>,
        type: <ScriptType>,
        guid: <Guid>,
        name: <腳本名稱>,
        folder: <腳本的路徑>,
        invisible: <是否是隱藏的腳本>,
        code: [
            "line#1",
            "line#2",
            "line#3",
            ..
        ]
    }
]
```

說明:

- 查詢時需傳入腳本類型, 1=函數, 2=指標, 3=Sensor, 4=選股, 7=自動交易. 如果不傳的話則回傳所有腳本, 不分類.

