import Chronicler from 'controllers/Chronicler';
import Informant from 'controllers/Informant';
import Traveler from 'thirdParty/traveler';
import Worker, {WorkerMemory} from './Worker';

interface CourierMemory extends WorkerMemory {
    resource: ResourceConstant;                 //must be provided by whatever is spawning the courier
    containerId: Id<StructureContainer>;        //must be provided by whatever is spawning the courier
    storageId: Id<StructureStorage>;
    terminalId?: Id<StructureTerminal>;
}

export default class Courier extends Worker {
    memory: CourierMemory

    storage?: StructureStorage;
    container?: StructureContainer;
    terminal?: StructureTerminal;
    target?: StructureStorage | StructureTerminal;

    path: RoomPosition[];
    reversedPath: RoomPosition[];
    constructor(courier: Creep) {
        super(courier);

        _.defaults(this.memory, {
            storageId: Game.rooms[this.spawnRoom].storage?.id,
            terminalId: Game.rooms[this.spawnRoom].terminal?.id
        });

        this.container = Game.getObjectById(this.memory.containerId) || undefined;
        this.storage = Game.getObjectById(this.memory.storageId) || undefined;
        if (this.memory.terminalId !== undefined) {
            this.terminal = Game.getObjectById(this.memory.terminalId) || undefined;
        }
        if (this.memory.resource === RESOURCE_ENERGY) {
            this.target = this.storage;
        } else {
            this.target = this.terminal;
        }
    }

    update(): boolean {
        if (!super.update()) {
            //creep is dead
            return false;
        }
        //attributes that will change tick to tick
        this.storage = Game.getObjectById(this.memory.storageId) || undefined;
        this.container = Game.getObjectById(this.memory.containerId) || undefined;
        if (this.memory.terminalId !== undefined) {
            this.terminal = Game.getObjectById(this.memory.terminalId) || undefined;
        }

        //defined cached path between the target and the container
        if (this.path === undefined && this.container !== undefined && this.target !== undefined) {
            this.path = PathFinder.search(
                this.target.pos,
                {
                    "pos" : this.container.pos,
                    "range" : 1
                },
                {
                    "roomCallback": Informant.getCostMatrix,
                    "plainCost": 2,
                    "swampCost": 10
                }
            ).path;

            this.reversedPath = [...this.path].reverse();
        }
        
        return true;
    }

    /**
     * logic to run each tick
     */
    run(): boolean {
        if (this.fleeing) {
            return this.march(this.spawnRoom, true);
        }

        if (this.path !== undefined) {
            let replacementTime = this.path.length + (CREEP_SPAWN_TIME * this.body.length);
            if (this.ticksToLive < replacementTime && this.memory.generation !== undefined) {
                if (this.remote === false) this.evolve(false);
                this.replace();
            }
        }

        //if container no longer exists, its been replaced by a link
        if (this.container === undefined) {
            if (!this.remote) {
                //disable rebirth
                delete this.memory.generation;
                //rip
                this.liveObj.suicide();
                return false;
            } else return this.march(this.assignedRoom);
        }

        if (this.store.getUsedCapacity() == 0 || (this.memory.task == "withdraw" && this.store.getFreeCapacity() > 0)) {
            this.memory.task = "withdraw";
            //withdraw from tombstone on current tile
            this.withdrawTomb(this.memory.resource)
            //pickup dropped energy from the current tile
            this.withdrawDropped(this.memory.resource);

            this.moveByPath(this.path);
            this.withdrawContainer(this.memory.resource);
        } else {
            this.memory.task = "deposit";
            this.moveByPath(this.reversedPath);
            //only put energy into storage, the rest goes to terminal
            if (this.memory.resource == RESOURCE_ENERGY) {
                this.depositStorage(this.memory.resource);
            } else {
                this.depositTerminal(this.memory.resource);
            }
        }
        return true;
    }

    /**
     * Move to assigned container and withdraw if the container can fill the creep
     */
    withdrawContainer(resourceType:ResourceConstant = RESOURCE_ENERGY): boolean {
        if (this.container === undefined) return false;
        if (this.pos.inRangeTo(this.container, 1)) {
            if (this.container.store.getUsedCapacity(resourceType) > this.store.getFreeCapacity(resourceType)) {
                this.liveObj.withdraw(this.container, resourceType);
            } else if (this.container.pos.lookFor(LOOK_RESOURCES).length > 0){
                for (let res of this.container.pos.lookFor(LOOK_RESOURCES)) {
                    if (res.resourceType === resourceType) {
                        this.liveObj.pickup(res);
                    }
                }
            }
        }
        return true;
    }

