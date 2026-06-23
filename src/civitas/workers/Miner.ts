import Chronicler from 'controllers/Chronicler';
import Worker, {WorkerMemory} from './Worker';
import Container from 'castrum/Container';
import Conduit from 'castrum/Conduit';

export interface MinerMemory extends WorkerMemory {
    sourceId: Id<Source>;
    courierSpawned: boolean;
}

export default class Miner extends Worker {
    memory: MinerMemory;

    miningSpot: Position;
    source?: Source;
    container?: Container;
    conduit?: Conduit;


    constructor(miner: Creep) {
        super(miner);

        this.initialize();
    }

    update(): boolean {
        if (!super.update()) {  
            //creep is dead
            return false;
        }

        //in some cases we might not have vision of the source
        this.source = Game.getObjectById(this.memory.sourceId) || undefined;
        if (!this.container && !this.conduit) {
            this.initialize();
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

        if (this.conduit === undefined) {
            if (this.container !== undefined && this.container.hits === this.container.hitsMax || this.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                this.harvest();
            } else if (this.container !== undefined && this.container.hits < this.container.hitsMax) {
                this.repairContainer(this.container.liveObj);
            } else {
                //build new link/container
                this.build();
            }

        } else {
            if (this.store.getFreeCapacity(RESOURCE_ENERGY) > 0) {
                this.harvest();
            } else {
                this.depositLink(this.conduit.liveObj);
            }
        }

        return;
    }

    /**
     * Overridden harvest method that moves to container instead of to source
     */
    harvest(): boolean {
        let targetPos = new RoomPosition(this.miningSpot.x, this.miningSpot.y, this.assignedRoom);
        if (this.source === undefined || targetPos === undefined) return false;
        if (this.pos.inRangeTo(targetPos, 0)) {
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
            this.liveObj.travelTo(targetPos, {allowSwap: true});
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
    initialize() {
        let containerPos: Position;
        let linkPos: Position;
        if (!this.remote) {
            let schema = Chronicler.readSchema(this.spawnRoom);
            containerPos = schema.resources.sources[this.memory.sourceId]?.containerPos;
            linkPos = schema.resources.sources[this.memory.sourceId]?.linkPos;
            this.miningSpot = containerPos;

            let conduits = this.supervisor.castrum[CASTRUM_TYPES.CONDUIT];
            for (let conduit of conduits) {
                if (conduit.pos.x == linkPos.x && conduit.pos.y == linkPos.y){
                    this.conduit = conduit;
                }
            }
            if (this.conduit) {
                return;
            }
        } else {
            let schema = Chronicler.readRemoteSchema(this.spawnRoom, this.assignedRoom);
            if (!schema) return;
            containerPos = schema.sources[this.memory.sourceId]?.containerPos;
            this.miningSpot = containerPos;
        }

        let containers = this.supervisor.castrum[CASTRUM_TYPES.CONTAINER];
        for (let container of containers) {
            if (container.pos.x == containerPos.x && container.pos.y == containerPos.y) {
                this.container = container;
            }
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
        } else containers = this.supervisor.castrum[CASTRUM_TYPES.CONTAINER].map(i => i.liveObj);
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
            this.supervisor.queueCreep({
                'body': body,
                'type': CIVITAS_TYPES.COURIER,
                'memory': {
                    'generation' : 0,
                    'assignedRoom': this.assignedRoom,
                    'offRoading': false,
                    'containerPos': {
                        'x': this.miningSpot.x,
                        'y': this.miningSpot.y
                    }
                }
            });
        }

        this.memory.courierSpawned = true;
    }

    /**
     * Method to replace the miner 
     */
     replace() {
        //basically rebirth but without the dying first
        this.evolve();
        this.supervisor.queueCreep({
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
        if (this.conduit) {
            this.memory.body = [
                WORK, WORK, WORK, WORK, WORK, WORK, WORK,
                CARRY, CARRY, CARRY, CARRY, CARRY,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
            ]
        }
    }
}
