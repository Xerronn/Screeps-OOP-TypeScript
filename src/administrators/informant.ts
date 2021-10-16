import { Castrum } from "castrum/castrum";
import { Civitas } from "civitas/civitas";

export class Informant {

    /**
     * Method that returns the wrapper for a given game object id
     * @param {String} id
     */
    static getWrapper(id: Id<any>): Castrum | Civitas | undefined {
        let liveObj = Game.getObjectById(id);
        if (!liveObj || !liveObj.my) {
            return undefined;
        }

        let room = liveObj.room;

        if (liveObj.structureType !== undefined) {
            //is a structure
            let supervisor = global.Imperator.administrators[room.name].supervisor;
            let castrumType = Informant.mapGameToClass(liveObj.structureType);
            if (castrumType === undefined) return undefined;
            let structures = supervisor.castrum[castrumType];
            for (let struc of structures) {
                if (struc.id == id) {
                    return struc;
                }
            }
            return undefined;
        } else {
            //is a creep
            let supervisor = global.Imperator.administrators[liveObj.memory.spawnRoom].supervisor;
            let creeps = supervisor.civitas[liveObj.memory.type]
            for (let creep of creeps) {
                if (creep.id === id) {
                    return creep;
                }
            }
            return undefined;
        }
    }

    /**
     * Bunker schema adopted from HallowNest 2.0
     * @returns bunker Schema Object
     */
    static getBunkerSchema() {
        let schema: {[structureType: string]: {pos: any}} = {
            "road":{"pos":[{"x":0,"y":0},{"x":1,"y":1},{"x":2,"y":2},{"x":3,"y":3},
                {"x":4,"y":4},{"x":5,"y":5},{"x":6,"y":6},{"x":7,"y":7},{"x":8,"y":8},
                {"x":9,"y":9},{"x":10,"y":10},{"x":10,"y":0},{"x":9,"y":1},{"x":8,"y":2},
                {"x":7,"y":3},{"x":6,"y":4},{"x":4,"y":6},{"x":3,"y":7},{"x":2,"y":8},
                {"x":1,"y":9},{"x":0,"y":10},{"x":5,"y":0},{"x":4,"y":1},{"x":3,"y":2},
                {"x":2,"y":3},{"x":1,"y":4},{"x":0,"y":5},{"x":1,"y":6},{"x":2,"y":7},
                {"x":3,"y":8},{"x":4,"y":9},{"x":5,"y":10},{"x":6,"y":9},{"x":9,"y":6},
                {"x":10,"y":5},{"x":6,"y":1},{"x":7,"y":2},{"x":8,"y":3},{"x":9,"y":4}]},
            "tower":{"pos":[{"x":4,"y":5},{"x":3,"y":5},{"x":3,"y":6},{"x":6,"y":5},
                {"x":7,"y":5},{"x":7,"y":4}]},
            "spawn":{"pos":[{"x":4,"y":3},{"x":7,"y":6},{"x":4,"y":7}]},
            "storage":{"pos":[{"x":5,"y":4}]},
            "link":{"pos":[{"x":5,"y":2}]},
            "observer":{"pos":[{"x":5,"y":1}]},
            "powerSpawn":{"pos":[{"x":4,"y":2}]},
            "factory":{"pos":[{"x":6,"y":2}]},
            "terminal":{"pos":[{"x":6,"y":3}]},
            "lab":{"pos":[{"x":9,"y":8},{"x":8,"y":9},{"x":9,"y":7},{"x":8,"y":7},
                {"x":7,"y":9},{"x":7,"y":8},{"x":10,"y":8},{"x":10,"y":9},{"x":8,"y":10},
                {"x":9,"y":10}]},
            "nuker":{"pos":[{"x":3,"y":4}]},
            "extension":{"pos":[{"x":1,"y":0},{"x":2,"y":0},{"x":3,"y":0},{"x":4,"y":0},
                {"x":3,"y":1},{"x":2,"y":1},{"x":7,"y":0},{"x":8,"y":0},{"x":9,"y":0},
                {"x":6,"y":0},{"x":7,"y":1},{"x":8,"y":1},{"x":10,"y":4},{"x":10,"y":3},
                {"x":10,"y":1},{"x":10,"y":2},{"x":9,"y":2},{"x":9,"y":3},{"x":8,"y":4},
                {"x":8,"y":5},{"x":9,"y":5},{"x":8,"y":6},{"x":10,"y":6},{"x":10,"y":7},
                {"x":6,"y":10},{"x":7,"y":10},{"x":5,"y":9},{"x":4,"y":8},{"x":5,"y":8},
                {"x":6,"y":8},{"x":6,"y":7},{"x":5,"y":7},{"x":5,"y":6},{"x":1,"y":10},
                {"x":2,"y":10},{"x":4,"y":10},{"x":3,"y":10},{"x":3,"y":9},{"x":2,"y":9},
                {"x":0,"y":9},{"x":0,"y":8},{"x":1,"y":8},{"x":1,"y":7},{"x":0,"y":7},
                {"x":0,"y":6},{"x":2,"y":4},{"x":2,"y":6},{"x":2,"y":5},{"x":1,"y":5},
                {"x":0,"y":4},{"x":0,"y":3},{"x":1,"y":3},{"x":1,"y":2},{"x":0,"y":2},
                {"x":0,"y":1}]}
        };

        return schema;
    }

