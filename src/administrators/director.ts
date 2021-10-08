//Entity that manages task execution
export class Director {
    /**
     * Function that schedules task on tick referencing objects in objArr if needed
     * @param {Number} tick
     * @param {String} task
     * @param {Array} objArr
     */
    static schedule(room: string, tick: number, task: string, objArr: Array<any> | undefined) {
        if (!Memory.directives[room]) {
            Memory.directives[room] = {};
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

    /**
     * Function that executes the schedule
     */
    static run(): void {
        // for (let room in Memory.directives) {
        //     for (let tick in Memory.directives[room]) {
        //         if (parseInt(tick) <= Game.time) {
        //             for (let id in Memory.directives[room][tick]) {
        //                 let task = Memory.directives[room][tick][id];
        //                 let objArr = task.objArr;
        //                 eval(task.script);
        //             }
        //             delete Memory.directives[room][tick];
        //         }
        //     }
        // }
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
                    eval(task.script);
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

    /**
     * Method that generates a unique ID
     * @returns ID
     */
    static makeId(length = 7): string {
        let result = '';
        for (let i = 0; i < length; i++) {
            result += String.fromCharCode(Math.floor(Math.random() * (65536)));
        }
        return result;
    }
}
