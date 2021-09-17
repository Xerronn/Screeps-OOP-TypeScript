interface CreepMemory {
    name: string;
    type: CIVITAS_TYPES;
    spawnRoom: string;
    generation: number | undefined;
    body: BodyPartConstant[];
    boost: Array<MineralBoostConstant>
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
                    objArr: Array<any> | undefined
                }
            }
        }
    };
}

interface RoomAnchor {
    x: number;
    y: number;
}

interface RenewalTemplate {
    body: BodyPartConstant[];
    type: CIVITAS_TYPES;
    memory: CreepMemory;
}
