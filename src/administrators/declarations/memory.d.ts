interface CreepMemory {
    name: string;
    type: CIVITAS_TYPES;
    spawnRoom: string;
    generation: number | undefined;
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
                    ] | undefined
                }
            }
        }
    };
}

interface RoomAnchor {
    x: number,
    y: number,
}
