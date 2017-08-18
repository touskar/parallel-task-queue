let TaskManager = require('../lib/parallel-task-queue');

let uuid = TaskManager.uuid;


let taskQueue = new TaskManager.TaskQueue({
    globalTimeout:3000,
    timeBeforeClose:2000,
    paralleleTask:50
});


let repeat = (value, len) => {
    if (len == 0) return [];
    var a = [value];
    while (a.length * 2 <= len) a = a.concat(a);
    if (a.length < len) a = a.concat(a.slice(0, len - a.length));
    return a;
};

let imgList = repeat('http://placehold.it/500x500', 30000);
let wget = require('node-wget');
let dw = 0;

for(let i = 0; i < imgList.length;i++)
{
    let u = ('tmp/'+uuid()+'.jpg').replace(/-/g,'');
    taskQueue.push((task) => {
            wget({
                    url:  imgList[i],
                    dest: u,      // destination path or path with filenname, default is ./
                    timeout: 50000       // duration to wait for request fulfillment in milliseconds, default is 2 seconds
                },
                function (error, response, body) {
                    //throw new TypeError('Coucou', "unFichier.js", 10);

                    task.done();

                    dw++;
                    if (error) {
                        console.log(`timeout ${u} ${dw}`);
                    } else {
                        console.log(`save ${u} ${dw} ${taskQueue.runningTaskLengh}`);
                    }
                }
            );
        }, 20000)
        .then(() => {
            console.log('finish');
        })
        .catch(TaskManager.TaskTimeoutError, (e) => {
            console.log('Task Timeout')
        })
        .catch(e => {
            console.log(e)
        });
}

taskQueue.on(TaskManager.ALL_TASK_FINISHED_EVENT, () => {
    console.log('All task finished')
});