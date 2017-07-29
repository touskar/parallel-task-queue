let TaskManager = module.exports;
let EventEmitter = require('events').EventEmitter;
let util = require('util');
let BPromise = require("bluebird");
TaskManager.uuid = () => {
    let s4 = () => {
        return Math.floor((1 + Math.random()) * 65536)
            .toString(16)
            .substring(1);
    };
    return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
        s4() + '-' + s4() + s4() + s4();
};
let normalize = (value) => {
    return Math.abs(Number(value) || 0)
};

TaskManager.TASK_DEFAULT_TIMEOUT = 5000;
TaskManager.PARALLELE_TASK = 5;
TaskManager.ALL_TASK_FINISHED_EVENT = 'all_finish';
TaskManager.BEGIN_FIRST_TASK_EVENT = 'begin';
TaskManager.TASK_FINISHED_EVENT = 'finish';
TaskManager.TASK_NOT_START_YET_STATUS = 0;
TaskManager.TASK_RUNNING_STATUS = 1;
TaskManager.TASK_FINSHED_STATUS = 2;
TaskManager.TIME_OUT_BEFORE_CLOSE_QUEUE = 10000;
TaskManager.QUEUE_ALREADY_CLOSED_ERROR_MESSAGE = 'Queue already closed';


function TaskQueue(opt) {
    opt = opt || {};
    this._globalTimeout = normalize(opt.globalTimeout) || TaskManager.TASK_DEFAULT_TIMEOUT;
    this._taskQueue = [];
    this._alreadyFinishedTask = [];
    this._timeoutedTask = [];
    this._status = TaskManager.TASK_NOT_START_YET_STATUS;
    this._begined = false;
    this._allFinished = false;
    this._timeBeforeClose = normalize(opt.timeBeforeClose) || TaskManager.TIME_OUT_BEFORE_CLOSE_QUEUE;
    this._closed = false;
    this._parallelTask = normalize(opt.paralleleTask) || TaskManager.PARALLELE_TASK;
    this._runningTaskLengh = 0;
    this._timeoutId = null;
}

TaskQueue.prototype = {
    get globalTimeout() {
        return this._globalTimeout;
    },
    get taskQueue() {
        return this._taskQueue;
    },
    get alreadyFinishedTask() {
        return this._alreadyFinishedTask;
    },
    get timeoutedTask(){
        return this._timeoutedTask;
    },
    get status() {
        return this._status;
    },
    get begined() {
        return this._begined;
    },
    get allFinished() {
        return this._allFinished;
    },
    get closed() {
        return this._closed;
    },
    get parallelTask() {
        return this._parallelTask;
    },
    get runningTaskLengh() {
        return this._runningTaskLengh;
    },
    get timeBeforeClose() {
        return this._timeBeforeClose;
    },
    get timeoutId() {
        return this._timeoutId;
    }
};

TaskQueue.prototype.add = function(fn, taskTimeout) {
    return new BPromise((resolve, reject) => {
        if (this.allFinished === true || this._closed === true)
        {
            reject(TaskManager.QUEUE_ALREADY_CLOSED_ERROR_MESSAGE);
            return;
        }

        taskTimeout = Number(taskTimeout) || this.globalTimeout;
        let newTask = null;



        let taskId = TaskManager.uuid();
        newTask = {
            _task: {
                id: taskId,
                done: (data) => {
                    if(newTask._task.alreadyDone === false && newTask._task.failed === false)
                    {
                        newTask._task.alreadyDone = true;

                        if(newTask._task.expery === false)
                        {
                            clearTimeout(newTask._task.timeOutId);
                            this.emit(TaskManager.TASK_FINISHED_EVENT, {
                                id: newTask._task.id
                            });

                            this.alreadyFinishedTask.push(newTask._task.id);
                            newTask._task.resolve(data);
                            this._runningTaskLengh--;
                            this._processNext();
                        }
                        //else if(this._runningTaskLengh.length < this.parallelTask){
                        //    this._processNext();
                        //}
                    }
                },
                cancel: () => {

                },
                error: (e) => {
                    newTask._task.failed = true;
                    newTask._task.reject(e);
                    this._processNext();
                    clearTimeout(newTask._task.timeOutId);
                },
                resolve:resolve,
                reject:reject,
                expery:false,
                alreadyDone:false,
                failed:false,
                taskTimeout:taskTimeout
            },
            _fn: fn
        };

        if (this.begined === false) {
            this._start();
            this._begined = true;
            process.nextTick(() => {
                this._nextTask(newTask._task.id);
            });
        }

        if (this.timeoutId !== null) {
            clearTimeout(this.timeoutId);
            this._timeoutId = null;

            process.nextTick(() => {
                this._nextTask(newTask._task.id);
            });
        }

        this._taskQueue.push(newTask);



    });

};