    /**
     * Method that takes a structure Constant and returns a corresponding wrapper type
     * @param structureType
     * @returns
     */
    static mapGameToClass(structureType: StructureConstant): CASTRUM_TYPES {
        switch (structureType) {
            //structures with wrappers to execute logic
            case STRUCTURE_SPAWN:
                return CASTRUM_TYPES.NEXUS;
            case STRUCTURE_TOWER:
                return CASTRUM_TYPES.BASTION;
            case STRUCTURE_LINK:
                return CASTRUM_TYPES.CONDUIT;
            case STRUCTURE_LAB:
                return CASTRUM_TYPES.WORKSHOP;
            case STRUCTURE_TERMINAL:
                return CASTRUM_TYPES.MARKET;

            //structures that are stored in a list an updated on demand
            case STRUCTURE_CONTAINER:
                return CASTRUM_TYPES.CONTAINER
            case STRUCTURE_EXTENSION:
                return CASTRUM_TYPES.EXTENSION
            case STRUCTURE_ROAD:
                return CASTRUM_TYPES.ROAD

            //things I don't care about
            default:
                return CASTRUM_TYPES.UNDEFINED;
        }
    }

    /**
     * Method that takes a body array and returns the energy cost
     * @param {Array} body A body parts array
     * @returns the energy cost of a body
     */
    static calculateBodyCost(body: BodyPartConstant[]) {
        let cost = 0;
        for (let part of body) {
            cost += BODYPART_COST[part];
        }

        return cost;
    }
}
declare global {
    /**
     * TYPES AND ENUMS
     */
    const enum CASTRUM_TYPES {
        //wrappers
        BASTION = 'bastion',
        CONDUIT = 'conduit',
        MARKET = 'market',
        NEXUS = 'nexus',
        WORKSHOP = 'workshop',

        //primitives
        CONTAINER = 'container',
        EXTENSION = 'extension',
        ROAD = 'road',

        //everything else
        UNDEFINED = 'undefined'
    }

    type CastrumType =
        'bastion' | 'conduit' | 'market' | 'nexus' | 'workshop' | 'undefined';

    const enum CIVITAS_TYPES {
        ARBITER = 'arbiter',
        CHEMIST = 'chemist',
        CONTRACTOR = 'contractor',
        COURIER = 'courier',
        CURATOR = 'curator',
        EMISSARY = 'emissary',
        EXCAVATOR = 'excavator',
        MINER = 'miner',
        RUNNER = 'runner',
        SCHOLAR = 'scholar',
        SCOUT = 'scout',
    }

    type CivitasType =
        'arbiter' | 'chemist' | 'contractor' | 'courier' | 'curator' |
        'emissary' | 'excavator' | 'miner' | 'runner' | 'scholar' | 'scout';

    const enum LEGION_TYPES {
        EXECUTIONER = 'executioner',
        GARRISON = 'garrison',
        JESTER = 'jester',
    }

    type LegionType =
        'executioner' | 'garrison' | 'jester';

    const enum REMOTE_STATUSES {
        SAFE = 'safe',
        DANGEROUS = 'dangerous',
        UNINTERESTING = 'uninteresting'
    }

    /**
     * INTERFACES
     */
    interface CreepMemory {
        name: string;
        type: CivitasType | LegionType;
        spawnRoom: string;
        generation: number | undefined;
        body: BodyPartConstant[];
        _trav: {};
        spawnDirection?: DirectionConstant;
        remote?: boolean;
        boost?: Array<MineralBoostConstant>;
        offRoading?: boolean;
        task?: string;
        targetRoom?: string;
    }

    //todo: better typing here
    interface RoomMemory {
        flags?: any;
        statistics?: any;
        sources: SourceMemory;
        remotes?: RemoteMemory;
    }

    interface Memory {
        creeps: {[creepName: string]: CreepMemory}
        gFlags: {[flagName: string]: string | boolean};
        rooms: {[roomName: string]: RoomMemory};
        directives: {
            [roomName: string]: {
                [tick: number]: {
                    [taskId: string]: {
                        script: string,
                        objArr: any
                    }
                }
            }
        };
    }

    interface SourceMemory {
        [sourceId: Id<Source>]: {
            workers: {
                [creepType: string]: string[]
            }
            openSpots: number;
            linkId?: Id<StructureLink>;
        }
    }

    interface RoomAnchor {
        x: number;
        y: number;
    }

    interface RenewalTemplate {
        body: BodyPartConstant[];
        type: CivitasType | LegionType;
        memory: CreepMemory | any;
    }

    interface RemoteMemory {
        [roomName: string]: RemoteRoomMemory;
    }

    interface RemoteRoomMemory {
        status: REMOTE_STATUSES;
        distances?: number[];
        selected?: boolean;
    }
}

