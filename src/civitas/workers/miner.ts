import Chronicler from 'controllers/Chronicler';
import Worker, {WorkerMemory} from './Worker';

export interface MinerMemory extends WorkerMemory {
    sourceId: Id<Source>;
    containerId?: Id<StructureContainer>;
    linkId?: Id<StructureLink>;
    courierSpawned: boolean;
}

export default class Miner extends Worker {
    memory: MinerMemory;

    source: Source;
    container?: StructureContainer;
    link?: StructureLink;

    replacementTime: number;                //When the creep should spawn its replacement

    constructor(miner: Creep) {
        super(miner);

        if (this.memory.sourceId === undefined) {
            this.memory.sourceId = this.assignToSource();
        }
        if (this.memory.courierSpawned === undefined) {
            this.memory.courierSpawned = false;
        }

        let unkSource = Game.getObjectById(this.memory.sourceId);      //in some cases we might not have vision of the source
        if (unkSource !== null) {
            this.source = unkSource;
            this.replacementTime = Game.rooms[this.memory.spawnRoom].find(FIND_MY_SPAWNS)[0].pos.findPathTo(this.source).length + (this.body.length * 2);

            //container assignment
            if (this.memory.containerId !== undefined && this.memory.linkId === undefined) {
                let unkContainer = Game.getObjectById(this.memory.containerId);

                if (unkContainer !== null) {
                    this.container = unkContainer;
                } else {
                    this.memory.containerId = undefined;
                }
            } else this.memory.containerId = this.getContainer();

            //link assignment
            if (this.memory.linkId !== undefined) {
                let unkLink = Game.getObjectById(this.memory.linkId);

                if (unkLink !== null) {
                    this.link = unkLink;
                } else {
                    this.memory.linkId = undefined;
                }
            } else this.memory.linkId = this.getLink();
        }
    }

    update(): boolean {
        if (!super.update()) {  //creep is dead
            //remove name from the assigned source worker memory
            let roomSources = Chronicler.readResources(this.memory.spawnRoom);
            let index = roomSources[this.memory.sourceId].workers[this.constructor.name].indexOf(this.name);
            roomSources[this.memory.sourceId].workers[this.constructor.name].splice(index, 1);
            roomSources[this.memory.sourceId].openSpots++;
            return false;
        }

        let unkSource = Game.getObjectById(this.memory.sourceId);      //in some cases we might not have vision of the source
        if (unkSource) {
            this.source = unkSource;

            if (this.memory.containerId !== undefined) {
                let unkContainer = Game.getObjectById(this.memory.containerId);

                if (unkContainer !== null) {
                    this.container = unkContainer;
                } else {
                    this.memory.containerId = undefined;
                }
            } else if (Game.time % 25 === 0 && this.memory.linkId === undefined) {      //check every 25 ticks for a newly built link
                this.memory.containerId = this.getContainer();
            }

            if (this.memory.linkId !== undefined) {
                let unkLink = Game.getObjectById(this.memory.linkId);

                if (unkLink !== null) {
                    this.link = unkLink;
                } else {
                    this.memory.linkId = undefined;
                }
            } else if (Game.time % 25 === 0) {      //check every 25 ticks for a newly built link
                this.memory.linkId = this.getLink();
            }
        }


        return true;
    }

    run(): boolean {
        //make sure to spawn new miner before the current one dies, to maintain 100% uptime
        if (this.memory.generation !== undefined && this.ticksToLive <= this.replacementTime) {
            //basically rebirth but without the dying first
            this.evolve();
            this.supervisor.initiate({
                'body': [...this.body],
                'type': this.memory.type,
                'memory': {...this.memory}
            });

            //no more rebirth for you
            delete this.memory.generation;
        }

        //spawn courier
        if (this.memory.courierSpawned === false) {
            this.spawnCourier();
        }

        if (this.link === undefined) {
            if (this.container !== undefined || this.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                this.harvest();
            } else {
                this.build();   //build either new container or new link
            }

        } else {
            this.depositLink(this.link);
        }

        //evolve the creep if it has a link
        if (this.ticksToLive < 2 && this.link !== undefined) {
            this.evolve();
        }
        return true;
    }

