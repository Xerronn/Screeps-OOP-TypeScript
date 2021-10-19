import { Informant } from 'administrators/informant';
import {Worker, WorkerMemory} from './worker';

interface CourierMemory extends WorkerMemory {
    resource: ResourceConstant;                 //must be provided by whatever is spawning the courier
    containerId: Id<StructureContainer>;        //must be provided by whatever is spawning the courier
    storageId: Id<StructureStorage>;
    terminalId?: Id<StructureTerminal>;
}

export class Courier extends Worker {
    memory: CourierMemory

    storage?: StructureStorage;
    container?: StructureContainer;
    terminal?: StructureTerminal;
    target?: StructureStorage | StructureTerminal;
    evolved: boolean;

    path: RoomPosition[];
    reversedPath: RoomPosition[];
    stuckTick: number;
    stuckPos: RoomPosition;
    pathing: boolean;
    constructor(courier: Creep) {
        super(courier);

        _.defaults(this.memory, {
            storageId: Game.rooms[this.memory.spawnRoom].storage?.id,
            terminalId: Game.rooms[this.memory.spawnRoom].terminal?.id
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

        this.evolved = false;

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
        return true;
    }

    /**
     * logic to run each tick
     */
    run(): boolean {
        //if container no longer exists, its been replaced by a link
        if (!this.container) {
            //disable rebirth
            delete this.memory.generation;
            //rip
            this.liveObj.suicide();
            return false;
        }

        //evolve if the container ever gets full. it means the transporter is underpowered
        if (this.container.store.getFreeCapacity() == 0 && this.evolved == false) {
            this.evolve();
        }

        if (this.store.getUsedCapacity() == 0 || (this.memory.task == "withdraw" && this.store.getFreeCapacity() > 0)) {
            this.memory.task = "withdraw";
            //withdraw from tombstone on current tile
            this.withdrawTomb(this.memory.resource)
            //pickup dropped energy from the current tile
            this.withdrawDropped(this.memory.resource);

            if (this.pathing) this.moveByPath();
            this.withdrawContainer(this.memory.resource);
        } else {
            this.memory.task = "deposit";
            if (this.pathing) this.moveByPath(true);
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
     * Method to travel along the cached path
     * @param {Boolean} reversed go in the opposite direction
     * @param {Boolean} reset reset the path to the start
     */
    moveByPath(reversed: boolean = false) {
        //if creep is sitting at its destination, there is nothing to do
        if (!reversed) {
            if (this.pos.isEqualTo(this.path[this.path.length - 1])) {
                return false;
            }
        } else {
            if (this.pos.isEqualTo(this.path[0])) {
                return false;
            }
        }

        //detect if creep is stuck, and path normally if necessary
        if (this.stuckPos.x != this.pos.x || this.stuckPos.y != this.pos.y) {
            this.stuckPos = this.pos;
            this.stuckTick = 0;
        } else {
            this.stuckPos = this.pos;
            this.stuckTick++;
        }

        if (this.stuckTick > 3) {
            //do something
            this.pathing = false;
        }
        if (!reversed) {
            this.liveObj.moveByPath(this.path);
        } else {
            this.liveObj.moveByPath(this.reversedPath);
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
            }
        } else {
            if (!this.pathing) {
                this.liveObj.moveTo(this.container);
            }
        }
        return true;
    }

    /**
     * Move to storage and deposit all stored energy
     */
    depositStorage(resourceType:ResourceConstant = RESOURCE_ENERGY): boolean {
        if (this.storage === undefined) return false;
        if (this.pos.inRangeTo(this.storage, 1)) {
            this.liveObj.transfer(this.storage, resourceType);
        } else if (!this.pathing) {
            this.liveObj.moveTo(this.storage);
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
        } else if (!this.pathing) {
            this.liveObj.moveTo(this.terminal);
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
     * Method to evolve creep if its base body isn't enough to keep up
     */
    evolve() {
        //add one of each
        //only if < 800 in case it fills up while transporter is dead
        if (this.ticksToLive < 800 && this.target !== undefined && this.container !== undefined) {
            //miners mine 12 energy per tick, and you have to travel both ways
            let travelLength = this.target.pos.findPathTo(this.container).length * 12 * 2;
            let targetCarryCount = Math.ceil(travelLength / 50);
            let maxBody = Game.rooms[this.room].energyCapacityAvailable / 50 / 2;

            let carryCount = Math.min(targetCarryCount, maxBody / 2);

            let newBody: BodyPartConstant[] = [];
            for (let i = 0; i < carryCount; i++) {
                newBody.push(MOVE);
                newBody.unshift(CARRY);
            }
            this.evolved = true;
            this.memory.body = newBody;
        }
    }
}