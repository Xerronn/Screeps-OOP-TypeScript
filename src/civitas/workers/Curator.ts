import Chronicler from 'controllers/Chronicler';
import Worker, {WorkerMemory} from './worker'

interface CuratorMemory extends WorkerMemory {
    closestRoad: Id<StructureRoad>;
    closestContainer: Id<StructureContainer>;
}

export default class Curator extends Worker {
    memory: CuratorMemory;
    
    constructor(curator: Creep) {
        super(curator);
    }

    run() {
        //march to room and flee if enemies
        if (this.fleeing === true) {
            return this.march(this.memory.spawnRoom, true);
        }
        
        if (this.arrived === false) {
            return this.march(this.assignedRoom);
        }

        //steal from one of the two containers
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) == 0 || (this.memory.task == "withdraw" && this.store.getFreeCapacity(RESOURCE_ENERGY) > 0)) {
            this.memory.task = "withdraw";
            this.withdrawContainer();
        } else {
            this.memory.task = "repair"
            this.repairRoads();
        }
        return;
    }


    /**
     * Function that repairs all structures in a room
     */
    repairRoads(): boolean {
        let liveObj: StructureRoad | undefined;
        if (this.memory.closestRoad !== undefined) {
            let tmpObj = Game.getObjectById(this.memory.closestRoad) || undefined;
            if (tmpObj !== undefined) liveObj = tmpObj;
        }

        if (liveObj === undefined || liveObj.hits === liveObj.hitsMax) {
            let repairableRoads = Game.rooms[this.room].find(
                FIND_STRUCTURES, 
                {filter: (struc) => struc.structureType == STRUCTURE_ROAD && struc.hits < struc.hitsMax / (25/23)}
            ) as StructureRoad[];

            liveObj = this.pos.findClosestByRange(repairableRoads) || undefined;
            if (liveObj === undefined) {
                this.conclude();
                return false;
            }
            this.memory.closestRoad = liveObj.id;
        }

        if (this.pos.inRangeTo(liveObj, 3)) {
            if (this.pos.lookFor(LOOK_STRUCTURES).length > 0) {
                for (let i = -1; i < 2; i++) {
                    for (let j = -1; j < 2; j++) {
                        let roomPos = new RoomPosition(liveObj.pos.x + i, liveObj.pos.y + j, this.room);
                        let strucCount = roomPos.lookFor(LOOK_STRUCTURES).length;
                        let terrainData = roomPos.lookFor(LOOK_TERRAIN);
                        let isWall = false;
                        for (let t of terrainData) {
                            if (t === 'wall') {
                                isWall = true;
                            }
                        }
                        if (strucCount === 0 && !isWall) {
                            this.liveObj.moveTo(liveObj.pos.x + i, liveObj.pos.y + j);
                            break;
                        }
                    }
                }
            }
            this.liveObj.repair(liveObj);
        } else this.liveObj.travelTo(liveObj);

        return true;
    }

    /**
     * Method that finds nearest container and withdraws from it
     */
    withdrawContainer(): boolean {
        let liveObj: StructureContainer | undefined;
        if (this.memory.closestContainer !== undefined) {
            let tmpObj = Game.getObjectById(this.memory.closestContainer) || undefined;
            if (tmpObj !== undefined) liveObj = tmpObj;
        }

        if (liveObj === undefined || liveObj.hits === liveObj.hitsMax) {
            let containers = Game.rooms[this.room].find(
                FIND_STRUCTURES, 
                {filter: {structureType: STRUCTURE_CONTAINER}}
            ) as StructureContainer[];

            liveObj = this.pos.findClosestByRange(containers) || undefined;
            if (liveObj === undefined) return false;
            this.memory.closestContainer = liveObj.id;
        }

        if (this.pos.inRangeTo(liveObj, 1)) {
            this.liveObj.withdraw(liveObj, RESOURCE_ENERGY);
        } else this.liveObj.travelTo(liveObj);

        return true;
    }

    /**
     * Method to retire the repairer without rebirth
     */
    conclude() {
        delete this.memory.generation;
        Chronicler.writeRemoteCurated(this.memory.spawnRoom, this.assignedRoom, false);
        this.liveObj.suicide();
    }
}