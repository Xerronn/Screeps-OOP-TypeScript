//Entity that manages task execution
export default class Director {
    /**
     * Function that schedules task on tick referencing objects in objArr if needed
     * @param {Number} tick
     * @param {String} task
     * @param {Array} objArr
     */
    static schedule(room: string, tick: number, task: string, objArr: any[]) {
        if (!Memory.directives[room]) {
            Memory.directives[room] = {"spawning": {}};
        }
        if (!Memory.directives[room][tick]) {
            Memory.directives[room][tick] = {};
        }
        let taskObj = {
            script: task,
            objArr: objArr
        };
        let taskId = this.makeId();
        Memory.directives[room][tick][taskId] = taskObj;
    }

    static scheduleCreep(room: string, priority: number, task: string, objArr: any[]) {
        if (!Memory.directives[room]) {
            Memory.directives[room] = {"spawning": {}};
        }
        let spawning = Memory.directives[room]["spawning"];
        if (!spawning[priority]) {
            spawning[priority] = {};
        }
        let taskObj = {
            script: task,
            objArr: objArr
        };
        let taskId = this.makeId();
        spawning[priority][taskId] = taskObj;
    }
    
    static execTask(room: string, task: Task): boolean {
        let objArr = task.objArr;
        if (objArr) {   //needed because of typescript shenanigans
            try {
                return eval(task.script);
            } catch(taskErr: any) {
                let errorMessage = `<b style='color:red;'>Room FAILURE during execution of directive ${task.script}</b>`
                console.log(errorMessage);
                Director.schedule(room, Game.time + 25, task.script, objArr);
                return false;
            }
        }
        return false;
    }

    /**
     * Function that executes the schedule
     */
    static run(): void {
        for (let room in Memory.directives) {
            // normal directives
            for (let tick in Memory.directives[room]) {
                if (parseInt(tick) <= Game.time) {
                    for (let id in Memory.directives[room][tick]) {
                        let task = Memory.directives[room][tick][id];
                        this.execTask(room, task);
                    }
                    delete Memory.directives[room][tick];
                }
            }
            // creep spawning directives
            if (Memory.directives[room]["spawning"]) {
                let blocked = false;
                let spawning = Memory.directives[room]["spawning"];
                let priorities = Object.keys(spawning).sort((a, b) => Number(a) - Number(b));
                for (let priority of priorities) {
                    let tasks = spawning[Number(priority)];
                    for (let id in tasks) {
                        blocked = true;
                        let task = tasks[id];
                        if (this.execTask(room, task) === true) {
                            delete tasks[id];
                        }
                    }
                    if (blocked) break; //only execute the highest priority tasks with > 0 each tick
                }
            }
        }
    }

    /**
     * Method to run a specific task based on the task ID
     * @param {String} room
     * @param {String} taskId
     * @returns
     */
    static runDirective(room: string, taskId: string): boolean {
        for (let tick in Memory.directives[room]) {
            for (let id in Memory.directives[room][tick]) {
                if (id === taskId) {
                    let task = Memory.directives[room][tick][id];
                    let objArr = task.objArr;
                    if (objArr) {   //needed because of typescript shenanigans
                        eval(task.script);
                    }
                    delete Memory.directives[room][tick][id];
                    return true;
                }
            }
        }
        return false;
    }

    /**
     * Delete all instances of tasks using provided script
     * @param {String} script the script to find
     */
    static deleteDirective(script: string): void {
        let schedule = Memory.directives;
    }

    static deleteCreepDirective(room: string, type: string): void {
        let spawning = Memory.directives[room]["spawning"];
        for (let priority in spawning) {
            let tasks = spawning[priority];
            for (let id in tasks) {
                let task = tasks[id];
                if (task.objArr[1]?.type === type) {
                    delete tasks[id];
                }
            }
        }
    }

    /**
     * Method that generates a unique ID
     * @returns ID
     */
    static makeId(length = 7): string {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }
}
