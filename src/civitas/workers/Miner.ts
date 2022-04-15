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

    source?: Source;
    container?: StructureContainer;
    link?: StructureLink;

    constructor(miner: Creep) {
        super(miner);

    }

    update(): boolean {
        if (!super.update()) {  
            //creep is dead
            return false;
        }

        let liveSource = Game.getObjectById(this.memory.sourceId) || undefined;      //in some cases we might not have vision of the source
        if (liveSource !== undefined) {
            this.source = liveSource;
            //check every tick for a new container/link to use
            this.assignStore();
        }

        return true;
    }

    run() {
        //make sure to spawn new miner before the current one dies, to maintain 100% uptime
        let replacementTime = (this.memory.travelTime || 0) + CREEP_SPAWN_TIME * this.body.length;
        if (this.memory.generation !== undefined && this.ticksToLive <= replacementTime) {
            this.replace();
        }

        //march to room and flee if enemies
        if (this.fleeing === true) {
            return this.march(this.memory.spawnRoom);
        }

        if (this.arrived === false) {
            return this.march(this.assignedRoom);
        }

        //spawn courier
        if (this.memory.courierSpawned === false && this.memory.travelTime !== undefined) {
            this.spawnCourier(this.memory.travelTime - (CREEP_SPAWN_TIME * this.body.length));
        }

        if (this.link === undefined) {
            if (this.container !== undefined || this.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                this.harvest();
            } else {
                this.build();   //build either new container or new link
            }

        } else {
            if (this.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                this.harvest();
            } else {
                this.depositLink(this.link);
            }
        }

        return;
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
            if (this.memory.travelTime === undefined && this.ticksToLive > 1400) {
                this.memory.travelTime = Game.time - this.spawnTime;
            }
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
     * Method to assign a container or link to the miner
     */
    assignStore() {
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

    spawnCourier(travelTime: number) {
        //miners harvest 12 energy per tick and the courier has to travel both ways
        let travelLength = travelTime * 12 * 2;
        let carryCount = Math.ceil(travelLength / 50);
        let numCouriers = Math.ceil(carryCount / 30);    //30 is the max carry parts we want on a single creep

        let body: BodyPartConstant[] = [];
        for (let i = 0; i < Math.ceil(carryCount / numCouriers); i++) {
            body.push(MOVE);
            body.unshift(CARRY);
        }

        for (let i = 0; i < numCouriers; i++) {
            // this.supervisor.initiate({
            //     'body': body,
            //     'type': CIVITAS_TYPES.COURIER,
            //     'memory': {
            //         'generation' : 0, 
            //         'targetRoom': this.assignedRoom, 
            //         'offRoading': false,
            //         'containerId': this.memory.containerId,
            //         'resource': RESOURCE_ENERGY
            //     }
            // });
            console.log(JSON.stringify({
                'body': body,
                'type': CIVITAS_TYPES.COURIER,
                'memory': {
                    'generation' : 0, 
                    'targetRoom': this.assignedRoom, 
                    'offRoading': false,
                    'containerId': this.memory.containerId,
                    'resource': RESOURCE_ENERGY
                }
            }));
        }

        this.memory.courierSpawned = true;
    }

    /**
     * Method to replace the miner 
     */
     replace() {
        //evolve the creep if it has a link
        if (this.link !== undefined) {
            this.evolve();
        }

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
}
