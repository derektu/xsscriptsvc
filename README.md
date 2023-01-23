# XSScriptSvc

提供XS腳本查詢的服務.

## Installation

- 請確定有安裝redis (for node.js bull module)

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

### 查詢Sensor對應的自訂腳本的資訊 

```
http://<server>/api/sensorscript?appid=<AppID>&userid=<UserID>&guid=<Guid>
```

如果Sensor對應的是自訂腳本(非系統腳本), 則回傳這個腳本的內容, 格式同 /script

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

### 下載用戶某種類型的腳本資訊 

```
http://<server>/api/zipuserscripts?appid=<AppID>&userid=<UserID>&type=<ScriptType>
```

回傳產生的zip檔案, 以attachment的方式回傳. 

### 上傳csv, 產生csv內所定義的腳本

```
http://<server>/api/zipfromcsv
```

client端需post以下資料:

- csv: FILE for the CSV file
- has_headerrow: csv是否有header row, 預設是1
- col_appid: AppID是第幾欄, 預設是0 (0-based)
- col_userid: UserID是第幾欄, 預設是1 (0-based)  
- col_type: ScriptType是第幾欄, 預設是2 (0-based)
- col_guid: Guid是第幾欄, 預設是3 (0-based)

server收到request之後, 會回傳

```
{
    status: <url>
}
```

Client端可以呼叫\<url\>, 取得這個zip task執行的狀態. Url會回傳以下內容

```
{
    taskId: '..', 
    finished: ..,
    progress: '..',
    retValue: '..'
}
```

- taskId是一個unique的字串, 代表這一次上傳,
- finished是true or false, 
- 如果是true的話, 則可以從retValue內得到一個可以下載zip檔案的路徑
- 如果是false的話, 則可以檢視progress, 這是一個字串, 說明目前處理的進度

