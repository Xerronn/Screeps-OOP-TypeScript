import { Archivist } from 'administrators/archivist';
import { Worker } from './worker';

interface MinerMemory extends CreepMemory {
    sourceId: Id<Source>;
    containerId?: Id<StructureContainer>;
}

export class Miner extends Worker {
    memory: MinerMemory;

    sourceId: Id<Source>;
    source: Source;
    containerId?: Id<StructureContainer>;
    container?: StructureContainer;

    replacementTime: number;                //When the creep should spawn its replacement

    constructor(miner: Creep) {
        super(miner);
        _.defaults(this.memory, {
            sourceId: this.assignToSource()
        })

        this.sourceId = this.memory.sourceId;
        let unkSource = Game.getObjectById(this.sourceId);      //in some cases we might not have vision of the source
        if (unkSource !== null) {
            this.source = unkSource;
            this.replacementTime = Game.rooms[this.memory.spawnRoom].find(FIND_MY_SPAWNS)[0].pos.findPathTo(this.source).length + (this.body.length * 2);

            //container assignment
            if (this.memory.containerId !== undefined) {
                let unkContainer = Game.getObjectById(this.memory.containerId);

                if (unkContainer !== null) {
                    this.container = unkContainer;
                } else {
                    this.memory.containerId = undefined;
                }
            } else this.memory.containerId = this.getContainer();
        }
    }

    update(): boolean {
        if (!super.update()) {  //creep is dead
            //remove name from the assigned source worker memory
            let roomSources = Archivist.getSources(this.memory.spawnRoom);
            let index = roomSources[this.sourceId].workers[this.constructor.name].indexOf(this.name);
            roomSources[this.sourceId].workers[this.constructor.name].splice(index, 1);
            return false;
        }

        let unkSource = Game.getObjectById(this.sourceId);      //in some cases we might not have vision of the source
        if (unkSource) {
            this.source = unkSource;

            if (this.memory.containerId !== undefined) {
                let unkContainer = Game.getObjectById(this.memory.containerId);

                if (unkContainer !== null) {
                    this.container = unkContainer;
                } else {
                    this.memory.containerId = undefined;
                }
            } else if (Game.time % 25 === 0) {      //check every 25 ticks for a newly built container
                this.memory.containerId = this.getContainer();
            }
        }


        return true;
    }

    run(): boolean {
        if (this.store.getFreeCapacity(RESOURCE_ENERGY) > 0 ) {
            this.harvest();
        }
        return true;
    }

    /**
     * Overridden harvest method that moves to container instead of to source
     */
    //TODO: add automatic container repairing too
    harvest() {
        let target: RoomObject;
        let targetRange: number;
        if (this.container !== undefined) {
            target = this.container;
            targetRange = 0;
        } else {
            target = this.source;
            targetRange = 1;
        }
        if (this.pos.inRangeTo(target, targetRange)) {
            this.liveObj.harvest(this.source);
        } else {
            //this.liveObj.travelTo(this.source, {allowSwap: false});
            this.liveObj.moveTo(target);
        }
    }

    /**
     * Method that assigns the creep to an available source
     * @returns assigned source ID
     */
    assignToSource(): Id<Source> {
        let roomSources = Archivist.getSources(this.memory.spawnRoom);

        if (this.memory.sourceId) {
            //for creep rebirth and object init
            !(this.constructor.name in roomSources[this.memory.sourceId].workers) &&       //cool snippet of code that will create an empty array if one doesn't exist
                (roomSources[this.memory.sourceId].workers[this.constructor.name] = []);

            let index = roomSources[this.memory.sourceId].workers[this.constructor.name].indexOf(this.name);
            if (index < 0) {
                roomSources[this.memory.sourceId].workers[this.constructor.name].push(this.name);
            }

            return this.memory.sourceId;
        } else {
            //for first time an ancestry has spawned
            let sortedSources: Id<Source>[] = _.sortBy(
                Object.keys(roomSources) as Array<keyof typeof roomSources>,
                s => this.pos.findPathTo(Game.getObjectById(s as Id<any>)).length
            );
            let currentBest = "" as Id<Source>;
            for (let source of sortedSources) {
                !(this.constructor.name in roomSources[source].workers) &&
                (roomSources[source].workers[this.constructor.name] = []);

                //find the source with the least workers assigned
                if (currentBest == "" || roomSources[source].workers[this.constructor.name].length < roomSources[currentBest].workers[this.constructor.name].length) {
                    currentBest = source;
                }
            }

            roomSources[currentBest].workers[this.constructor.name].push(this.name);
            return currentBest;
        }
    }

    /**
     * Method that checks the source to see if there is a container and then returns the ID
     * @returns assigned container ID
     */
    getContainer(): Id<StructureContainer> | undefined {
        let roomContainers = this.supervisor.containers;
        let container = this.source.pos.findInRange(roomContainers, 1)[0];
        if (container !== undefined) {
            return container.id;
        } else return undefined;

    }
}
