"use strict"

const Queue = require("bull");

/**
 * 提供一個在背景執行task的流程(實際實做採用bull module)
 * 
 * let queue = new TaskQueue(name, workerProc);
 * 
 * await queue.add(taskId1, {..data for this task..});  // add a task, taskId1 must be unique
 * await queue.add(taskId2, {..data for this task..});  // add a task, taskId2 must be unique
 * 
 * let isFinish = await queue.isTaskFinish(taskId1);    // check if taskId1 is finished
 * 
 * async workerProc(taskId1, {..data for this task..}) {
 *    // execute this task
 * }
 */
class TaskQueue {
    /**
     * 建立一個TaskQueue. 之後可以用add的方式加入要在背景執行的task. 
     * 
     * 有新的task時, 會呼叫workerProc. WorkerProc是一個async函數, signature如下
     * 
     * async workerProc(taskId, task, updateProgress) {
     *  // taskId是add時傳入的unique編號字串
     *  // task是add時傳入的task內容
     *  // updateProgress是一個async callback, 用來report task的progress.
     *  //
     *  .. do something
     *  await updateProgress('progress#1');    // progress可以是一個數字, 或是任意字串
     *  .. do something
     *  await updateProgress('progress#2');
     *  .. 
     *  return 'my result';                    // task結束時可以回傳任意物件
     * }
     * 
     * caller加入task之後, 可以透過以下API查詢task的進度
     * 
     * let isFinished = await queue.isTaskFinished(taskId);         // 尚未結束時回傳false, 結束時回傳true
     * let returnValue = await queue.getTaskReturnValue(taskId);    // 結束時回傳workerProc的return value
     * let progress = await queue.getTaskProgress(taskId);          // 回傳task的執行進度 (as reported by updateProgress)
     * 
     * @param {string} name unique string to identify this task queue.
     * @param {*} workerProc 這是執行task的function.
     */
    constructor(name, workerProc) {
        // TODO: 目前先用local redis, 未來可以開放redis的參數
        //
        this.queue = new Queue(name, "redis://127.0.0.1:6379");
        this.workerProc = workerProc;

        this.queue.process(async (job) => {
            let updateProgress = async (progress)=> {
                await job.progress(progress)
            }
            return await this.workerProc(job.opts.jobId, job.data, updateProgress);
        })
    }

    /**
     * Close this task queue: all pending tasks will be removed
     */
    async close() {
        await this.queue.obliterate({force:true});
        await this.queue.close();
    }

    /**
     * 加入一個task. 
     * @param {string} taskId unique id to identify this task
     * @param {*} task an object pass by caller, to define the actual 'content' for this task. 
     */
    async add(taskId, task) {
        await this.queue.add(task, {jobId: taskId});
    }

    /**
     * 回傳task是否已經執行完成
     * 
     * @param {string} taskId task id
     * @returns true/false. Throw exception if any error.
     */
    async isTaskFinish(taskId) {
        let job = await this.queue.getJob(taskId);
        if (!job)
            throw `Cannot find jobId:${taskId}`;

        let state = await job.getState();
        if (!state || state == 'failed')
            throw `Job state:${state}`;
        else if (state == 'completed')
            return true;
        else
            return false;            
    }

    /**
     * 回傳 workerProc的return value
     * @param {string} taskId task id
     * @returns workerProc的回傳內容
     */
    async getTaskReturnValue(taskId) {
        let job = await this.queue.getJob(taskId);
        if (!job)
            throw `Cannot find jobId:${taskId}`;

        return job.returnvalue;
    }

    /**
     * 回傳task的progress
     * @param {string} taskId task id
     * @returns workerProc內呼叫updateProgress(..)所傳入的狀態
     */
    async getTaskProgress(taskId) {
        let job = await this.queue.getJob(taskId);
        if (!job)
            throw `Cannot find jobId:${taskId}`;

        return job.progress();
    }
}

module.exports = TaskQueue