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
        let replacementTime = (this.memory.travelTime || 0);
        if (this.memory.generation !== undefined && this.ticksToLive <= replacementTime) {
            this.replace();
        }

        //march to room and flee if enemies
        if (this.fleeing === true) {
            return this.march(this.spawnRoom, true);
        }

        if (this.arrived === false) {
            return this.march(this.assignedRoom);
        }

        //spawn courier
        if (this.memory.courierSpawned === false && this.memory.travelTime !== undefined) {
            this.spawnCourier(this.memory.travelTime - (CREEP_SPAWN_TIME * this.body.length));
        }

        if (this.link === undefined) {
            if (this.container !== undefined && this.container.hits === this.container.hitsMax || this.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                this.harvest();
            } else if (this.container !== undefined && this.container.hits < this.container.hitsMax) {
                this.repairContainer(this.container);
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
            let success = this.liveObj.harvest(this.source);
            if (success === OK) {
                let amount = this.getActiveBodyParts(WORK) * 2;
                if (this.remote) {
                    Chronicler.writeIncrementRemoteStatistic(this.spawnRoom, this.assignedRoom, 'energyMined', amount);
                } else Chronicler.writeIncrementStatistic(this.spawnRoom, 'energyMined', amount);
            }
        } else {
            this.liveObj.travelTo(target, {allowSwap: true});
        }
        return true;
    }

    repairContainer(container: StructureContainer) {
        if (this.pos.inRangeTo(container, 1)) {
            this.liveObj.repair(container);
        } else {
            this.liveObj.travelTo(container);
        }
    }

    /**
     * Method that empties all stored energy into the source link
     */
    depositLink(link: StructureLink) {
        if (this.pos.inRangeTo(link, 1)) {
            this.liveObj.transfer(link, RESOURCE_ENERGY);
            let amount = Math.min(this.store.getUsedCapacity(RESOURCE_ENERGY), link.store.getFreeCapacity(RESOURCE_ENERGY));
            Chronicler.writeIncrementStatistic(this.spawnRoom, 'energyDeposited', amount);
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

        if (!this.remote) {
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

    /**
     * Method that checks the source to see if there is a container and then returns the ID
     * @returns assigned container ID
     */
    getContainer(): Id<StructureContainer> | undefined {
        if (this.source === undefined) return undefined;
        let containers: StructureContainer[];
        if (this.remote) {
            containers = Game.rooms[this.assignedRoom].find(FIND_STRUCTURES, {'filter': {structureType: STRUCTURE_CONTAINER}});
        } else containers = this.supervisor.containers;
        let container = this.source.pos.findInRange(containers, 1)[0];
        if (container !== undefined && container.structureType === STRUCTURE_CONTAINER) {
            return container.id;
        } else return undefined;
    }

    /**
     * Method that checks the source to see if there is a link and then returns the ID
     * @returns assigned link ID
     */
    getLink(): Id<StructureLink> | undefined {
        let roomSources = Chronicler.readResources(this.spawnRoom);
        return roomSources[this.memory.sourceId].linkId;
    }

    spawnCourier(travelTime: number) {
        //miners harvest 12 energy per tick and the courier has to travel both ways
        let travelLength = travelTime * 12 * 2;
        let carryCount = Math.ceil(travelLength / 50);
        let numCouriers = Math.ceil(carryCount / 30);    //30 is the max carry parts we want on a single creep
        let energyCapacity = Game.rooms[this.spawnRoom].energyCapacityAvailable;

        let body: BodyPartConstant[] = [];
        for (let i = 0; i < Math.ceil(carryCount / numCouriers); i++) {
            if (energyCapacity < 100) break;
            body.push(MOVE);
            body.unshift(CARRY);
            energyCapacity -= 100;
        }

        for (let i = 0; i < numCouriers; i++) {
            this.supervisor.initiate({
                'body': body,
                'type': CIVITAS_TYPES.COURIER,
                'memory': {
                    'generation' : 0,
                    'assignedRoom': this.assignedRoom,
                    'offRoading': false,
                    'containerId': this.memory.containerId,
                    'resource': RESOURCE_ENERGY
                }
            });
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