TaskQueue.prototype.push = TaskQueue.prototype.add;

TaskQueue.prototype._nextTask = function(taskId, ignore) {
    if (this._allFinished === true  || this._closed === true) {
        return;
    }

    ignore = ignore || false;
    let index = -1;

    for (let i = 0; i < this._taskQueue.length; i++) {
        if (this._taskQueue[i]._task.id == taskId) {
            index = i;
            break;
        }
    }

    if(index === -1)
    {
        this._processNext();
        return;
    }

    let currentTask_ = this._taskQueue[index];
    this._taskQueue.splice(index, 1);


    if(!ignore)
    {
        this._runningTaskLengh++;
    }

    if (this._runningTaskLengh  < this.parallelTask && !ignore) {
        let toFill = this.parallelTask - this.runningTaskLengh;
        let length = this.taskQueue.length;
        for (let i = 0 ; i < toFill && i < length;i++) {
            if(this._taskQueue[i])
            {
                this._runningTaskLengh++;
                let nrTaskId = this._taskQueue[i]._task.id;
                process.nextTick(() => {
                    this._nextTask(nrTaskId, true);
                });
            }
        }
    }

    let taskTimeout = currentTask_._task.taskTimeout;
    currentTask_._task.timeOutId = setTimeout(() => {
        currentTask_._task.expery = true;
        this.runningTaskLengh--;
        this._timeoutedTask.push(taskId);
        currentTask_._task.reject(new TaskTimeoutError('Task time out', taskId));
        this._processNext();
    }, taskTimeout);

    try {
        currentTask_._fn(currentTask_._task);
    } catch (e) {
        currentTask_._task.failed = true;
        currentTask_._task.reject(e);
        this.runningTaskLengh--;
        this._processNext();
        clearTimeout(currentTask_._task.timeOutId);
    }
};

TaskQueue.prototype._start = function() {
    if(this.allFinished === true || this._closed === true)
        return;
    this._status = TaskManager.TASK_RUNNING_STATUS;
    this.emit(TaskManager.BEGIN_FIRST_TASK_EVENT);
};

TaskQueue.prototype._processNext = function(){
    if(this.allFinished === true || this._closed === true)
        return;

    if (this._taskQueue.length == 0 ) {
        if (this._runningTaskLengh <= 0) {
            this._timeoutId = setTimeout(() => {
                this._finish();
            }, this.timeBeforeClose);
        }
    } else {
        this._nextTask(this._taskQueue[0]._task.id);
    }
};

TaskQueue.prototype._finish = function() {
    this._allFinished = true;
    this._closed = true;
    this._status = TaskManager.TASK_FINSHED_STATUS;
    this.emit(TaskManager.ALL_TASK_FINISHED_EVENT);
    this._runningTaskLengh = 0;

};

TaskQueue.prototype.closeQueue = function(){
    this._closed = true;
};

function TaskTimeoutError(message, id){
    this.name = 'TaskTimeOutError';
    this.message = message || "Error TaskTimeOutError occured";
    this.id = id || 0;
}

util.inherits(TaskQueue, EventEmitter);
util.inherits(TaskTimeoutError, Error);

TaskManager.TaskQueue = TaskQueue;
TaskManager.TaskTimeoutError = TaskTimeoutError;