parallel-task-queue - Keep request process in sequence with configurable parallelism
=====================================================

Parallel-task-queue is simple tool to keep requests to be executed in order with configurable parallelism.

As we known, Node.js has an event-driven architecture capable of asynchronous I/O  and  callbacks are unordered. But sometimes we may need the requests to be processed in order.
Seq-queue takes the responsibility to make the asynchronous, unordered processing flow into serial and ordered.

Parallel-task-queue is a FIFO task queue and we can push tasks as we wish, anytime(before the queue closed), anywhere(if we hold the queue instance). A task is known as a function and we can do anything in the function and just need to call `task.done(data)` (`.then` will be called) to tell the queue current task has finished success fully or `task.error(error)` (`.catch will be called).

 * Tags: node.js
 
 http://sidsonaidson.github.io/parallel-task-queue/

##Installation
```
npm install parallel-task-queue
```

##Usage
``` javascript
let TaskManager = require('parallel-task-queue');

let taskQueue = new TaskManager.TaskQueue({
    globalTimeout:1000,
    timeBeforeClose:2000,
    paralleleTask:1
});

for(let i = 0; i < 50;i++)
{
    taskQueue.push(task => {
        setTimeout(() => {
            let beResolved = {
                message:'hello'
            };
            task.done(beResolved);
            // or task.error(error) to trigger promess rejection
        }, Math.floor(Math.random() * 1000));
    }).then(data => {
        console.log(beResolved.message);
    }).catch(TaskManager.TaskTimeoutError, (e) => {
            console.log(`Task Time out`)
    }).catch(e => {
        console.log(e)
    })
}

taskQueue.on(TaskManager.ALL_TASK_FINISHED_EVENT, () => {
    console.log('All task finished')
});

```


```
let TaskManager = require('parallel-task-queue');
 
let taskQueue = new TaskManager.TaskQueue({
    globalTimeout:1000,
    timeBeforeClose:2000,
    paralleleTask:1
});
 
taskQueue.on(TaskManager.ALL_TASK_FINISHED_EVENT, () => {
    console.log('All task finished')
});
 
taskQueue.push(task => {
        setTimeout(() => {
            task.done();
        }, Math.floor(Math.random() * 1000));
    }).then(() => {
        console.log(`Task ${i} finished`);
    }).catch(TaskManager.TaskTimeoutError, (e) => {
            console.log(`Task Time out`)
    }).catch(e => {
        console.log(e)
    })
 
for(let i = 0; i < 50;i++)
{
    taskQueue.push(task => {
        setTimeout(() => {
            task.done();
        }, Math.floor(Math.random() * 1000));
    }).then(() => {
        console.log(`Task ${i} finished`);
    }).catch(TaskManager.TaskTimeoutError, (e) => {
            console.log(`Task Time out`)
    }).catch(e => {
        console.log(e)
    })
}
 
taskQueue.push(task => {
 setTimeout(() => {
            task.done();
   }, Math.floor(Math.random() * 1000));
    }).then(() => {
        console.log(`Task ${i} finished`);
    }).catch(TaskManager.TaskTimeoutError, (e) => {
            console.log(`Task Time out`)
    }).catch(e => {
        console.log(e)
    })
 
 
```

##API
###`new TaskManager.TaskQueue(opt)`
Create a new  instance of TaskQueue. A global timeout value in ms for the new instance can be set by `timeout` parameter or use the default timeout (3s) by no parameter.
####Arguments
+ `opt.globalTimeout` - A global timeout value in ms (for the new instance) before processing next task.default value is `TASK_DEFAULT_TIMEOUT`
+ `opt.timeBeforeClose` - if no task has been pushed in this duration, queue will be closed and new added task will be ignored. Default value is `TIME_OUT_BEFORE_CLOSE_QUEUE`
+ `opt.paralleleTask` - Number of task to be executed at same time . Defaut value is `PARALLELE_TASK`

###`TaskQueue.push(fn, timeout)`
Add a task into the queue instance.
####Arguments
+ `fn(task)` - The function that describes the content of task and would be invoke by queue. `fn` takes a arguemnt task and we *must* call task.done() to tell queue current task has finished.
+ `timeout` - If specified, it would overwrite the global timeout that set by `new TaskManager.TaskQueue` for `fn`.

###`TaskQueue.close()`
Close the queue.

##Event
Seq-queue instances extend the EventEmitter and would emit events in their life cycles.
###`BEGIN_FIRST_TASK_EVENT`
Emited When starting first task
###`TASK_FINISHED_EVENT`
Emited each time one  task finished
###`ALL_TASK_FINISHED_EVENT`
Emit when all task finished

```
// All constant all member of `TaskManager` object
	taskQueue.on(TaskManager.ALL_TASK_FINISHED_EVENT, () => {
	    console.log('All task finished')
	});
```

##Status
TaskQueue has many life cycle with these value:
###`TASK_NOT_START_YET_STATUS`
### `TASK_RUNNING_STATUS`
### `TASK_FINSHED_STATUS`

## Getter
## `TaskQueue.globalTimeout` - Number
## `TaskQueue.status`
## `TaskQueue.closed` - Boolean - if queue is closed
## `TaskQueue.timeBeforeClose`