    /**
     * Overridden harvest method that moves to container instead of to source
     */
    //TODO: add automatic container repairing too
    harvest(): boolean {
        let target: RoomObject | undefined;
        let targetRange: number;
        if (this.container !== undefined) {
            target = this.container;
            targetRange = 0;
        } else {
            target = this.source;
            targetRange = 1;
        }
        if (target === undefined || this.source === undefined) return false;
        if (this.pos.inRangeTo(target, targetRange)) {
            this.liveObj.harvest(this.source);
        } else {
            this.liveObj.travelTo(target, {allowSwap: true});
        }
        return true;
    }

    /**
     * Method that empties all stored energy into the source link
     */
    depositLink(link: StructureLink) {
        if (this.pos.inRangeTo(link, 1)) {
            this.liveObj.transfer(link, RESOURCE_ENERGY);
        } else {
            this.liveObj.travelTo(link);
        }
    }

    /**
     * Method that assigns the creep to an available source
     * @returns assigned source ID
     */
    assignToSource(): Id<Source> {
        let roomSources = Chronicler.readResources(this.memory.spawnRoom);

        if (this.memory.sourceId) {
            //for creep rebirth and object init
            if (roomSources[this.memory.sourceId].workers[this.constructor.name] === undefined) {
                roomSources[this.memory.sourceId].workers[this.constructor.name] = [];
            }

            let index = roomSources[this.memory.sourceId].workers[this.constructor.name].indexOf(this.name);
            if (index < 0) {
                roomSources[this.memory.sourceId].workers[this.constructor.name].push(this.name);
                roomSources[this.memory.sourceId].openSpots--;
            }

            return this.memory.sourceId;
        } else {
            //for first time an ancestry has spawned
            let sortedSources: any[] = _.sortBy(
                Object.keys(roomSources) as Array<keyof typeof roomSources>,
                s => this.pos.findPathTo(Game.getObjectById(s as Id<any>)).length
            );
            let currentBest = "" as Id<Source>;
            for (let source of sortedSources) {
                if (roomSources[source].workers[this.constructor.name] === undefined) {
                    roomSources[source].workers[this.constructor.name] = [];
                }

                //find the source with the least workers assigned
                if (currentBest == "" || roomSources[source].workers[this.constructor.name].length < roomSources[currentBest].workers[this.constructor.name].length) {
                    currentBest = source;
                }
            }

            roomSources[currentBest].workers[this.constructor.name].push(this.name);
            roomSources[currentBest].openSpots--;
            return currentBest;
        }
    }

    /**
     * Method that checks the source to see if there is a container and then returns the ID
     * @returns assigned container ID
     */
    getContainer(): Id<StructureContainer> | undefined {
        let roomContainers = this.supervisor.containers;
        if (this.source === undefined) return undefined;
        let container = this.source.pos.findInRange(roomContainers, 1)[0];
        if (container !== undefined) {
            return container.id;
        } else return undefined;

    }

    /**
     * Method that checks the source to see if there is a link and then returns the ID
     * @returns assigned link ID
     */
    getLink(): Id<StructureLink> | undefined {
        let roomSources = Chronicler.readResources(this.memory.spawnRoom);
        return roomSources[this.memory.sourceId].linkId;
    }

    /**
     * Method to evolve the body after getting a link
     */
     evolve() {
        if (this.link) {
            this.memory.body = [
                WORK, WORK, WORK, WORK, WORK, WORK, WORK,
                CARRY, CARRY, CARRY, CARRY, CARRY,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
            ]
        }
    }

    spawnCourier() {
        this.supervisor.initiate({
            'body': [CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
            'type': CIVITAS_TYPES.COURIER,
            'memory': {
                'generation' : 0,
                'containerId': this.memory.containerId,
                'resource': RESOURCE_ENERGY
            }
        });

        this.memory.courierSpawned = true;
    }
}
