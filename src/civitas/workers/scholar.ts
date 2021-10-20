import {Informant} from 'administrators/informant';
import {Worker, WorkerMemory} from './worker';

interface ScholarMemory extends WorkerMemory {
    controllerId: Id<StructureController>;
    storageId: Id<StructureStorage>;
    linkId: Id<StructureLink>;
}

export class Scholar extends Worker {
    memory: ScholarMemory;

    controller?: StructureController;
    storage?: StructureStorage;
    link?: StructureLink;

    constructor(scholar: Creep) {
        super(scholar);

        _.defaults(this.memory, {
            storageId: Game.rooms[this.memory.spawnRoom].storage?.id,
            controllerId: Game.rooms[this.memory.spawnRoom].controller?.id,
            linkId: this.supervisor.controllerLink?.id
        });

        this.controller = Game.getObjectById(this.memory.controllerId) || undefined;
        this.storage = Game.getObjectById(this.memory.storageId) || undefined;
    }

    update(): boolean {
        if (!super.update()) {
            //creep is dead
            return false;
        }
        if (Game.time % 50 == 0 && this.supervisor.controllerLink !== undefined) {      //check every 50 ticks if the scholar has a new link
            this.memory.linkId = this.supervisor.controllerLink.id;
        }
        //attributes that will change tick to tick
        this.storage = Game.getObjectById(this.memory.storageId) || undefined;
        this.controller = Game.getObjectById(this.memory.controllerId) || undefined;
        this.link = Game.getObjectById(this.memory.linkId) || undefined;
        return true;
    }

    /**
     * logic to run each tick
     */
    run(): boolean {
        // if (this.memory.boost !== undefined && this.ticksToLive > 1400) {
        //     if (this.boost(this.memory.boost)) return;
        //     delete this.memory.boost;
        // }
        if (this.store.getUsedCapacity(RESOURCE_ENERGY) < this.getActiveBodyParts(WORK) || (this.memory.task == "withdraw" && this.store.getFreeCapacity(RESOURCE_ENERGY) > 0)) {
            this.memory.task = "withdraw";
            if (this.link === undefined) {
                this.withdrawStorage();
            } else this.withdrawLink();
        } else {
            this.memory.task = "upgrade";
            this.upgradeController();
        }

        //evolve the creep to meet expanding stored energy
        if (this.ticksToLive < 2) {
            this.evolve();
        }

        return true;
    }

    /**
     * Method to withdraw from link
     */
    withdrawLink(): boolean {
        if (this.link === undefined) return false;
        if (this.link.store.getUsedCapacity(RESOURCE_ENERGY) > this.store.getCapacity(RESOURCE_ENERGY)) {
            if (this.pos.inRangeTo(this.link, 1)) {
                this.liveObj.withdraw(this.link, RESOURCE_ENERGY);
            } else {
                this.liveObj.moveTo(this.link);
            }
        }
        return true;
    }

    /**
     * Method to evolve the upgrader depending on storage levels and link
     */
    evolve(): boolean {
        if (this.storage === undefined || this.controller === undefined) return false;

        //default body
        let newBody = [
            WORK, WORK, WORK, WORK,
            CARRY, CARRY, CARRY, CARRY,
            MOVE, MOVE, MOVE, MOVE
        ]
        if (this.link) {
            //remove some move parts, as the carry parts weight nothing and the creep never moves when full after getting link
            newBody = [
                WORK, WORK, WORK, WORK,
                CARRY, CARRY, CARRY, CARRY,
                MOVE, MOVE,
            ]
        }
        if (this.controller !== undefined && this.controller.level == 8) {
            //at RCL, upgrading energy is capped at 15 work parts per tick.
            this.memory.body = [
                WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK, WORK,
                CARRY, CARRY, CARRY, CARRY,
                MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE, MOVE
            ]
            return true;
        }
        //disable automatic move adding
        this.memory.offRoading = true;
        if (this.storage.store.getUsedCapacity(RESOURCE_ENERGY) > this.storage.store.getCapacity(RESOURCE_ENERGY) / 3) {
            let currentBodyCost = Informant.calculateBodyCost(newBody);
            let totalEnergy = Game.rooms[this.room].energyCapacityAvailable - currentBodyCost;
            let targetWorks = 30;
            let numWork = 4;
            let index = 0;
            while(true) {
                if (numWork % 2 == 0 && (totalEnergy < 250 || 50 - newBody.length < 3)) {
                    if (this.link) {
                        //fill in extra with carry parts if there is a link
                        if (newBody.length < 50 && totalEnergy >= 50) {
                            newBody.splice(numWork, 0, CARRY);
                            totalEnergy -= 50;
                        } else break;
                    } else break;
                    continue;
                }
                if (totalEnergy >= 100 && numWork < targetWorks) {
                    newBody.unshift(WORK);
                    totalEnergy -= 100;
                    numWork++;
                } else break;

                if (totalEnergy >= 50) {
                    if (index % 2 != 0) {
                        newBody.push(MOVE);
                        totalEnergy -= 50;
                    }
                } else break;

                index++;
            }
        }
        this.memory.body = newBody;
        return true;
    }
}