    /**
     * Method to deposit minerals to the terminal
     * @param {STRING} resourceType
     */
    depositTerminal(resourceType:ResourceConstant = RESOURCE_ENERGY): boolean {
        if (this.terminal === undefined) return false;
        if (this.pos.inRangeTo(this.terminal, 1)) {
            this.liveObj.transfer(this.terminal, resourceType);
        }
        return true;
    }

    /**
     * Method to deposit minerals to the terminal
     * @param {STRING} resourceType
     */
    depositStorage(resourceType:ResourceConstant = RESOURCE_ENERGY): boolean {
        if (this.storage === undefined) return false;
        if (this.pos.inRangeTo(this.storage, 1)) {
            this.liveObj.transfer(this.storage, resourceType);
            if (resourceType === RESOURCE_ENERGY) {
                let amount = Math.min(this.store.getUsedCapacity(RESOURCE_ENERGY), this.storage.store.getFreeCapacity(RESOURCE_ENERGY));
                if (this.remote) {
                    Chronicler.writeIncrementRemoteStatistic(this.spawnRoom, this.assignedRoom, 'energyDeposited', amount);
                    Chronicler.writeIncrementStatistic(this.spawnRoom, 'remoteEnergyDeposited', amount);
                } else Chronicler.writeIncrementStatistic(this.spawnRoom, 'energyDeposited', amount);
            }
        }
        return true;
    }

    /**
     * Method to pull energy from tombstones along the hauler's path
     */
    withdrawTomb(resourceType:ResourceConstant = RESOURCE_ENERGY): boolean {
        if (this.target === undefined) return false;
        let tombs = this.pos.lookFor(LOOK_TOMBSTONES);
        if (tombs) {
            for (let tomb of tombs) {
                if (tomb.store.getUsedCapacity(resourceType) > 0) {
                    this.liveObj.withdraw(tomb, resourceType);
                    let amount = tomb.store.getUsedCapacity(resourceType);
                    if (amount > this.store.getFreeCapacity(resourceType) / 1.2 || this.pos.getRangeTo(this.target) < 15 && amount > this.store.getFreeCapacity(resourceType) / 3) {
                        this.memory.task = "deposit";
                    }
                }
            }
        }
        return true;
    }

    /**
     * Method to withdraw dropped energy along the hauler's path
     */
    withdrawDropped(resourceType:ResourceConstant = RESOURCE_ENERGY): boolean {
        if (this.target === undefined) return false;
        let resources = this.pos.lookFor(LOOK_RESOURCES);
        if (resources) {
            for (let res of resources) {
                if (res.resourceType == resourceType) {
                    this.liveObj.pickup(res);
                    if (res.amount > this.store.getFreeCapacity(resourceType) / 1.2 || this.pos.getRangeTo(this.target) < 15 && res.amount > this.store.getFreeCapacity(resourceType) / 3) {
                        this.memory.task = "deposit";
                    }
                }
            }
        }
        return true;
    }

    /**
     * Method to double the size of the courier for when two couriers are downsized to one
     */
    evolve(double: boolean) {
        let body: BodyPartConstant[] = [];
        if (double) {
            let carryCount = 0;
            for (let part of this.body) {
                if (part === CARRY) carryCount++;
            }

            for (let i = 0; i < Math.min(32, carryCount * 2); i++) {
                body.push(CARRY);
                body.push(MOVE);
            }
        } else {
            let travelLength = this.path.length * 12 * 2;
            let carryCount = Math.ceil(travelLength / 50);
            let numCouriers = Math.ceil(carryCount / 30);    //30 is the max carry parts we want on a single creep
            let energyCapacity = Game.rooms[this.spawnRoom].energyCapacityAvailable;

            for (let i = 0; i < Math.ceil(carryCount / numCouriers); i++) {
                if (energyCapacity < 100) break;
                body.push(MOVE);
                body.unshift(CARRY);
                energyCapacity -= 100;
            }
        }
        this.memory.body = body;
    }
}
