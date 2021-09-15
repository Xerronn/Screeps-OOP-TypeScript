interface CreepMemory {
    name: string;
    type: string;
    spawnRoom: string;
    body: string[];
}

interface Memory {
    creeps: {[creepName: string]: CreepMemory}
    gFlags: {[flagName: string]: string | boolean};
    rooms: {[roomName: string]: any};
    scheduler: {
        [roomName: string]: {
            [tick: number]: {
                [taskId: string]: {
                    script: string,
                    objArr: [
                        string[],
                        string,
                        object
                    ]
                }
            }
        }
    };
}
