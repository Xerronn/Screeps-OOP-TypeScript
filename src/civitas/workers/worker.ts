import { Civitas } from '../civitas';

export interface WorkerMemory extends CreepMemory {
    fillTarget?: Id<AnyStoreStructure>;
}
export class Worker extends Civitas {
    memory: WorkerMemory;

    constructor(creep: Creep) {
        super(creep);
    }

    update(): boolean {
        if (!super.update()) {
            return false;
        }

        return true;
    }

    run(): boolean {
        return true;
    }

    /**
     * Function to fill spawn and extensions
     */
    fillExtensions(): void {
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
            if (liveObj === null) return;
            this.memory.fillTarget = liveObj.id;
        }

        if (this.pos.inRangeTo(liveObj, 1)) {
            this.liveObj.transfer(liveObj, RESOURCE_ENERGY);
        } else {
            this.liveObj.travelTo(liveObj);
        }
    }
}
