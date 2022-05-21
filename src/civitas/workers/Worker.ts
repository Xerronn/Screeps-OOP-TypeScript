import Supervisor from 'administrators/Supervisor';
import Chronicler from 'controllers/Chronicler';
import Civitas from '../Civitas';

export interface WorkerMemory extends CreepMemory {
    fillTarget?: Id<AnyStoreStructure>;
    pillageTarget?: Id<StructureStorage | StructureTerminal | Ruin>;
    buildTarget?: Id<ConstructionSite>;
}
export default class Worker extends Civitas {
    memory: WorkerMemory;

    noPillage: boolean;             //if there is nothing to pillage
    constructor(creep: Creep) {
        super(creep);
    }

    update(): boolean {
        if (!super.update()) {
            return false;
        }

        return true;
    }

    run() {
        return;
    }

    /**
     * upgrade the controller
     */
    upgradeController(): boolean {
        let controller = Game.rooms[this.room].controller;
        if (controller === undefined) throw Error('Room has no controller');
        
        if (this.pos.inRangeTo(controller, 3)) {
            this.liveObj.upgradeController(controller);
            let amount = Math.min(this.getActiveBodyParts(WORK), this.store.getUsedCapacity(RESOURCE_ENERGY))
            Chronicler.writeIncrementStatistic(this.assignedRoom, 'energyUpgraded', amount);
        } else {
            this.liveObj.moveTo(controller);
        }
        return true;
    }

    /**
     * build construction sites closest to current position
     */
    build(): boolean {
        let liveSite: ConstructionSite | undefined;
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
            liveSite = this.pos.findClosestByRange(sites) || undefined;
            if (liveSite === undefined) return false;
            this.memory.buildTarget = liveSite.id;
        }

        if (this.pos.inRangeTo(liveSite, 3)) {
            this.liveObj.build(liveSite);
        } else this.liveObj.travelTo(liveSite);

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
        } else this.liveObj.travelTo(storage);

        return true;
    }

    /**
     * Method that moves to the storage and withdraws energy
     * @returns if the task was executed
     */
    withdrawTerminal(): boolean {
        let terminal = Game.rooms[this.room].terminal;
        if (terminal === undefined || terminal.store.getUsedCapacity(RESOURCE_ENERGY) < this.store.getFreeCapacity(RESOURCE_ENERGY)) return false;

        if (this.pos.inRangeTo(terminal, 1)) {
            this.liveObj.withdraw(terminal, RESOURCE_ENERGY);
        } else this.liveObj.travelTo(terminal);

        return true;
    }

    /**
     * Function to fill spawn and extensions
     */
    fillExtensions(): boolean {
        let liveObj: StructureSpawn | StructureExtension | undefined;
        if (this.memory.fillTarget !== undefined) {
            let tmpObj = Game.getObjectById(this.memory.fillTarget) || undefined;
            if (tmpObj !== undefined && (tmpObj.structureType === STRUCTURE_EXTENSION || tmpObj.structureType === STRUCTURE_SPAWN)) liveObj = tmpObj;
        }

        if (liveObj === undefined || liveObj.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            let supervisor: Supervisor;
            if (this.remote) {
                supervisor = global.Imperator.administrators[this.assignedRoom].supervisor;
            } else supervisor = this.supervisor;
            let ext = Game.rooms[this.room].find(FIND_MY_STRUCTURES, {filter:{structureType: STRUCTURE_EXTENSION}})
            let spawns = supervisor.castrum.nexus.map(s => s.liveObj);

            let fillables = spawns.concat(ext as any[]).filter(
                obj => obj.store && obj.store.getFreeCapacity(RESOURCE_ENERGY) > 0
            );

            liveObj = this.pos.findClosestByRange(fillables) || undefined;
            if (liveObj === undefined) return false;
            this.memory.fillTarget = liveObj.id;
        }

        if (this.pos.inRangeTo(liveObj, 1)) {
            this.liveObj.transfer(liveObj, RESOURCE_ENERGY);
        } else this.liveObj.travelTo(liveObj);

        return true;
    }

    /**
     * Function to fill spawn and extensions
     */
    fillTowers(): boolean {
        let liveObj: StructureTower | undefined;
        if (this.memory.fillTarget !== undefined) {
            let tmpObj = Game.getObjectById(this.memory.fillTarget) || undefined;
            if (tmpObj !== undefined && tmpObj.structureType === STRUCTURE_TOWER && tmpObj.store.getFreeCapacity(RESOURCE_ENERGY) > tmpObj.store.getCapacity(RESOURCE_ENERGY) / 4) liveObj = tmpObj;
        }

        if (liveObj === undefined || liveObj.store.getFreeCapacity(RESOURCE_ENERGY) === 0) {
            let supervisor: Supervisor;
            if (this.remote) {
                supervisor = global.Imperator.administrators[this.assignedRoom].supervisor;
            } else supervisor = this.supervisor;
            let bastions = supervisor.castrum.bastion.map(s => s.liveObj);

            let fillables = bastions.filter(
                obj => obj.store && obj.store.getFreeCapacity(RESOURCE_ENERGY) > obj.store.getCapacity(RESOURCE_ENERGY) / 4
            );

            liveObj = this.pos.findClosestByRange(fillables) || undefined;
            if (liveObj === undefined) {
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
     * Move to storage and deposit all stored energy
     */
    depositStorage(resourceType:ResourceConstant = RESOURCE_ENERGY): boolean {
        let storage = Game.rooms[this.room].storage;
        if (storage === undefined) return false;
        if (this.pos.inRangeTo(storage, 1)) {
            this.liveObj.transfer(storage, resourceType);
        } else this.liveObj.travelTo(storage);

        return true;
    }

    /**
     * Method to steal energy from leftover enemy storage and terminals
     * @returns If pillage does anything
     */
    pillage(): boolean {
        let liveObj: StructureStorage | StructureTerminal | Ruin | undefined;
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
        } else this.liveObj.travelTo(liveObj);
        
        return true;
    }

    /**
     * Method to replace the creep early
     */
    replace() {
        this.supervisor.initiate({
            'body': [...this.body],
            'type': this.memory.type,
            'memory': {...this.memory}
        });

        //no more rebirth for you
        delete this.memory.generation;
    }
}
