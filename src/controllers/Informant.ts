import Castrum from "castrum/Castrum";
import Civitas from "civitas/Civitas";
import Chronicler from "./Chronicler";

export default class Informant {

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
            if (castrumType === CASTRUM_TYPES.CONTAINER || castrumType === CASTRUM_TYPES.ROAD || castrumType === CASTRUM_TYPES.UNDEFINED || castrumType === CASTRUM_TYPES.CAPACITOR) {
                throw Error('Primitive types do not have wrappers')
            }
            let structures = supervisor.castrum[castrumType];
            for (let struc of structures) {
                if (struc.id == id) {
                    return struc;
                }
            }
            return undefined;
        } else {
            //is a creep
            let creep = liveObj as Creep;
            let supervisor = global.Imperator.administrators[creep.memory.spawnRoom].supervisor;
            let creeps = supervisor.civitas[creep.memory.type]
            for (let creep of creeps) {
                if (creep.id === id) {
                    return creep;
                }
            }
            return undefined;
        }
    }

    /**
     * Get information about sources from a room
     * @param room 
     * @returns 
     */
    static prospect(room: string): RoomResources {
        let resources: RoomResources = {};
        let terrainData = Game.rooms[room].getTerrain();
        let sources = Game.rooms[room].find(FIND_SOURCES).map(source => source.id);
        for (let source of sources) {
            let liveSource = Game.getObjectById(source);
            if (liveSource === null) continue;
            let openSpots = 0;
            for (let i = 0; i < 3; i++) {   //x values
                for (let j = 0; j < 3; j++) {   //y values
                    if (terrainData.get(liveSource.pos.x-1 + i, liveSource.pos.y-1 + j) !== TERRAIN_MASK_WALL) {
                        openSpots++;
                    }
                }
            }
            resources[source] = {
                type: 'source',
                openSpots: openSpots
            };
        }
        return resources;
    }

    /**
     * Method to calculate the gamestage, should be run occasionally to check for certain game events
     * @param {String} room String representing the room
     * @returns an integer representing the game stage
     */
     static calculateGameStage(room: string): number {
        let liveRoom = Game.rooms[room];
        if (liveRoom === undefined || liveRoom.controller === undefined) return -1;
        let supervisor = global.Imperator.administrators[room].supervisor;
        let rcl = liveRoom.controller.level;
        let currentStage = Chronicler.readGameStage(room);
        let calculation = -1; //hopefully never calculation = s this
        let numConstructionSites = liveRoom.find(FIND_MY_CONSTRUCTION_SITES).length;
        if (rcl == 1) {
            //activate phase 1
            calculation = 1;
        }
        if (rcl == 2) {
            //nothing special happens
            calculation = 2;
        }
        if (rcl == 3) {
            //nothing special
            calculation = 3;
        }
        if (rcl == 3 && supervisor.castrum.bastion?.length > 0) {
            //tower is built, time to build containers
            calculation = 3.1;
        }
        if (rcl == 4) {
            //nothing special
            calculation = 4;
        }
        if (rcl == 4 && liveRoom.storage && liveRoom.storage.my && liveRoom.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 10000 && numConstructionSites === 0) {
            //storage is built, time to switch to phase 2
            calculation = 4.1;
        }
        if (rcl == 4 && liveRoom.storage && liveRoom.storage.my && liveRoom.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 25000) {
            //storage is built, has 25,000 energy. time to build bunker roads
            calculation = 4.2;
        }
        if (rcl == 4 && currentStage == 4.2 && numConstructionSites === 0) {
            //bunker roads are built, build roads to sources
            calculation = 4.3;
        }
        if (rcl == 5) {
            //links are available, time to build controller link and storage link
            calculation = 5;
        }
        if (rcl == 5 && currentStage == 5 && numConstructionSites === 0) {
            //links are built, spawn arbiter
            calculation = 5.1;
        }
        if (rcl == 6) {
            //rcl 6 has lots of expensive stuff to build
            calculation = 6;
        }
        if (rcl == 6 && currentStage == 6 && numConstructionSites === 0) {
            //lots of expensive stuff is done building, time to build one source link
            calculation = 6.1;
        }
        if (rcl == 6 && currentStage == 6.1 && numConstructionSites === 0) {
            //build excavator and roads to it
            calculation = 6.2;
        }
        if (rcl == 6 && currentStage == 6.2 && numConstructionSites === 0) {
            //time to start scouting and spawn the excavator
            calculation = 6.3;
        }
        if (rcl == 6 && currentStage == 6.3 && Chronicler.readDoneScouting(room) == true) {
            //time to build road to the remote
            calculation = 6.4;
        }
        if (rcl == 6 && currentStage == 6.4 && numConstructionSites === 0) {
            //time to build the insides of the remote and miners
            calculation = 6.5;
        }
        if (rcl == 7) {
            //build second source link
            calculation = 7;
        }
        if (rcl == 7 && currentStage == 7 && numConstructionSites === 0
            && liveRoom.storage && liveRoom.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 100000) {
                //build workshops
                calculation = 7.1;
        }
        if (rcl == 7 && currentStage == 7.1 && numConstructionSites === 0
            && liveRoom.storage && liveRoom.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 100000) {
                //start chemical productions
                calculation = 7.2;
        }
        if (rcl == 8) {
            //todo: lots
            calculation = 8;
        }
        if (rcl === 8 && currentStage === 8 && numConstructionSites === 0
            && liveRoom.storage && liveRoom.storage.store.getUsedCapacity(RESOURCE_ENERGY) > 200000) {
            //todo: lots
            calculation = 8.1;
        }

        return calculation;
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

    /**
     * Method that returns the strcutre matrix of a room
     * @param {String} roomName
     * @returns a roomcache
     */
    static getCostMatrix(roomName: string) {
        //! TODO: figure out why the cacheing isnt working
        if (global.Imperator.matrixCache[roomName] !== undefined && Game.time < global.Imperator.matrixExpirations[roomName]) {
            return global.Imperator.matrixCache[roomName];
        }
        let room = Game.rooms[roomName];
        let matrix = new PathFinder.CostMatrix();
        if (room === undefined) return false;
        let impassibleStructures = [];
        for (let structure of room.find(FIND_STRUCTURES)) {
            if (structure instanceof StructureRampart) {
                if (!structure.my && !structure.isPublic) {
                    impassibleStructures.push(structure);
                }
            }
            else if (structure instanceof StructureRoad) {
                matrix.set(structure.pos.x, structure.pos.y, 1);
            }
            else if (structure instanceof StructureContainer) {
                matrix.set(structure.pos.x, structure.pos.y, 5);
            }
            else {
                impassibleStructures.push(structure);
            }
        }
        for (let site of room.find(FIND_MY_CONSTRUCTION_SITES)) {
            if (site.structureType === STRUCTURE_CONTAINER || site.structureType === STRUCTURE_ROAD
                || site.structureType === STRUCTURE_RAMPART) {
                continue;
            }
            matrix.set(site.pos.x, site.pos.y, 0xff);
        }
        for (let structure of impassibleStructures) {
            matrix.set(structure.pos.x, structure.pos.y, 0xff);
        }
        if (Chronicler.readRoomActive(roomName)) {
            let anchor = Chronicler.readSchema(roomName).main.anchor;
            matrix.set(anchor.x + 1, anchor.y + 1, 0xff);
        }
        global.Imperator.matrixCache[roomName] = matrix;
        global.Imperator.matrixExpirations[roomName] = Game.time + 3000;
        return matrix;
    }

    /**
     * Method that returns all supported recipies.
     * TODO: support all chemicals
     * @returns 
     */
    static getChemicalRecipes(chemical: RESOURCE_CATALYZED_GHODIUM_ACID | RESOURCE_GHODIUM_ACID | RESOURCE_HYDROXIDE | RESOURCE_GHODIUM_HYDRIDE | RESOURCE_GHODIUM | RESOURCE_ZYNTHIUM_KEANITE | RESOURCE_UTRIUM_LEMERGITE): Array<MineralCompoundConstant | MineralConstant> {
        let reactions = {
            [RESOURCE_CATALYZED_GHODIUM_ACID] : [RESOURCE_GHODIUM_ACID, RESOURCE_CATALYST],
            [RESOURCE_GHODIUM_ACID]: [RESOURCE_GHODIUM_HYDRIDE, RESOURCE_HYDROXIDE],
            [RESOURCE_HYDROXIDE]: [RESOURCE_HYDROGEN, RESOURCE_OXYGEN],
            [RESOURCE_GHODIUM_HYDRIDE]: [RESOURCE_GHODIUM, RESOURCE_HYDROGEN],
            [RESOURCE_GHODIUM]: [RESOURCE_ZYNTHIUM_KEANITE, RESOURCE_UTRIUM_LEMERGITE],
            [RESOURCE_ZYNTHIUM_KEANITE]: [RESOURCE_ZYNTHIUM, RESOURCE_KEANIUM],
            [RESOURCE_UTRIUM_LEMERGITE]: [RESOURCE_UTRIUM, RESOURCE_LEMERGIUM]
        }
        return reactions[chemical];
    }
    
    /**
     * Method to get the steps of making a chemical
     * TODO: support all chemicals
     */
    static getChemicalSteps(chemical: RESOURCE_CATALYZED_GHODIUM_ACID | RESOURCE_GHODIUM_HYDRIDE) {
        let steps = {
            [RESOURCE_CATALYZED_GHODIUM_ACID]: [
                RESOURCE_UTRIUM_LEMERGITE,
                RESOURCE_ZYNTHIUM_KEANITE,
                RESOURCE_GHODIUM,
                RESOURCE_GHODIUM_HYDRIDE,
                RESOURCE_HYDROXIDE,
                RESOURCE_GHODIUM_ACID,
                RESOURCE_CATALYZED_GHODIUM_ACID
            ],
            [RESOURCE_GHODIUM_HYDRIDE]: [
                RESOURCE_UTRIUM_LEMERGITE,
                RESOURCE_ZYNTHIUM_KEANITE,
                RESOURCE_GHODIUM,
                RESOURCE_GHODIUM_HYDRIDE
            ]
        }
        return steps[chemical];
    }
}
declare global {
    //TYPES AND CONSTANTS
    const enum CASTRUM_TYPES {
        //wrappers
        BASTION = 'bastion',
        CONDUIT = 'conduit',
        MARKET = 'market',
        NEXUS = 'nexus',
        WORKSHOP = 'workshop',
        CAPACITOR = 'capacitor',

        //primitives
        CONTAINER = 'container',
        ROAD = 'road',

        //everything else
        UNDEFINED = 'undefined'
    }

    const enum CIVITAS_TYPES {
        ARBITER = 'arbiter',
        CHEMIST = 'chemist',
        CONTRACTOR = 'contractor',
        COURIER = 'courier',
        CURATOR = 'curator',
        EMISSARY = 'emissary',
        ENGINEER = 'engineer',
        EXCAVATOR = 'excavator',
        HOST = 'host',
        MINER = 'miner',
        SCHOLAR = 'scholar',
        SCOUT = 'scout',
    }

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
        UNINTERESTING = 'uninteresting',
        CLAIMED = 'claimed',
        INVADED = 'invaded'
    }

    type LinkType =
        'storage' | 'controller' | 'container';

    const enum LINK_TYPES {
        STORAGE = 'storage',
        CONTROLLER = 'controller',
        CONTAINER = 'container'
    }

    const enum WORKSHOP_TYPES {
        REAGENT = 'reagent',
        PRODUCT = 'product'
    }
}