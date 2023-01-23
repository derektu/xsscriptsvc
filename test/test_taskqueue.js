"use strict";

const assert = require('assert');
const moment = require('moment');

const XSService = require('../lib/xsservice');
const XSScriptType = require('../lib/xsscripttype');
const XSScriptFileSvc = require('../lib/xsscriptfilesvc');
const TaskQueue = require('../lib/taskqueue');

describe.only("TaskQueue", async ()=> {
    it("test", async()=> {
        const delay = (t, val) => new Promise(resolve => setTimeout(resolve, t, val));
        const workerProc = async(taskId, task, updateProgress) => {
            console.log(`workerProc started. taskId: ${taskId}, task:${JSON.stringify(task)}`);
            let timeout = 0;
            while (timeout <= task.timeout) {
                await delay(100);
                timeout += 100;
                await updateProgress(`${timeout}/${task.timeout}`);
            }

            console.log(`workerProc finished. taskId: ${taskId} finished at ${moment().format("HHmmss.SSS")}`);
            return task.retvalue;
        }

        let queue = new TaskQueue('test', workerProc);

        let taskId1 = moment().format("YYYYMMDD-HHmmss.SSS");
        console.log(`add task${taskId1} at ${moment().format("HHmmss.SSS")}`);
        await queue.add(taskId1, {timeout: 5000, retvalue: 'abc'});

        let taskId2 = moment().format("YYYYMMDD-HHmmss.SSS");
        console.log(`add task${taskId2} at ${moment().format("HHmmss.SSS")}`);
        await queue.add(taskId2, {timeout: 10000, retvalue: 'def'});

        const waitForTaskToFinish = async(taskId)=> {
            try {
                while (!await queue.isTaskFinish(taskId)) {
                    let progress = await queue.getTaskProgress(taskId);
                    console.log(`${taskId} current progress:${progress}`);
                    await delay(500);
                }
                
                return await queue.getTaskReturnValue(taskId);    
            }       
            catch(exception) {
                console.error(`isTaskFinish(${taskId}) exception=${exception}`);
            }  
        }

        console.log(moment().format("HHmmss.SSS"));
        let retValue = await waitForTaskToFinish(taskId1);
        console.log(`${taskId1} is finished with ${retValue}. Now:${moment().format("HHmmss.SSS")}`);
        retValue = await waitForTaskToFinish(taskId2);
        console.log(`${taskId2} is finished with ${retValue}. Now:${moment().format("HHmmss.SSS")}`);
        await queue.close();

    })

});