import Director from "controllers/Director";
import Civitas from "../Civitas";

interface ExcavatorMemory extends CreepMemory {
    mineralId: Id<Mineral>;
    extractorId: Id<StructureExtractor>;
    containerId: Id<StructureContainer>;
    courierSpawned: boolean;
}

export default class Excavator extends Civitas {
    memory: ExcavatorMemory;

    mineral?: Mineral;
    extractor?: StructureExtractor;
    container?: StructureContainer;
    constructor(excavator: Creep) {
        super(excavator);

        if (!this.memory.mineralId) {
            this.memory.mineralId = Game.rooms[this.room].find(FIND_MINERALS)[0]?.id;
        }
        if (!this.memory.extractorId) {
            this.memory.extractorId = Game.rooms[this.room].find(FIND_STRUCTURES,
                {
                    filter: {
                        structureType : STRUCTURE_EXTRACTOR
                    }
                }
            )[0]?.id as Id<StructureExtractor>;
        }
    }

    update(): boolean {
        if (!super.update()) {
            //creep is dead
            return false;
        }
        //any attributes to update

        if (this.memory.mineralId) {
            this.mineral = Game.getObjectById(this.memory.mineralId) || undefined;
        }
        if (this.memory.extractorId) {
            this.extractor = Game.getObjectById(this.memory.extractorId) || undefined;
        }
        if (this.memory.containerId) {
            this.container = Game.getObjectById(this.memory.containerId) || undefined;
        } else if (!this.memory.containerId && this.mineral) {
            let allContainers = this.supervisor.containers;
            this.container = this.mineral.pos.findInRange(allContainers, 1)[0] || undefined;
            this.memory.containerId = this.container.id;
        }

        return true;
    }

    run(): boolean {
        // suiciding the creep when the mineral is empty would fill the container with energy. just make them idle instead
        if (this.memory.generation == undefined || this.mineral === undefined || this.container === undefined) return false

        this.harvest();

        if (this.container.store.getUsedCapacity() > 1500 && !this.memory.courierSpawned) {
            this.spawnCourier();
        }

        // this mineral courier will not rebirth due to it not being spawned very often
        if (this.memory.courierSpawned && this.container.store.getUsedCapacity() < 1000) {
            this.memory.courierSpawned = false;
        }

        //spawn a new excavator when the mineral is regenerated
        if (this.memory.generation !== undefined && this.mineral.mineralAmount == 0 && this.mineral.ticksToRegeneration && this.ticksToLive < this.mineral.ticksToRegeneration) {
            let task = `
                global.Imperator.administrators[\"` + this.memory.spawnRoom + `\"].supervisor.initiate({
                    'body': objArr[0],
                    'type': objArr[1],
                    'memory': objArr[2]
                });
            `
            Director.schedule(this.memory.spawnRoom, Game.time + this.mineral.ticksToRegeneration, task, [[...this.body], this.memory.type, {...this.memory}]);
            //no more rebirth for you
            delete this.memory.generation;
        }

        return true;
    }

    /**
     * Move to container then start harvesting the mineral
     */
    harvest(): boolean {
        if (this.container === undefined ||
            this.extractor === undefined ||
            this.mineral === undefined) return false;
        if (this.pos.inRangeTo(this.container, 0)) {
            if (this.extractor.cooldown == 0){
                this.liveObj.harvest(this.mineral);
            }
            //do nothing
        } else {
            this.liveObj.moveTo(this.container);
        }
        return true;
    }

    /**
     * Method to spawn a courier that will move the minerals
     */
    spawnCourier(): boolean {
        if (this.memory.containerId === undefined || this.mineral === undefined) return false;
        this.supervisor.initiate({
            'body': [CARRY, CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE],
            'type': CIVITAS_TYPES.COURIER,
            'memory': {
                'containerId': this.memory.containerId,
                'resource': this.mineral.mineralType
            }
        });

        this.memory.courierSpawned = true;
        return true;
    }
}
