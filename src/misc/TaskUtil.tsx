

// NOTE:
// 1. Tasks in task-queue are executed one at a time, per event loop cycle
// 2. Tasks in micro-task queue are executed until queue is empty. However, if queue is being added with new microtasks, while event loop is still processing current microtask, newly added tasks to micro-tasks queue, will be executed until queue is empty.

// NOTE:
// 1. Tasks/Microtasks/Javascript code are all executed on the Javascript stack
// 2. WebAPIs are executed on a separate thread

const TaskUtil = (() => {

    const __queueMicroTask = function(cb? : Function) {

        return new Promise<any | void>((resolve, reject) => resolve()).then(() => {
            
            let res;
            
            if (cb) {
                res = cb();
            }

            return res;
        })

    }

    // execute routine as a task
    // submit results as a microtask
    const __queueTask = function(cb : any, delay? : any) {

        delay = delay ? delay : 0;

        return new Promise<any | void>((resolve, reject) => {
            setTimeout(() => {
                let res;

                if (cb) {
                    res = cb();
                }
                
                resolve(res);
            }, delay);
        });

    }
    return {
        queueMicroTask: __queueMicroTask,
        queueTask: __queueTask
    }

})();

export default TaskUtil;