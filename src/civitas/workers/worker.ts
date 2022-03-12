import Chronicler from 'controllers/Chronicler';
import Civitas from '../Civitas';

export interface WorkerMemory extends CreepMemory {
    fillTarget?: Id<AnyStoreStructure>;
    pillageTarget?: Id<StructureStorage | StructureTerminal | Ruin>;
    buildTarget?: Id<ConstructionSite>;
}
export default class Worker extends Civitas {
    memory: WorkerMemory;

    extensionsFilled: boolean;      //if the extensions are filled
    noPillage: boolean;             //if there is nothing to pillage
    constructor(creep: Creep) {
        super(creep);

        this.extensionsFilled = false;
    }

    update(): boolean {
        if (!super.update()) {
            return false;
        }

        this.extensionsFilled = Game.rooms[this.room].energyCapacityAvailable === Game.rooms[this.room].energyAvailable;

        return true;
    }

    run(): boolean {
        return true;
    }

    /**
     * upgrade the controller
     */
    upgradeController(): boolean {
        let controller = Game.rooms[this.room].controller;
        if (controller === undefined) return false;
        if (this.pos.inRangeTo(controller, 3)) {
            this.liveObj.upgradeController(controller);
        } else {
            this.liveObj.moveTo(controller);
        }
        return true;
    }

    /**
     * build construction sites closest to current position
     */
    build(): boolean {
        let liveSite;
        if (this.memory.buildTarget !== undefined) {
            let tmpObj = Game.getObjectById(this.memory.buildTarget);
            if (tmpObj !== null) {
                liveSite = tmpObj;
            } else {
                //if the tmpObj is null, it means that the
                this.supervisor.wrap(true);
                delete this.memory.buildTarget;
            }
        }
        if (liveSite === undefined) {
            let sites = Game.rooms[this.room].find(FIND_MY_CONSTRUCTION_SITES);

            liveSite = this.pos.findClosestByRange(sites);

        }
        if (liveSite !== null) {
            this.memory.buildTarget = liveSite.id;
        } else return false;

        if (this.pos.inRangeTo(liveSite, 3)) {
            this.liveObj.build(liveSite);
        } else {
            this.liveObj.travelTo(liveSite);
        }
        return true;
    }

    /**
     * Method that moves to the storage and withdraws energy
     * @returns if the task was executed
     */
    withdrawStorage(): boolean {
        let storage = Game.rooms[this.room].storage;
        if (storage === undefined || storage.store.getUsedCapacity(RESOURCE_ENERGY) < this.store.getFreeCapacity(RESOURCE_ENERGY)) return false;

        if (this.pos.inRangeTo(storage, 1)) {
            this.liveObj.withdraw(storage, RESOURCE_ENERGY);
        } else {
            this.liveObj.travelTo(storage);
        }
        return true;
    }

    /**
     * Function to fill spawn and extensions
     */
    fillExtensions(): boolean {
        let liveObj;
        if (this.memory.fillTarget !== undefined) {
            let tmpObj = Game.getObjectById(this.memory.fillTarget);
            if (tmpObj !== null && (tmpObj.structureType === STRUCTURE_EXTENSION || tmpObj.structureType === STRUCTURE_SPAWN)) liveObj = tmpObj;
        }

        if (liveObj === undefined || liveObj.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            let ext = this.supervisor.extensions;
            let spawns = this.supervisor.castrum.nexus.map(s => s.liveObj as StructureSpawn);

            let fillables = spawns.concat(ext as any[]).filter(
                obj => obj.store && obj.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );

            liveObj = this.pos.findClosestByRange(fillables);
            if (liveObj === null) return false;
            this.memory.fillTarget = liveObj.id;
        }

        if (this.pos.inRangeTo(liveObj, 1)) {
            this.liveObj.transfer(liveObj, RESOURCE_ENERGY);
        } else {
            this.liveObj.travelTo(liveObj);
        }
        return true;
    }

    /**
     * Function to fill spawn and extensions
     */
    fillTowers(): boolean {
        let liveObj;
        if (this.memory.fillTarget !== undefined) {
            let tmpObj = Game.getObjectById(this.memory.fillTarget);
            if (tmpObj !== null && tmpObj.structureType === STRUCTURE_TOWER) liveObj = tmpObj;
        }

        if (liveObj === undefined || liveObj.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            let bastions = this.supervisor.castrum.bastion.map(s => s.liveObj as StructureSpawn);

            let fillables = bastions.filter(
                obj => obj.store && obj.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );

            liveObj = this.pos.findClosestByRange(fillables);
            if (liveObj === null) {
                Chronicler.writeBastionsFilled(this.room, true);
                return false;
            };
            this.memory.fillTarget = liveObj.id;
        }

        if (this.pos.inRangeTo(liveObj, 1)) {
            this.liveObj.transfer(liveObj, RESOURCE_ENERGY);
        } else {
            this.liveObj.travelTo(liveObj);
        }
        return true;
    }

    /**
     * Method to steal energy from leftover enemy storage and terminals
     * @returns If pillage does anything
     */
    pillage(): boolean {
        let liveObj;
        if (this.memory.pillageTarget !== undefined) {
            let tmpObj = Game.getObjectById(this.memory.pillageTarget);
            if (tmpObj !== null && tmpObj.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                liveObj = tmpObj;
            }
        } else {
            let liveRoom = Game.rooms[this.room];
            let targets = [liveRoom.storage, liveRoom.terminal];

            for (let target of targets) {
                if (target === undefined || target.my) continue;
                if (target.store.getUsedCapacity(RESOURCE_ENERGY) > 0) {
                    liveObj = target;
                    break;
                } else target.destroy();
            }

            if (liveObj === undefined && Game.rooms[this.room].find(FIND_RUINS).length > 0) {
                let ruins = Game.rooms[this.room].find(FIND_RUINS);
                for (let ruin of ruins) {
                    if (ruin.structure.structureType == STRUCTURE_STORAGE && ruin.store.getUsedCapacity(RESOURCE_ENERGY) > 3000) {
                        liveObj = ruin;
                    }
                }
            }
        }
        if (liveObj === undefined) {
            this.noPillage = true;
            return false;
        }

        if (this.pos.inRangeTo(liveObj, 1)) {
            this.liveObj.withdraw(liveObj, RESOURCE_ENERGY);
        } else {
            this.liveObj.travelTo(liveObj);
        }
        return true;
    }
}
